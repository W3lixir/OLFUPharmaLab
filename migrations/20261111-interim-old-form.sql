-- ============================================================
-- INTERIM lockdown, applied AFTER 20261111-requester-login.sql while the OLD website is still live.
--
-- 20261111-requester-login.sql locks everything to staff. The old public request form
-- (still live until the new site is pushed) saves requests without signing in, so this file
-- re-opens ONLY what that old form needs:
--   * anon may READ the reference lists it shows (courses, year levels, sections, groups,
--     subjects, experiments, instructors) and the item list (chemicals)
--   * anon may INSERT a new request (status must be 'pending'); never read, change or delete one
-- Everything else (requests, audit log, breakages, inventory changes, reports) is staff-only.
--
-- At full go-live, re-run 20261111-requester-login.sql (it drops every policy and grant,
-- including these) and then 20261112-experiment-kits.sql.
-- ============================================================
BEGIN;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['courses','year_levels','sections','groups','subjects','experiments','instructors','chemicals'] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('GRANT SELECT ON public.%I TO anon', t);
      EXECUTE format('DROP POLICY IF EXISTS interim_old_form_read ON public.%I', t);
      EXECUTE format('CREATE POLICY interim_old_form_read ON public.%I FOR SELECT TO anon USING (true)', t);
    END IF;
  END LOOP;
END $$;

-- The old form must save with a plain INSERT (hotfix: saveRequest() upsert -> insert).
-- anon gets INSERT only: no SELECT, UPDATE or DELETE on requests, so it can never read,
-- change or remove a request.
GRANT INSERT ON public.requests TO anon;
DROP POLICY IF EXISTS interim_old_form_insert ON public.requests;
CREATE POLICY interim_old_form_insert ON public.requests FOR INSERT TO anon
  WITH CHECK (status = 'pending' AND requester_id IS NULL AND rejection_reason IS NULL);

COMMIT;
