const XLSX = require('xlsx');
const wb = XLSX.readFile('C:\\Users\\karl\\Downloads\\Untitled spreadsheet - LIQUIDS .csv', { raw: false });
const sheet = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

console.log('Row 4 (header) - cols 27-31:');
rows[4].slice(27, 32).forEach((c, i) => {
  console.log(`  Col ${i+27}: "${c}"`);
});

for (let i = 0; i < rows.length; i++) {
  if (String(rows[i][0] || '').includes('Acetaldehyde')) {
    console.log('\nAcetaldehyde at row ' + i + ' - cols 27-31:');
    rows[i].slice(27, 32).forEach((c, i) => {
      console.log(`  Col ${i+27}: "${c}"`);
    });
    console.log(`\n  Col 29 type: ${typeof rows[i][29]}`);
    console.log(`  Col 29 raw value: ${JSON.stringify(rows[i][29])}`);
    break;
  }
}
