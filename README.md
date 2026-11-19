# PharmaLab

Laboratory management web app for the **College of Pharmacy, Our Lady of Fatima University (Valenzuela)**.
Lab technicians handle material requests, inventory, room schedules and incident reports; students and
faculty sign in with their OLFU Google account to request materials.

- **Live site:** https://olfupharmalab.vercel.app (deploys from `main` through Vercel)
- **Full documentation:** [`PROJECT-HANDOFF.md`](PROJECT-HANDOFF.md) covers roles, workflows, data model and known gaps

## Stack

Static HTML pages + vanilla JavaScript + CSS, with no build step. Backend is **Supabase** (Postgres with
row-level security, Auth with Google sign-in, Storage, and one Edge Function for public lab reports).

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000/login.html
```

The local site talks to the live database unless you point it at a test project
(see the comment at the top of `js/supabase-client.js`).

## Tests

```bash
npm test           # unit tests + sidebar check
```

The `tests/*.sql` scripts test the database functions. Run them in the Supabase SQL Editor; each one
rolls itself back.

## Database changes

SQL lives in `migrations/` (dated, run in order in the SQL Editor). `supabase-schema.sql` lists the
order for a new database. To see what the live database is missing, run
`migrations/check-live-database.sql`. It is read-only.

## Project layout

| Path | What it is |
|---|---|
| `*.html` | One file per page. Staff pages use `js/auth-guard.js`; requester pages use `js/requester-auth.js` |
| `js/supabase-data.js` | Data access helpers shared by the pages |
| `css/` | Shared styles |
| `partials/sidebar.html` | The staff sidebar. After editing, run `npm run sync-sidebar` |
| `migrations/`, `supabase/` | Database migrations and the Edge Function |
| `data-import/`, `scripts/import/` | Original inventory files and one-off import scripts (not deployed) |
| `vercel.json`, `.vercelignore` | Security headers and files kept off the live site |
