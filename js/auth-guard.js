/**
 * Auth guard for admin/lab tech pages. Include after supabase-data.js.
 * Validates session via Supabase auth, redirects to login if not signed in.
 */

// Hide hardcoded nav profile immediately to prevent flash
(function() {
  var style = document.createElement('style');
  style.textContent = '.user-profile { visibility: hidden; }';
  document.head.appendChild(style);
})();

async function requireAuth() {
  var redirect = (window.location.pathname.split('/').pop() || 'index.html');
  var toLogin = function () { window.location.replace('login.html?redirect=' + encodeURIComponent(redirect)); };
  if (!hasSupabaseAuth()) { toLogin(); return; }

  try {
    // No saved session at all: go to login right away, without waiting for the server.
    var local = await db.auth.getSession();
    if (!local.data || !local.data.session) { toLogin(); return; }
    var result = await db.auth.getUser();
    var user = result.data && result.data.user;
    if (!user) { toLogin(); return; }

    // Signed in is not enough: only accounts with the staff role may use staff pages.
    var roleRes = await db.from('app_users').select('role').eq('id', user.id).maybeSingle();
    var role = roleRes.data && roleRes.data.role;
    if (role !== 'staff') {
      window.location.replace(role ? 'student-dashboard.html' : 'login.html?denied=1');
      return;
    }

    var displayName = user.user_metadata && (user.user_metadata.full_name || user.user_metadata.name)
      ? (user.user_metadata.full_name || user.user_metadata.name)
      : user.email;
    setCurrentUser(displayName);
    initAuthUI(displayName, 'Lab Staff');
    showPage();
  } catch (err) {
    console.error('Auth check failed:', err);
    toLogin();
  }
}

// Staff pages start hidden (style#auth-pending in <head>) so their content never
// flashes before the staff check; reveal only once the user is confirmed as staff.
function showPage() {
  var s = document.getElementById('auth-pending');
  if (s) s.remove();
}

function hasSupabaseAuth() {
  return typeof db !== 'undefined' && db && db.auth && typeof db.auth.getUser === 'function';
}

function initAuthUI(name, role) {
  name = name || getCurrentUser();
  if (!name) return;
  var profile = document.querySelector('.user-profile');
  if (profile) {
    var parts = name.includes('@') ? name.split('@')[0].split(/[._]/) : name.split(/\s+/);
    var initials = parts.map(function(s){ return s[0]; }).join('').toUpperCase().slice(0, 2);
    var avatar = profile.querySelector('.user-avatar');
    if (avatar) avatar.textContent = initials;
    var nameEl = profile.querySelector('.user-name');
    if (nameEl) nameEl.textContent = name;
    var roleEl = profile.querySelector('.user-role');
    if (roleEl) roleEl.textContent = role || 'Lab Staff';
    var wrap = profile.querySelector('.user-info');
    if (wrap && !wrap.querySelector('.logout-link')) {
      var logout = document.createElement('a');
      logout.href = '#';
      logout.className = 'logout-link';
      logout.style.cssText = 'display:block;font-size:11px;color:#6E52C4;margin-top:4px;';
      logout.textContent = 'Logout';
      logout.onclick = function(e){ e.preventDefault(); doLogout(); };
      wrap.appendChild(logout);
    }
    profile.style.visibility = 'visible';
  }
}

async function doLogout() {
  var who = getCurrentUser();
  try { if (who) await addAuditEntry('Logout', who + ' signed out'); } catch(_) {}
  if (hasSupabaseAuth()) await db.auth.signOut();
  clearCurrentUser();
  window.location.href = 'login.html';
}
document.addEventListener('DOMContentLoaded', function(){
  requireAuth();
  initMobileNav();
});

function initMobileNav() {
  var nav = document.querySelector('.top-nav-left');
  var sidebar = document.querySelector('.sidebar');
  if (!nav || !sidebar) return;

  // Inject hamburger button before the logo
  var btn = document.createElement('button');
  btn.className = 'hamburger-btn';
  btn.setAttribute('aria-label', 'Toggle navigation');
  btn.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>';
  nav.insertBefore(btn, nav.firstChild);

  // Inject overlay
  var overlay = document.createElement('div');
  overlay.className = 'sidebar-overlay';
  document.body.appendChild(overlay);

  function openSidebar() {
    sidebar.classList.add('open');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
  function closeSidebar() {
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  btn.addEventListener('click', function() {
    sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
  });
  overlay.addEventListener('click', closeSidebar);

  // Close on nav link click (mobile UX)
  sidebar.querySelectorAll('.menu-item').forEach(function(link) {
    link.addEventListener('click', function() {
      if (window.innerWidth <= 768) closeSidebar();
    });
  });
}
