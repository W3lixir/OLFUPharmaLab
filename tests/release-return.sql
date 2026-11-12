-- Transactional test for migrations/20261114-release-return-rpc.sql (run after the migration).
-- Everything is rolled back.
BEGIN;

INSERT INTO auth.users (id, email, aud, role) VALUES
 ('b1111111-1111-4111-8111-111111111111','rr1val@student.fatima.edu.ph','authenticated','authenticated'),
 ('b5555555-5555-4555-8555-555555555555','rr.labtech@fatima.edu.ph','authenticated','authenticated');
INSERT INTO public.staff_emails(email) VALUES ('rr.labtech@fatima.edu.ph');
-- The auth trigger gives new users their role from the email.
UPDATE public.app_users SET role = 'staff' WHERE id = 'b5555555-5555-4555-8555-555555555555';

INSERT INTO chemicals (id, name, quantity, unit, category) VALUES
 ('rr-hcl',    'RR Hydrochloric acid', 100, 'mL',  'Liquid Reagent'),
 ('rr-nacl',   'RR Sodium chloride',     3, 'g',   'Solid Reagent'),
 ('rr-beaker', 'RR Beaker 250 mL',      10, 'pcs', 'Glassware'),
 ('rr-scale',  'RR Balance',             1, 'pcs', 'Equipment');

INSERT INTO requests (request_id, student_name, student_number, status, items) VALUES
 ('RR-1', 'Juan Dela Cruz', '2024-0001', 'approved', '[
   {"name":"RR Hydrochloric acid","category":"Liquid Reagent","quantity":"25","unit":"mL","itemId":"rr-hcl"},
   {"name":"rr sodium chloride ","category":"Solid Reagent","quantity":5,"unit":"g"},
   {"name":"RR Beaker 250 mL","category":"Glassware","quantity":4,"unit":"pcs","itemId":"rr-beaker"},
   {"name":"RR Balance","category":"Equipment","quantity":1,"unit":"pcs"},
   {"name":"RR Hydrochloric acid","category":"Liquid Reagent","quantity":2,"unit":"L","itemId":"rr-hcl"},
   {"name":"RR Distilled water","category":"Liquid Reagent","quantity":"","unit":"mL"},
   {"name":"RR Unknown thing","category":"Glassware","quantity":1,"unit":"pcs"}]'),
 ('RR-2', 'Maria Santos', '2024-0002', 'pending', '[]');

-- ── A student cannot release or return ──
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"role":"authenticated","sub":"b1111111-1111-4111-8111-111111111111","email":"rr1val@student.fatima.edu.ph"}',true);
DO $$ BEGIN
  BEGIN PERFORM release_request('RR-1', 'x'); RAISE EXCEPTION 'student released a request';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM NOT LIKE 'Staff login required%' THEN RAISE; END IF; END;
  BEGIN PERFORM return_request('RR-1', '[]', 'x'); RAISE EXCEPTION 'student returned a request';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM NOT LIKE 'Staff login required%' THEN RAISE; END IF; END;
END $$;

-- ── Staff releases ──
SELECT set_config('request.jwt.claims','{"role":"authenticated","sub":"b5555555-5555-4555-8555-555555555555","email":"rr.labtech@fatima.edu.ph"}',true);

DO $$ BEGIN
  BEGIN PERFORM release_request('RR-2', 'Tech'); RAISE EXCEPTION 'pending request was released';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM NOT LIKE '%is pending and cannot be released%' THEN RAISE; END IF; END;
  BEGIN PERFORM return_request('RR-1', '[]', 'Tech'); RAISE EXCEPTION 'approved request was returned';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM NOT LIKE '%is approved and cannot be returned%' THEN RAISE; END IF; END;
END $$;

