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
  if (!hasSupabaseAuth()) {
    var localName = getCurrentUser() || 'Demo Admin';
    setCurrentUser(localName);
    initAuthUI(localName, 'Demo Mode');
    return;
  }

  try {
    var result = await db.auth.getUser();
    var user = result.data && result.data.user;
    if (!user) {
      var redirect = (window.location.pathname.split('/').pop() || 'index.html');
      window.location.replace('login.html?redirect=' + encodeURIComponent(redirect));
      return;
    }
    var displayName = user.user_metadata && user.user_metadata.full_name
      ? user.user_metadata.full_name
      : user.email;
    setCurrentUser(displayName);
    initAuthUI(displayName, 'Lab Staff');
  } catch (err) {
    console.error('Auth check failed:', err);
    var fallbackName = getCurrentUser() || 'Demo Admin';
    setCurrentUser(fallbackName);
    initAuthUI(fallbackName, 'Demo Mode');
  }
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
      logout.style.cssText = 'display:block;font-size:11px;color:#0d9488;margin-top:4px;';
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
