-- Transactional test for migrations/20261112-experiment-kits.sql (run after the migration).
-- Everything is rolled back.
BEGIN;

INSERT INTO auth.users (id, email, aud, role) VALUES
 ('a1111111-1111-4111-8111-111111111111','kit1val@student.fatima.edu.ph','authenticated','authenticated'),
 ('a5555555-5555-4555-8555-555555555555','kit.labtech@fatima.edu.ph','authenticated','authenticated');
INSERT INTO public.staff_emails(email) VALUES ('kit.labtech@fatima.edu.ph');
INSERT INTO chemicals (id, name, quantity, unit, category) VALUES ('kit-castor','Castor oil',1000,'mL','Liquid Reagent') ON CONFLICT DO NOTHING;
INSERT INTO chemicals (id, name, quantity, min_quantity, unit, category) VALUES
 ('kit-low','Low item',2,5,'pcs','Glassware'), ('kit-out','Out item',0,5,'g','Solid Reagent') ON CONFLICT DO NOTHING;

-- ── Staff imports a subject ──
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"role":"authenticated","sub":"a5555555-5555-4555-8555-555555555555","email":"kit.labtech@fatima.edu.ph"}',true);
SELECT import_experiment_kit(
  '{"code":"pqa999","name":"QA Subject","year_level":"2nd Year","semester":"1st Semester"}',
  '[{"exp_no":"1","title":"QA Experiment","default_groups":6,"items":[
      {"kind":"chemical","item_name":"Castor oil","inventory_item_id":"kit-castor","category":"Liquid Reagent","qty":5,"unit":"mL","basis":"per_group"},
      {"kind":"equipment","item_name":"Beaker","category":"Glassware","qty":2,"unit":"pcs","basis":"per_group"},
      {"kind":"chemical","item_name":"Mouse","qty":1,"basis":"per_student"},
      {"kind":"chemical","item_name":"Ghost item","inventory_item_id":"does-not-exist","qty":null}]}]');

DO $$ DECLARE sid text; eid text; BEGIN
 SELECT id INTO sid FROM subjects WHERE code = 'PQA999';
 IF sid IS NULL THEN RAISE EXCEPTION 'subject not created with upper-case code'; END IF;
 SELECT id INTO eid FROM experiments WHERE subject_id = sid AND name = 'QA Experiment' AND active AND default_groups = 6 AND exp_no = '1';
 IF eid IS NULL THEN RAISE EXCEPTION 'experiment not created'; END IF;
 IF (SELECT count(*) FROM experiment_items WHERE experiment_id = eid) <> 4 THEN RAISE EXCEPTION 'items not created'; END IF;
 IF (SELECT inventory_item_id FROM experiment_items WHERE experiment_id = eid AND item_name = 'Castor oil') <> 'kit-castor' THEN RAISE EXCEPTION 'inventory link lost'; END IF;
 IF (SELECT inventory_item_id FROM experiment_items WHERE experiment_id = eid AND item_name = 'Ghost item') IS NOT NULL THEN RAISE EXCEPTION 'unknown inventory id kept'; END IF;
END $$;

-- Re-import replaces items, keeps the same experiment id, hides experiments no longer listed
SELECT import_experiment_kit('{"code":"PQA999"}',
  '[{"exp_no":"1","title":"QA Experiment","default_groups":8,"items":[{"kind":"equipment","item_name":"Test tube","qty":5,"unit":"pcs"}]},
    {"exp_no":"2","title":"QA Experiment Two","items":[]}]');
DO $$ DECLARE sid text; BEGIN
 SELECT id INTO sid FROM subjects WHERE code = 'PQA999';
 IF (SELECT count(*) FROM experiments WHERE subject_id = sid) <> 2 THEN RAISE EXCEPTION 'experiment duplicated on re-import'; END IF;
 IF (SELECT count(*) FROM experiment_items i JOIN experiments e ON e.id = i.experiment_id WHERE e.subject_id = sid) <> 1 THEN RAISE EXCEPTION 'old items not replaced'; END IF;
 IF (SELECT name FROM subjects WHERE id = sid) <> 'QA Subject' THEN RAISE EXCEPTION 'blank name overwrote subject name'; END IF;
END $$;

-- ── Student: can read kits, cannot change them or import ──
SELECT set_config('request.jwt.claims','{"role":"authenticated","sub":"a1111111-1111-4111-8111-111111111111","email":"kit1val@student.fatima.edu.ph"}',true);
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM experiment_items) THEN RAISE EXCEPTION 'student cannot read kit items'; END IF;
 IF NOT EXISTS (SELECT 1 FROM request_item_options() WHERE id = 'kit-castor') THEN RAISE EXCEPTION 'item options missing id'; END IF;
 IF (SELECT stock FROM request_item_options() WHERE id = 'kit-castor') <> 'ok'
    OR (SELECT stock FROM request_item_options() WHERE id = 'kit-low') <> 'low'
    OR (SELECT stock FROM request_item_options() WHERE id = 'kit-out') <> 'out' THEN RAISE EXCEPTION 'stock flag wrong'; END IF;
 BEGIN
  PERFORM import_experiment_kit('{"code":"HACK1"}', '[]');
  RAISE EXCEPTION 'student imported a kit';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'Staff login required' THEN RAISE; END IF; END;
END $$;
UPDATE experiment_items SET qty = 999;
DELETE FROM experiment_items;
DO $$ BEGIN
 BEGIN
  INSERT INTO experiment_items (experiment_id, kind, item_name) SELECT id, 'chemical', 'hack' FROM experiments LIMIT 1;
  RAISE EXCEPTION 'student inserted kit item';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;

-- Request with kit context is accepted for a student
INSERT INTO requests (request_id, student_name, items, experiment_id, group_count, student_count)
VALUES ('REQ-KIT-1', 'Kit Student', '[{"name":"Castor oil","quantity":"30","unit":"mL","source":"kit","itemId":"kit-castor"}]',
        (SELECT id FROM experiments WHERE name = 'QA Experiment'), 6, 30);

RESET ROLE;
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM experiment_items WHERE qty = 999) OR (SELECT count(*) FROM experiment_items i JOIN experiments e ON e.id=i.experiment_id JOIN subjects s ON s.id=e.subject_id WHERE s.code='PQA999') <> 1 THEN
  RAISE EXCEPTION 'student changed kit items';
 END IF;
 IF NOT EXISTS (SELECT 1 FROM requests WHERE request_id = 'REQ-KIT-1' AND group_count = 6 AND student_count = 30) THEN RAISE EXCEPTION 'request kit fields not saved'; END IF;
END $$;

-- ── Anon: nothing ──
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims','{"role":"anon"}',true);
DO $$ BEGIN
 BEGIN PERFORM 1 FROM experiment_items; RAISE EXCEPTION 'anon read kit items';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;

ROLLBACK;
SELECT 'PASS: kit import (create, re-import, link inventory), student read-only, anon blocked; rolled back' AS result;
