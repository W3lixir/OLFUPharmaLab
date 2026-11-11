/**
 * OLFU PharmaLab - Inventory Report Generator
 * Reads CSV files from Downloads and generates Excel report
 * Run: node generate-report.js
 */

const XLSX = require('xlsx');
const fs   = require('fs');
const path = require('path');

const DOWNLOADS = path.join(process.env.USERPROFILE || process.env.HOME, 'Downloads');

const FILES = [
  {
    csv:   'Untitled spreadsheet - LIQUIDS .csv',
    sheet: 'LIQUIDS',
    label: 'CHEMICALS (LIQUID REAGENTS)'
  },
  {
    csv:   'Untitled spreadsheet - SOLIDS.csv',
    sheet: 'SOLIDS',
    label: 'CHEMICALS (SOLID REAGENTS)'
  },
  {
    csv:   'Untitled spreadsheet - GLASSWARES.csv',
    sheet: 'GLASSWARES',
    label: 'GLASSWARES / SUPPLIES'
  },
  {
    csv:   'Untitled spreadsheet - EQUIPMENT .csv',
    sheet: 'EQUIPMENT',
    label: 'EQUIPMENT'
  },
  {
    csv:   'Untitled spreadsheet - ANTIBIOTIC DISC.csv',
    sheet: 'ANTIBIOTIC DISC',
    label: 'ANTIBIOTIC DISCS'
  },
  {
    csv:   'Untitled spreadsheet - OFFICE SUPPLIES .csv',
    sheet: 'OFFICE SUPPLIES',
    label: 'OFFICE SUPPLIES'
  }
];

const wb = XLSX.utils.book_new();

FILES.forEach(function(f) {
  const filePath = path.join(DOWNLOADS, f.csv);

  if (!fs.existsSync(filePath)) {
    console.warn('  SKIPPED (not found): ' + f.csv);
    return;
  }

  // Read CSV and parse as array of arrays (raw)
  const raw = XLSX.readFile(filePath, { raw: false });
  const firstSheet = raw.Sheets[raw.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' });

  if (!rows || rows.length === 0) {
    console.warn('  SKIPPED (empty): ' + f.csv);
    return;
  }

  // Find max columns
  const maxCols = rows.reduce(function(m, r) { return Math.max(m, r.length); }, 0);

  // Pass all CSV rows as-is (CSV already has school headers + data)
  var wsData = [];
  rows.forEach(function(row) {
    var padded = row.slice();
    while (padded.length < maxCols) padded.push('');
    wsData.push(padded);
  });

  var ws = XLSX.utils.aoa_to_sheet(wsData);

  // Auto column widths (max 50)
  var colWidths = Array(maxCols).fill(10);
  wsData.forEach(function(row) {
    row.forEach(function(cell, ci) {
      var len = String(cell || '').length;
      if (len > colWidths[ci]) colWidths[ci] = Math.min(len + 2, 50);
    });
  });
  ws['!cols'] = colWidths.map(function(w) { return { wch: w }; });

  XLSX.utils.book_append_sheet(wb, ws, f.sheet);
  console.log('  OK: ' + f.sheet + ' (' + (rows.length) + ' rows)');
});

const outFile = path.join(
  process.cwd(),
  'Inventory-Report-' + new Date().toISOString().slice(0, 10) + '.xlsx'
);

XLSX.writeFile(wb, outFile);
console.log('\nDone! Saved to: ' + outFile);
