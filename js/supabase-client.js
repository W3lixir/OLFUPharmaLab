/**
 * PharmaLab IMS - Supabase Client
 * Single source of truth for the Supabase connection.
 * Include this FIRST before supabase-data.js on every page.
 *
 * CDN: loaded via <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
 *
 * Testing against a separate Supabase project (localhost only, never on the live site):
 *   In the browser console on http://localhost:3000 run
 *     localStorage.setItem('pharmalabTestDb', JSON.stringify({ url: 'https://xxxx.supabase.co', anonKey: 'eyJ...' }))
 *   and reload. To go back to the live database:
 *     localStorage.removeItem('pharmalabTestDb')
 */

let SUPABASE_URL  = 'https://ygznqaqyrhhpeuibdsqe.supabase.co';
let SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlnem5xYXF5cmhocGV1aWJkc3FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3MDE3NjgsImV4cCI6MjA5MTI3Nzc2OH0.PfQ-UpEEEjuZPV2sPapLyCONSIm02P50QtdRP-wfTaY';

(function useTestDbOnLocalhost() {
  if (!/^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)) return;
  try {
    const t = JSON.parse(localStorage.getItem('pharmalabTestDb') || 'null');
    if (!t || !t.url || !t.anonKey) return;
    SUPABASE_URL = t.url;
    SUPABASE_ANON = t.anonKey;
    document.addEventListener('DOMContentLoaded', function () {
      const b = document.createElement('div');
      b.textContent = 'TEST DATABASE: ' + t.url.replace(/^https:\/\//, '');
      b.style.cssText = 'position:fixed;bottom:8px;left:8px;z-index:100000;background:#7c3aed;color:#fff;font:600 12px sans-serif;padding:6px 10px;border-radius:6px;opacity:.9;pointer-events:none;';
      document.body.appendChild(b);
    });
  } catch (_) { /* ignore bad test config */ }
})();

// supabase global is provided by the CDN script
const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
