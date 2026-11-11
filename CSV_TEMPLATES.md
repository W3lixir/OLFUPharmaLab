# CSV Templates for Data Entry

Gamitin ang templates na ito para mag-submit ng data. I-save as `.csv` file, tapos i-upload ko sa system.

---

## 1. LAB ROOMS

**Filename:** `lab-rooms.csv`

```csv
room_code,floor,building,description,capacity,has_equipment
AMS 204,2,Science Building,Advanced Microbiology Lab,30,Yes
AMS 205,2,Science Building,Organic Chemistry Lab,25,Yes
AMS 206,2,Science Building,Analytical Chemistry Lab,20,Yes
PHAR 101,1,Pharmacy Building,Pharmaceutical Sciences Lab,35,Yes
PHAR 102,1,Pharmacy Building,Pharmacy Practice Lab,25,No
```

**Column Guide:**
- `room_code`: Unique code (e.g., AMS 204)
- `floor`: Floor number (1, 2, 3, etc.)
- `building`: Building name
- `description`: What's taught/used here
- `capacity`: Max students/people
- `has_equipment`: Yes/No (if may special equipment)

---

## 2. CHEMICALS/INVENTORY

**Filename:** `chemicals.csv`

```csv
chemical_name,cas_number,quantity,unit,hazard_level,location,expiry_date,supplier,notes
Sulfuric Acid 98%,7664-93-9,500,mL,Corrosive,AMS 204 Cabinet A,2026-12-31,Sigma-Aldrich,Store in cool place
Sodium Chloride,7647-14-5,1000,g,Non-hazardous,AMS 205 Shelf B,2027-06-30,Fisher Scientific,Reorder when <200g
Ethanol 95%,64-17-5,2000,mL,Flammable,AMS 206 Flammable Cabinet,2026-09-15,Merck,Keep away from heat
Acetone,67-64-1,500,mL,Flammable,AMS 206 Flammable Cabinet,2025-08-20,Fisher Scientific,LOW STOCK - order soon
```

**Column Guide:**
- `chemical_name`: Full chemical name
- `cas_number`: CAS registry number (optional, pero helpful)
- `quantity`: Current quantity
- `unit`: mL, g, kg, L, etc.
- `hazard_level`: Non-hazardous / Toxic / Corrosive / Flammable / Oxidizer
- `location`: Room code + shelf/cabinet
- `expiry_date`: YYYY-MM-DD format
- `supplier`: Where you buy it from
- `notes`: Safety notes, reorder reminders, etc.

---

## 3. EQUIPMENT

**Filename:** `equipment.csv`

```csv
equipment_name,model,quantity,location,status,last_maintenance,next_maintenance
Microscope (Compound),Olympus CX21,5,AMS 204,Functional,2026-02-15,2026-08-15
Spectrophotometer,UV-1900,2,AMS 205,Functional,2026-01-30,2026-07-30
Centrifuge (High-speed),Hermle Z366K,1,AMS 206,Functional,2025-12-01,2026-06-01
pH Meter Digital,Hanna HI98128,10,Various Labs,Functional,2026-03-10,2026-09-10
Weighing Scale (Analytical),Mettler Toledo ML204T,3,AMS 204,In Repair,NULL,TBD
```

**Column Guide:**
- `equipment_name`: What it's called
- `model`: Model/brand info
- `quantity`: How many units
- `location`: Which room(s)
- `status`: Functional / In Repair / Broken / Offline
- `last_maintenance`: YYYY-MM-DD (or NULL if never maintained)
- `next_maintenance`: When it's due (or NULL if no schedule)

---

## 4. INSTRUCTORS/PROFESSORS

**Filename:** `instructors.csv`

```csv
instructor_name,employee_id,email,phone,specialization,labs_assigned
Dr. Maria Santos,EMP-001,maria.santos@olfu.edu.ph,+63-917-1234567,Pharmaceutical Chemistry,AMS 204|AMS 205
Prof. Juan dela Cruz,EMP-002,juan.delacruz@olfu.edu.ph,+63-917-7654321,Microbiology,AMS 204
Dr. Rose Garcia,EMP-003,rose.garcia@olfu.edu.ph,+63-917-5555555,Pharmacology,PHAR 101
Prof. Carlos Reyes,EMP-004,carlos.reyes@olfu.edu.ph,+63-917-6666666,Biochemistry,AMS 206
```

**Column Guide:**
- `instructor_name`: Full name
- `employee_id`: University ID (if available)
- `email`: Institutional email
- `phone`: Contact number
- `specialization`: Subject/expertise
- `labs_assigned`: Room codes separated by `|` pipe (e.g., AMS 204|AMS 205)

---

## 5. LAB TECHNICIANS

**Filename:** `lab-technicians.csv`

```csv
name,employee_id,email,phone,primary_lab,backup_lab,shift
Maria Reyes,EMP-101,maria.reyes@olfu.edu.ph,+63-917-8888888,AMS 204,AMS 205,Day (8AM-5PM)
Juan Santos,EMP-102,juan.santos@olfu.edu.ph,+63-917-9999999,AMS 205,AMS 206,Day (8AM-5PM)
Rosa Lopez,EMP-103,rosa.lopez@olfu.edu.ph,+63-917-4444444,AMS 206,AMS 204,Evening (1PM-10PM)
```

**Column Guide:**
- `name`: Full name
- `employee_id`: Unique ID
- `email`: Work email
- `phone`: Contact
- `primary_lab`: Main lab assignment
- `backup_lab`: Secondary lab (walang backup = leave blank)
- `shift`: Work hours

---

## 📋 HOW TO USE THESE TEMPLATES

1. **Copy-paste each template** into Excel or Google Sheets
2. **Fill in with real data** from your department
3. **Export as CSV** (File → Download → CSV format)
4. **Send to me** (or paste content here)
5. **I'll build a bulk import tool** to load all data into Supabase at once

---

## ⚠️ IMPORTANT NOTES

- **No special characters** in CSV fields unless quoted (use quotes if may commas)
- **Dates must be YYYY-MM-DD** format (e.g., 2026-12-31)
- **NULL or leave blank** for optional fields
- **Separate multiple values** with pipe `|` (e.g., labs_assigned: AMS 204|AMS 205)
- **Keep it consistent** — don't mix "ACTIVE" and "Functional"

---

## 🚀 NEXT STEPS

1. Fill out the templates above
2. Save each as `.csv` file
3. Send to me (or share here)
4. I'll create a bulk import page in admin-settings.html
5. You upload → data auto-loads to Supabase

**Questions?** Ask lang!
