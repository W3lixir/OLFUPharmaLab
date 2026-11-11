/**
 * Enriched inventory import — COP VAL LAB 2nd SEM INVENTORY 25-26
 * Run: node import-inventory-2026.js
 *
 * Reads the 5 CSV tabs from Downloads, uses BALANCE AS OF June 2026 as the
 * current quantity, and MERGE-upserts enriched rows into Supabase `chemicals`
 * (previous balance, ref no., dates, requested/received) plus consumption /
 * acquisition history into `inventory_history` (month 2026-01 = 2nd sem 25-26).
 *
 * No npm dependencies — built-in CSV parser, Node 18+ global fetch.
 */

const fs   = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://ygznqaqyrhhpeuibdsqe.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlnem5xYXF5cmhocGV1aWJkc3FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3MDE3NjgsImV4cCI6MjA5MTI3Nzc2OH0.PfQ-UpEEEjuZPV2sPapLyCONSIm02P50QtdRP-wfTaY';

const DOWNLOADS = path.join(process.env.USERPROFILE || process.env.HOME, 'Downloads');
const PREFIX = 'COP VAL LAB 2nd  SEM INVENTORY 25-26 for checking (1).xlsx - ';

const HISTORY_MONTH = '2026-01'; // 2nd sem 25-26 = Jan–May 2026, stored at first month

const FILES = [
  { csv: PREFIX + 'LIQUIDS .csv',        category: 'Liquid Reagent',  nameCol: 0 },
  { csv: PREFIX + 'SOLIDS.csv',          category: 'Solid Reagent',   nameCol: 0 },
  { csv: PREFIX + 'GLASSWARES.csv',      category: 'Glassware',       nameCol: 0 },
  { csv: PREFIX + 'EQUIPMENT .csv',      category: 'Equipment',       nameCol: 1 },
  { csv: PREFIX + 'ANTIBIOTIC DISC.csv', category: 'Antibiotic Disc', nameCol: 1 },
];

const HEADER_KEYWORDS = ['balance','request','acquisition','consumption','item','chemicals','expiration','uom','date acquired'];
const SKIP_NAMES = ['prepared by','reviewed by','reviewwed by','noted by','laboratory technician','laboratory coordinator',
                    'laboratory technicial','program head','dean','queendolyn','mary june','cristina','suzette','olive',
                    'our lady of fatima','inventory of reagents','college of pharmacy'];

