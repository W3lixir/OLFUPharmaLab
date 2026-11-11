/**
 * Unified Navigation Highlighting
 * Flat sidebar with 6 sections. Sub-pages (admin-requests, equipment,
 * laboratory-rooms, room-logs) highlight their parent section.
 * Also handles in-page top tabs (.page-tab[data-tab]) via window.location.
 */
(function () {
    function initNavHighlighting() {
        var currentPage = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
        if (!currentPage || currentPage.indexOf('.html') === -1) currentPage = 'index.html';

        // Map each page → which sidebar item (data-page) gets .active
        var pageMap = {
            'index.html':              'dashboard',
            'admin-requests.html':     'labtech',
            'lab-reports.html':        'labtech',
            'inventory.html':          'inventory',
            'equipment.html':          'inventory',
            'lecture-rooms.html':      'rooms',
            'laboratory-rooms.html':   'rooms',
            'add-schedule.html':       'rooms',
            'activity-log.html':       'activity',
            'room-logs.html':          'activity',
            'admin-settings.html':     'settings'
        };

        var key = pageMap[currentPage];
        if (!key) return;

        document.querySelectorAll('.sidebar .menu-item.active')
            .forEach(function (el) { el.classList.remove('active'); });

        var target = document.querySelector('.sidebar .menu-item[data-page="' + key + '"]');
        if (target) target.classList.add('active');

        // In-page top tabs: a tab is active if its href matches current page
        document.querySelectorAll('.page-tabs .page-tab').forEach(function (tab) {
            var href = (tab.getAttribute('href') || '').toLowerCase();
            var hrefPage = href.split('/').pop();
            if (hrefPage === currentPage) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initNavHighlighting);
    } else {
        initNavHighlighting();
    }
})();
