# One-off inventory import scripts

These were used once to load the school's Excel/CSV inventory into Supabase. They are kept for
reference and are **not part of the website**.

- They read CSV files from your `Downloads` folder (`node scripts/import/<file>.js`).
- `fresh-import-inventory.js`, `import-csv-to-supabase.js` and `import-inventory-2026.js` write
  with the public anon key. Since `migrations/20261111-requester-login.sql`, signed-out (anon)
  access is blocked, so they **no longer work as-is**. A future import should go through the
  Settings page or a staff-only RPC, never through a service role key in a file.
- `build-inventory-json.js` writes `inventory-data.json` at the project root (used by the
  inventory export).
