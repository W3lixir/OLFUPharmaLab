-- ============================================================
-- PharmaLab - base Supabase schema (tables only)
--
-- Setting up a NEW database, run these in the SQL Editor, in this order:
--   1. supabase-schema.sql                      (this file)
--   2. data-import/add-category-column.sql
--   3. data-import/incident-report-migration.sql
--   4. migrations/20261010-breakage-dates.sql
--   5. migrations/20261010-laboratory-reports.sql
--   6. migrations/20261111-requester-login.sql  (all access rules / RLS)
--   7. migrations/20261112-experiment-kits.sql
--   8. migrations/20261114-release-return-rpc.sql
--   (20261111-interim-old-form.sql and 20261113-golive-remove-interim.sql were only for the
--    switch-over on the live database and are not needed on a new one.)
--   Optional demo rows for a test database: data-import/demo-seed.sql
--
-- This file does NOT grant any access. Earlier versions created "anon_all" policies that let
-- anyone read and change every table; never re-create those. Access rules live in
-- migrations/20261111-requester-login.sql.
--
-- To compare with the live database, run migrations/check-live-database.sql (read-only).
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

-- Year levels (Settings → Year Levels)
CREATE TABLE IF NOT EXISTS year_levels (
  id   TEXT PRIMARY KEY,
  name TEXT
);

-- Groups, each belonging to a section (Settings → Groups)
CREATE TABLE IF NOT EXISTS groups (
  id         TEXT PRIMARY KEY,
  name       TEXT,
  section_id TEXT
);

-- Per-item semester history: consumption and acquisition per month (inventory item popup)
CREATE TABLE IF NOT EXISTS inventory_history (
  id          TEXT PRIMARY KEY,           -- '<chemical id>_<month>'
  chemical_id TEXT REFERENCES chemicals(id) ON DELETE CASCADE,
  month       TEXT,
  consumption NUMERIC DEFAULT 0,
  acquisition NUMERIC DEFAULT 0,
  notes       TEXT
);
CREATE INDEX IF NOT EXISTS idx_inventory_history_item ON inventory_history (chemical_id, month);

-- Inventory balance columns used by the inventory page
ALTER TABLE chemicals ADD COLUMN IF NOT EXISTS reference_number TEXT;
ALTER TABLE chemicals ADD COLUMN IF NOT EXISTS previous_balance NUMERIC;
ALTER TABLE chemicals ADD COLUMN IF NOT EXISTS requested_amount NUMERIC;
ALTER TABLE chemicals ADD COLUMN IF NOT EXISTS received_amount  NUMERIC;
ALTER TABLE chemicals ADD COLUMN IF NOT EXISTS location         TEXT;

-- Every table is locked until the access rules in migrations/20261111-requester-login.sql run.
ALTER TABLE requests          ENABLE ROW LEVEL SECURITY;
ALTER TABLE breakages         ENABLE ROW LEVEL SECURITY;
ALTER TABLE chemicals         ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment         ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplies          ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log         ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_schedule     ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections          ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses           ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects          ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE instructors       ENABLE ROW LEVEL SECURITY;
ALTER TABLE year_levels       ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups            ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_history ENABLE ROW LEVEL SECURITY;
