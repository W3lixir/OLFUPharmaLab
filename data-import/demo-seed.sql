-- ============================================================
-- Demo rows for a TEST database only. Never run this on the live database:
-- it adds sample chemicals, equipment and subjects.
-- Run after supabase-schema.sql and data-import/add-category-column.sql.
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
