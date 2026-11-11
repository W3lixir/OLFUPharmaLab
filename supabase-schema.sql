-- ============================================================
-- PharmaLab IMS - Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- Requests (student material requests)
CREATE TABLE IF NOT EXISTS requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id      TEXT UNIQUE NOT NULL,
  student_name    TEXT,
  student_number  TEXT,
  contact_number  TEXT,
  course          TEXT,
  year_level      TEXT,
  section         TEXT,
  subject         TEXT,
  activity        TEXT,
  instructor      TEXT,
  date_needed     DATE,
  time_needed     TIME,
  time_end        TIME,
  room_assignment TEXT,
  room_assignment_name TEXT,
  request_type    TEXT,
  remarks         TEXT,
  items           JSONB    DEFAULT '[]',
  status          TEXT     DEFAULT 'pending',
  date_submitted  TIMESTAMPTZ DEFAULT NOW(),
  laboratory      TEXT,
  rejection_reason TEXT
);

-- Incident / breakage reports
CREATE TABLE IF NOT EXISTS breakages (
  id                TEXT PRIMARY KEY,
  request_id        TEXT,
  student_name      TEXT NOT NULL,
  student_number    TEXT,
  group_name        TEXT,
  item_name         TEXT NOT NULL,
  quantity          NUMERIC,
  unit              TEXT,
  incident_type     TEXT NOT NULL DEFAULT 'breakage',
  description       TEXT,
  logbook_image_url TEXT,
  damage_image_url  TEXT,
  reported_by       TEXT,
  date_reported     TIMESTAMPTZ DEFAULT NOW(),
  date_occurred     TIMESTAMPTZ,
  date_resolved     TIMESTAMPTZ,
  CONSTRAINT breakages_dates_valid CHECK (
    (date_occurred IS NULL OR date_occurred <= date_reported) AND
    (date_resolved IS NULL OR (date_occurred IS NOT NULL AND date_resolved >= date_occurred))
  )
);
CREATE INDEX IF NOT EXISTS idx_breakages_date ON breakages (date_reported DESC);

-- Chemicals
CREATE TABLE IF NOT EXISTS chemicals (
  id            TEXT PRIMARY KEY,
  name          TEXT,
  storage       TEXT,
  quantity      NUMERIC,
  unit          TEXT,
  min_quantity  NUMERIC DEFAULT 0,
  supplier      TEXT,
  delivery_date DATE,
  expiry        DATE,
  msds          TEXT
);

-- Equipment
CREATE TABLE IF NOT EXISTS equipment (
  id                   TEXT PRIMARY KEY,
  name                 TEXT,
  storage_location     TEXT,
  quantity             INTEGER DEFAULT 1,
  brand                TEXT,
  supplier             TEXT,
  delivery_date        DATE,
  calibrate_date       DATE,
  parts_checklist      JSONB DEFAULT '[]',
  remarks_certificates TEXT,
  times_used           INTEGER DEFAULT 0
);

-- Supplies (consumables)
CREATE TABLE IF NOT EXISTS supplies (
  id       TEXT PRIMARY KEY,
  name     TEXT,
  unit     TEXT,
  quantity NUMERIC DEFAULT 0
);

-- Audit log
CREATE TABLE IF NOT EXISTS audit_log (
  id         BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  action     TEXT,
  details    TEXT,
  user_name  TEXT
);

-- Room schedule
CREATE TABLE IF NOT EXISTS room_schedule (
  id         TEXT PRIMARY KEY,
  room_type  TEXT,
  room_id    TEXT,
  date       DATE,
  start_time TIME,
  end_time   TIME,
  request_id TEXT
);

-- Sections
CREATE TABLE IF NOT EXISTS sections (
  id   TEXT PRIMARY KEY,
  name TEXT
);

-- Courses
CREATE TABLE IF NOT EXISTS courses (
  id   TEXT PRIMARY KEY,
  name TEXT
);

-- Subjects
CREATE TABLE IF NOT EXISTS subjects (
  id        TEXT PRIMARY KEY,
  name      TEXT,
  course_id TEXT
);

-- Experiments
CREATE TABLE IF NOT EXISTS experiments (
  id         TEXT PRIMARY KEY,
  name       TEXT,
  subject_id TEXT
);

-- Instructors
CREATE TABLE IF NOT EXISTS instructors (
  id          TEXT PRIMARY KEY,
  name        TEXT,
  subject_ids JSONB DEFAULT '[]'
);

-- ============================================================
-- Row Level Security (RLS) — allow anon key to read/write all
-- Safe for school project; tighten per-table for production
-- ============================================================
ALTER TABLE requests      ENABLE ROW LEVEL SECURITY;
ALTER TABLE breakages     ENABLE ROW LEVEL SECURITY;
ALTER TABLE chemicals     ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment     ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplies      ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log     ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections      ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses       ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects      ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE instructors   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_all" ON requests      FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON breakages     FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON chemicals     FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON equipment     FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON supplies      FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON audit_log     FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON room_schedule FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON sections      FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON courses       FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON subjects      FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON experiments   FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON instructors   FOR ALL TO anon USING (true) WITH CHECK (true);

-- ============================================================
-- Seed default data (same as data.js defaults)
-- ============================================================

INSERT INTO sections (id, name) VALUES
  ('sec-a', 'A'), ('sec-b', 'B'), ('sec-c', 'C')
