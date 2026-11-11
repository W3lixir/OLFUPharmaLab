-- ============================================================
-- Experiment kits (materials per subject/experiment from the professors' Excel)
-- Run AFTER migrations/20261111-requester-login.sql, in the SQL Editor.
-- Safe to run twice.
-- ============================================================
BEGIN;

-- Subjects: course code (PCOG221, PCOL312 ...) + year/semester + hide instead of delete
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS code       text;
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS year_level text;
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS semester   text;
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS active     boolean NOT NULL DEFAULT true;
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS sort_order int;
CREATE UNIQUE INDEX IF NOT EXISTS subjects_code_unique ON public.subjects (upper(code)) WHERE code IS NOT NULL AND code <> '';

-- Experiments: number, default group count, objectives, hide instead of delete
ALTER TABLE public.experiments ADD COLUMN IF NOT EXISTS exp_no         text;
ALTER TABLE public.experiments ADD COLUMN IF NOT EXISTS default_groups int NOT NULL DEFAULT 8;
ALTER TABLE public.experiments ADD COLUMN IF NOT EXISTS objectives     text;
ALTER TABLE public.experiments ADD COLUMN IF NOT EXISTS active         boolean NOT NULL DEFAULT true;
ALTER TABLE public.experiments ADD COLUMN IF NOT EXISTS sort_order     int;

-- Materials per experiment
CREATE TABLE IF NOT EXISTS public.experiment_items (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id     text NOT NULL REFERENCES public.experiments(id) ON DELETE CASCADE,
  kind              text NOT NULL CHECK (kind IN ('equipment','chemical')),
  item_name         text NOT NULL CHECK (length(trim(item_name)) > 0),
  inventory_item_id text REFERENCES public.chemicals(id) ON DELETE SET NULL,
  category          text,
  qty               numeric CHECK (qty IS NULL OR qty >= 0),
  unit              text,
  basis             text NOT NULL DEFAULT 'per_group' CHECK (basis IN ('per_group','per_student','per_class')),
  note              text,
  sort_order        int NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_experiment_items_exp ON public.experiment_items (experiment_id, sort_order);

-- Requests remember the kit context
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS experiment_id text;
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS group_count   int CHECK (group_count IS NULL OR group_count BETWEEN 1 AND 50);
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS student_count int CHECK (student_count IS NULL OR student_count BETWEEN 1 AND 500);

-- RLS: staff manage; any signed-in requester may read (the form needs the kit)
ALTER TABLE public.experiment_items ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.experiment_items FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.experiment_items TO authenticated;
DROP POLICY IF EXISTS staff_all ON public.experiment_items;
DROP POLICY IF EXISTS requester_read ON public.experiment_items;
CREATE POLICY staff_all ON public.experiment_items FOR ALL TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE POLICY requester_read ON public.experiment_items FOR SELECT TO authenticated
  USING (public.current_app_role() IS NOT NULL);

-- Item picker for requesters now also returns the inventory id (for exact deduction on release)
-- and a coarse stock flag (ok / low / out) so the form can suggest substitutes. Never the amount.
DROP FUNCTION IF EXISTS public.request_item_options();
CREATE FUNCTION public.request_item_options()
RETURNS TABLE (id text, name text, unit text, category text, stock text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT c.id::text, c.name, c.unit, c.category,
         CASE WHEN c.quantity IS NULL THEN NULL
              WHEN c.quantity <= 0 THEN 'out'
              WHEN c.quantity <= coalesce(c.min_quantity, 0) THEN 'low'
              ELSE 'ok' END
  FROM public.chemicals c
  WHERE public.current_app_role() IS NOT NULL
  ORDER BY c.name
$$;
REVOKE ALL ON FUNCTION public.request_item_options() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_item_options() TO authenticated;

-- Staff import: replace a subject's experiments + items in one transaction.
-- p_subject: {id?, code, name, year_level, semester, course_id}
-- p_experiments: [{exp_no, title, objectives, default_groups, items:[{kind,item_name,inventory_item_id,category,qty,unit,basis,note}]}]
CREATE OR REPLACE FUNCTION public.import_experiment_kit(p_subject jsonb, p_experiments jsonb)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  sid text := nullif(p_subject->>'id', '');
  e jsonb; it jsonb; eid text; n int := 0; k int;
BEGIN
  IF NOT public.is_staff() THEN RAISE EXCEPTION 'Staff login required'; END IF;
  IF coalesce(trim(p_subject->>'code'), '') = '' THEN RAISE EXCEPTION 'Subject code required'; END IF;

  IF sid IS NULL THEN
    SELECT id INTO sid FROM subjects WHERE upper(code) = upper(p_subject->>'code') LIMIT 1;
  END IF;
  IF sid IS NULL THEN
    sid := 'subj-' || lower(regexp_replace(p_subject->>'code', '[^A-Za-z0-9]', '', 'g'));
    INSERT INTO subjects (id, name, course_id, code, year_level, semester, active)
    VALUES (sid, coalesce(nullif(p_subject->>'name', ''), p_subject->>'code'), nullif(p_subject->>'course_id', ''),
            upper(p_subject->>'code'), p_subject->>'year_level', p_subject->>'semester', true)
    ON CONFLICT (id) DO NOTHING;
  END IF;
  UPDATE subjects SET
    code = upper(p_subject->>'code'),
    name = coalesce(nullif(p_subject->>'name', ''), name),
    course_id = coalesce(nullif(p_subject->>'course_id', ''), course_id),
    year_level = coalesce(nullif(p_subject->>'year_level', ''), year_level),
    semester = coalesce(nullif(p_subject->>'semester', ''), semester),
    active = true
  WHERE id = sid;

  -- Old experiments of this subject are hidden (kept for request history), their kits removed.
  UPDATE experiments SET active = false WHERE subject_id = sid;

  FOR e IN SELECT * FROM jsonb_array_elements(p_experiments) LOOP
    n := n + 1;
    -- Reuse an experiment with the same title so instructor/requests history stays linked.
    SELECT id INTO eid FROM experiments
      WHERE subject_id = sid AND lower(trim(name)) = lower(trim(e->>'title')) LIMIT 1;
    IF eid IS NULL THEN
      eid := 'exp-' || replace(gen_random_uuid()::text, '-', '');
      INSERT INTO experiments (id, name, subject_id) VALUES (eid, trim(e->>'title'), sid);
    END IF;
    UPDATE experiments SET
      name = trim(e->>'title'),
      exp_no = nullif(e->>'exp_no', ''),
      objectives = nullif(e->>'objectives', ''),
      default_groups = greatest(1, least(50, coalesce((e->>'default_groups')::int, 8))),
      sort_order = n,
      active = true
    WHERE id = eid;
    DELETE FROM experiment_items WHERE experiment_id = eid;
    k := 0;
    FOR it IN SELECT * FROM jsonb_array_elements(coalesce(e->'items', '[]'::jsonb)) LOOP
      k := k + 1;
      INSERT INTO experiment_items (experiment_id, kind, item_name, inventory_item_id, category, qty, unit, basis, note, sort_order)
      VALUES (eid, it->>'kind', trim(it->>'item_name'),
              (SELECT c.id FROM chemicals c WHERE c.id = nullif(it->>'inventory_item_id', '')),
              nullif(it->>'category', ''), nullif(it->>'qty', '')::numeric, nullif(it->>'unit', ''),
              coalesce(nullif(it->>'basis', ''), 'per_group'), nullif(it->>'note', ''), k);
    END LOOP;
  END LOOP;

  INSERT INTO audit_log (action, details, user_name)
  VALUES ('Experiment Kit Import', upper(p_subject->>'code') || ': ' || n || ' experiments',
          coalesce(auth.jwt()->>'email', 'Lab Staff'));
  RETURN sid;
END $$;
REVOKE ALL ON FUNCTION public.import_experiment_kit(jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.import_experiment_kit(jsonb, jsonb) TO authenticated;

COMMIT;
