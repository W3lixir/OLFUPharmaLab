/**
 * Import CSV inventory data into Supabase
 * Run: node import-csv-to-supabase.js
 *
 * Reads each CSV, finds the latest balance column (BALANCE AS OF June 2026),
 * and upserts items into the Supabase chemicals table.
 */

const XLSX = require('xlsx');
const fs   = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://ygznqaqyrhhpeuibdsqe.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlnem5xYXF5cmhocGV1aWJkc3FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3MDE3NjgsImV4cCI6MjA5MTI3Nzc2OH0.PfQ-UpEEEjuZPV2sPapLyCONSIm02P50QtdRP-wfTaY';

const DOWNLOADS = path.join(process.env.USERPROFILE || process.env.HOME, 'Downloads');

const FILES = [
  { csv: 'Untitled spreadsheet - LIQUIDS .csv',        category: 'Liquid Reagent',  nameCol: 0 },
  { csv: 'Untitled spreadsheet - SOLIDS.csv',          category: 'Solid Reagent',   nameCol: 0 },
  { csv: 'Untitled spreadsheet - GLASSWARES.csv',      category: 'Glassware',       nameCol: 0 },
  { csv: 'Untitled spreadsheet - EQUIPMENT .csv',      category: 'Equipment',       nameCol: 1 },
  { csv: 'Untitled spreadsheet - ANTIBIOTIC DISC.csv', category: 'Antibiotic Disc', nameCol: 1 },
  { csv: 'Untitled spreadsheet - OFFICE SUPPLIES .csv',category: 'Office Supplies', nameCol: 0 },
];

// Words that identify a header row (not a data row)
const HEADER_KEYWORDS = ['balance','request','acquisition','consumption','item','chemicals','expiration','uom'];
const SKIP_NAMES = ['prepared by','reviewed by','noted by','laboratory technician','laboratory coordinator',
                    'dean','queendolyn','mary june','cristina','suzette','olive'];

function isHeaderRow(row) {
  return row.some(function(c) {
    var s = String(c || '').toLowerCase();
    return HEADER_KEYWORDS.some(function(k) { return s.includes(k); });
  });
}

function isSkipRow(name) {
  var n = String(name || '').toLowerCase().trim();
  if (!n) return true;
  return SKIP_NAMES.some(function(s) { return n.includes(s); });
}

function findHeaderRow(rows, nameCol) {
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    var cell = String(row[nameCol] || '').toLowerCase();
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

async function upsertBatch(items) {
  if (items.length === 0) return;
  const resp = await fetch(SUPABASE_URL + '/rest/v1/chemicals', {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates'
    },
    body: JSON.stringify(items)
  });
  if (!resp.ok) {
    const err = await resp.text();
    console.error('  Supabase error:', err);
  }
}

async function main() {
  for (var fi = 0; fi < FILES.length; fi++) {
    var f = FILES[fi];
    var filePath = path.join(DOWNLOADS, f.csv);

    if (!fs.existsSync(filePath)) { console.warn('SKIPPED (not found): ' + f.csv); continue; }

    var raw   = XLSX.readFile(filePath, { raw: false });
    var sheet = raw.Sheets[raw.SheetNames[0]];
    var rows  = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    // Find the header row
    var hIdx = findHeaderRow(rows, f.nameCol);
    if (hIdx === -1) { console.warn('SKIPPED (no header found): ' + f.csv); continue; }

    var headerRow = rows[hIdx];

    // Find key columns
    var balJune2026Col = findCol(headerRow, 'june 2026');
    var expiryCol      = findCol(headerRow, 'expiration');

    if (balJune2026Col === -1) {
      balJune2026Col = findCol(headerRow, 'balance');
    }

    // Find UOM column AFTER balance (could be multiple columns apart)
    var uomJuneCol = -1;
    for (var c = balJune2026Col + 1; c < Math.min(balJune2026Col + 5, headerRow.length); c++) {
      if (String(headerRow[c] || '').toLowerCase() === 'uom') {
        uomJuneCol = c;
        break;
      }
    }
    if (uomJuneCol === -1) uomJuneCol = balJune2026Col + 1; // fallback

    console.log('\nProcessing: ' + f.csv);
    console.log('  Header row ' + hIdx + ', name col ' + f.nameCol +
                ', balance col ' + balJune2026Col + ', expiry col ' + expiryCol);

    var items = [];
    var skipped = 0;

    for (var i = hIdx + 1; i < rows.length; i++) {
      var row  = rows[i];
      var name = String(row[f.nameCol] || '').trim();

      if (!name || isSkipRow(name) || isHeaderRow(row)) { skipped++; continue; }

      var qty    = parseFloat(row[balJune2026Col]) || 0;
      var unit   = String(row[uomJuneCol] || '').trim();
      var expiry = expiryCol >= 0 ? String(row[expiryCol] || '').trim() : '';

      // Parse expiry date (format like "05//2028" or "2028-05")
      var expiryDate = null;
      if (expiry && expiry !== 'NO EXP' && expiry !== 'NO EXPIRY' && expiry !== 'EXPIRED PRE PAMDEMIC') {
        var m = expiry.match(/(\d{1,2})[\/\-]+(\d{4})/);
        if (m) expiryDate = m[2] + '-' + String(m[1]).padStart(2,'0') + '-01';
      }

      // Generate a stable ID from name + category
      var id = f.category.toLowerCase().replace(/\s+/g,'-') + '--' +
               name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/-+$/,'');

      items.push({
        id:       id,
        name:     name,
        category: f.category,
        quantity: qty,
        unit:     unit,
        expiry:   expiryDate,
        storage:  '',
        supplier: '',
        msds:     ''
      });
    }

    console.log('  Items found: ' + items.length + ' (skipped: ' + skipped + ')');

    // Upsert in batches of 100
    for (var b = 0; b < items.length; b += 100) {
      await upsertBatch(items.slice(b, b + 100));
    }
    console.log('  Uploaded to Supabase.');
  }

  console.log('\nDone! All categories imported.');
}

main().catch(console.error);
