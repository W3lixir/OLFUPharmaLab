BEGIN;
CREATE TABLE public.laboratory_reports (
 id uuid PRIMARY KEY,
 reference_number text UNIQUE NOT NULL DEFAULT ('LAB-' || upper(substr(replace(gen_random_uuid()::text, '-', ''),1,16))),
 submission_hash text NOT NULL,
 report_type text NOT NULL CHECK (report_type IN ('breakage','incident','concern','session')),
 reporter_type text NOT NULL CHECK (reporter_type IN ('student','faculty')),
 reporter_name text NOT NULL,
 student_number text,
 room text NOT NULL,
 occurred_at timestamptz NOT NULL CHECK (occurred_at <= now()),
 submitted_at timestamptz NOT NULL DEFAULT now(),
 description text NOT NULL,
 request_id text,
 details jsonb NOT NULL,
 photos jsonb NOT NULL DEFAULT '[]' CHECK (jsonb_array_length(photos) <= 3),
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','resolved')),
 reviewer uuid REFERENCES auth.users(id),
 reviewed_at timestamptz,
 review_notes text,
 resolved_at timestamptz,
 linked_breakage_id text UNIQUE,
 CHECK (reporter_type <> 'student' OR length(trim(student_number)) > 0),
 CHECK (resolved_at IS NULL OR resolved_at >= occurred_at)
);
CREATE INDEX ON public.laboratory_reports (submitted_at DESC);
ALTER TABLE public.laboratory_reports ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.laboratory_reports FROM anon;
GRANT SELECT ON public.laboratory_reports TO authenticated;
CREATE POLICY laboratory_staff_read ON public.laboratory_reports FOR SELECT TO authenticated USING (true);
ALTER TABLE public.breakages ADD COLUMN laboratory_report_id uuid UNIQUE REFERENCES public.laboratory_reports(id);
ALTER TABLE public.breakages ADD COLUMN date_accepted timestamptz;
ALTER TABLE public.breakages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.breakages FROM anon;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.breakages TO authenticated;
CREATE POLICY lab_staff_breakages ON public.breakages FOR ALL TO authenticated USING(true) WITH CHECK(true);

CREATE FUNCTION public.submit_laboratory_report(p_id uuid, p_hash text, p_payload jsonb, p_photos jsonb)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE receipt text; existing_hash text;
BEGIN
 IF auth.role() <> 'service_role' THEN RAISE EXCEPTION 'Submission endpoint only'; END IF;
 INSERT INTO laboratory_reports(id,submission_hash,report_type,reporter_type,reporter_name,student_number,room,occurred_at,description,request_id,details,photos)
 VALUES(p_id,p_hash,p_payload->>'report_type',p_payload->>'reporter_type',p_payload->>'reporter_name',p_payload->>'student_number',p_payload->>'room',(p_payload->>'occurred_at')::timestamptz,p_payload->>'description',nullif(p_payload->>'request_id',''),p_payload->'details',p_photos)
 ON CONFLICT (id) DO NOTHING;
 SELECT reference_number,submission_hash INTO receipt,existing_hash FROM laboratory_reports WHERE id=p_id;
 IF existing_hash <> p_hash THEN RAISE EXCEPTION 'Retry must contain the same report'; END IF;
 RETURN receipt;
END $$;
REVOKE ALL ON FUNCTION public.submit_laboratory_report(uuid,text,jsonb,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_laboratory_report(uuid,text,jsonb,jsonb) TO service_role;

CREATE FUNCTION public.review_laboratory_report(p_id uuid, p_action text, p_notes text DEFAULT '', p_resolved_at timestamptz DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE r laboratory_reports; bid text; staff text;
BEGIN
 IF auth.uid() IS NULL OR auth.role() <> 'authenticated' THEN RAISE EXCEPTION 'Staff login required'; END IF;
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
REVOKE ALL ON FUNCTION public.review_laboratory_report(uuid,text,text,timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_laboratory_report(uuid,text,text,timestamptz) TO authenticated;

CREATE FUNCTION public.sync_report_breakage_dates() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF OLD.laboratory_report_id IS NOT NULL THEN
  IF auth.uid() IS NULL AND auth.role() <> 'service_role' THEN RAISE EXCEPTION 'Staff login required'; END IF;
  IF NEW.laboratory_report_id IS DISTINCT FROM OLD.laboratory_report_id OR NEW.date_reported IS DISTINCT FROM OLD.date_reported OR NEW.date_accepted IS DISTINCT FROM OLD.date_accepted THEN RAISE EXCEPTION 'Report identity and original timestamps cannot be changed'; END IF;
  IF NEW.date_occurred IS NULL OR NEW.date_resolved > now() THEN RAISE EXCEPTION 'Invalid incident dates'; END IF;
  UPDATE laboratory_reports SET occurred_at=NEW.date_occurred,resolved_at=NEW.date_resolved,status=CASE WHEN NEW.date_resolved IS NULL THEN 'accepted' ELSE 'resolved' END WHERE id=OLD.laboratory_report_id;
  IF NEW.date_resolved IS DISTINCT FROM OLD.date_resolved THEN
   INSERT INTO audit_log(action,details,user_name) VALUES('Lab Report Resolution Updated',OLD.laboratory_report_id::text,coalesce(auth.jwt()->>'email','Lab Staff'));
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER sync_report_breakage_dates BEFORE UPDATE ON public.breakages FOR EACH ROW EXECUTE FUNCTION public.sync_report_breakage_dates();
CREATE FUNCTION public.protect_report_breakage() RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
BEGIN IF OLD.laboratory_report_id IS NOT NULL THEN RAISE EXCEPTION 'Linked QR reports must be retained'; END IF; RETURN OLD; END $$;
CREATE TRIGGER protect_report_breakage BEFORE DELETE ON public.breakages FOR EACH ROW EXECUTE FUNCTION public.protect_report_breakage();

INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types) VALUES('laboratory-report-photos','laboratory-report-photos',false,8388608,ARRAY['image/jpeg','image/png','image/webp']) ON CONFLICT(id) DO UPDATE SET public=false;
CREATE POLICY lab_report_photo_read ON storage.objects FOR SELECT TO authenticated USING (bucket_id='laboratory-report-photos');
CREATE POLICY lab_report_photo_upload ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='laboratory-report-photos' AND EXISTS(SELECT 1 FROM laboratory_reports WHERE id::text=(storage.foldername(name))[1]));
CREATE FUNCTION public.add_laboratory_report_photos(p_id uuid,p_photos jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE r laboratory_reports; photo jsonb; combined jsonb;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Staff login required'; END IF;
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
REVOKE ALL ON FUNCTION public.add_laboratory_report_photos(uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.add_laboratory_report_photos(uuid,jsonb) TO authenticated;
COMMIT;
