-- Incident reports: run once in Supabase SQL Editor.
-- The table is also included in supabase-schema.sql for new installations.
CREATE TABLE IF NOT EXISTS breakages (
  id TEXT PRIMARY KEY,
  request_id TEXT,
  student_name TEXT NOT NULL,
  student_number TEXT,
  group_name TEXT,
  item_name TEXT NOT NULL,
  quantity NUMERIC,
  unit TEXT,
  incident_type TEXT NOT NULL DEFAULT 'breakage',
  description TEXT,
  logbook_image_url TEXT,
  damage_image_url TEXT,
  reported_by TEXT,
  date_reported TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE breakages ADD COLUMN IF NOT EXISTS logbook_image_url TEXT;
ALTER TABLE breakages ADD COLUMN IF NOT EXISTS damage_image_url TEXT;
ALTER TABLE breakages ADD COLUMN IF NOT EXISTS incident_type TEXT DEFAULT 'breakage';
ALTER TABLE breakages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all" ON breakages;
CREATE POLICY "anon_all" ON breakages FOR ALL TO anon USING (true) WITH CHECK (true);

-- Evidence image bucket and policies.
INSERT INTO storage.buckets (id, name, public)
VALUES ('incident-evidence', 'incident-evidence', true)
ON CONFLICT (id) DO UPDATE SET public = true;
DROP POLICY IF EXISTS "incident_evidence_anon_all" ON storage.objects;
CREATE POLICY "incident_evidence_anon_all" ON storage.objects
  FOR ALL TO anon USING (bucket_id = 'incident-evidence')
  WITH CHECK (bucket_id = 'incident-evidence');
