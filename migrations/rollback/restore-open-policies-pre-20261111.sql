-- ============================================================
-- EMERGENCY ROLLBACK ONLY. Restores the OPEN (insecure) access rules that existed before
-- 20261111-requester-login.sql, captured from the live database on 2026-11-11.
-- Use only if the lockdown breaks the live site and there is no quicker fix.
-- It does not delete app_users / staff_emails; they are harmless with these rules.
-- ============================================================
BEGIN;

DO $$
DECLARE p record; t text;
BEGIN
  FOR p IN SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, p.tablename);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['audit_log','chemicals','courses','equipment','experiments','instructors','requests','room_schedule','sections','subjects','supplies'] LOOP
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)', 'Allow full access on ' || t, t);
    EXECUTE format('CREATE POLICY anon_all ON public.%I FOR ALL TO anon USING (true) WITH CHECK (true)', t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['audit_log','chemicals','courses','equipment','experiments','groups','instructors','inventory_history','requests','room_schedule','sections','subjects','supplies','year_levels'] LOOP
    EXECUTE format('GRANT ALL ON public.%I TO anon, authenticated', t);
  END LOOP;
END $$;

CREATE POLICY "Allow all for year_levels" ON public.year_levels FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY lab_staff_breakages ON public.breakages FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY laboratory_staff_read ON public.laboratory_reports FOR SELECT TO authenticated USING (true);
ALTER TABLE public.groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_history DISABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.breakages TO authenticated;
GRANT SELECT ON public.laboratory_reports TO authenticated;

-- storage: back to the original lab report photo rules
DROP POLICY IF EXISTS incident_evidence_staff ON storage.objects;
DROP POLICY IF EXISTS lab_report_photo_read ON storage.objects;
DROP POLICY IF EXISTS lab_report_photo_upload ON storage.objects;
CREATE POLICY lab_report_photo_read ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'laboratory-report-photos');
CREATE POLICY lab_report_photo_upload ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'laboratory-report-photos' AND EXISTS (SELECT 1 FROM public.laboratory_reports WHERE id::text = (storage.foldername(name))[1]));

COMMIT;
