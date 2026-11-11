/**
 * Settings → Experiment Kits
 *  1. Import the professors' Excel (preview + subject matching + inventory linking)
 *  2. Edit each subject's experiments and their materials
 * Needs: XLSX (SheetJS CDN), ExperimentKits (js/experiment-kit-import.js), supabase-data.js
 */
(function () {
  const K = window.ExperimentKits;
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = id => document.getElementById(id);
  const BASIS = { per_group: 'per group', per_student: 'per student', per_class: 'per class' };
  const CATEGORIES = ['Liquid Reagent', 'Solid Reagent', 'Glassware', 'Equipment', 'Antibiotic Disc'];

  let parsed = null;        // { subjects, warnings }
  let inventory = [];       // chemicals rows
  let subjectsCache = [];
  let courses = [];
  const linkCache = new Map();

  async function loadRefs() {
    const [inv, subs, crs] = await Promise.all([getChemicals(), getSubjects(true), getCourses()]);
    inventory = inv || []; subjectsCache = subs || []; courses = crs || [];
    linkCache.clear();
    const dl = $('kit-inventory-list');
    if (dl) dl.innerHTML = inventory.map(c => `<option value="${esc(c.name)}">${esc(c.category || '')}${c.unit ? ' · ' + esc(c.unit) : ''}</option>`).join('');
  }
  // Only certain matches are linked (see matchInventory); ambiguous sizes stay unlinked for staff to pick.
  const findInventory = name => {
    if (!linkCache.has(name)) linkCache.set(name, K.matchInventory(name, inventory));
    return linkCache.get(name);
  };

  /* ═════════════ 1. IMPORT ═════════════ */

  async function onFile(file) {
    const status = $('kit-import-status');
    if (!file) return;
    status.textContent = 'Reading ' + file.name + '…';
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const sheets = {};
      wb.SheetNames.forEach(n => { sheets[n] = XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, defval: '', raw: false, blankrows: true }); });
      await loadRefs();
      parsed = K.parseWorkbook(sheets);
      renderPreview();
      status.textContent = '';
    } catch (err) {
      console.error(err);
      status.textContent = 'Could not read this file: ' + (err.message || err);
    }
  }

  function guessSubject(s) {
    const code = (s.code || '').toUpperCase();
    const letters = code.replace(/\d+$/, '');
    const byCode = subjectsCache.find(x => (x.code || '').toUpperCase() === code);
    if (byCode) return byCode.id;
    const squash = v => (v || '').toUpperCase().replace(/\s+/g, '');
    // 1) full code in the name, e.g. "PHARMACEUTICAL ANALYSIS 2 (PHAN 212)" for PHAN212
    if (/\d/.test(code)) {
      const full = subjectsCache.filter(x => squash(x.name).includes(code));
      if (full.length === 1) return full[0].id;
    }
    // 2) same descriptive name
    if (s.name) {
      const named = subjectsCache.find(x => squash(x.name) === squash(s.name));
      if (named) return named.id;
    }
    // 3) letters only, but only when exactly one subject has them (PHAN 111 vs PHAN 212 is ambiguous)
    if (letters.length >= 3) {
      const byLetters = subjectsCache.filter(x => squash(x.name).includes(letters));
      if (byLetters.length === 1) return byLetters[0].id;
    }
    return '';
  }

  function renderPreview() {
    const box = $('kit-preview');
    if (!parsed || !parsed.subjects.length) { box.innerHTML = '<p class="kit-muted">No subject sheets were found in this file.</p>'; return; }
    const pharmacy = courses.find(c => /pharm/i.test(c.name)) || courses[0];
    const subjOptions = sel => '<option value="">New subject</option>' + subjectsCache.map(x =>
      `<option value="${esc(x.id)}" ${x.id === sel ? 'selected' : ''}>${esc(subjectLabel(x))}${x.active === false ? ' (hidden)' : ''}</option>`).join('');
    let totalItems = 0, linked = 0;
    const rows = parsed.subjects.map((s, i) => {
      const items = s.experiments.flatMap(e => e.items);
      const hits = items.filter(it => findInventory(it.name)).length;
      totalItems += items.length; linked += hits;
      const target = guessSubject(s);
      const existing = subjectsCache.find(x => x.id === target);
      return `<tr>
        <td><input type="text" class="kit-code" data-i="${i}" value="${esc(s.code)}" aria-label="Subject code for sheet ${esc(s.sheet)}"></td>
        <td><input type="text" class="kit-name" data-i="${i}" value="${esc(existing ? existing.name : (s.name || s.code))}" aria-label="Subject name"></td>
        <td><select class="kit-target" data-i="${i}" aria-label="Save as">${subjOptions(target)}</select></td>
        <td class="num">${s.experiments.length}</td>
        <td class="num">${items.length}</td>
        <td class="num">${hits}/${items.length}</td>
        <td class="kit-muted">${esc(s.sheet)}</td>
      </tr>`;
    }).join('');
    const warn = parsed.warnings.length ? `<details class="kit-warnings"><summary>${parsed.warnings.length} item(s) to review after import</summary><ul>${
      parsed.warnings.map(w => `<li><strong>${esc(w.sheet)}${w.row ? ' row ' + w.row : ''}:</strong> ${esc(w.message)}</li>`).join('')}</ul></details>` : '';
    box.innerHTML = `
      <div class="kit-summary">${parsed.subjects.length} subjects · ${parsed.subjects.reduce((n, s) => n + s.experiments.length, 0)} experiments · ${totalItems} materials · ${linked} linked to inventory</div>
      <div class="kit-table-wrap"><table class="equipment-table kit-table">
        <thead><tr><th>Code</th><th>Subject name</th><th>Save as</th><th>Exps</th><th>Items</th><th>In inventory</th><th>Sheet</th></tr></thead>
        <tbody>${rows}</tbody></table></div>
      ${warn}
      <div class="kit-import-options">
        <label>Course <select id="kit-course">${courses.map(c => `<option value="${esc(c.id)}" ${pharmacy && c.id === pharmacy.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>
        <label class="kit-check"><input type="checkbox" id="kit-hide-others" checked> Hide subjects that are not in this file (history is kept)</label>
        <button type="button" class="btn btn-primary" id="kit-import-btn">Import ${parsed.subjects.length} subjects</button>
      </div>`;
    $('kit-import-btn').addEventListener('click', runImport);
  }

  async function runImport() {
    const btn = $('kit-import-btn'); const status = $('kit-import-status');
    btn.disabled = true;
    const courseId = $('kit-course') ? $('kit-course').value : '';
    const importedIds = [];
    try {
      for (let i = 0; i < parsed.subjects.length; i++) {
        const s = parsed.subjects[i];
        const code = document.querySelector(`.kit-code[data-i="${i}"]`).value.trim();
        const name = document.querySelector(`.kit-name[data-i="${i}"]`).value.trim();
        const target = document.querySelector(`.kit-target[data-i="${i}"]`).value;
        if (!code) throw new Error(`Sheet "${s.sheet}" needs a subject code.`);
        status.textContent = `Importing ${code} (${i + 1}/${parsed.subjects.length})…`;
        const experiments = s.experiments.map(e => ({
          exp_no: e.no, title: e.title, objectives: e.objectives, default_groups: e.defaultGroups,
          items: e.items.map(it => {
            const inv = findInventory(it.name);
            return { kind: it.kind, item_name: it.name, inventory_item_id: inv ? inv.id : null,
              category: inv ? inv.category : it.category, qty: it.qty, unit: it.unit || (inv ? inv.unit : ''), basis: it.basis, note: it.note };
          }),
        }));
        const id = await importExperimentKit({ id: target, code, name, course_id: courseId, year_level: s.yearLevel, semester: s.semester }, experiments);
        importedIds.push(id);
      }
      if ($('kit-hide-others') && $('kit-hide-others').checked) {
        const others = subjectsCache.filter(x => !importedIds.includes(x.id) && x.active !== false).map(x => x.id);
        if (others.length) {
          const { error } = await db.from('subjects').update({ active: false }).in('id', others);
          if (error) throw error;
        }
      }
      status.textContent = `Imported ${importedIds.length} subjects. Review flagged items below.`;
      $('kit-preview').innerHTML = '';
      parsed = null;
      await loadRefs();
      await renderBrowser();
      await loadUnlinked();
      if (typeof renderSubjects === 'function') renderSubjects();
      if (typeof renderExperiments === 'function') renderExperiments();
    } catch (err) {
      console.error(err);
      status.textContent = 'Import stopped: ' + (err.message || err);
      btn.disabled = false;
    }
  }

  /* ═════════════ 2. BROWSE + EDIT ═════════════ */

  let currentExp = null;

  async function renderBrowser() {
    const sel = $('kit-subject');
    const keep = sel.value;
    subjectsCache = await getSubjects(true);
    sel.innerHTML = '<option value="">Select a subject</option>' + subjectsCache.map(s =>
      `<option value="${esc(s.id)}">${esc(subjectLabel(s))}${s.active === false ? ' (hidden)' : ''}</option>`).join('');
    if (keep) sel.value = keep;
    await renderExperimentList();
  }

  async function renderExperimentList() {
    const sid = $('kit-subject').value;
    const list = $('kit-experiments');
    $('kit-editor').innerHTML = '';
    currentExp = null;
    if (!sid) { list.innerHTML = '<p class="kit-muted">Choose a subject to see its experiments.</p>'; return; }
    const exps = await getExperimentsBySubject(sid, true);
    const counts = {};
    if (exps.length) {
      const { data } = await db.from('experiment_items').select('experiment_id').in('experiment_id', exps.map(e => e.id));
      (data || []).forEach(r => { counts[r.experiment_id] = (counts[r.experiment_id] || 0) + 1; });
    }
    list.innerHTML = (exps.length ? exps.map(e => `
      <button type="button" class="kit-exp ${e.active === false ? 'is-hidden' : ''}" data-id="${esc(e.id)}">
        <span class="kit-exp-title">${esc(experimentLabel(e))}</span>
        <span class="kit-muted">${counts[e.id] || 0} materials · ${e.default_groups || 8} groups${e.active === false ? ' · hidden' : ''}</span>
      </button>`).join('') : '<p class="kit-muted">No experiments yet.</p>') +
      `<button type="button" class="btn btn-secondary kit-new-exp" id="kit-new-exp">+ New experiment</button>`;
    list.querySelectorAll('.kit-exp').forEach(b => b.addEventListener('click', () => openExperiment(exps.find(e => e.id === b.dataset.id))));
    $('kit-new-exp').addEventListener('click', () => openExperiment({ id: '', subject_id: sid, name: '', exp_no: '', default_groups: 8, active: true }));
  }

  async function openExperiment(e) {
    currentExp = e;
    document.querySelectorAll('.kit-exp').forEach(b => b.classList.toggle('active', b.dataset.id === e.id));
    const items = e.id ? await getExperimentItems(e.id) : [];
    const ed = $('kit-editor');
    ed.innerHTML = `
      <div class="kit-exp-fields">
        <label>Exp no. <input type="text" id="kit-e-no" value="${esc(e.exp_no || '')}" maxlength="10"></label>
        <label class="grow">Title <input type="text" id="kit-e-title" value="${esc(e.name || '')}" required></label>
        <label>Default groups <input id="kit-e-groups" type="number" min="1" max="50" value="${esc(e.default_groups || 8)}"></label>
        <label class="kit-check"><input type="checkbox" id="kit-e-active" ${e.active === false ? '' : 'checked'}> Shown in request form</label>
      </div>
      <div class="kit-table-wrap"><table class="equipment-table kit-items">
        <thead><tr><th>Type</th><th>Item (pick from inventory or type)</th><th>Qty</th><th>Unit</th><th>Basis</th><th>Category</th><th>Note</th><th></th></tr></thead>
        <tbody id="kit-item-rows"></tbody></table></div>
      <div class="kit-editor-actions">
        <button type="button" class="btn btn-secondary" id="kit-add-item">+ Add material</button>
        <span class="kit-muted" id="kit-save-status"></span>
        <button type="button" class="btn btn-primary" id="kit-save">Save experiment</button>
      </div>`;
    const body = $('kit-item-rows');
    (items.length ? items : []).forEach(it => body.appendChild(itemRow(it)));
    $('kit-add-item').addEventListener('click', () => { const r = itemRow({ kind: 'chemical', basis: 'per_group' }); body.appendChild(r); r.querySelector('.ki-name').focus(); });
    $('kit-save').addEventListener('click', saveExperiment);
  }

  function itemRow(it) {
    const tr = document.createElement('tr');
    const linked = it.inventory_item_id && inventory.find(c => c.id === it.inventory_item_id);
    tr.dataset.inv = linked ? linked.id : '';
    tr.innerHTML = `
      <td><select class="ki-kind" aria-label="Type"><option value="equipment" ${it.kind === 'equipment' ? 'selected' : ''}>Equipment</option><option value="chemical" ${it.kind !== 'equipment' ? 'selected' : ''}>Chemical / sample</option></select></td>
      <td><input type="text" class="ki-name" list="kit-inventory-list" value="${esc(it.item_name || '')}" aria-label="Item name">
          <span class="ki-link ${linked ? 'ok' : ''}">${linked ? 'In inventory' : 'Not in inventory'}</span></td>
      <td><input class="ki-qty" type="number" min="0" step="any" value="${it.qty == null ? '' : esc(it.qty)}" placeholder="as needed" aria-label="Quantity"></td>
      <td><input type="text" class="ki-unit" value="${esc(it.unit || '')}" placeholder="mL, g, pcs" aria-label="Unit"></td>
      <td><select class="ki-basis" aria-label="Basis">${Object.entries(BASIS).map(([v, l]) => `<option value="${v}" ${it.basis === v ? 'selected' : ''}>${l}</option>`).join('')}</select></td>
      <td><select class="ki-cat" aria-label="Category">${CATEGORIES.map(c => `<option ${it.category === c ? 'selected' : ''}>${c}</option>`).join('')}</select></td>
      <td><input type="text" class="ki-note" value="${esc(it.note || '')}" aria-label="Note"></td>
      <td><button type="button" class="equipment-action-btn action-delete ki-del" aria-label="Remove material">Remove</button></td>`;
    const name = tr.querySelector('.ki-name');
    name.addEventListener('change', () => {
      const inv = inventory.find(c => c.name.toLowerCase() === name.value.trim().toLowerCase()) || findInventory(name.value);
      tr.dataset.inv = inv ? inv.id : '';
      const badge = tr.querySelector('.ki-link');
      badge.textContent = inv ? 'In inventory' : 'Not in inventory';
      badge.classList.toggle('ok', !!inv);
      if (inv) {
        if (inv.category) tr.querySelector('.ki-cat').value = inv.category;
        if (inv.unit && !tr.querySelector('.ki-unit').value) tr.querySelector('.ki-unit').value = inv.unit;
      }
    });
    tr.querySelector('.ki-del').addEventListener('click', () => tr.remove());
    return tr;
  }

  async function saveExperiment() {
    const status = $('kit-save-status'); const btn = $('kit-save');
    const title = $('kit-e-title').value.trim();
    if (!title) { status.textContent = 'Enter the experiment title.'; $('kit-e-title').focus(); return; }
    const rows = [...document.querySelectorAll('#kit-item-rows tr')];
    const items = [];
    for (const [i, tr] of rows.entries()) {
      const name = tr.querySelector('.ki-name').value.trim();
      if (!name) continue;
      const qtyRaw = tr.querySelector('.ki-qty').value;
      items.push({
        kind: tr.querySelector('.ki-kind').value, item_name: name, inventory_item_id: tr.dataset.inv || null,
        category: tr.querySelector('.ki-cat').value, qty: qtyRaw === '' ? null : Number(qtyRaw),
        unit: tr.querySelector('.ki-unit').value.trim() || null, basis: tr.querySelector('.ki-basis').value,
        note: tr.querySelector('.ki-note').value.trim() || null, sort_order: i + 1,
      });
    }
    btn.disabled = true; status.textContent = 'Saving…';
    try {
      const fields = {
        name: title, exp_no: $('kit-e-no').value.trim() || null,
        default_groups: Math.max(1, Math.min(50, parseInt($('kit-e-groups').value, 10) || 8)),
        active: $('kit-e-active').checked,
      };
      let id = currentExp.id;
      if (id) {
        const { error } = await db.from('experiments').update(fields).eq('id', id);
        if (error) throw error;
      } else {
        id = 'exp-' + Date.now();
        const { error } = await db.from('experiments').insert({ id, subject_id: currentExp.subject_id, ...fields });
        if (error) throw error;
      }
      // Insert the new list first; only then remove the old rows, so a failure never empties a kit.
      const { data: old } = await db.from('experiment_items').select('id').eq('experiment_id', id);
      if (items.length) {
        const { error } = await db.from('experiment_items').insert(items.map(x => ({ ...x, experiment_id: id })));
        if (error) throw error;
      }
      const oldIds = (old || []).map(r => r.id);
      if (oldIds.length) {
        const { error } = await db.from('experiment_items').delete().in('id', oldIds);
        if (error) throw error;
      }
      try { await addAuditEntry('Experiment Kit Edited', title + ': ' + items.length + ' materials'); } catch (_) {}
      status.textContent = 'Saved.';
      await renderExperimentList();
      const fresh = (await getExperimentsBySubject(currentExp ? currentExp.subject_id : $('kit-subject').value, true)).find(e => e.id === id);
      if (fresh) await openExperiment(fresh);
      $('kit-save-status').textContent = 'Saved.';
    } catch (err) {
      console.error(err);
      status.textContent = 'Not saved: ' + (err.message || err);
    } finally {
      if ($('kit-save')) $('kit-save').disabled = false;
    }
  }

  // Jump from Settings → Experiments to this experiment's materials editor.
  window.openKitMaterials = async function (subjectId, expId) {
    const tab = document.querySelector('.settings-tab[data-panel="kits"]');
    if (tab) tab.click();
    $('kit-subject').value = subjectId;
    await renderExperimentList();
    const exp = (await getExperimentsBySubject(subjectId, true)).find(x => x.id === expId);
    if (exp) await openExperiment(exp);
    ($('kit-editor') || $('kit-subject')).scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  /* ═════════════ init ═════════════ */
  /* ═════════════ 3. BULK LINK UNLINKED MATERIALS ═════════════ */

  let unlinkedGroups = [];

  async function fetchUnlinked() {
    // Page through in 1000-row windows (Supabase's default limit). Stop on a short page, on a
    // server that ignores the range (returns more than asked), or after 50k rows as a safety cap.
    const rows = []; const seen = new Set();
    for (let from = 0; from < 50000; from += 1000) {
      const { data, error } = await db.from('experiment_items')
        .select('id,item_name,kind,unit,experiment_id').is('inventory_item_id', null).order('id').range(from, from + 999);
      if (error) throw error;
      const fresh = (data || []).filter(r => !seen.has(r.id));
      fresh.forEach(r => seen.add(r.id));
      rows.push(...fresh);
      if (!data || data.length !== 1000 || fresh.length === 0) break;
    }
    const groups = new Map();
    for (const r of rows) {
      const key = String(r.item_name || '').trim().toLowerCase().replace(/\s+/g, ' ');
      if (!key) continue;
      const g = groups.get(key) || { label: r.item_name.trim(), names: new Set(), units: new Set(), kinds: new Set(), exps: new Set(), count: 0 };
      g.names.add(r.item_name); if (r.unit) g.units.add(r.unit); g.kinds.add(r.kind); g.exps.add(r.experiment_id); g.count++;
      groups.set(key, g);
    }
    unlinkedGroups = [...groups.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }

  function renderUnlinked() {
    const box = $('kit-unlinked'); if (!box) return;
    const q = ($('kit-link-filter')?.value || '').trim().toLowerCase();
    const list = unlinkedGroups.filter(g => !q || g.label.toLowerCase().includes(q));
    const total = unlinkedGroups.reduce((n, g) => n + g.count, 0);
    $('kit-link-summary').textContent = unlinkedGroups.length
      ? `${unlinkedGroups.length} names · ${total} materials not linked${q ? ` · showing ${list.length}` : ''}`
      : 'Every material is linked to inventory.';
    if (!list.length) { box.innerHTML = unlinkedGroups.length ? '<p class="kit-muted" style="padding:12px;">No names match.</p>' : ''; return; }
    box.innerHTML = `<table class="equipment-table kit-link-table">
      <thead><tr><th>Name in the kits</th><th>Used</th><th>Kit unit</th><th>Inventory item</th><th></th></tr></thead>
      <tbody>${list.slice(0, 150).map(g => {
        const i = unlinkedGroups.indexOf(g);
        const guess = K.matchInventory(g.label, inventory);
        return `<tr data-i="${i}">
          <td><strong>${esc(g.label)}</strong><span class="kit-muted" style="display:block;font-size:11px;">${[...g.kinds].join(', ')}</span></td>
          <td class="num">${g.count} in ${g.exps.size} exp${g.exps.size > 1 ? 's' : ''}</td>
          <td>${esc([...g.units].join(', ') || '—')}</td>
          <td><input type="text" class="kl-pick" list="kit-inventory-list" value="${guess ? esc(guess.name) : ''}" placeholder="Type to search inventory" aria-label="Inventory item for ${esc(g.label)}"><span class="kl-hint"></span></td>
          <td><button type="button" class="btn btn-secondary btn-sm kl-link">Link all ${g.count}</button></td>
        </tr>`;
      }).join('')}</tbody></table>${list.length > 150 ? `<p class="kit-muted" style="padding:10px;">Showing the 150 most used. Use Find to narrow down.</p>` : ''}`;
    box.querySelectorAll('tr[data-i]').forEach(tr => {
      const g = unlinkedGroups[Number(tr.dataset.i)];
      const input = tr.querySelector('.kl-pick'); const hint = tr.querySelector('.kl-hint');
      const check = () => {
        const inv = inventory.find(c => c.name.toLowerCase() === input.value.trim().toLowerCase());
        const kitUnits = [...g.units].map(u => u.toLowerCase());
        hint.textContent = !input.value.trim() ? '' : !inv ? 'Choose a name from the inventory list.'
          : (inv.unit && kitUnits.length && !kitUnits.includes(String(inv.unit).toLowerCase()) && !/glassware|equipment/i.test(inv.category || ''))
            ? `Stock is counted in ${inv.unit}; release will ask staff to deduct manually.` : '';
      };
      input.addEventListener('input', check); check();
      tr.querySelector('.kl-link').addEventListener('click', async e => {
        const btn = e.currentTarget;
        const inv = inventory.find(c => c.name.toLowerCase() === input.value.trim().toLowerCase());
        if (!inv) { hint.textContent = 'Choose a name from the inventory list.'; input.focus(); return; }
        btn.disabled = true; btn.textContent = 'Linking…';
        const { error } = await db.from('experiment_items').update({ inventory_item_id: inv.id, category: inv.category || null })
          .in('item_name', [...g.names]).is('inventory_item_id', null);
        if (error) { btn.disabled = false; btn.textContent = `Link all ${g.count}`; hint.textContent = 'Not saved: ' + error.message; return; }
        try { await addAuditEntry('Experiment Kit Linked', `${g.label} → ${inv.name} (${g.count} materials)`); } catch (_) {}
        tr.querySelector('td:last-child').innerHTML = `<span class="kl-done">Linked ✓</span>`;
        input.disabled = true;
        unlinkedGroups.splice(unlinkedGroups.indexOf(g), 1);
        const total = unlinkedGroups.reduce((n, x) => n + x.count, 0);
        $('kit-link-summary').textContent = `${unlinkedGroups.length} names · ${total} materials not linked`;
      });
    });
  }

  async function loadUnlinked() {
    try { await fetchUnlinked(); renderUnlinked(); }
    catch (err) { console.error(err); if ($('kit-link-summary')) $('kit-link-summary').textContent = 'Could not load: ' + (err.message || err); }
  }

  async function init() {
    if (!$('panel-kits')) return;
    $('kit-file').addEventListener('change', e => onFile(e.target.files[0]));
    $('kit-subject').addEventListener('change', renderExperimentList);
    $('kit-link-filter')?.addEventListener('input', renderUnlinked);
    await loadRefs();
    await renderBrowser();
    await loadUnlinked();
  }
  document.addEventListener('DOMContentLoaded', init);
})();
