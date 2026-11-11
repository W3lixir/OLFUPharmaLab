/**
 * Unify sidebar across all pages — flat 6-item structure.
 * Sub-sections are handled by in-page tabs (see inject-page-tabs.js),
 * NOT by nested sidebar items.
 *
 * Run: node unify-sidebar.js
 */

const fs = require('fs');
const path = require('path');

const SIDEBAR = `    <aside class="sidebar">
        <nav class="sidebar-menu">
            <a href="index.html" class="menu-item" data-page="dashboard">
                <svg class="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                Dashboard
            </a>
            <a href="admin-requests.html" class="menu-item" data-page="labtech">
                <svg class="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                Lab Tech
            </a>
            <a href="inventory.html" class="menu-item" data-page="inventory">
                <svg class="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>
                Inventory
            </a>
            <a href="lecture-rooms.html" class="menu-item" data-page="rooms">
                <svg class="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                Rooms
            </a>
            <a href="activity-log.html" class="menu-item" data-page="activity">
                <svg class="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                Activity Log
            </a>
            <a href="admin-settings.html" class="menu-item menu-settings" data-page="settings">
                <svg class="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                Settings
            </a>
        </nav>
        <div class="sidebar-footer">
            <div id="sidebar-datetime">—</div>
            <div style="margin-top:4px;font-size:11px;">Philippine Time (PHT)</div>
        </div>
    </aside>`;

const FILES = [
    'index.html',
    'labtech-dashboard.html',
    'inventory.html',
    'equipment.html',
    'admin-requests.html',
    'activity-log.html',
    'admin-settings.html',
    'add-schedule.html',
    'lecture-rooms.html',
    'laboratory-rooms.html',
    'room-logs.html'
];

const SIDEBAR_REGEX = /[ \t]*<aside class="sidebar">[\s\S]*?<\/aside>/m;

let updated = 0, skipped = 0;

FILES.forEach(function (file) {
    var filePath = path.join(__dirname, file);
    if (!fs.existsSync(filePath)) { console.log('SKIP (missing): ' + file); skipped++; return; }

    var content = fs.readFileSync(filePath, 'utf8');
    if (!SIDEBAR_REGEX.test(content)) { console.log('SKIP (no sidebar match): ' + file); skipped++; return; }

    var next = content.replace(SIDEBAR_REGEX, SIDEBAR);

    if (!/js\/nav-highlighting\.js/.test(next)) {
        next = next.replace(
            /(<script src="js\/auth-guard\.js"><\/script>)/,
            '$1\n    <script src="js/nav-highlighting.js"></script>'
        );
    }

    fs.writeFileSync(filePath, next, 'utf8');
    console.log('OK: ' + file);
    updated++;
});

console.log('\nDone. Updated: ' + updated + ', Skipped: ' + skipped);
