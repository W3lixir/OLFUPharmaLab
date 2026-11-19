const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { staffPages, outOfSync } = require('../scripts/sync-sidebar.js');

test('every staff page uses the sidebar from partials/sidebar.html', () => {
  assert.ok(staffPages().length >= 10, 'staff pages not found');
  assert.deepEqual(outOfSync(), [], 'run: node scripts/sync-sidebar.js');
});

test('every sidebar link points to a page that exists', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'partials', 'sidebar.html'), 'utf8');
  const links = [...html.matchAll(/href="([^"#]+)"/g)].map(m => m[1]);
  assert.ok(links.length >= 5);
  for (const href of links) assert.ok(fs.existsSync(path.join(__dirname, '..', href)), href + ' is missing');
});
