# Laboratory report QR workflow

Production: https://olfupharmalab.vercel.app. Deploy frontend changes by pushing `main` to `w3lixir2-hub/olfupharmalab`; do not deploy with the unrelated Karl Vercel CLI project.

## Setup

1. Apply `migrations/20261010-breakage-dates.sql` if missing, then apply `migrations/20261010-laboratory-reports.sql` once in the PharmaLab Supabase SQL Editor.
2. Deploy `supabase/functions/submit-laboratory-report/index.ts` as `submit-laboratory-report`. Retain legacy JWT verification. The anonymous public key supplied by the form is sufficient; no reporter login is required. Server-side `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are built-in Edge runtime secrets and must never be placed in frontend files.
3. Push the frontend to `main`. Students contains one report QR card pointing to `laboratory-reports.html`, where reporters choose one of the four forms. Lab Tech → Lab Reports opens the authenticated review inbox.

The endpoint accepts multipart fields `submission_id` (UUID v4), `payload` (JSON), and up to three `photos` (JPEG/PNG/WebP, at most 8 MB each). It returns only `{reference_number}` after saving, or `{error}` with a failure status. Dates are sent as ISO timestamps; datetime controls represent Philippine time. Reusing the same ID and payload returns the same reference. Changed data uses a new ID. Reference receipts do not expose report contents or status.

Report status transitions: pending → accepted/rejected; accepted → resolved. Accepted breakages create exactly one linked breakage in the same database transaction. Original submission and staff acceptance timestamps stay separate. Breakage date changes sync back to the report, including reopening when resolution is cleared. Linked breakage records cannot be deleted. Existing incident dates are not inferred.

All authenticated accounts are treated as laboratory staff, matching the current app. The new report table is SELECT-only for staff; mutations use authenticated review/photo RPCs. Anonymous callers cannot access report records, breakage records, or private photos. Evidence links expire after five minutes; reopening Details regenerates them.

Photo objects upload before a report commits. Failed uploads do not create a report; a retry safely reuses content-addressed objects. A failed or abandoned attempt can leave unreferenced private objects for later administrator cleanup. Staff photo upload retries can also leave unreferenced private objects; they never become public.

## Validation

Run `node --test tests/laboratory-reports.test.cjs`. Run `tests/laboratory-reports.sql` in SQL Editor to verify submission/acceptance idempotency, timestamp preservation, and resolution sync. Its fixtures and audit entries are rolled back. Browser smoke tests cover mobile layouts, field requirements, failure retention, successful retries, inbox review actions, and filters.