/* ── Built-in RFC4180 CSV parser (handles quoted commas, "" escapes, CRLF) ── */
function parseCSV(text) {
  var rows = [], row = [], field = '', i = 0, inQuotes = false;
  text = text.replace(/^﻿/, ''); // strip BOM
  while (i < text.length) {
    var ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += ch; i++; continue;
    }
    if (ch === '"') { inQuotes = true; i++; continue; }
    if (ch === ',') { row.push(field); field = ''; i++; continue; }
    if (ch === '\r') { i++; continue; }
    if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
    field += ch; i++;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

function isHeaderRow(row) {
  return row.some(function (c) {
    var s = String(c || '').toLowerCase();
    return HEADER_KEYWORDS.some(function (k) { return s.includes(k); });
  });
}

function isSkipRow(name) {
  var n = String(name || '').toLowerCase().trim();
  if (!n) return true;
  return SKIP_NAMES.some(function (s) { return n.includes(s); });
}

function findHeaderRow(rows, nameCol) {
  for (var i = 0; i < rows.length; i++) {
    var cell = String(rows[i][nameCol] || '').toLowerCase();
    if (cell === 'item' || cell.includes('chemicals') || cell.includes('liquid') ||
        cell.includes('solid') || cell.includes('glassware') || cell.includes('equipment') ||
        cell.includes('antibiotic')) {
      return i;
    }
  }
  return -1;
}

function findCol(headerRow, keyword) {
  keyword = keyword.toLowerCase();
  for (var i = 0; i < headerRow.length; i++) {
    if (String(headerRow[i] || '').toLowerCase().includes(keyword)) return i;
  }
  return -1;
}

function num(v) {
  var n = parseFloat(String(v == null ? '' : v).replace(/,/g, ''));
  return isNaN(n) ? 0 : n;
}

var MONTHS = { jan:1, feb:2, mar:3, apr:4, may:5, jun:6, jul:7, aug:8, sep:9, oct:10, nov:11, dec:12 };

function parseExpiry(raw) {
  var s = String(raw || '').trim();
  if (!s) return null;
  var up = s.toUpperCase();
  if (up.includes('NO EXP') || up.includes('EXPIRED') || up.includes('PANDEMIC') || up.includes('PAMDEMIC')) return null;
  // "05//2028" or "2/19/2026" style → mm + yyyy
  var m = s.match(/(\d{1,2})[\/\-]+\d{0,2}[\/\-]*(\d{4})/);
  if (m) return m[2] + '-' + String(m[1]).padStart(2, '0') + '-01';
  // "Nov-26" month-name form
  var mn = s.match(/([A-Za-z]{3})[\-\s]+(\d{2})\b/);
  if (mn && MONTHS[mn[1].toLowerCase()]) {
    return '20' + mn[2] + '-' + String(MONTHS[mn[1].toLowerCase()]).padStart(2, '0') + '-01';
  }
  return null;
}

function parseDate(raw) {
  var s = String(raw || '').trim();
  if (!s) return null;
  var m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/); // first m/d/yyyy
  if (m) return m[3] + '-' + String(m[1]).padStart(2, '0') + '-' + String(m[2]).padStart(2, '0');
  return null;
}

function slug(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

async function upsert(table, items, prefer) {
  if (items.length === 0) return { ok: true };
  var resp = await fetch(SUPABASE_URL + '/rest/v1/' + table, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Content-Type': 'application/json',
      'Prefer': prefer || 'resolution=merge-duplicates'
    },
    body: JSON.stringify(items)
  });
  if (!resp.ok) {
    var err = await resp.text();
    return { ok: false, status: resp.status, err: err };
  }
  return { ok: true };
}

async function historyTableExists() {
  var r = await fetch(SUPABASE_URL + '/rest/v1/inventory_history?select=id&limit=1', {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
  });
  return r.ok;
}

