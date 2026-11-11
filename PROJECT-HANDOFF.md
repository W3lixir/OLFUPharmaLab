# PharmaLab: Project Handoff

**What it is:** A working laboratory management web app for the **College of Pharmacy, Our Lady of Fatima University (OLFU), Valenzuela campus**. Lab technicians use it to handle student and professor material requests, inventory, room schedules, and incident/breakage reports.

**Why this handoff exists:** The school wants a broader, complete system for the whole College of Pharmacy. This document describes what already exists and works in production, so the new system can reuse the data model, workflows, and lessons learned instead of starting from scratch.

> The old `README.md` and `PROJECT-STRUCTURE.md` in the repo are **outdated**. They describe an early HTML prototype and a planned React/Prisma stack that was never built. Trust this file and the code over those two.

---

## 1. Current state at a glance

| | |
|---|---|
| Live URL | https://olfupharmalab.vercel.app |
| Repo | `W3lixir/OLFUpharmalab` (deploys from `main` via Vercel Git integration) |
| Frontend | Static multi-page HTML + vanilla JS + CSS. No build step, no framework. |
| Backend | Supabase (Postgres, Auth, Storage, one Edge Function) |
| Supabase project ref | `ygznqaqyrhhpeuibdsqe` |
| Local dev | `npm install && npm run dev` (live-server on port 3000) |
| Tests | `node --test tests/*.test.cjs`, plus `tests/laboratory-reports.sql` run in the SQL Editor |
| Status | In daily use by lab staff. Active since mid-2026. |

Supabase is loaded from the CDN (`@supabase/supabase-js@2`). The client is created in `js/supabase-client.js` using the **public anon key**, which is fine to expose. The service role key must never appear in frontend code.

---

## 2. Users and roles (as actually implemented)

Roles live in `app_users.role` and are enforced by RLS (migration `migrations/20261111-requester-login.sql`, details in `REQUESTER-LOGIN.md`):

- **Lab staff (`staff`).** Emails listed in `staff_emails`. Lab techs share the `@fatima.edu.ph` domain with professors, so staff must be an explicit list. They sign in on `login.html` with Google or email/password. `js/auth-guard.js` requires the `staff` role.
- **Students (`student`).** Google sign-in with an email ending in `val@student.fatima.edu.ph` (Valenzuela campus only). They can submit requests and see **only their own** requests (`student-dashboard.html` = My Requests).
- **Professors (`professor`).** Google sign-in with `@fatima.edu.ph` (not on the staff list). Same rights as students.
- **Anyone else / not signed in.** No table access. Lab reports remain public through the Edge Function.

A complete college system will need more roles (Dean/Admin, Program Head, Faculty approval). The `app_users` + `is_staff()` / `current_app_role()` pattern is the base to extend.

---

## 3. Core workflows

### 3.1 Material request → release → return (the main feature)
1. A student or professor scans the **material request QR**, which opens `material-request.html` (logic in `js/student-request.js`). They must **sign in with their OLFU Google account** first (`js/requester-auth.js`); their saved details are prefilled. The multi-step form covers requester info (course, year level, section, group), subject → experiment → instructor (cascading dropdowns), date/time needed, room, items from inventory with quantities, and remarks.
2. The request is saved to `requests` with `status = 'pending'` and a reference ID such as `REQ-2026-1110-0748`. Items are stored as a **JSONB array** on the request row.
3. Lab tech reviews it in `admin-requests.html`. Pending requests **can still be edited** (`js/request-editor.js`). Lab tech approves or rejects (rejection requires a reason).
4. **Print checklist** (`print-checklist.html`) is a black-and-white dispensing form printed on **folio / long bond paper, fitted to one page**. It shows request info, the item table (Item / Qty / Unit / **Returned** / Remarks), request remarks under "Notes / Special Instructions", Released By (Lab Technician) and Received By (Student) signatures, and the Equipment Return Verification section, **verified by the Laboratory Instructor**.
5. **Release:** status becomes `released` and **all released items are deducted from inventory**.
6. **Return:** lab tech records the condition of each item. **Damaged or Missing items automatically create a `breakages` entry** with the person's name and group. That insert is isolated so it can never block the return itself.

Status values: `pending` → `approved` → `released` → returned. `rejected` is the other outcome of `pending`.

### 3.2 Inventory
- `inventory.html` covers chemicals, glassware, and equipment (tables `chemicals`, `equipment`, `supplies`), with categories, storage location, min quantity (low stock), expiry, supplier, and MSDS link.
- Each item has a **per-semester history** (`inventory_history`) with previous balance, received/acquisition, consumption, and a bar chart in the item popup.
- **Balance rule** (`js/inventory-balance.js`, tested): editing previous balance or received amount adjusts current stock **only by the delta**, so stock already issued stays deducted. Stock can never go negative.
- The initial data was imported from the school's Excel inventory (`data-import/`, plus scripts like `fresh-import-inventory.js`).

### 3.3 Rooms and schedule
- `laboratory-rooms.html` and `lecture-rooms.html` show availability. `add-schedule.html` and `room-logs.html` manage entries.
- Room schedule entries live in `room_schedule` and can link to a `request_id`.

### 3.4 Incidents / breakage
- `breakage.html` covers incident types (breakage, damage, loss, etc.), evidence photos (logbook photo and damage photo in Storage), and three separate dates: **date occurred, date reported/accepted, date resolved**. A DB check constraint enforces their order.

