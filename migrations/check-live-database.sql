-- ============================================================
-- READ-ONLY health check for the live database. Changes nothing; safe to run any time.
-- Paste into Supabase → SQL Editor → Run. Each row says OK or what to do.
-- ============================================================
WITH checks AS (
  -- 1. Go-live: visitors who are not signed in must have no table access.
  SELECT 1 AS n, 'No access for signed-out visitors (anon)' AS check_name,
         CASE WHEN count(*) = 0 THEN 'OK'
              ELSE 'ACTION: run migrations/20261113-golive-remove-interim.sql. Open policies: '
                   || string_agg(tablename || '.' || policyname, ', ') END AS result
    FROM pg_policies WHERE schemaname = 'public' AND roles::text LIKE '%anon%'
  UNION ALL
  SELECT 2, 'No table grants left for anon',
         CASE WHEN count(*) = 0 THEN 'OK'
              ELSE 'ACTION: run migrations/20261113-golive-remove-interim.sql. Grants on: '
                   || string_agg(DISTINCT table_name, ', ') END
    FROM information_schema.role_table_grants WHERE table_schema = 'public' AND grantee = 'anon'
  UNION ALL
  -- 2. Old wide-open policies from the first schema file must be gone.
  SELECT 3, 'No old "anon_all" policies',
         CASE WHEN count(*) = 0 THEN 'OK' ELSE 'ACTION: run migrations/20261111-requester-login.sql again. Found on: '
              || string_agg(tablename, ', ') END
    FROM pg_policies WHERE schemaname = 'public' AND policyname IN ('anon_all', 'interim_old_form_read', 'interim_old_form_insert')
  UNION ALL
  -- 3. Every public table has row security switched on.
  SELECT 4, 'Row security on for every table',
         CASE WHEN count(*) = 0 THEN 'OK' ELSE 'ACTION: tables without RLS: ' || string_agg(relname, ', ') END
    FROM pg_class c JOIN pg_namespace s ON s.oid = c.relnamespace
   WHERE s.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity
  UNION ALL
  -- 4. Database functions the website calls.
  SELECT 5, 'Release/return in one transaction',
         CASE WHEN to_regprocedure('public.release_request(text,text)') IS NOT NULL
               AND to_regprocedure('public.return_request(text,jsonb,text,timestamptz,text)') IS NOT NULL
              THEN 'OK' ELSE 'ACTION: run migrations/20261114-release-return-rpc.sql' END
  UNION ALL
  SELECT 6, 'Experiment kits',
         CASE WHEN to_regclass('public.experiment_items') IS NOT NULL THEN 'OK'
              ELSE 'ACTION: run migrations/20261112-experiment-kits.sql' END
)
SELECT n, check_name, result FROM checks ORDER BY n;

-- Optional: list every table and column, to compare with supabase-schema.sql
-- SELECT table_name, column_name, data_type FROM information_schema.columns
--  WHERE table_schema = 'public' ORDER BY table_name, ordinal_position;
