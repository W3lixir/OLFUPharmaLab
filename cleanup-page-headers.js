/**
 * Remove redundant page chrome now that sidebar + page-tabs handle navigation:
 *   1. Strip <div class="breadcrumb">...</div> from ALL pages
 *   2. Strip <h1 class="page-title">...</h1> from the 8 paired pages where
 *      the in-page tab already names the section
 *
 * Run: node cleanup-page-headers.js
 */

const fs = require('fs');
const path = require('path');

const ALL_PAGES = [
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

// Pages whose tab label replaces the h1 page-title
const PAIRED_PAGES = new Set([
    'labtech-dashboard.html',
    'admin-requests.html',
    'inventory.html',
    'equipment.html',
    'lecture-rooms.html',
    'laboratory-rooms.html',
    'activity-log.html',
    'room-logs.html'
]);

// <div class="breadcrumb" ...>...</div> — match whole element including any inline style attrs.
// The breadcrumb has only inline spans/anchors, no nested <div>, so first </div> closes it.
const BREADCRUMB_REGEX = /\n?[ \t]*<div class="breadcrumb"[^>]*>[\s\S]*?<\/div>\n?/g;

// <h1 class="page-title">...</h1> — single-line in this codebase
const PAGE_TITLE_REGEX = /\n?[ \t]*<h1 class="page-title"[^>]*>[\s\S]*?<\/h1>\n?/g;

let stripped = { breadcrumb: 0, h1: 0 };

ALL_PAGES.forEach(function (file) {
    var filePath = path.join(__dirname, file);
    if (!fs.existsSync(filePath)) return;

    var content = fs.readFileSync(filePath, 'utf8');
    var orig = content;

    if (BREADCRUMB_REGEX.test(content)) {
        content = content.replace(BREADCRUMB_REGEX, '\n');
        stripped.breadcrumb++;
    }
    BREADCRUMB_REGEX.lastIndex = 0;

    if (PAIRED_PAGES.has(file) && PAGE_TITLE_REGEX.test(content)) {
        content = content.replace(PAGE_TITLE_REGEX, '\n');
        stripped.h1++;
    }
    PAGE_TITLE_REGEX.lastIndex = 0;

    if (content !== orig) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('OK: ' + file);
    }
});

console.log('\nBreadcrumbs removed: ' + stripped.breadcrumb + ', H1 titles removed: ' + stripped.h1);