async function main() {
  var histOk = await historyTableExists();
  if (!histOk) {
    console.log('\n⚠️  inventory_history table not found — consumption/acquisition history will be SKIPPED.');
    console.log('    Create it in Supabase SQL editor, then re-run for history:\n');
    console.log('    create table if not exists inventory_history (id text primary key, chemical_id text not null, month text not null, consumption numeric default 0, acquisition numeric default 0, notes text);');
    console.log('    alter table inventory_history disable row level security;\n');
  }

  var grandTotal = 0;

  for (var fi = 0; fi < FILES.length; fi++) {
    var f = FILES[fi];
    var filePath = path.join(DOWNLOADS, f.csv);
    if (!fs.existsSync(filePath)) { console.warn('SKIPPED (not found): ' + f.csv); continue; }

    var rows = parseCSV(fs.readFileSync(filePath, 'utf8'));
    var hIdx = findHeaderRow(rows, f.nameCol);
    if (hIdx === -1) { console.warn('SKIPPED (no header): ' + f.csv); continue; }

    var H = rows[hIdx];
    var balCol = findCol(H, 'june 2026');
    if (balCol === -1) balCol = findCol(H, 'balance');

    // UOM column right after the balance
    var uomCol = -1;
    for (var c = balCol + 1; c < Math.min(balCol + 6, H.length); c++) {
      if (String(H[c] || '').toLowerCase() === 'uom') { uomCol = c; break; }
    }
    if (uomCol === -1) uomCol = balCol + 1;

    // 2nd sem 25-26 block sits immediately before the June-2026 balance
    var conCol = balCol - 1, refCol = balCol - 2, dateCol = balCol - 3, acqCol = balCol - 5;
    if (!String(H[conCol] || '').toLowerCase().includes('consumption')) {
      // structure differs — fall back to explicit header search before balCol
      for (var k = balCol - 1; k >= 0; k--) {
        var hk = String(H[k] || '').toLowerCase();
        if (conCol === balCol - 1 && hk.includes('consumption')) conCol = k;
      }
    }

    var prevCol = findCol(H, 'january 2026');
    if (prevCol === -1) prevCol = findCol(H, 'jan 2026');
    var reqCol  = findCol(H, '26-27');
    var expiryCol = findCol(H, 'expiration');
    var dateAcquiredCol = findCol(H, 'date acquired'); // EQUIPMENT fallback

    console.log('\nProcessing: ' + f.csv);
    console.log('  header=' + hIdx + ' name=' + f.nameCol + ' bal=' + balCol + ' uom=' + uomCol +
                ' prev=' + prevCol + ' acq=' + acqCol + ' con=' + conCol + ' ref=' + refCol +
                ' date=' + dateCol + ' req=' + reqCol + ' exp=' + expiryCol);

    var byId = {}; // dedup by id, last wins
    var skipped = 0;

    for (var i = hIdx + 1; i < rows.length; i++) {
      var row = rows[i];
      var name = String(row[f.nameCol] || '').trim();
      if (!name || isSkipRow(name) || isHeaderRow(row)) { skipped++; continue; }

      var id = slug(f.category) + '--' + slug(name);

      var deliveryDate = parseDate(row[dateCol]);
      if (!deliveryDate && dateAcquiredCol >= 0) deliveryDate = parseDate(row[dateAcquiredCol]);

      var chem = {
        id: id,
        name: name,
        category: f.category,
        quantity: num(row[balCol]),
        unit: String(row[uomCol] || '').trim(),
        expiry: expiryCol >= 0 ? parseExpiry(row[expiryCol]) : null,
        previous_balance: prevCol >= 0 ? num(row[prevCol]) : null,
        reference_number: refCol >= 0 ? (String(row[refCol] || '').trim() || null) : null,
        received_amount: acqCol >= 0 ? num(row[acqCol]) : null,
        requested_amount: reqCol >= 0 ? num(row[reqCol]) : null,
        delivery_date: deliveryDate
      };

      var hist = null;
      if (histOk) {
        hist = {
          id: id + '_' + HISTORY_MONTH,
          chemical_id: id,
          month: HISTORY_MONTH,
          consumption: conCol >= 0 ? num(row[conCol]) : 0,
          acquisition: acqCol >= 0 ? num(row[acqCol]) : 0,
          notes: ''
        };
      }

      byId[id] = { chem: chem, hist: hist };
    }

    var entries = Object.keys(byId).map(function (k) { return byId[k]; });
    var chems = entries.map(function (e) { return e.chem; });
    var hists = histOk ? entries.map(function (e) { return e.hist; }) : [];

    console.log('  items: ' + chems.length + ' (skipped rows: ' + skipped + ')');

    // upsert chemicals in batches of 100
    for (var b = 0; b < chems.length; b += 100) {
      var r1 = await upsert('chemicals', chems.slice(b, b + 100));
      if (!r1.ok) console.error('  chemicals error ' + r1.status + ': ' + r1.err);
    }
    // upsert history
    if (histOk) {
      for (var h = 0; h < hists.length; h += 100) {
        var r2 = await upsert('inventory_history', hists.slice(h, h + 100));
        if (!r2.ok) console.error('  history error ' + r2.status + ': ' + r2.err);
      }
    }

    console.log('  ✓ uploaded');
    grandTotal += chems.length;
  }

  console.log('\nDone! Total items upserted: ' + grandTotal + (histOk ? ' (with history)' : ' (no history)'));
}

main().catch(console.error);