DO $$ DECLARE r jsonb; sk jsonb; it jsonb; BEGIN
  r := release_request('RR-1', 'Lab Tech One');
  sk := r->'skipped';
  IF jsonb_array_length(sk) <> 4 THEN RAISE EXCEPTION 'expected 4 skipped lines, got %', sk; END IF;
  IF NOT sk @> '["rr sodium chloride  — only 3 g was in stock (requested 5)"]' THEN RAISE EXCEPTION 'short stock not reported: %', sk; END IF;
  IF NOT sk @> '["RR Hydrochloric acid — requested in L, stock is in mL"]' THEN RAISE EXCEPTION 'unit mismatch not reported: %', sk; END IF;
  IF NOT sk @> '["RR Distilled water — quantity \"as needed\", deduct manually"]' THEN RAISE EXCEPTION 'as-needed not reported: %', sk; END IF;
  IF NOT sk @> '["RR Unknown thing — not found in inventory"]' THEN RAISE EXCEPTION 'unknown item not reported: %', sk; END IF;

  IF (SELECT quantity FROM chemicals WHERE id='rr-hcl')    <> 75 THEN RAISE EXCEPTION 'HCl not deducted'; END IF;
  IF (SELECT quantity FROM chemicals WHERE id='rr-nacl')   <> 0  THEN RAISE EXCEPTION 'NaCl must stop at zero'; END IF;
  IF (SELECT quantity FROM chemicals WHERE id='rr-beaker') <> 6  THEN RAISE EXCEPTION 'beakers not deducted'; END IF;
  IF (SELECT quantity FROM chemicals WHERE id='rr-scale')  <> 0  THEN RAISE EXCEPTION 'balance not deducted'; END IF;

  SELECT items->1 INTO it FROM requests WHERE request_id='RR-1';
  IF it->>'releasedFrom' <> 'rr-nacl' OR (it->>'deductedQty')::numeric <> 3 THEN RAISE EXCEPTION 'name match not recorded: %', it; END IF;
  SELECT items->4 INTO it FROM requests WHERE request_id='RR-1';
  IF it ? 'deductedQty' THEN RAISE EXCEPTION 'unit mismatch row must not be deducted'; END IF;
  IF (SELECT status FROM requests WHERE request_id='RR-1') <> 'released' THEN RAISE EXCEPTION 'status not released'; END IF;
  IF (SELECT count(*) FROM audit_log WHERE details LIKE '%Req: RR-1') <> 7 THEN RAISE EXCEPTION 'one audit line per item expected'; END IF;
  IF NOT EXISTS (SELECT 1 FROM audit_log WHERE action='Request Released' AND user_name='Lab Tech One') THEN RAISE EXCEPTION 'release not logged'; END IF;
END $$;

-- Releasing twice is refused, so stock is never deducted twice.
DO $$ BEGIN
  BEGIN PERFORM release_request('RR-1', 'Tech'); RAISE EXCEPTION 'released twice';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM NOT LIKE '%is released and cannot be released%' THEN RAISE; END IF; END;
  IF (SELECT quantity FROM chemicals WHERE id='rr-hcl') <> 75 THEN RAISE EXCEPTION 'stock changed by refused release'; END IF;
END $$;

-- ── Return: too many counted is refused and changes nothing ──
DO $$ BEGIN
  BEGIN PERFORM return_request('RR-1', '[{"index":2,"good":4,"damaged":1}]', 'Lab Tech One');
    RAISE EXCEPTION 'over-count accepted';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM NOT LIKE '%Good + Damaged is more than the 4 released%' THEN RAISE; END IF; END;
  IF (SELECT quantity FROM chemicals WHERE id='rr-beaker') <> 6 THEN RAISE EXCEPTION 'refused return changed stock'; END IF;
END $$;

