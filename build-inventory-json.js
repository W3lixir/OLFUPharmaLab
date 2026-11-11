/**
 * Run once: node build-inventory-json.js
 * Reads CSV files from Downloads and outputs inventory-data.json
 * Commit inventory-data.json so the web app can use it for export.
 */
const XLSX = require('xlsx');
const fs   = require('fs');
const path = require('path');

const DOWNLOADS = path.join(process.env.USERPROFILE || process.env.HOME, 'Downloads');

const FILES = [
  { csv: 'Untitled spreadsheet - LIQUIDS .csv',       sheet: 'LIQUIDS',        label: 'CHEMICALS (LIQUID REAGENTS)' },
  { csv: 'Untitled spreadsheet - SOLIDS.csv',         sheet: 'SOLIDS',         label: 'CHEMICALS (SOLID REAGENTS)'  },
  { csv: 'Untitled spreadsheet - GLASSWARES.csv',     sheet: 'GLASSWARES',     label: 'GLASSWARES / SUPPLIES'       },
  { csv: 'Untitled spreadsheet - EQUIPMENT .csv',     sheet: 'EQUIPMENT',      label: 'EQUIPMENT'                   },
  { csv: 'Untitled spreadsheet - ANTIBIOTIC DISC.csv',sheet: 'ANTIBIOTIC DISC',label: 'ANTIBIOTIC DISCS'            },
  { csv: 'Untitled spreadsheet - OFFICE SUPPLIES .csv',sheet:'OFFICE SUPPLIES', label: 'OFFICE SUPPLIES'            }
];

const output = {};

FILES.forEach(function(f) {
  const filePath = path.join(DOWNLOADS, f.csv);
  if (!fs.existsSync(filePath)) { console.warn('SKIPPED: ' + f.csv); return; }

  const raw   = XLSX.readFile(filePath, { raw: false });
  const sheet = raw.Sheets[raw.SheetNames[0]];
  const rows  = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  output[f.sheet] = { label: f.label, rows: rows };
  console.log('OK: ' + f.sheet + ' (' + rows.length + ' rows)');
});

fs.writeFileSync(
  path.join(__dirname, 'inventory-data.json'),
  JSON.stringify(output, null, 2)
);
console.log('\nSaved: inventory-data.json');
