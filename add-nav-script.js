const fs = require('fs');

const files = [
    'index.html', 'equipment.html', 'admin-requests.html', 
    'activity-log.html', 'admin-settings.html', 'add-schedule.html',
    'lecture-rooms.html', 'laboratory-rooms.html', 'room-logs.html', 
    'labtech-dashboard.html', 'inventory.html'
];

files.forEach(function(file) {
    try {
        let content = fs.readFileSync(file, 'utf8');

        // Remove old inline nav highlighting script if present
        content = content.replace(
            /        \/\/ Highlight active tab based on current page[\s\S]*?\n        \}\)\(\);\n\n/m,
            ''
        );

        // Add the new nav-highlighting script import (if not already present)
        if (!content.includes('nav-highlighting.js')) {
            // Find the place to insert it - after supabase scripts but before page-specific script
            content = content.replace(
                /    <script src="js\/auth-guard\.js"><\/script>\n/,
                '    <script src="js/auth-guard.js"></script>\n    <script src="js/nav-highlighting.js"></script>\n'
            );

            // If auth-guard not found, try inserting after supabase-data.js
            if (!content.includes('nav-highlighting.js')) {
                content = content.replace(
                    /    <script src="js\/supabase-data\.js"><\/script>\n/,
                    '    <script src="js/supabase-data.js"></script>\n    <script src="js/nav-highlighting.js"></script>\n'
                );
            }
        }

        fs.writeFileSync(file, content, 'utf8');
        console.log('✓ ' + file);
    } catch (e) {
        console.log('✗ ' + file + ': ' + e.message);
    }
});

console.log('\nDone!');
