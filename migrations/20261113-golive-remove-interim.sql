-- ============================================================
-- GO-LIVE: remove the interim access that kept the OLD public request form working.
-- Run right before (or right after) pushing the new website, which signs requesters in with Google.
--
-- Already applied on the live database (2026-11-11):
--   20261111-requester-login.sql, 20261111-interim-old-form.sql, 20261112-experiment-kits.sql
-- After this file, visitors who are not signed in have no table access at all.
-- ============================================================
BEGIN;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['courses','year_levels','sections','groups','subjects','experiments','instructors','chemicals'] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('DROP POLICY IF EXISTS interim_old_form_read ON public.%I', t);
      EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    END IF;
  END LOOP;
END $$;

DROP POLICY IF EXISTS interim_old_form_insert ON public.requests;
REVOKE ALL ON public.requests FROM anon;

-- Safety net: nothing in public should still mention anon.
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM pg_policies WHERE schemaname = 'public' AND roles::text LIKE '%anon%';
  IF n > 0 THEN RAISE EXCEPTION 'Still % public policies for anon', n; END IF;
  SELECT count(*) INTO n FROM information_schema.role_table_grants WHERE grantee = 'anon' AND table_schema = 'public';
  IF n > 0 THEN RAISE EXCEPTION 'Still % table grants for anon', n; END IF;
END $$;

COMMIT;
