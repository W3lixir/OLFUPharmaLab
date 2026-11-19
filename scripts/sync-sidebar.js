#!/usr/bin/env node
/**
 * The staff sidebar lives in ONE place: partials/sidebar.html.
 * This copies it into every staff page (any page that has <aside class="sidebar">).
 * Pages stay plain HTML (no build step, no flash while a script loads the menu).
 *
 *   node scripts/sync-sidebar.js           update every page
 *   node scripts/sync-sidebar.js --check   only report pages that differ (used by npm test)
 *
 * To add or rename a menu item: edit partials/sidebar.html, run this script, and if the new
 * page should highlight a menu item, add it to the pageMap in js/nav-highlighting.js.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SIDEBAR_RE = /[ \t]*<aside class="sidebar">[\s\S]*?<\/aside>/;

function canonicalSidebar() {
  return fs.readFileSync(path.join(ROOT, 'partials', 'sidebar.html'), 'utf8').replace(/\s+$/, '');
}

function staffPages() {
  return fs.readdirSync(ROOT).filter(f => f.endsWith('.html')).sort()
    .filter(f => SIDEBAR_RE.test(fs.readFileSync(path.join(ROOT, f), 'utf8')));
}

function outOfSync() {
  const sidebar = canonicalSidebar();
  return staffPages().filter(f => fs.readFileSync(path.join(ROOT, f), 'utf8').match(SIDEBAR_RE)[0] !== sidebar);
}

function sync() {
  const sidebar = canonicalSidebar();
  const changed = [];
  for (const f of staffPages()) {
    const file = path.join(ROOT, f);
    const html = fs.readFileSync(file, 'utf8');
    const next = html.replace(SIDEBAR_RE, () => sidebar);
    if (next !== html) { fs.writeFileSync(file, next, 'utf8'); changed.push(f); }
  }
  return changed;
}

module.exports = { staffPages, outOfSync, sync };

if (require.main === module) {
  if (process.argv.includes('--check')) {
    const bad = outOfSync();
    if (bad.length) { console.error('Sidebar differs from partials/sidebar.html in: ' + bad.join(', ') + '\nRun: node scripts/sync-sidebar.js'); process.exit(1); }
    console.log('Sidebar is the same on all ' + staffPages().length + ' staff pages.');
  } else {
    const changed = sync();
    console.log(changed.length ? 'Updated: ' + changed.join(', ') : 'All pages already up to date.');
  }
}