### 3.5 Public laboratory reports (QR)
- One **report QR** opens `laboratory-reports.html`, where reporters choose one of four report forms. They submit **without logging in** through the Edge Function `submit-laboratory-report`. It accepts multipart data with up to 3 photos and is idempotent on `submission_id`.
- Staff review in an authenticated inbox (`lab-reports.html`) through RPCs `review_laboratory_report` and `add_laboratory_report_photos`. Report flow: pending → accepted/rejected, then accepted → resolved. Accepting a breakage report creates **exactly one linked `breakages` row** in the same transaction, and the dates stay in sync both ways.
- Full details are in `LABORATORY-REPORTS.md`.

### 3.6 Other pages
- `index.html` is the dashboard. `students.html` lists requesters with filters and holds the QR cards. `reports.html` holds reports/analytics. `activity-log.html` shows `audit_log` (who did what). `admin-settings.html` has CRUD for courses, year levels, sections, groups, subjects, experiments, instructors, and request settings. `print-qr-poster.html` prints the lab QR poster.

---

## 4. Data model (Supabase / Postgres)

Base schema is in `supabase-schema.sql`. Later changes are in `migrations/` and `data-import/*.sql`. **Some tables exist in the live DB but not in the schema file** (`year_levels`, `groups`, `inventory_history`). Run `list_tables` against the live project before designing anything.

| Table | Purpose / notes |
|---|---|
| `requests` | Material requests. `request_id` is the human reference. `items` is a JSONB array of {name, qty, unit, …}. Also stores status, rejection_reason, remarks, room, date/time needed. |
| `chemicals` | Main inventory table (also holds non-chemical items by category). Text IDs. |
| `equipment` | Equipment with calibration date, parts checklist (JSONB), times_used |
| `supplies` | Simple consumables |
| `inventory_history` | Per-item semester balances, acquisition, and consumption |
| `breakages` | Incidents. Links to `request_id` and optionally `laboratory_report_id`. Has photo URLs. Cannot be deleted while linked to a report. |
| `laboratory_reports` | Public QR report submissions (RLS: staff read only; writes go through RPC/Edge Function) |
| `room_schedule` | Room bookings |
| `courses`, `year_levels`, `sections`, `groups`, `subjects`, `experiments`, `instructors` | Academic reference data. Instructors are linked to subjects through a JSONB `subject_ids` array. Subjects have a course `code` (PCOG221, PCOL312…) and `active`; experiments have `exp_no`, `default_groups`, `active`. |
| `experiment_items` | Materials per experiment ("experiment kit"), imported from the professors' Excel via Settings → Experiment Kits (`js/experiment-kit-import.js` parser, RPC `import_experiment_kit`). Each item: kind, name, optional `inventory_item_id`, qty, unit, basis (per_group / per_student / per_class). The request form computes totals from the number of groups/students; requesters can uncheck items and add "Substitute for …" items. |
| `audit_log` | Free-text action log (action, details, user_name) |

Storage buckets: incident evidence images, and `laboratory-report-photos` (private, served through signed URLs that expire after 5 minutes).

---

## 5. Code layout

```
*.html                 One file per page; most CSS/JS is embedded in the page
css/lab-ui.css         Shared UI styles (OLFU green/teal institutional look)
js/supabase-client.js  Creates the global `db` Supabase client
js/supabase-data.js    Data access layer: getRequests, saveRequest, getChemicals, deductChemicalQuantity, room schedule, breakages, audit…
js/data.js             Older localStorage-era helpers (partly legacy)
js/auth-guard.js       Login check + mobile sidebar; include on every staff page
js/student-request.js  Public request form logic
js/request-editor.js   Edit pending requests
js/inventory-balance.js  Stock balance rule (unit tested)
js/laboratory-report-*.js  QR report forms, inbox, QR
supabase/functions/submit-laboratory-report/  Edge Function (Deno)
migrations/            Dated SQL migrations
data-import/           Original Excel/CSV inventory + import SQL
tests/                 Node tests + SQL test script
*.js at root           One-off maintenance scripts (sidebar sync, imports). Not part of the app.
```

All time handling uses **Philippine time (Asia/Manila)**. See `getTodayManilaDateStr()` and related helpers in `supabase-data.js`.

---

## 6. Known gaps and technical debt

1. **Only three roles** (staff, student, professor). No admin/dean tier, and no faculty approval step yet.
2. **RLS was rebuilt** by the requester-login migration (every public table defaults to staff-only). Any new table must get its own policies.
3. **Request items are JSONB** rather than a `request_items` table, which makes item-level reporting and inventory joins harder. Normalize this in the new system.
4. **Inventory is matched by item name/ID inside JSONB**, not by foreign keys.
5. **Duplicated HTML/CSS per page**, with sidebar markup copied across files and kept in sync by root scripts (`unify-sidebar.js`, etc.).
6. `audit_log` is free text, not structured (no entity type/id).
7. The schema file is behind the live database (see section 4).

---

## 7. Suggestions for the complete College of Pharmacy system

- **Keep these, because they are proven in real use:** the request → approve → print checklist → release (deduct stock) → return (auto-incident) lifecycle; the semester inventory balance rule; public QR forms for people without accounts; the date rules for incidents; and the folio print layouts the lab tech already uses.
- **Add:** real roles (Dean, Program Head, Faculty, Lab Tech, Student) with RLS; student accounts linked to their student number; faculty approval of student requests before lab release; normalized `request_items`; structured audit trail; and likely new modules such as class scheduling, faculty loading, student records, announcements, and SDS repository.
- **Data migration:** the current Supabase DB already holds real inventory, requests, incidents, and academic reference data (courses, subjects, experiments, instructors). Plan to import it rather than re-encode it.
- **Watch out for these lab-staff wording choices on the checklist:** the item table column is **"Returned"** (not Lot/Batch), and return verification is signed by the **Laboratory Instructor** (not the technician).