-- Beakers: 2 good, 1 damaged, 1 missing. Balance: not listed, so fully missing.
DO $$ DECLARE r jsonb; BEGIN
  r := return_request('RR-1',
        '[{"index":2,"good":2,"damaged":1,"name":"Pedro Reyes","group":"Group 3"},{"index":6,"good":1}]',
        'Lab Tech One', '2026-11-14T08:30:00Z', 'Lab Tech One');
  IF jsonb_array_length(r->'warnings') <> 0 THEN RAISE EXCEPTION 'unexpected warnings %', r; END IF;
  IF NOT (r->'summary') @> '["RR Beaker 250 mL: 1 damaged, 1 missing", "RR Balance: 1 missing"]' THEN RAISE EXCEPTION 'summary wrong: %', r; END IF;

  IF (SELECT quantity FROM chemicals WHERE id='rr-beaker') <> 8 THEN RAISE EXCEPTION 'good beakers not restored'; END IF;
  IF (SELECT quantity FROM chemicals WHERE id='rr-scale')  <> 0 THEN RAISE EXCEPTION 'missing balance restored'; END IF;
  IF (SELECT count(*) FROM breakages WHERE request_id='RR-1') <> 3 THEN RAISE EXCEPTION 'expected 3 breakage rows'; END IF;
  IF NOT EXISTS (SELECT 1 FROM breakages WHERE request_id='RR-1' AND incident_type='breakage' AND student_name='Pedro Reyes'
                 AND group_name='Group 3' AND quantity=1 AND description='1 of 4 damaged on return. Group: Group 3') THEN
    RAISE EXCEPTION 'damaged entry wrong';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM breakages WHERE request_id='RR-1' AND incident_type='missing' AND item_name='RR Balance'
                 AND student_name='Juan Dela Cruz' AND student_number='2024-0001') THEN
    RAISE EXCEPTION 'missing balance entry wrong';
  END IF;
  IF (SELECT status FROM requests WHERE request_id='RR-1') <> 'returned' THEN RAISE EXCEPTION 'status not returned'; END IF;
  IF NOT EXISTS (SELECT 1 FROM audit_log WHERE action='Request Returned' AND details = 'RR-1 — Juan Dela Cruz — returned at 11/14/2026, 4:30:00 PM') THEN
    RAISE EXCEPTION 'return not logged in Manila time: %', (SELECT details FROM audit_log WHERE action='Request Returned');
  END IF;
END $$;

-- Returning twice is refused, so stock is never restored twice.
DO $$ BEGIN
  BEGIN PERFORM return_request('RR-1', '[{"index":2,"good":4}]', 'Lab Tech One'); RAISE EXCEPTION 'returned twice';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM NOT LIKE '%is returned and cannot be returned%' THEN RAISE; END IF; END;
  IF (SELECT quantity FROM chemicals WHERE id='rr-beaker') <> 8 THEN RAISE EXCEPTION 'stock changed by refused return'; END IF;
END $$;

-- ── A breakage entry that fails to save must not block the return ──
RESET ROLE;
INSERT INTO requests (request_id, student_name, status, items) VALUES
 ('RR-3', 'Ana Cruz', 'released', '[{"name":"RR Beaker 250 mL","category":"Glassware","quantity":2,"unit":"pcs","releasedFrom":"rr-beaker","deductedQty":2}]');
CREATE FUNCTION pg_temp.rr_block() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'storage full'; END $$;
CREATE TRIGGER rr_block BEFORE INSERT ON breakages FOR EACH ROW EXECUTE FUNCTION pg_temp.rr_block();
SET LOCAL ROLE authenticated;
DO $$ DECLARE r jsonb; BEGIN
  r := return_request('RR-3', '[{"index":0,"good":1,"damaged":1}]', 'Lab Tech One');
  IF NOT (r->'warnings') @> '["The breakage entry for \"RR Beaker 250 mL\" could not be logged: storage full"]' THEN RAISE EXCEPTION 'no warning: %', r; END IF;
  IF (SELECT status FROM requests WHERE request_id='RR-3') <> 'returned' THEN RAISE EXCEPTION 'return blocked by breakage failure'; END IF;
  IF (SELECT quantity FROM chemicals WHERE id='rr-beaker') <> 9 THEN RAISE EXCEPTION 'good beaker not restored'; END IF;
END $$;

RESET ROLE;
DO $$ BEGIN RAISE NOTICE 'release-return tests passed'; END $$;
ROLLBACK;
