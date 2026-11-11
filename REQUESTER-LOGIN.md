# Requester login (Google) — setup and rollout

Students and professors must sign in with their OLFU Google account before requesting materials. Lab staff are an explicit email list.

| Who | Email | Role |
|---|---|---|
| Student (Valenzuela) | ends in `val@student.fatima.edu.ph` | `student`: submit own requests, see own requests |
| Professor | `@fatima.edu.ph`, not on the staff list | `professor`: same as student |
| Lab tech / staff | any email on `staff_emails` (usually `@fatima.edu.ph`) | `staff`: full access, as before |
| Anyone else | gmail.com, other campuses | no access |

## Current state of the live database (2026-11-11)

Already applied on `ygznqaqyrhhpeuibdsqe` (dry-run first, all SQL tests passed):

| File | Status |
|---|---|
| `migrations/20261111-requester-login.sql` | Applied — roles, staff list (5 accounts), RLS lockdown |
| `migrations/20261111-interim-old-form.sql` | Applied — lets the OLD public form read its lists and INSERT pending requests only |
| `migrations/20261112-experiment-kits.sql` | Applied — kit tables/columns (empty until the Excel import) |
| `migrations/20261113-golive-remove-interim.sql` | **Not yet** — run at go-live |
| Live site | Old website + hotfix `b47c339` (requests saved with insert) |

Emergency undo of the lockdown: `migrations/rollback/restore-open-policies-pre-20261111.sql`.

## Go-live (outside lab hours)

1. Google sign-in set up and tested — see `GOOGLE-SIGNIN-SETUP.md`.
2. Commit the working tree on top of `23589af` and push to `main` (Vercel deploys in ~1 min).
3. Run `migrations/20261113-golive-remove-interim.sql` (dry-run first).
4. Settings → Experiment Kits → upload `LAB-Summary-of-materials.xlsx` → in the preview set **PRES** to the right subject (PRES 311 vs 312) → Import.
5. Settings → Experiment Kits → **Link materials to inventory**: link the common generic names (Beaker, Pipette, Erlenmeyer flask, Funnel, Graduated cylinder…) to the size the lab gives. Fix flagged items (e.g. PBIO211 Coconut Oil `#REF!`). Link instructors to subjects.
6. Live check: Google sign-in (student + staff), request → approve → release → return with inventory before/after, and the anonymous-access security test.

## Original one-time setup notes

1. **Google Cloud Console** → APIs & Services → Credentials → Create OAuth client ID → *Web application*.
   - Authorized redirect URI: `https://ygznqaqyrhhpeuibdsqe.supabase.co/auth/v1/callback`
   - OAuth consent screen: app name "PharmaLab", user type *External* (or *Internal* if created under the school's Workspace).
2. **Supabase Dashboard** → Authentication → Providers → Google → enable, paste Client ID and Client Secret.
3. **Supabase Dashboard** → Authentication → URL Configuration → Redirect URLs: add
   `https://olfupharmalab.vercel.app/**` and `http://localhost:3000/**`.
4. If the school blocks third-party apps on student accounts, school IT must allow the OAuth client ID.
5. **Outside lab hours:** run `migrations/20261111-requester-login.sql`, then `migrations/20261112-experiment-kits.sql` in the SQL Editor, then immediately push the frontend to `main`. From the moment the SQL runs, the old public form stops working until the new frontend is live.
6. Run `tests/requester-login.sql` and `tests/experiment-kits.sql` in the SQL Editor. Both must print `PASS`.
6b. **Experiment kits:** Settings → Experiment Kits → choose `LAB-Summary-of-materials.xlsx` → check the preview (subject codes, "Save as" matches) → Import. Then open the flagged items (e.g. PBIO211 Coconut Oil `#REF!`) and fix them, and link instructors to the new subjects in Settings → Instructors.
7. Check the staff list: `SELECT email, role FROM app_users ORDER BY role, email;`. Every existing account is migrated as staff.

## Testing before going live (separate test database)

Running the migration on the live project affects the live site immediately, so test on a separate free Supabase project:

1. Create a new Supabase project (e.g. `pharmalab-test`).
2. Copy the live schema: `npx supabase login`, `npx supabase link --project-ref ygznqaqyrhhpeuibdsqe`, `npx supabase db dump -f test-schema.sql` (asks for the live DB password; it only reads). Paste `test-schema.sql` into the test project's SQL Editor and run it. Optionally dump the reference data too (`--data-only`).
3. In the **test** project: run `migrations/20261111-requester-login.sql`, then `tests/requester-login.sql`.
4. Do setup steps 1–3 above against the **test** project's callback URL (`https://<test-ref>.supabase.co/auth/v1/callback`), with redirect URL `http://localhost:3000/**`.
5. `npm run dev`, then in the browser console on localhost:
   `localStorage.setItem('pharmalabTestDb', JSON.stringify({ url: 'https://<test-ref>.supabase.co', anonKey: '<test anon key>' }))` and reload. A purple "TEST DATABASE" tag appears. (Only works on localhost, never on the live site.)
6. Create a staff test account in the test project (Auth → Users → Add user), then test staff and student flows.

## Managing lab staff

```sql
-- add a lab tech (works before or after they first sign in)
INSERT INTO staff_emails(email) VALUES ('juan.delacruz@fatima.edu.ph');
-- remove
DELETE FROM staff_emails WHERE email = 'juan.delacruz@fatima.edu.ph';
```

Lab techs can sign in on `login.html` with **Sign in with Google (@fatima.edu.ph)** or with their existing email/password.

## Opening other campuses

Edit `public.requester_role_for_email()` (one function) and re-run it with `CREATE OR REPLACE`.

## What changed in code

- `js/requester-auth.js`: Google sign-in gate and user bar for requester pages.
- `material-request.html` / `js/student-request.js`: requires sign-in; requester type locked to role; saved details prefilled; plain insert with reference-number retry.
- `student-dashboard.html`: now **My Requests** (own requests only).
- `js/auth-guard.js`: staff pages require role `staff`; the "Demo Mode" fallback is removed.
- `login.html`: Google button for staff; students/professors are routed to My Requests.
- `print-checklist.html`: now staff-only.
- Database: `app_users`, `staff_emails`, `requests.requester_id/requester_email`, RLS rebuilt (anon has no table access; requesters only their own requests and reference lists; staff everything). Lab report QR still works through its Edge Function.
