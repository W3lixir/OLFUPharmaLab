/**
 * PharmaLab — Experiment kit import (professors' "Summary of materials" Excel)
 *
 * Pure functions, no DOM / no Supabase. Works in the browser (window.ExperimentKits)
 * and in Node tests (module.exports).
 *
 *   parseWorkbook({ sheetName: rows[][] , ... })  -> { subjects: [...], warnings: [...] }
 *   kitQuantity(item, groups, students)          -> number | null
 *
 * Each sheet = one subject. The layout differs between sheets, so columns are found by
 * header text, and experiments are split by blank rows (titles are sometimes merged
 * cells that land a few rows below the experiment number).
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ExperimentKits = api;
})(typeof self !== 'undefined' ? self : this, function () {

  const clean = v => String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
  const upper = v => clean(v).toUpperCase();

  /* ── Units ─────────────────────────────────────────────── */
  const UNIT_MAP = {
    ml: 'mL', mls: 'mL', cc: 'mL', l: 'L', liter: 'L', liters: 'L', litre: 'L',
    g: 'g', gm: 'g', gms: 'g', gram: 'g', grams: 'g', kg: 'kg', mg: 'mg', ug: 'µg', 'µg': 'µg',
    pc: 'pcs', pcs: 'pcs', piece: 'pcs', pieces: 'pcs', unit: 'pcs', units: 'pcs', set: 'set', sets: 'set',
    gtt: 'gtt', gtts: 'gtt', drop: 'gtt', drops: 'gtt', tab: 'tab', tabs: 'tab', tablet: 'tab', tablets: 'tab',
    cap: 'cap', caps: 'cap', capsule: 'cap', capsules: 'cap', cup: 'cup', cups: 'cup', box: 'box', bottle: 'bottle', pack: 'pack',
  };
  function normUnit(u) {
    const k = clean(u).toLowerCase().replace(/\.$/, '');
    if (!k) return '';
    return UNIT_MAP[k] || clean(u);
  }

  /* ── Quantity cell → { qty, unit, basis, note } ──────────── */
  function parseQuantity(raw) {
    const text = clean(raw);
    const low = text.toLowerCase();
    if (!text) return { qty: null, unit: '', basis: 'per_group', note: '' };
    if (/#ref!|#value!|#n\/a|#div/i.test(text)) return { qty: null, unit: '', basis: 'per_group', note: '', invalid: true };

    let basis = 'per_group';
    if (/\bindividual\b|\bind\b|per student|\/student/.test(low)) basis = 'per_student';
    else if (/per class|\/class|\/room|per room|per section/.test(low)) basis = 'per_class';

    // number (decimal or simple fraction) + optional unit
    const m = low.match(/(\d+(?:\.\d+)?)(?:\s*\/\s*(\d+(?:\.\d+)?))?\s*([a-zµ]+\.?)?/);
    if (m) {
      let qty = Number(m[1]);
      let unit = m[3] || '';
      if (m[2] && !/^(grp|group|room|class)/.test(unit)) qty = qty / Number(m[2]);        // 1/4 cup
      if (/^(grp|group|grps|groups|per|ind|individual|class|room)$/.test(unit)) unit = '';  // "4/grp", "2pcs ind"
      if (m[2] && /^(grp|group)/.test(low.slice(low.indexOf('/') + 1).trim())) qty = Number(m[1]);
      const fullyNumeric = /^\d+(?:\.\d+)?$/.test(text);
      const recognised = fullyNumeric || unit === '' || UNIT_MAP[unit.replace(/\.$/, '')] || /^(\d+(?:\.\d+)?)\s*[a-zµ]+\.?$/i.test(text);
      return { qty: Number.isFinite(qty) ? Math.round(qty * 1000) / 1000 : null, unit: normUnit(unit), basis, note: recognised && basis === 'per_group' ? '' : text };
    }
    if (basis !== 'per_group') return { qty: 1, unit: '', basis, note: text };
    return { qty: null, unit: '', basis, note: text, unparsed: true };
  }

  /* ── Category guess for the inventory picker ─────────────── */
  const GLASS = /beaker|flask|pipet|pipette|burette|buret|cylinder|test ?tube|tube|funnel|watch glass|glass|slide|cover ?slip|petri|dish|bottle|vial|ampoule|condenser|dropper|capillary|crucible|casserole|evaporating|stirring rod|rod|thermometer|pycnometer|hydrometer|desiccator|dessicator|jar|beral/;
  function guessCategory(kind, name, unit) {
    const n = clean(name).toLowerCase();
    if (kind === 'equipment') return GLASS.test(n) ? 'Glassware' : 'Equipment';
    // The samples column also lists supplies and animals; they are not reagents.
    if (/syringe|glove|swab|tray|flashlight|cotton|holder|paper|container|cardboard|gauze|tape|mask|needle|lancet|towel|tissue|strip|plate|board|pot\b|net\b|wire|adhesive/.test(n)) return 'Equipment';
    if (/disc|disk/.test(n) && /antibiotic|sensitivity|amoxi|penicillin|tetracycl|chloram|gentamicin/.test(n)) return 'Antibiotic Disc';
    const u = (unit || '').toLowerCase();
    if (['ml', 'l', 'gtt'].includes(u)) return 'Liquid Reagent';
    if (['g', 'kg', 'mg', 'µg'].includes(u)) return 'Solid Reagent';
    return /solution|acid|alcohol|oil|water|reagent|syrup|spirit|tincture|ether|acetone|chloroform|ammonia|glycerin|ethanol|methanol/.test(n) ? 'Liquid Reagent' : 'Solid Reagent';
  }

  /* ── Header discovery ────────────────────────────────────── */
  function findHeader(rows) {
    for (let r = 0; r < Math.min(rows.length, 40); r++) {
      const cells = (rows[r] || []).map(upper);
      if (cells.some(c => c.includes('EXPERIMENT NO'))) return r;
    }
    return -1;
  }
  function columns(header) {
    const H = header.map(upper);
    const find = (pred, from = 0, to = H.length) => { for (let i = from; i < to; i++) if (pred(H[i])) return i; return -1; };
    const no = find(h => h.includes('EXPERIMENT NO'));
    const title = find(h => h.includes('EXPERIMENT TITLE') || h === 'TITLE');
    const objectives = find(h => h.includes('OBJECTIVE'));
    const eq = find(h => h.includes('APPARATUS') || h.includes('EQUIPMENT') || h.includes('EQUIMENT'));
    const ch = find(h => h.includes('CHEMICAL') || h.includes('SAMPLE'));
    const block = (start, end) => ({
      name: start,
      qty: find(h => h.includes('QUANTITY/GROUP') || h.includes('QUANTITY / GROUP') || h === 'QUANTITY', start + 1, end),
      unit: find(h => h === 'UOM' || h === 'UNIT', start + 1, end),
      groups: find(h => h.includes('NO. OF GROUP') || h.includes('NO OF GROUP'), start + 1, end),
    });
    return {
      no, title, objectives,
      equipment: eq >= 0 ? block(eq, ch > eq ? ch : H.length) : null,
      chemical: ch >= 0 ? block(ch, H.length) : null,
    };
  }

  /* ── Subject meta (rows above the header) ─────────────────── */
  function subjectMeta(rows, headerIdx, sheetName) {
    const meta = {};
    for (let r = 0; r < headerIdx; r++) {
      const row = rows[r] || [];
      const key = upper(row[0]);
      const val = clean(row.slice(1).find(v => clean(v)) || '');
      if (key && val) meta[key] = val;
    }
    const subjectText = meta['SUBJECT'] || '';
    const courseCode = (meta['COURSE CODE'] || '').replace(/\bLAB\b/ig, '').replace(/\s+/g, '').toUpperCase();
    const sheet = clean(sheetName).toUpperCase().replace(/\s+/g, '');
    let code = '';
    if (/^[A-Z]{3,5}\d{3}$/.test(courseCode)) code = courseCode;
    else {
      const letters = (sheet.match(/^[A-Z]{3,5}/) || subjectText.toUpperCase().replace(/\s+/g, '').match(/^[A-Z]{3,5}/) || [''])[0];
      const digits = ((courseCode.match(/\d{3}/) || [])[0]) || ((sheet.match(/\d{3}/) || [])[0]) || '';
      code = letters + digits;
    }
    const descriptive = subjectText && subjectText.replace(/\s+/g, '').toUpperCase() !== code.replace(/\d+$/, '') && !/^[A-Z]{3,5}\d*$/.test(subjectText.replace(/\s+/g, '').toUpperCase());
    return {
      code,
      name: descriptive ? titleCase(subjectText.replace(/\bLAB\b\.?$/i, '').trim()) : '',
      yearLevel: titleCase(meta['YEAR LEVEL'] || ''),
      semester: titleCase(meta['SEMESTER'] || ''),
    };
  }
  function titleCase(s) {
    const t = clean(s);
    if (!t || t !== t.toUpperCase()) return t;
    return t.toLowerCase().replace(/\b([a-z])/g, (m, c) => c.toUpperCase()).replace(/\b(Of|And|With|The|In|On|For)\b/g, w => w.toLowerCase()).replace(/^./, c => c.toUpperCase());
  }
  function normNo(v) {
    const t = clean(v);
    if (!t) return '';
    if (/^\d+\.0+$/.test(t)) return String(parseInt(t, 10));
    return t;
  }

  /* ── One sheet → subject ─────────────────────────────────── */
  function parseSheet(sheetName, rows) {
    const warnings = [];
    const h = findHeader(rows);
    if (h < 0) return { subject: null, warnings: [{ sheet: sheetName, message: 'No "EXPERIMENT NO" header row found; sheet skipped.' }] };
    const cols = columns(rows[h]);
    const meta = subjectMeta(rows, h, sheetName);
    const subject = { sheet: clean(sheetName), code: meta.code, name: meta.name, yearLevel: meta.yearLevel, semester: meta.semester, experiments: [] };

    // Split data rows into blocks: a fully blank row ends a block, and a new experiment
    // number starts one (some sheets have no blank rows between experiments). A number
    // that appears before any title/number in the block (merged cells) does not split.
    const blocks = []; let cur = [];
    const hasHead = blk => blk.some(x => clean((x.row || [])[cols.no]) || clean((x.row || [])[cols.title]));
    for (let r = h + 1; r < rows.length; r++) {
      const row = rows[r] || [];
      const empty = !row.some(v => clean(v));
      if (empty) { if (cur.length) { blocks.push(cur); cur = []; } continue; }
      const no = cols.no >= 0 ? clean(row[cols.no]) : '';
      const title = cols.title >= 0 ? clean(row[cols.title]) : '';
      // New numbered experiment, or a lettered sub-experiment title ("B. Bulk and Tapped Density").
      // Letters in the number column (PDDS "A", "B") are preparations sharing one item list: no split.
      const startsNew = /^\d/.test(no) || /^[A-Z]\.\s+/.test(title);
      if (startsNew && cur.length && hasHead(cur)) { blocks.push(cur); cur = []; }
      cur.push({ r: r + 1, row });
    }
    if (cur.length) blocks.push(cur);

    let lastNumericNo = '';
    let parentTitle = '';
    let current = null;

    const cell = (row, c) => (c >= 0 ? clean(row[c]) : '');
    const addItems = (exp, block) => {
      for (const { r, row } of block) {
        for (const kind of ['equipment', 'chemical']) {
          const b = cols[kind]; if (!b) continue;
          let name = cell(row, b.name).replace(/^[-–•*\s]+/, '').replace(/\*+$/, '').trim();
          if (!name || /^total\b/i.test(name) || /^n\/?a$/i.test(name)) continue;
          const q = parseQuantity(cell(row, b.qty));
          const unitCol = normUnit(cell(row, b.unit));
          const unit = unitCol || q.unit || (kind === 'equipment' ? 'pcs' : '');
          const g = parseFloat(cell(row, b.groups));
          if (Number.isFinite(g) && g > 0) exp._groups.push(g);
          if (q.invalid) warnings.push({ sheet: subject.sheet, row: r, message: `"${name}": quantity cell is an Excel error (${cell(row, b.qty)}). Set it in Settings.` });
          else if (q.unparsed) warnings.push({ sheet: subject.sheet, row: r, message: `"${name}": could not read quantity "${cell(row, b.qty)}".` });
          exp.items.push({
            kind, name, qty: q.qty, unit, basis: q.basis, note: q.note,
            category: guessCategory(kind, name, unit),
          });
        }
      }
    };

    for (const block of blocks) {
      const nos = block.map(x => normNo(cell(x.row, cols.no))).filter(n => /^\d/.test(n) || n.length > 1);
      const titles = block.map(x => cell(x.row, cols.title)).filter(Boolean);
      const objectives = block.map(x => cell(x.row, cols.objectives)).filter(Boolean);
      const no = nos[0] || '';
      const title = titles[0] || '';

      if (!no && !title) {
        // continuation of the previous experiment (e.g. PMQA "Total dosage form" rows)
        if (current) addItems(current, block);
        continue;
      }

      let expNo = no;
      let expTitle = title;
      const subs = titles.slice(1);
      const letterNo = /^[A-Z]$/i.test(no);
      const letterTitle = /^[A-Z]\.\s+/.test(title);

      if (/^\d+[A-Z]?$/i.test(no) && !letterNo) { lastNumericNo = no.replace(/[A-Z]$/i, ''); parentTitle = title; }

      if (letterNo || (!no && letterTitle)) {
        // sub-experiment of the last numbered heading: 7A "Powders and Granules: A. Angle of Repose"
        const letter = letterNo ? no.toUpperCase() : title[0].toUpperCase();
        expNo = lastNumericNo + letter;
        expTitle = (parentTitle ? parentTitle + ': ' : '') + title;
      } else if (no && subs.length && /^[A-Z]\.\s+/.test(subs[0])) {
        // heading row followed directly by "A. ..." in the same block
        parentTitle = title;
        expNo = lastNumericNo + subs[0][0].toUpperCase();
        expTitle = title + ': ' + subs[0];
        subs.shift();
      }

      const exp = {
        no: expNo,
        title: subs.length && !letterTitle ? `${expTitle} (${subs.join('; ')})` : expTitle || `Experiment ${expNo}`,
        objectives: objectives.join('\n'),
        defaultGroups: 8,
        items: [],
        _groups: [],
      };
      addItems(exp, block);

      // A numbered heading with no items whose children follow is just a label: skip it.
      if (!exp.items.length && no && !letterNo) { parentTitle = title; current = exp; subject.experiments.push(exp); continue; }
      subject.experiments.push(exp);
      current = exp;
    }

    // Drop empty parent headings that have lettered children; finalise defaults.
    subject.experiments = subject.experiments.filter((e, i, all) => {
      if (e.items.length) return true;
      const next = all[i + 1];
      return !(next && next.no && next.no.startsWith(e.no) && /[A-Z]$/i.test(next.no));
    });
    for (const e of subject.experiments) {
      const counts = {};
      e._groups.forEach(g => { counts[g] = (counts[g] || 0) + 1; });
      const mode = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
      e.defaultGroups = mode ? Math.round(Number(mode)) : 8;
      delete e._groups;
      e.items = dedupeItems(e.items);
      if (!e.items.length) warnings.push({ sheet: subject.sheet, message: `Experiment ${e.no || ''} "${e.title}" has no materials listed.` });
    }
    if (!subject.code) warnings.push({ sheet: subject.sheet, message: 'Could not determine the subject code; set it in the preview.' });
    return { subject, warnings };
  }

  // Same item listed twice in one experiment (same kind, name, unit, basis) → keep the larger quantity.
  function dedupeItems(items) {
    const out = []; const seen = new Map();
    for (const it of items) {
      const key = [it.kind, it.name.toLowerCase(), it.unit, it.basis].join('|');
      if (seen.has(key)) {
        const prev = seen.get(key);
        if (it.qty != null && (prev.qty == null || it.qty > prev.qty)) prev.qty = it.qty;
        continue;
      }
      seen.set(key, it); out.push(it);
    }
    return out;
  }

  function parseWorkbook(sheets) {
    const subjects = []; const warnings = [];
    for (const [name, rows] of Object.entries(sheets)) {
      const res = parseSheet(name, rows || []);
      warnings.push(...res.warnings);
      if (res.subject) subjects.push(res.subject);
    }
    return { subjects, warnings };
  }

  /* ── Kit totals for the request form ─────────────────────── */
  function kitQuantity(item, groups, students) {
    if (item == null || item.qty == null || item.qty === '') return null;
    const q = Number(item.qty);
    if (!Number.isFinite(q)) return null;
    let n = 1;
    if (item.basis === 'per_student') n = Number(students) || 0;
    else if (item.basis === 'per_class') n = 1;
    else n = Number(groups) || 0;
    return Math.round(q * n * 1000) / 1000;
  }

  // Normalised name used to link Excel items to inventory rows.
  function matchKey(name) {
    return clean(name).toLowerCase()
      .replace(/\(.*?\)/g, ' ')
      .replace(/[^a-z0-9%.]+/g, ' ')
      .replace(/\b(pcs?|pieces?|set ?up|setup)\b/g, ' ')
      .replace(/\s+/g, ' ').trim();
  }

  /* ── Linking kit items to inventory rows ──────────────────
   * Inventory often has several sizes of one item ("Beaker (50ml, glass)", "Beaker (250ml, glass)").
   * A wrong link would deduct the wrong stock, so we only link when the match is certain:
   *   1. same words (any order, typos and plurals fixed): "Porcelain Spatula" = "Spatula (porcelain)"
   *   2. the kit names a size and exactly one row of that item has that size
   *   3. the kit names no size and the inventory has exactly one row of that item
   * Anything else stays unlinked; staff pick the right row in Settings. */
  const TYPOS = [[/\bcylider\b/g, 'cylinder'], [/\bstiring\b/g, 'stirring'], [/\bpipet\b/g, 'pipette'], [/\bpipets\b/g, 'pipette'],
    [/\berlenmeryer\b/g, 'erlenmeyer'], [/\bdessicator\b/g, 'desiccator'], [/\bsitirring\b/g, 'stirring'], [/\bthermometers?\b/g, 'thermometer']];
  const STOP = new Set(['glass', 'pcs', 'pc', 'piece', 'pieces', 'set', 'up', 'setup', 'of', 'the', 'w', 'with', 'and']);
  function sizeOf(name) {
    const m = clean(name).toLowerCase().match(/(\d+(?:\.\d+)?)\s*(ml|l|g|mg|ul|µl|mm|cm)\b/);
    return m ? Number(m[1]) + m[2] : '';
  }
  function words(name, insideParens) {
    let s = clean(name).toLowerCase();
    if (!insideParens) s = s.replace(/\(.*?\)/g, ' ');
    s = s.replace(/(\d+(?:\.\d+)?)\s*(ml|l|g|mg|ul|µl|mm|cm)\b/g, ' ').replace(/[^a-z0-9%.]+/g, ' ');
    TYPOS.forEach(([re, to]) => { s = s.replace(re, to); });
    return s.split(' ').filter(w => w && !STOP.has(w))
      .map(w => (w.length > 3 && /[^s]s$/.test(w) && !/(ss|us|is)$/.test(w) ? w.slice(0, -1) : w)); // tubes -> tube
  }
  const setKey = arr => [...new Set(arr)].sort().join(' ');
  function matchInventory(name, inventory) {
    const list = inventory || [];
    const all = setKey(words(name, true));
    const base = words(name, false).join(' ');
    const size = sizeOf(name);
    const exact = list.filter(r => setKey(words(r.name, true)) === all);
    if (exact.length === 1) return exact[0];
    const sameBase = list.filter(r => words(r.name, false).join(' ') === base);
    if (size) {
      const sized = sameBase.filter(r => sizeOf(r.name) === size);
      return sized.length === 1 ? sized[0] : null;
    }
    return sameBase.length === 1 ? sameBase[0] : null;
  }

  return { parseWorkbook, parseSheet, parseQuantity, guessCategory, normUnit, kitQuantity, matchKey, matchInventory };
});
