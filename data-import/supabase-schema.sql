-- ============================================================
-- PharmaLab IMS - Complete Supabase Schema
-- College of Pharmacy - OUR LADY OF FATIMA UNIVERSITY
-- Updated: 2026-04-16
-- ============================================================
-- Run this in: Supabase Dashboard > SQL Editor
-- This script is safe to re-run (uses IF NOT EXISTS / IF EXISTS)
-- ============================================================


-- ── 1. AUDIT LOG ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS audit_log (
    id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    action        text NOT NULL,
    details       text,
    user_name     text DEFAULT 'Unknown',
    created_at    timestamptz DEFAULT now()
);


-- ── 2. CHEMICALS (Inventory) ──────────────────────────────────
-- Stores: Liquid Reagents, Solid Reagents, Glassware,
--         Equipment items, Antibiotic Discs

CREATE TABLE IF NOT EXISTS chemicals (
    id            text PRIMARY KEY,
    name          text NOT NULL,
    category      text DEFAULT '',
    storage       text DEFAULT '',
    quantity      numeric DEFAULT 0,
    unit          text DEFAULT '',
    min_quantity  numeric DEFAULT 0,
    supplier      text DEFAULT '',
    delivery_date date,
    expiry        date,
    msds          text DEFAULT ''
);

-- Add category column if table already exists without it
ALTER TABLE chemicals ADD COLUMN IF NOT EXISTS category text DEFAULT '';

-- Index for faster filtering
CREATE INDEX IF NOT EXISTS idx_chemicals_category ON chemicals (category);
CREATE INDEX IF NOT EXISTS idx_chemicals_name ON chemicals (name);
CREATE INDEX IF NOT EXISTS idx_chemicals_expiry ON chemicals (expiry);


-- ── 3. EQUIPMENT ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS equipment (
    id                     text PRIMARY KEY,
    name                   text NOT NULL,
    "storageLocation"      text DEFAULT '',
    quantity               numeric DEFAULT 0,
    brand                  text DEFAULT '',
    supplier               text DEFAULT '',
    "deliveryDate"         text DEFAULT '',
    "calibrateDate"        text DEFAULT '',
    "remarksCertificates"  text DEFAULT '',
    "timesUsed"            numeric DEFAULT 0,
    "partsChecklist"       jsonb DEFAULT '[]'::jsonb
);

-- Alternate snake_case column for calibration queries
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS calibrate_date date;


-- ── 4. SUPPLIES ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS supplies (
    id            text PRIMARY KEY,
    name          text NOT NULL,
    unit          text DEFAULT 'pcs',
    quantity      numeric DEFAULT 0
);


-- ── 5. REQUESTS (Student Material Requests) ───────────────────

CREATE TABLE IF NOT EXISTS requests (
    request_id           text PRIMARY KEY,
    student_name         text,
    student_number       text,
    contact_number       text,
    course               text,
    year_level           text,
    section              text,
    subject              text,
    activity             text,
    instructor           text,
    date_needed          date,
    time_needed          time,
    time_end             time,
    room_assignment      text,
    room_assignment_name text,
    request_type         text,
    remarks              text,
    items                jsonb DEFAULT '[]'::jsonb,
    status               text DEFAULT 'pending',
    date_submitted       timestamptz DEFAULT now(),
    laboratory           text,
    rejection_reason     text
);

CREATE INDEX IF NOT EXISTS idx_requests_status ON requests (status);
CREATE INDEX IF NOT EXISTS idx_requests_date ON requests (date_submitted DESC);


-- ── 6. SECTIONS ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sections (
    id    text PRIMARY KEY,
    name  text NOT NULL
);


-- ── 7. COURSES ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS courses (
    id    text PRIMARY KEY,
    name  text NOT NULL
);


-- ── 8. SUBJECTS ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS subjects (
    id         text PRIMARY KEY,
    name       text NOT NULL,
    course_id  text REFERENCES courses(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_subjects_course ON subjects (course_id);


-- ── 9. EXPERIMENTS ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS experiments (
    id          text PRIMARY KEY,
    name        text NOT NULL,
    subject_id  text REFERENCES subjects(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_experiments_subject ON experiments (subject_id);


-- ── 10. INSTRUCTORS ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS instructors (
    id           text PRIMARY KEY,
    name         text NOT NULL,
    subject_ids  jsonb DEFAULT '[]'::jsonb
);


-- ── 11. ROOM SCHEDULE ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS room_schedule (
    id          text PRIMARY KEY,
    room_type   text NOT NULL,
    room_id     text NOT NULL,
    date        date NOT NULL,
    start_time  time DEFAULT '08:00',
    end_time    time DEFAULT '10:00',
    request_id  text
);

CREATE INDEX IF NOT EXISTS idx_room_schedule_lookup
    ON room_schedule (room_type, room_id, date);


-- ── 12. ROW LEVEL SECURITY (RLS) ─────────────────────────────
-- Enable RLS but allow anon access (public-facing lab app)

ALTER TABLE audit_log     ENABLE ROW LEVEL SECURITY;
ALTER TABLE chemicals     ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment     ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplies      ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests      ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections      ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses       ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects      ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE instructors   ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_schedule ENABLE ROW LEVEL SECURITY;

-- Allow full access for anon role (adjust as needed for production)
-- Drop existing policies first, then recreate
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN SELECT unnest(ARRAY[
        'audit_log','chemicals','equipment','supplies','requests',
        'sections','courses','subjects','experiments','instructors','room_schedule'
    ])
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Allow anon full access on %I" ON %I', t, t);
        EXECUTE format(
            'CREATE POLICY "Allow anon full access on %I" ON %I FOR ALL TO anon USING (true) WITH CHECK (true)',
            t, t
        );
    END LOOP;
END
$$;


-- ── 13. REALTIME ──────────────────────────────────────────────
-- Enable realtime for tables that need live updates (skip if already added)

DO $$
DECLARE
    t text;
BEGIN
    FOR t IN SELECT unnest(ARRAY['chemicals','equipment','requests','room_schedule'])
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables
            WHERE pubname = 'supabase_realtime' AND tablename = t
        ) THEN
            EXECUTE format('ALTER publication supabase_realtime ADD TABLE %I', t);
        END IF;
    END LOOP;
END
$$;


-- ============================================================
-- DONE! All 11 tables created with indexes and RLS policies.
--
-- Next: Go to Inventory page > Import > select inventory-import.json
-- ============================================================
