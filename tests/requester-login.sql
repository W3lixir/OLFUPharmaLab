-- Transactional RLS test for migrations/20261111-requester-login.sql.
-- Run in Supabase SQL Editor AFTER the migration. Everything is rolled back.
BEGIN;

-- Fixture users (trigger assigns roles from email / staff list)
INSERT INTO auth.users (id, email, raw_user_meta_data, aud, role) VALUES
 ('11111111-1111-4111-8111-111111111111','qa1234val@student.fatima.edu.ph','{"full_name":"QA Student"}','authenticated','authenticated'),
 ('22222222-2222-4222-8222-222222222222','qa.prof@fatima.edu.ph','{"full_name":"QA Prof"}','authenticated','authenticated'),
 ('33333333-3333-4333-8333-333333333333','qa.outsider@gmail.com','{}','authenticated','authenticated'),
 ('44444444-4444-4444-8444-444444444444','qa9999qc@student.fatima.edu.ph','{}','authenticated','authenticated'),
 ('55555555-5555-4555-8555-555555555555','qa.labtech@fatima.edu.ph','{}','authenticated','authenticated');
INSERT INTO public.staff_emails(email) VALUES ('qa.labtech@fatima.edu.ph');

DO $$ BEGIN
 IF (SELECT role FROM app_users WHERE id='11111111-1111-4111-8111-111111111111') <> 'student'   THEN RAISE EXCEPTION 'student role'; END IF;
 IF (SELECT role FROM app_users WHERE id='22222222-2222-4222-8222-222222222222') <> 'professor' THEN RAISE EXCEPTION 'professor role'; END IF;
 IF EXISTS (SELECT 1 FROM app_users WHERE id='33333333-3333-4333-8333-333333333333') THEN RAISE EXCEPTION 'gmail got access'; END IF;
 IF EXISTS (SELECT 1 FROM app_users WHERE id='44444444-4444-4444-8444-444444444444') THEN RAISE EXCEPTION 'non-Valenzuela student got access'; END IF;
 IF (SELECT role FROM app_users WHERE id='55555555-5555-4555-8555-555555555555') <> 'staff' THEN RAISE EXCEPTION 'staff list did not promote lab tech'; END IF;
END $$;

-- Another requester's existing request
INSERT INTO requests (request_id, student_name, status, requester_id, items)
VALUES ('REQ-QA-OTHER','QA Prof','pending','22222222-2222-4222-8222-222222222222','[]');

-- ── Act as the student ──
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"role":"authenticated","sub":"11111111-1111-4111-8111-111111111111","email":"qa1234val@student.fatima.edu.ph"}',true);

-- Tries to sneak in an approved request for someone else: trigger forces own + pending
INSERT INTO requests (request_id, student_name, status, requester_id, items)
VALUES ('REQ-QA-STUDENT','QA Student','approved','22222222-2222-4222-8222-222222222222','[]');

DO $$ BEGIN
 IF (SELECT count(*) FROM requests) <> 1 THEN RAISE EXCEPTION 'student sees other requests'; END IF;
 IF NOT EXISTS (SELECT 1 FROM requests WHERE request_id='REQ-QA-STUDENT' AND status='pending'
                AND requester_id='11111111-1111-4111-8111-111111111111' AND requester_type='student') THEN RAISE EXCEPTION 'insert not stamped'; END IF;
 IF EXISTS (SELECT 1 FROM chemicals)   THEN RAISE EXCEPTION 'student reads chemicals'; END IF;
 IF EXISTS (SELECT 1 FROM breakages)   THEN RAISE EXCEPTION 'student reads breakages'; END IF;
 IF EXISTS (SELECT 1 FROM audit_log)   THEN RAISE EXCEPTION 'student reads audit_log'; END IF;
 IF EXISTS (SELECT 1 FROM staff_emails) THEN RAISE EXCEPTION 'student reads staff list'; END IF;
 IF (SELECT count(*) FROM app_users) <> 1 THEN RAISE EXCEPTION 'student sees other users'; END IF;
 PERFORM * FROM request_item_options(); -- item picker must work for requesters
END $$;

UPDATE requests SET status='approved' WHERE request_id='REQ-QA-STUDENT';
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM requests WHERE request_id='REQ-QA-STUDENT' AND status <> 'pending') THEN RAISE EXCEPTION 'student approved own request'; END IF;
END $$;

DO $$ BEGIN
 BEGIN
  UPDATE app_users SET role='staff' WHERE id='11111111-1111-4111-8111-111111111111';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 IF public.current_app_role() <> 'student' THEN RAISE EXCEPTION 'student promoted self'; END IF;
END $$;

SELECT save_my_profile('{"student_number":"2024-00001","course":"BS Pharmacy"}');
DO $$ BEGIN
 IF (SELECT student_number FROM app_users WHERE id='11111111-1111-4111-8111-111111111111') <> '2024-00001' THEN RAISE EXCEPTION 'profile not saved'; END IF;
END $$;

-- ── Act as anon ──
RESET ROLE;
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims','{"role":"anon"}',true);
DO $$ BEGIN
 BEGIN
  PERFORM 1 FROM requests LIMIT 1;
  RAISE EXCEPTION 'anon can read requests';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;

-- ── Act as the lab tech (staff) ──
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"role":"authenticated","sub":"55555555-5555-4555-8555-555555555555","email":"qa.labtech@fatima.edu.ph"}',true);
UPDATE requests SET status='approved' WHERE request_id='REQ-QA-STUDENT';
DO $$ BEGIN
 IF (SELECT count(*) FROM requests WHERE request_id LIKE 'REQ-QA-%') <> 2 THEN RAISE EXCEPTION 'staff cannot see all requests'; END IF;
 IF NOT EXISTS (SELECT 1 FROM requests WHERE request_id='REQ-QA-STUDENT' AND status='approved') THEN RAISE EXCEPTION 'staff cannot approve'; END IF;
END $$;

RESET ROLE;
ROLLBACK;
SELECT 'PASS: roles by domain/staff list, own-request isolation, insert stamping, no anon access, staff unaffected; fixtures rolled back' AS result;
