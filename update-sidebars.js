/**
 * Update all HTML pages with the new tabbed sidebar design
 * Run: node update-sidebars.js
 */

const fs = require('fs');
const path = require('path');

// New sidebar HTML (tabbed design)
const newSidebar = `    <!-- Sidebar -->
    <aside class="sidebar">
        <nav class="sidebar-menu">
            <a href="index.html" class="menu-item">
                <svg class="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="7" height="7"></rect>
                    <rect x="14" y="3" width="7" height="7"></rect>
                    <rect x="14" y="14" width="7" height="7"></rect>
                    <rect x="3" y="14" width="7" height="7"></rect>
                </svg>
                Dashboard
            </a>
            <a href="labtech-dashboard.html" class="menu-item">
                <svg class="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                Lab Tech
            </a>

            <!-- INVENTORY Section with Tabs -->
            <div class="menu-section">
                <div class="menu-section-title">INVENTORY</div>
                <div class="menu-tabs">
                    <a href="inventory.html" class="menu-tab" data-tab="inventory">
                        <svg class="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                        </svg>
                        LabTech
                    </a>
                    <a href="equipment.html" class="menu-tab" data-tab="equipment">
                        <svg class="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <circle cx="12" cy="12" r="4"></circle>
                            <line x1="4.93" y1="4.93" x2="9.17" y2="9.17"></line>
                            <line x1="14.83" y1="14.83" x2="19.07" y2="19.07"></line>
                            <line x1="14.83" y1="9.17" x2="19.07" y2="4.93"></line>
                            <line x1="4.93" y1="19.07" x2="9.17" y2="14.83"></line>
                        </svg>
                        Equipment
                    </a>
                </div>
            </div>

            <a href="admin-requests.html" class="menu-item">
                <svg class="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                Requests & Acquisitions
            </a>
            <a href="activity-log.html" class="menu-item">
                <svg class="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                Activity Log
            </a>

            <!-- ROOMS Section with Tabs -->
            <div class="menu-section">
                <div class="menu-section-title">ROOMS</div>
                <div class="menu-tabs">
                    <a href="add-schedule.html" class="menu-tab" data-tab="schedule">
                        <svg class="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                        Schedule
                    </a>
                    <a href="lecture-rooms.html" class="menu-tab" data-tab="lecture">
                        <svg class="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 6h20v12H2z"></path><path d="M6 10h2v4H6z"></path><path d="M10 10h2v4h-2z"></path></svg>
                        Lecture
                    </a>
                    <a href="laboratory-rooms.html" class="menu-tab" data-tab="lab">
                        <svg class="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>
                        Lab
                    </a>
                    <a href="room-logs.html" class="menu-tab" data-tab="logs">
                        <svg class="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                        Logs
                    </a>
                </div>
            </div>

            <a href="admin-settings.html" class="menu-item menu-settings">
                <svg class="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                Settings
            </a>
        </nav>
        <div class="sidebar-footer"><div id="sidebar-datetime">—</div><div style="margin-top:4px;font-size:11px;">Philippine Time (PHT)</div></div>
    </aside>`;

const newStyles = `        /* Sidebar tabbed sections */
        .menu-tabs {
            display: flex;
            flex-direction: column;
            gap: 4px;
            padding: 6px 0;
        }
        .menu-tab {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 12px;
            color: var(--lab-text-secondary);
            text-decoration: none;
            font-size: 13px;
            font-weight: 500;
            border-radius: 4px;
            transition: all 0.2s ease;
            border-left: 3px solid transparent;
            margin-left: 8px;
        }
        .menu-tab:hover {
            background-color: var(--lab-bg-hover);
            color: var(--lab-text-primary);
        }
        .menu-tab.active {
            color: var(--lab-primary);
            background-color: rgba(var(--lab-primary-rgb), 0.1);
            border-left-color: var(--lab-primary);
            font-weight: 600;
        }
        .menu-tab .menu-icon {
            width: 18px;
            height: 18px;
            flex-shrink: 0;
        }
        .menu-settings {
            margin-top: auto;
            border-top: 1px solid var(--lab-border);
            padding-top: 12px;
        }`;

const tabActivationScript = `        // Highlight active tab based on current page
        (function () {
            var currentPage = window.location.pathname.split('/').pop() || 'index.html';
            var activeTab = null;
            if (currentPage === 'inventory.html') activeTab = 'inventory';
            else if (currentPage === 'equipment.html') activeTab = 'equipment';
            else if (currentPage === 'add-schedule.html') activeTab = 'schedule';
            else if (currentPage === 'lecture-rooms.html') activeTab = 'lecture';
            else if (currentPage === 'laboratory-rooms.html') activeTab = 'lab';
            else if (currentPage === 'room-logs.html') activeTab = 'logs';

            if (activeTab) {
                var tabs = document.querySelectorAll('.menu-tab');
                tabs.forEach(function (tab) {
                    tab.classList.remove('active');
                    if (tab.getAttribute('data-tab') === activeTab) {
                        tab.classList.add('active');
                    }
                });
            }
        })();`;

const files = [
    'index.html',
    'equipment.html',
    'admin-requests.html',
    'activity-log.html',
    'admin-settings.html',
    'add-schedule.html',
    'lecture-rooms.html',
    'laboratory-rooms.html',
    'room-logs.html'
];

files.forEach(function(file) {
    var filePath = path.join(__dirname, file);
    if (!fs.existsSync(filePath)) {
        console.log('SKIP: ' + file + ' (not found)');
        return;
    }

    var content = fs.readFileSync(filePath, 'utf8');

    // Replace sidebar (old structure)
    content = content.replace(
        /    <!-- Sidebar -->[\s\S]*?    <\/aside>/,
        newSidebar
    );

    // Add styles if not present
    if (!content.includes('.menu-tab {')) {
        content = content.replace(
            /        \.expiry-danger \{ color: var\(--lab-danger\); font-weight: 600; \}/,
            `.expiry-danger { color: var(--lab-danger); font-weight: 600; }\n\n${newStyles}`
        );
    }

    // Add tab activation script if not present
    if (!content.includes('Highlight active tab based on current page')) {
        content = content.replace(
            /    <script>\n        \(function \(\) \{/,
            `    <script>\n${tabActivationScript}\n\n        (function () {`
        );
    }

    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✓ Updated: ' + file);
});

console.log('\nDone! All sidebars updated.');
