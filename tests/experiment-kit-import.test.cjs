// Parser tests against the professors' real "LAB Summary of materials" workbook
// (tests/fixtures/lab-summary-of-materials.json = every sheet as SheetJS rows).
const test = require('node:test');
const assert = require('node:assert/strict');
const K = require('../js/experiment-kit-import.js');
const sheets = require('./fixtures/lab-summary-of-materials.json');

const parsed = K.parseWorkbook(sheets);
const subject = code => parsed.subjects.find(s => s.code === code);
const exp = (code, no) => subject(code).experiments.find(e => e.no === no);
const item = (code, no, name) => exp(code, no).items.find(i => i.name.toLowerCase().startsWith(name.toLowerCase()));

test('reads every sheet as a subject with a course code', () => {
  assert.equal(parsed.subjects.length, 17);
  const codes = parsed.subjects.map(s => s.code).sort();
  assert.deepEqual(codes, ['PBIO211', 'PBOT111', 'PCOG221', 'PCOL312', 'PCOS311', 'PCQA111', 'PDDS211', 'PHAN111',
    'PHAN212', 'PHCL111', 'PHCT311', 'PHMP211', 'PMOC311', 'PMQA311', 'PORG121', 'PPAR211', 'PRES']);
  const experiments = parsed.subjects.reduce((n, s) => n + s.experiments.length, 0);
  const items = parsed.subjects.reduce((n, s) => n + s.experiments.reduce((m, e) => m + e.items.length, 0), 0);
  assert.ok(experiments >= 210 && experiments <= 235, `experiments=${experiments}`);
  assert.ok(items > 2500, `items=${items}`);
  assert.equal(subject('PCOG221').name, 'Pharmacognosy');
  assert.equal(subject('PCOL312').semester, '1st Semester');
});

test('separate UOM columns (PMOC311)', () => {
  const e = exp('PMOC311', '2');
  assert.equal(e.title, 'CHEMICAL REACTIONS OF ORGANIC COMPOUNDS');
  assert.equal(e.defaultGroups, 10);
  assert.deepEqual(pick(item('PMOC311', '2', '10% Ferric chloride')), { qty: 5, unit: 'mL', basis: 'per_group', category: 'Liquid Reagent' });
  assert.deepEqual(pick(item('PMOC311', '2', 'Beaker')), { qty: 5, unit: 'pcs', basis: 'per_group', category: 'Glassware' });
  assert.equal(item('PMOC311', '2', 'Water bath').basis, 'per_class');
});

test('unit written inside the quantity (PPAR211, Physical Pharmacy)', () => {
  const clove = item('PPAR211', '1', 'Clove Oil');
  assert.deepEqual(pick(clove), { qty: 100, unit: 'mL', basis: 'per_group', category: 'Liquid Reagent' });
  assert.equal(clove.note, '');
  assert.deepEqual(pick(item('PPAR211', '6', 'Calcium stearate')), { qty: 0.4, unit: 'g', basis: 'per_group', category: 'Solid Reagent' });
  assert.equal(item('PPAR211', '6', 'Micropipettes').qty, null);
});

test('per student / per class / per group wording (PCOL312)', () => {
  assert.deepEqual(pick(item('PCOL312', '2', 'Laboratory Mouse')), { qty: 1, unit: '', basis: 'per_student', category: 'Solid Reagent' });
  assert.deepEqual(pick(item('PCOL312', '2', '1 ml tuberculin syringe')), { qty: 2, unit: 'pcs', basis: 'per_student', category: 'Equipment' });
  assert.equal(item('PCOL312', '6', 'Rabbits').qty, 4);
  assert.equal(item('PCOL312', '6', 'Rabbits').basis, 'per_group');
  assert.equal(item('PCOL312', '6', 'Nitroglycerin').basis, 'per_class');
  assert.equal(subject('PCOL312').experiments.length, 17);
});

test('preparations sharing one item list stay one experiment (PDDS211)', () => {
  const sol = exp('PDDS211', '10');
  assert.equal(sol.title, 'SOLUTIONS (SIMPLE SYRUP; MAGNESIUM CITRATE SOLUTION)');
  assert.ok(sol.items.some(i => i.name === 'Magnesium citrate'));
  assert.ok(sol.items.some(i => i.name === 'Sucrose'), 'leading ** stripped');
  assert.equal(subject('PDDS211').experiments.length, 14);
});

test('lettered sub-experiments become 7A/7B/7C (PHAN212)', () => {
  const titles = subject('PHAN212').experiments.filter(e => e.no.startsWith('7')).map(e => `${e.no} ${e.title}`);
  assert.deepEqual(titles, [
    '7A Powders and Granules: A. Angle of Repose',
    '7B Powders and Granules: B. Bulk and Tapped Density',
    '7C Powders and Granules: C. Particle size Analysis',
  ]);
});

