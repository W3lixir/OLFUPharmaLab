-- Transactional integration test: all fixtures and audit entries are rolled back.
BEGIN;
SELECT set_config('request.jwt.claims','{"role":"service_role"}',true);
SELECT submit_laboratory_report('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','qa-hash',
 '{"report_type":"breakage","reporter_type":"student","reporter_name":"QA transaction","student_number":"QA-001","room":"AMS 204","occurred_at":"2026-01-01T01:00:00Z","description":"QA fixture","details":{"item_name":"QA Beaker","quantity":1,"unit":"pcs","damage_cause":"QA"}}','[]');
SELECT submit_laboratory_report('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','qa-hash',
 '{"report_type":"breakage","reporter_type":"student","reporter_name":"QA transaction","student_number":"QA-001","room":"AMS 204","occurred_at":"2026-01-01T01:00:00Z","description":"QA fixture","details":{"item_name":"QA Beaker","quantity":1,"unit":"pcs"}}','[]');
SELECT set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',(SELECT id FROM auth.users ORDER BY created_at LIMIT 1),'email','qa-staff@example.invalid')::text,true);
SELECT review_laboratory_report('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','accept','QA acceptance');
SELECT review_laboratory_report('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','accept','QA retry');
DO $$ BEGIN
 IF (SELECT count(*) FROM breakages WHERE laboratory_report_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') <> 1 THEN RAISE EXCEPTION 'Duplicate breakage'; END IF;
 IF NOT EXISTS (SELECT 1 FROM breakages b JOIN laboratory_reports r ON b.laboratory_report_id=r.id WHERE r.id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' AND b.date_reported=r.submitted_at AND b.date_occurred=r.occurred_at AND b.date_accepted=r.reviewed_at) THEN RAISE EXCEPTION 'Timestamp mismatch'; END IF;
END $$;
SELECT review_laboratory_report('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','resolve','QA resolution','2026-01-02T01:00:00Z');
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM breakages WHERE laboratory_report_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' AND date_resolved='2026-01-02T01:00:00Z') THEN RAISE EXCEPTION 'Inbox resolution did not sync'; END IF;
END $$;
UPDATE breakages SET date_resolved='2026-01-03T01:00:00Z' WHERE laboratory_report_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM laboratory_reports WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' AND resolved_at='2026-01-03T01:00:00Z' AND status='resolved') THEN RAISE EXCEPTION 'Breakage resolution did not sync'; END IF;
END $$;
ROLLBACK;
SELECT 'PASS: idempotent submit/accept, separate timestamps, and bidirectional resolution; fixtures rolled back' AS result;
