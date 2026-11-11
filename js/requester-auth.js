/**
 * Requester (student / professor) Google sign-in gate.
 * Include after supabase-client.js and supabase-data.js on requester pages.
 *
 *   const me = await requireRequester();
 *   // me = { id, email, role: 'student'|'professor'|'staff', full_name, student_number, ... }
 *
 * The promise only resolves once the user is signed in with an allowed account.
 * Real enforcement is in the database (app_users + RLS); this is the UI side.
 */
(function () {
  var GOOGLE_HD = { student: 'student.fatima.edu.ph', professor: 'fatima.edu.ph' };
  var ACCESS_MSG = 'Access restricted. Students must use their Valenzuela campus email ending in val@student.fatima.edu.ph. Faculty must use their @fatima.edu.ph email.';

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function injectStyles() {
    if (document.getElementById('rq-auth-style')) return;
    if (!document.getElementById('rq-fonts')) {
      var f = document.createElement('link');
      f.id = 'rq-fonts'; f.rel = 'stylesheet';
      f.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Source+Serif+4:opsz,wght@8..60,600&family=IBM+Plex+Mono:wght@400;500&display=swap';
      document.head.appendChild(f);
    }
    var s = document.createElement('style');
    s.id = 'rq-auth-style';
    s.textContent = [
      '.rq-gate{position:fixed;inset:0;z-index:10000;overflow:auto;background:linear-gradient(160deg,#F6F2FD 0%,#EFEAFA 55%,#ECE6F9 100%);color:#2E2645;font-family:Inter,"Segoe UI",system-ui,sans-serif;-webkit-font-smoothing:antialiased;}',
      '.rq-head{background:#2A0E52;line-height:0;}',
      '.rq-banner{display:block;width:100%;max-width:1100px;height:auto;aspect-ratio:2172/280;margin:0 auto;}',
      '.rq-body{max-width:440px;margin:28px auto 48px;padding:32px 24px;background:#FCFBFF;border:1px solid rgba(255,255,255,.7);border-radius:26px;box-shadow:10px 10px 24px rgba(98,74,170,.13),-8px -8px 20px rgba(255,255,255,.85),inset 2px 2px 5px rgba(255,255,255,.9),inset -3px -3px 8px rgba(98,74,170,.07);}',
      '.rq-eyebrow{font-family:"IBM Plex Mono",Consolas,monospace;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#6E52C4;margin-bottom:8px;}',
      '.rq-body h1{font-family:"Source Serif 4",Georgia,serif;font-weight:600;font-size:28px;line-height:1.15;margin-bottom:8px;}',
      '.rq-sub{font-size:15px;line-height:1.5;color:#675F82;margin-bottom:24px;}',
      '.rq-legend{font-size:14px;font-weight:500;margin-bottom:8px;}',
      '.rq-roles{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:24px;}',
      '.rq-role{display:flex;gap:10px;align-items:flex-start;border:1px solid #E6DFF4;border-radius:18px;padding:12px;background:#FCFBFF;box-shadow:5px 5px 12px rgba(98,74,170,.12),-4px -4px 10px rgba(255,255,255,.85),inset 2px 2px 5px rgba(255,255,255,.9);cursor:pointer;text-align:left;font:inherit;color:#2E2645;transition:border-color .15s cubic-bezier(.2,0,0,1),background-color .15s cubic-bezier(.2,0,0,1);}',
      '.rq-role svg{flex-shrink:0;color:#675F82;margin-top:1px;}',
      '.rq-role b{display:block;font-size:14px;font-weight:600;}',
      '.rq-role small{display:block;font-family:"IBM Plex Mono",Consolas,monospace;font-size:11px;color:#675F82;margin-top:4px;word-break:break-all;}',
      '.rq-role:hover{border-color:#C9BCEE;}',
      '.rq-role.on{border-color:#A896E2;background:#F3EFFC;box-shadow:inset 3px 3px 7px rgba(98,74,170,.12),inset -3px -3px 7px rgba(255,255,255,.95);}',
      '.rq-role.on svg{color:#6E52C4;}',
      '.rq-google{width:100%;min-height:48px;display:flex;align-items:center;justify-content:center;gap:10px;padding:12px 16px;border-radius:14px;border:1px solid rgba(255,255,255,.25);background:linear-gradient(145deg,#7D62D2,#6247BC);box-shadow:6px 6px 14px rgba(98,74,170,.3),inset 2px 2px 4px rgba(255,255,255,.3),inset -2px -2px 5px rgba(48,28,120,.25);color:#fff;font:600 15px Inter,"Segoe UI",system-ui,sans-serif;cursor:pointer;transition:background-color .15s cubic-bezier(.2,0,0,1);}',
      '.rq-google .g{display:grid;place-items:center;width:26px;height:26px;border-radius:8px;background:#fff;}',
      '.rq-google:hover{background:linear-gradient(145deg,#7258CA,#563DAE);}.rq-google:disabled{opacity:.65;cursor:wait;}',
      '.rq-role:focus-visible,.rq-google:focus-visible,.rq-note a:focus-visible{outline:3px solid rgba(110,82,196,.45);outline-offset:2px;}',
      '.rq-error{display:none;background:#FCE8EC;border:1px solid #F6C9D2;color:#B42338;font-size:14px;line-height:1.45;padding:12px;border-radius:14px;margin-bottom:16px;}',
      '.rq-note{font-size:13px;color:#675F82;margin-top:24px;text-align:center;}',
      '.rq-note a{color:#5B41AE;font-weight:500;}',
      '@media (prefers-reduced-motion:reduce){.rq-gate *{transition:none!important;}}',
      '.rq-userbar{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;background:#F3EFFC;border-bottom:1px solid #E6DFF4;padding:10px 16px;font-size:13px;color:#2E2645;}',
      '.rq-userbar a,.rq-userbar button{color:#5B41AE;font-weight:600;background:none;border:none;cursor:pointer;font-size:13px;text-decoration:none;padding:0;}',
      '.rq-userbar .rq-links{display:flex;gap:14px;}'
    ].join('\n');
    document.head.appendChild(s);
  }

  var GOOGLE_SVG = '<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.6 5.4 2.7 13.2l7.8 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/><path fill="#FBBC05" d="M10.5 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.8-6.1C1 16.6 0 20.2 0 24s1 7.4 2.7 10.8l7.8-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.8 6.1C6.6 42.6 14.6 48 24 48z"/></svg>';

  function showGate(errorMsg) {
    injectStyles();
    var gate = document.getElementById('rq-gate');
    if (!gate) {
      gate = document.createElement('div');
      gate.id = 'rq-gate';
      gate.className = 'rq-gate';
      document.body.appendChild(gate);
      document.documentElement.style.overflow = "hidden";
    }
    var role = sessionStorage.getItem('rqRole') === 'professor' ? 'professor' : 'student';
    var CAP = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 2 9 2 12 0v-5"/></svg>';
    var CASE = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M3 13h18"/></svg>';
    gate.setAttribute('role', 'dialog');
    gate.setAttribute('aria-labelledby', 'rq-title');
    gate.innerHTML =
      '<header class="rq-head"><img class="rq-banner" src="images/header-banner.jpg" alt="Our Lady of Fatima University, College of Pharmacy: Laboratory Automation System" width="2172" height="280"></header>' +
      '<main class="rq-body">' +
        '<div class="rq-eyebrow">Material request</div>' +
        '<h1 id="rq-title">Sign in to request</h1>' +
        '<p class="rq-sub">Use your OLFU Google account to submit and track laboratory material requests.</p>' +
        '<div class="rq-error" id="rq-error" role="alert"></div>' +
        '<div class="rq-legend" id="rq-legend">I am a</div>' +
        '<div class="rq-roles" role="radiogroup" aria-labelledby="rq-legend">' +
          '<button type="button" role="radio" aria-checked="' + (role === 'student') + '" class="rq-role' + (role === 'student' ? ' on' : '') + '" data-role="student">' + CAP + '<span><b>Student</b><small>\u2026val@student.fatima.edu.ph</small></span></button>' +
          '<button type="button" role="radio" aria-checked="' + (role === 'professor') + '" class="rq-role' + (role === 'professor' ? ' on' : '') + '" data-role="professor">' + CASE + '<span><b>Faculty</b><small>@fatima.edu.ph</small></span></button>' +
        '</div>' +
        '<button type="button" class="rq-google" id="rq-google"><span class="g">' + GOOGLE_SVG + '</span><span>Continue with Google</span></button>' +
        '<p class="rq-note">Lab staff? <a href="login.html">Staff sign-in</a></p>' +
      '</main>';

    gate.querySelectorAll('.rq-role').forEach(function (btn) {
      btn.addEventListener('click', function () {
        role = btn.dataset.role;
        sessionStorage.setItem('rqRole', role);
        gate.querySelectorAll('.rq-role').forEach(function (b) { b.classList.toggle('on', b === btn); b.setAttribute('aria-checked', String(b === btn)); });
      });
    });

    document.getElementById('rq-google').addEventListener('click', async function () {
      var btn = this;
      btn.disabled = true;
      var redirectTo = window.location.origin + window.location.pathname + window.location.search;
      var res = await db.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: redirectTo, queryParams: { prompt: 'select_account', hd: GOOGLE_HD[role] } }
      });
      if (res.error) { setError(res.error.message); btn.disabled = false; }
    });

    if (errorMsg) setError(errorMsg);
  }

  function setError(msg) {
    var el = document.getElementById('rq-error');
    if (!el) return;
    el.textContent = msg;
    el.style.display = 'block';
  }

  function hideGate() {
    var gate = document.getElementById('rq-gate');
    if (gate) gate.remove();
    document.documentElement.style.overflow = "";
  }

  function renderUserBar(me) {
    injectStyles();
    if (document.getElementById('rq-userbar')) return;
    var bar = document.createElement('div');
    bar.id = 'rq-userbar';
    bar.className = 'rq-userbar';
    var label = me.role === 'professor' ? 'Faculty' : (me.role === 'staff' ? 'Lab Staff' : 'Student');
    bar.innerHTML =
      '<span>Signed in as <strong>' + esc(me.full_name || me.email) + '</strong> · ' + esc(me.email) + ' (' + label + ')</span>' +
      '<span class="rq-links"><a href="student-dashboard.html">My Requests</a><a href="material-request.html">New Request</a><button type="button" id="rq-logout">Logout</button></span>';
    var host = document.querySelector('[data-rq-userbar]') || document.body;
    host.insertBefore(bar, host.firstChild);
    document.getElementById('rq-logout').addEventListener('click', async function () {
      await db.auth.signOut();
      window.location.reload();
    });
  }

  // Supabase puts OAuth errors in the URL hash or query.
  function readOAuthError() {
    var src = (window.location.hash || '').replace(/^#/, '') + '&' + (window.location.search || '').replace(/^\?/, '');
    var params = new URLSearchParams(src);
    var err = params.get('error_description') || params.get('error');
    if (!err) return null;
    history.replaceState(null, '', window.location.pathname);
    return err.replace(/\+/g, ' ');
  }

  window.requireRequester = async function () {
    var oauthError = readOAuthError();
    var session = (await db.auth.getSession()).data.session;

    if (!session) {
      showGate(oauthError);
      return new Promise(function () {}); // page stays behind the gate until sign-in redirect
    }

    var res = await db.from('app_users').select('*').eq('id', session.user.id).maybeSingle();
    var me = res.data;
    if (!me) {
      await db.auth.signOut();
      showGate(ACCESS_MSG);
      return new Promise(function () {});
    }

    if (window.location.hash && /access_token|refresh_token/.test(window.location.hash)) {
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
    if (!me.full_name) {
      var meta = session.user.user_metadata || {};
      me.full_name = meta.full_name || meta.name || '';
    }
    hideGate();
    renderUserBar(me);
    return me;
  };
})();