test('number above a merged title still groups the right rows (PCOS311)', () => {
  const e = exp('PCOS311', '2');
  assert.equal(e.title, 'PREPARATION OF SOLID SHAMPOO');
  assert.ok(e.items.some(i => i.name.startsWith('Aspirator')));
});

test('PMQA "Total dosage form" rows are not items', () => {
  const all = subject('PMQA311').experiments.flatMap(e => e.items);
  assert.ok(!all.some(i => /^total/i.test(i.name)));
});

test('Excel errors are flagged, never guessed', () => {
  const coconut = item('PBIO211', '3', 'Coconut Oil');
  assert.equal(coconut.qty, null);
  assert.ok(parsed.warnings.some(w => /Coconut Oil/.test(w.message) && /#REF!/.test(w.message)));
});

test('parseQuantity edge cases', () => {
  assert.deepEqual(q('5.0'), { qty: 5, unit: '', basis: 'per_group' });
  assert.deepEqual(q('0.4 g'), { qty: 0.4, unit: 'g', basis: 'per_group' });
  assert.deepEqual(q('20 gtts'), { qty: 20, unit: 'gtt', basis: 'per_group' });
  assert.deepEqual(q('1/4 cup'), { qty: 0.25, unit: 'cup', basis: 'per_group' });
  assert.deepEqual(q('4/grp'), { qty: 4, unit: '', basis: 'per_group' });
  assert.deepEqual(q('1/room'), { qty: 1, unit: '', basis: 'per_class' });
  assert.deepEqual(q('per class'), { qty: 1, unit: '', basis: 'per_class' });
  assert.deepEqual(q('individual'), { qty: 1, unit: '', basis: 'per_student' });
  assert.equal(K.parseQuantity('#REF!').qty, null);
  assert.equal(K.parseQuantity('').qty, null);
});

test('kitQuantity totals', () => {
  assert.equal(K.kitQuantity({ qty: 5, basis: 'per_group' }, 6, 30), 30);
  assert.equal(K.kitQuantity({ qty: 2, basis: 'per_student' }, 6, 30), 60);
  assert.equal(K.kitQuantity({ qty: 1, basis: 'per_class' }, 6, 30), 1);
  assert.equal(K.kitQuantity({ qty: 0.4, basis: 'per_group' }, 3, 0), 1.2);
  assert.equal(K.kitQuantity({ qty: null, basis: 'per_group' }, 6, 30), null);
});

test('matchKey links Excel names to inventory names', () => {
  assert.equal(K.matchKey('Beaker (250mL, glass)'), K.matchKey('beaker'));
  assert.equal(K.matchKey('  Castor  oil '), 'castor oil');
  assert.equal(K.matchKey('10% Ferric chloride '), '10% ferric chloride');
});

test('matchInventory links only when certain (real inventory names)', () => {
  const inv = [
    'Beaker (1000ml, glass)', 'Beaker (250ml, glass)', 'Beaker (500ml, glass)', 'Beaker (50ml, glass)',
    'Test tube (small)', 'Test tube brush', 'Test tube holder', 'Test tube rack (Wood 12 holes)',
    'Graduated cylinder (100ml)', 'Graduated cylinder (50ml)', 'Graduated cylinder (10ml)',
    'Spatula (porcelain)', 'Spatula (stainless)', 'Stirring rod (glass)', 'Stirring rod (stainless)',
    'Pipette (10ml)', 'Pipette (1ml)', 'Ethyl alcohol 70 %', 'Ethyl alcohol 95%', 'Sulfuric acid', 'Ferric chloride',
  ].map((name, i) => ({ id: 'i' + i, name }));
  const m = n => (K.matchInventory(n, inv) || {}).name || null;
  assert.equal(m('Test tubes'), 'Test tube (small)', 'plural + only one plain test tube');
  assert.equal(m('Test tubes brush'), 'Test tube brush', 'Excel spelling of the brush');
  assert.equal(m('Test tubes holder'), 'Test tube holder');
  assert.equal(m('Porcelain Spatula'), 'Spatula (porcelain)', 'any word order');
  assert.equal(m('Graduated Cylider (50ml)'), 'Graduated cylinder (50ml)', 'typo + size');
  assert.equal(m('Beaker (250mL)'), 'Beaker (250ml, glass)', 'size picks the right beaker');
  assert.equal(m('Beaker'), null, 'no size + four beaker sizes = staff must choose');
  assert.equal(m('Beaker 100mL'), null, 'size not in stock = no link');
  assert.equal(m('Pipet'), null, 'two pipette sizes = no link');
  assert.equal(m('Ethyl alcohol'), null, '70% vs 95% = no link');
  assert.equal(m('Sulfuric acid'), 'Sulfuric acid');
  assert.equal(m('10% Ferric chloride'), null, 'a solution is not the solid stock');
});

function pick(i) { return { qty: i.qty, unit: i.unit, basis: i.basis, category: i.category }; }
function q(s) { const r = K.parseQuantity(s); return { qty: r.qty, unit: r.unit, basis: r.basis }; }
