-- ============================================================
-- Requester login (Google) + staff role + RLS lockdown
-- Run ONCE in Supabase Dashboard -> SQL Editor, outside lab hours,
-- then deploy the matching frontend right away.
--
-- After this runs:
--   * anon (not signed in) can read/write NOTHING in public tables
--   * staff  = rows in app_users with role 'staff' (all existing accounts)
--   * student/professor = Google sign-in with an OLFU email; they can
--     only insert their own pending requests and read their own requests
-- ============================================================
BEGIN;

-- ── 1. Users / roles ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.app_users (
  id             uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email          text NOT NULL,
  full_name      text,
  role           text NOT NULL CHECK (role IN ('staff','student','professor')),
  student_number text,
  contact_number text,
  course         text,
  year_level     text,
  section        text,
  group_name     text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- Every account that exists today is a lab staff account.
INSERT INTO public.app_users (id, email, full_name, role)
SELECT u.id, coalesce(u.email, ''), u.raw_user_meta_data->>'full_name', 'staff'
FROM auth.users u
ON CONFLICT (id) DO NOTHING;

-- The single place that decides who may request. Edit this to open other campuses.
CREATE OR REPLACE FUNCTION public.requester_role_for_email(p_email text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN lower(p_email) LIKE '%val@student.fatima.edu.ph' THEN 'student'
    WHEN lower(p_email) LIKE '%@fatima.edu.ph'            THEN 'professor'
    ELSE NULL
  END
$$;

-- Lab techs share the @fatima.edu.ph domain with professors, so staff are an explicit list.
-- Add a lab tech:    INSERT INTO staff_emails(email) VALUES ('name@fatima.edu.ph');
-- Remove a lab tech: DELETE FROM staff_emails WHERE email = 'name@fatima.edu.ph';
CREATE TABLE IF NOT EXISTS public.staff_emails (
  email      text PRIMARY KEY CHECK (email = lower(email)),
  added_at   timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.staff_emails (email)
SELECT lower(u.email) FROM auth.users u WHERE u.email IS NOT NULL
ON CONFLICT DO NOTHING;

-- Keep app_users.role in step with the staff list (also for people who already signed in).
CREATE OR REPLACE FUNCTION public.sync_staff_email()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.app_users SET role = 'staff', updated_at = now() WHERE lower(email) = NEW.email;
    INSERT INTO public.app_users (id, email, full_name, role)
    SELECT u.id, u.email, coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name'), 'staff'
    FROM auth.users u WHERE lower(u.email) = NEW.email
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
  END IF;
  UPDATE public.app_users SET role = public.requester_role_for_email(email), updated_at = now()
  WHERE lower(email) = OLD.email AND public.requester_role_for_email(email) IS NOT NULL;
  DELETE FROM public.app_users WHERE lower(email) = OLD.email AND public.requester_role_for_email(email) IS NULL;
  RETURN OLD;
END $$;
DROP TRIGGER IF EXISTS sync_staff_email ON public.staff_emails;
CREATE TRIGGER sync_staff_email AFTER INSERT OR DELETE ON public.staff_emails
  FOR EACH ROW EXECUTE FUNCTION public.sync_staff_email();

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE r text := CASE
  WHEN EXISTS (SELECT 1 FROM public.staff_emails WHERE email = lower(NEW.email)) THEN 'staff'
  ELSE public.requester_role_for_email(NEW.email) END;
BEGIN
  IF r IS NOT NULL THEN
    INSERT INTO public.app_users (id, email, full_name, role)
    VALUES (NEW.id, NEW.email,
            coalesce(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
            r)
    ON CONFLICT (id) DO NOTHING;
  END IF;
  -- Other domains (not on the staff list) get no app_users row = no access.
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created_app_user ON auth.users;
CREATE TRIGGER on_auth_user_created_app_user
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

CREATE OR REPLACE FUNCTION public.current_app_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT role FROM public.app_users WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT coalesce((SELECT role = 'staff' FROM public.app_users WHERE id = auth.uid()), false)
$$;

REVOKE ALL ON FUNCTION public.current_app_role(), public.is_staff() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_app_role(), public.is_staff() TO authenticated;

-- Requesters update their saved profile only through this RPC (cannot touch role).
CREATE OR REPLACE FUNCTION public.save_my_profile(p jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Login required'; END IF;
  UPDATE public.app_users SET
    full_name      = coalesce(nullif(trim(p->>'full_name'), ''), full_name),
    student_number = nullif(trim(p->>'student_number'), ''),
    contact_number = nullif(trim(p->>'contact_number'), ''),
    course         = nullif(trim(p->>'course'), ''),
    year_level     = nullif(trim(p->>'year_level'), ''),
    section        = nullif(trim(p->>'section'), ''),
    group_name     = nullif(trim(p->>'group_name'), ''),
    updated_at     = now()
  WHERE id = auth.uid();
END $$;
REVOKE ALL ON FUNCTION public.save_my_profile(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_my_profile(jsonb) TO authenticated;

-- ── 2. Requests: who submitted it ───────────────────────────
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS requester_id    uuid REFERENCES auth.users(id);
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS requester_email text;
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS requester_type  text;
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS project_title   text;
CREATE INDEX IF NOT EXISTS idx_requests_requester ON public.requests (requester_id, date_submitted DESC);

-- Non-staff inserts are forced to belong to the caller and start as pending.
CREATE OR REPLACE FUNCTION public.stamp_request_requester()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE r text := public.current_app_role();
BEGIN
  IF r IN ('student','professor') THEN
    NEW.requester_id     := auth.uid();
    NEW.requester_email  := auth.jwt()->>'email';
    NEW.requester_type   := r;
    NEW.status           := 'pending';
    NEW.rejection_reason := NULL;
    NEW.date_submitted   := now();
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS stamp_request_requester ON public.requests;
CREATE TRIGGER stamp_request_requester BEFORE INSERT ON public.requests
  FOR EACH ROW EXECUTE FUNCTION public.stamp_request_requester();

-- Item picker for requesters: names/units/categories only, no stock levels.
CREATE OR REPLACE FUNCTION public.request_item_options()
RETURNS TABLE (id text, name text, unit text, category text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT c.id::text, c.name, c.unit, c.category
  FROM public.chemicals c
  WHERE public.current_app_role() IS NOT NULL
  ORDER BY c.name
$$;
REVOKE ALL ON FUNCTION public.request_item_options() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_item_options() TO authenticated;

-- ── 3. Drop EVERY existing policy on public tables, then rebuild ──
DO $$
DECLARE p record; t record;
BEGIN
  FOR p IN SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I', p.policyname, p.schemaname, p.tablename);
  END LOOP;

  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t.tablename);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t.tablename);
    -- Default for every table: lab staff only.
    EXECUTE format('CREATE POLICY staff_all ON public.%I FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff())', t.tablename);
  END LOOP;
END $$;

-- Reference data the request form needs: any signed-in requester may read.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['courses','year_levels','sections','groups','subjects','experiments','instructors'] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('CREATE POLICY requester_read ON public.%I FOR SELECT TO authenticated USING (public.current_app_role() IS NOT NULL)', t);
    END IF;
  END LOOP;
END $$;

-- Requests: requesters insert their own and read their own. No update/delete.
CREATE POLICY requester_insert_own ON public.requests FOR INSERT TO authenticated
  WITH CHECK (public.current_app_role() IN ('student','professor')
              AND requester_id = auth.uid() AND status = 'pending');
CREATE POLICY requester_read_own ON public.requests FOR SELECT TO authenticated
  USING (requester_id = auth.uid());

-- app_users: read own row (staff already covered by staff_all). Writes only via RPC/staff.
CREATE POLICY self_read ON public.app_users FOR SELECT TO authenticated USING (id = auth.uid());

-- laboratory_reports stays read-only for staff (writes go through RPCs / Edge Function).
DROP POLICY IF EXISTS staff_all ON public.laboratory_reports;
REVOKE INSERT, UPDATE, DELETE ON public.laboratory_reports FROM authenticated;
CREATE POLICY staff_read ON public.laboratory_reports FOR SELECT TO authenticated USING (public.is_staff());

-- ── 4. Storage: evidence buckets are staff-only ─────────────
DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies
           WHERE schemaname = 'storage' AND tablename = 'objects'
             AND (coalesce(qual,'') || coalesce(with_check,'')) ~ '(incident-evidence|laboratory-report-photos)'
  LOOP
    EXECUTE format('DROP POLICY %I ON storage.objects', p.policyname);
  END LOOP;
END $$;
CREATE POLICY incident_evidence_staff ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'incident-evidence' AND public.is_staff())
  WITH CHECK (bucket_id = 'incident-evidence' AND public.is_staff());
CREATE POLICY lab_report_photo_read ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'laboratory-report-photos' AND public.is_staff());
CREATE POLICY lab_report_photo_upload ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'laboratory-report-photos' AND public.is_staff()
              AND EXISTS (SELECT 1 FROM public.laboratory_reports WHERE id::text = (storage.foldername(name))[1]));

-- ── 5. Lab report RPCs: signed in is no longer enough, must be staff ──
CREATE OR REPLACE FUNCTION public.review_laboratory_report(p_id uuid, p_action text, p_notes text DEFAULT '', p_resolved_at timestamptz DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE r laboratory_reports; bid text; staff text;
BEGIN
 IF auth.uid() IS NULL OR auth.role() <> 'authenticated' OR NOT public.is_staff() THEN RAISE EXCEPTION 'Staff login required'; END IF;
 SELECT * INTO r FROM laboratory_reports WHERE id=p_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Report not found'; END IF;
 staff := coalesce(auth.jwt()->'user_metadata'->>'full_name',auth.jwt()->>'email','Lab Staff');
 IF p_action='accept' THEN
  IF r.status IN ('accepted','resolved') THEN RETURN; END IF;
  IF r.status <> 'pending' THEN RAISE EXCEPTION 'Only pending reports can be accepted'; END IF;
  IF r.report_type='breakage' THEN
   bid := 'qr-' || r.id::text;
   INSERT INTO breakages(id,request_id,student_name,student_number,item_name,quantity,unit,incident_type,description,reported_by,date_reported,date_occurred,laboratory_report_id,date_accepted)
   VALUES(bid,r.request_id,r.reporter_name,r.student_number,r.details->>'item_name',(r.details->>'quantity')::numeric,r.details->>'unit','breakage',r.description,staff,r.submitted_at,r.occurred_at,r.id,now());
  END IF;
  UPDATE laboratory_reports SET status='accepted',reviewer=auth.uid(),reviewed_at=now(),review_notes=p_notes,linked_breakage_id=bid WHERE id=p_id;
 ELSIF p_action='reject' THEN
  IF r.status='rejected' THEN RETURN; END IF;
  IF r.status <> 'pending' OR length(trim(coalesce(p_notes,'')))=0 THEN RAISE EXCEPTION 'Pending report and rejection reason required'; END IF;
  UPDATE laboratory_reports SET status='rejected',reviewer=auth.uid(),reviewed_at=now(),review_notes=p_notes WHERE id=p_id;
 ELSIF p_action='resolve' THEN
  IF r.status='resolved' THEN RETURN; END IF;
  IF r.status <> 'accepted' THEN RAISE EXCEPTION 'Accept the report before resolving'; END IF;
  IF p_resolved_at IS NULL OR p_resolved_at < r.occurred_at OR p_resolved_at > now() THEN RAISE EXCEPTION 'Invalid resolution date'; END IF;
  UPDATE laboratory_reports SET status='resolved',resolved_at=p_resolved_at WHERE id=p_id;
  IF r.linked_breakage_id IS NOT NULL THEN UPDATE breakages SET date_resolved=p_resolved_at WHERE id=r.linked_breakage_id; END IF;
 ELSE RAISE EXCEPTION 'Invalid review action'; END IF;
 INSERT INTO audit_log(action,details,user_name) VALUES('Lab Report ' || p_action,r.reference_number || ' ' || coalesce(p_notes,''),staff);
END $$;

CREATE OR REPLACE FUNCTION public.add_laboratory_report_photos(p_id uuid,p_photos jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE r laboratory_reports; photo jsonb; combined jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_staff() THEN RAISE EXCEPTION 'Staff login required'; END IF;
 SELECT * INTO r FROM laboratory_reports WHERE id=p_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Report not found'; END IF;
 combined := r.photos;
 FOR photo IN SELECT * FROM jsonb_array_elements(p_photos) LOOP
  IF photo->>'path' NOT LIKE p_id::text || '/%' OR NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='laboratory-report-photos' AND name=photo->>'path') THEN RAISE EXCEPTION 'Invalid photo'; END IF;
  IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(combined) x WHERE x->>'path'=photo->>'path') THEN combined := combined || jsonb_build_array(photo); END IF;
 END LOOP;
 IF jsonb_array_length(combined)>3 THEN RAISE EXCEPTION 'Maximum 3 photos'; END IF;
 UPDATE laboratory_reports SET photos=combined WHERE id=p_id;
 INSERT INTO audit_log(action,details,user_name) VALUES('Lab Report Photos Added',r.reference_number,coalesce(auth.jwt()->>'email','Lab Staff'));
END $$;

COMMIT;

-- Quick check after running (should list staff accounts):
-- SELECT email, role FROM public.app_users ORDER BY role, email;