ON CONFLICT (id) DO NOTHING;

INSERT INTO courses (id, name) VALUES
  ('course-bspharm', 'BS Pharmacy'),
  ('course-mspharm', 'MS Pharmacy'),
  ('course-phdpharm', 'PhD Pharmacy')
ON CONFLICT (id) DO NOTHING;

INSERT INTO subjects (id, name, course_id) VALUES
  ('subj-1', 'Pharmaceutical Chemistry 1', 'course-bspharm'),
  ('subj-2', 'Pharmacology 1',             'course-bspharm'),
  ('subj-3', 'Pharmaceutics',              'course-bspharm')
ON CONFLICT (id) DO NOTHING;

INSERT INTO experiments (id, name, subject_id) VALUES
  ('exp-1', 'Acid-Base Titration',    'subj-1'),
  ('exp-2', 'Qualitative Analysis',   'subj-1'),
  ('exp-3', 'Dosage Form Preparation','subj-3')
ON CONFLICT (id) DO NOTHING;

INSERT INTO instructors (id, name, subject_ids) VALUES
  ('inst-1', 'Prof. Maria Santos',    '["subj-1","subj-3"]'),
  ('inst-2', 'Prof. Juan Dela Cruz',  '["subj-2"]'),
  ('inst-3', 'Dr. Ana Reyes',         '["subj-1"]')
ON CONFLICT (id) DO NOTHING;

INSERT INTO chemicals (id, name, storage, quantity, unit, min_quantity, supplier, delivery_date, expiry, msds) VALUES
  ('ch1','Hydrochloric Acid',      'Hazmat Cabinet A1',   2.5,  'L',  0.5,  'Sigma-Aldrich',      '2025-01-15','2026-12-15',''),
  ('ch2','Sodium Hydroxide',       'AMS 204 - Cab 3',     500,  'g',  100,  'Merck Philippines',  '2024-08-20','2027-08-20',''),
  ('ch3','Ethanol (95%)',          'Flammable Cabinet B2',10,   'L',  5,    'Chemline Scientific','2025-03-10','2026-05-30',''),
  ('ch4','Sulfuric Acid (98%)',    'Hazmat Cabinet A2',   1.8,  'L',  0.5,  'Sigma-Aldrich',      '2024-06-05','2026-02-10',''),
  ('ch5','Phenolphthalein',        'AMS 204 - Cab 5',     50,   'g',  100,  'LabChem Inc.',       '2025-02-01','2026-11-18',''),
  ('ch6','Methylene Blue',         'AMS 205 - Cab 1',     100,  'g',  50,   'Merck Philippines',  '2025-01-22','2027-09-22',''),
  ('ch7','Acetic Acid (Glacial)',  'Hazmat Cabinet B1',   3.2,  'L',  1,    'Chemline Scientific','2024-01-28','2026-01-28',''),
  ('ch8','Potassium Permanganate', 'AMS 204 - Cab 2',     250,  'g',  100,  'Sigma-Aldrich',      '2025-06-15','2027-12-31','')
ON CONFLICT (id) DO NOTHING;

INSERT INTO equipment (id, name, storage_location, quantity, brand, supplier, delivery_date, calibrate_date, parts_checklist, remarks_certificates, times_used) VALUES
  ('eq1','Analytical Balance',     'AMS 204',          1,'Sartorius Entris',        'Sartorius Philippines',    '2024-03-15','2025-08-01','[{"name":"Weighing pan"},{"name":"Display unit"},{"name":"Leveling feet"}]',          'Annual calibration certificate on file.',142),
  ('eq2','Compound Microscope',    'AMS 204 - Cab 2',  1,'Olympus CX23',            'Olympus Philippines',      '2023-06-20','2025-01-10','[{"name":"Eyepiece (10x)"},{"name":"Objective lenses"},{"name":"Stage and clips"},{"name":"Light source"}]','Optical alignment verified.',89),
  ('eq3','pH Meter (Digital)',     'AMS 205',          2,'Hanna Instruments',       'Hanna Instruments PH',     '2024-01-08','2025-01-15','[{"name":"Electrode"},{"name":"Display unit"},{"name":"Calibration buffers"}]',       'Calibration due Feb 2026.',256),
  ('eq4','Magnetic Stirrer Hotplate','AMS 301',        1,'IKA C-MAG HS7',           'IKA Philippines',          '2023-11-12','2024-11-01','[{"name":"Hotplate surface"},{"name":"Stirrer magnet"},{"name":"Control panel"}]',    'Under maintenance - thermocouple replaced.',312),
  ('eq5','Centrifuge',             'AMS 301',          1,'Thermo Scientific',       'Thermo Fisher Scientific PH','2024-05-20','2025-06-01','[{"name":"Rotor"},{"name":"Lid lock"},{"name":"Timer display"}]',                   'Service contract active.',78),
  ('eq6','Micropipette Set',       'AMS 204 - Cab 1',  1,'Eppendorf Research Plus', 'Eppendorf PH',             '2024-02-28','2025-12-01','[{"name":"0.5-10 µL pipette"},{"name":"10-100 µL pipette"},{"name":"100-1000 µL pipette"},{"name":"Tips box"}]','Calibrated Dec 2025.',445)
ON CONFLICT (id) DO NOTHING;
