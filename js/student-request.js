/**
 * Student Material Request - Form wizard and submission
 * Uses Supabase via supabase-data.js
 */
let currentStep = 1;
const totalSteps = 4;

let requesterType = 'student'; // 'student' | 'professor'

let _chemicals = null;
let currentRequester = null; // set by requireRequester(): { role, email, full_name, ... }

// Experiment kit loaded for the selected experiment: { experiment, items: [...] }
let currentKit = null;
const kitOff = new Set();   // ids of kit items the requester unchecked

/* ── Requester type (Student / Professor) ─────────────────── */

function setRequesterType(type) {
    requesterType = type === 'professor' ? 'professor' : 'student';
    const isStudent = requesterType === 'student';

    document.querySelectorAll('.requester-option').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === requesterType);
    });

    // Show/hide student-only fields (Student Number, Group)
    document.querySelectorAll('.student-only').forEach(el => {
        el.style.display = isStudent ? '' : 'none';
    });
    // Show/hide professor-only fields (Project / Research Title)
    document.querySelectorAll('.professor-only').forEach(el => {
        el.style.display = isStudent ? 'none' : '';
    });

    // Student number is only collected for student requests; professors do not need a faculty number.
    const idGroup = document.getElementById('grp-student-number');
    if (idGroup) idGroup.style.display = isStudent ? '' : 'none';
    const idLabel = document.getElementById('label-id-number');
    if (idLabel) idLabel.innerHTML = 'Student Number <span class="required">*</span>';
    const idInput = document.getElementById('student-number');
    if (idInput) { idInput.placeholder = 'e.g., 2020-12345'; if (!isStudent) idInput.value = ''; }

    // Contact number is only collected for students; professors don't provide one.
    const contactGroup = document.getElementById('grp-contact-number');
    if (contactGroup) contactGroup.style.display = isStudent ? '' : 'none';
    const contactInput = document.getElementById('contact-number');
    if (contactInput && !isStudent) contactInput.value = '';
    const reviewContactRow = document.getElementById('review-contact-row');
    if (reviewContactRow) reviewContactRow.style.display = isStudent ? '' : 'none';

    // Course label: required for student, optional (Department) for professor
    const courseLabel = document.getElementById('label-course');
    if (courseLabel) {
        courseLabel.innerHTML = isStudent
            ? 'Course <span class="required">*</span>'
            : 'Department / Course';
    }
    // Year Level stays for both, but required mark only for students
    const ylLabel = document.getElementById('label-year-level');
    if (ylLabel) {
        ylLabel.innerHTML = isStudent ? 'Year Level <span class="required">*</span>' : 'Year Level';
    }
}

async function getChemicalsForForm() {
    if (!_chemicals) _chemicals = await getRequestItemOptions();
    return _chemicals;
}

const CATEGORY_OPTS = `
<option value="">Select Category</option>
<option value="Liquid Reagent">Liquid Reagent</option>
<option value="Solid Reagent">Solid Reagent</option>
<option value="Glassware">Glassware</option>
<option value="Equipment">Equipment</option>
<option value="Antibiotic Disc">Antibiotic Disc</option>`.trim();

const UNIT_OPTS = `<option value="mL">mL</option><option value="L">L</option><option value="g">g</option><option value="kg">kg</option><option value="pcs">pcs</option>`;

/* ── Dropdown population ──────────────────────────────────── */

async function populateDropdowns() {
    const [sections, courses, yearLevels, groups] = await Promise.all([getSections(), getCourses(), getYearLevels(), getGroups()]);

    const sectionSelect = document.getElementById('section');
    if (sectionSelect) {
        sectionSelect.innerHTML = '<option value="">Select Section</option>' +
            sections.map(s => `<option value="${s.name}">${s.name}</option>`).join('');
    }

    const groupSelect = document.getElementById('group');
    if (groupSelect) {
        groupSelect.innerHTML = '<option value="">Select Group</option>' +
            groups.map(g => `<option value="${g.name}">${g.name}</option>`).join('');
    }

    const courseSelect = document.getElementById('course');
    if (courseSelect) {
        courseSelect.innerHTML = '<option value="">Select Course</option>' +
            courses.map(c => `<option value="${c.name}" data-id="${c.id}">${c.name}</option>`).join('');
    }

    const yearLevelSelect = document.getElementById('year-level');
    if (yearLevelSelect) {
        yearLevelSelect.innerHTML = '<option value="">Select Year Level</option>' +
            yearLevels.map(y => `<option value="${y.name}">${y.name}</option>`).join('');
    }

    await populateSubjectDropdown();
    // Pre-fetch chemicals into cache so first category change is instant
    getChemicalsForForm();
}

async function populateSubjectDropdown() {
    const courseSelect = document.getElementById('course');
    const courseName = courseSelect ? courseSelect.value : '';
    const courses = window.__coursesCache || (window.__coursesCache = await getCourses());
    const course = courses.find(c => c.name === courseName);
    const subjects = course ? await getSubjectsByCourse(course.id) : await getSubjects();

    const subjectSelect = document.getElementById('subject');
    if (subjectSelect) {
        subjectSelect.innerHTML = '<option value="">Select Subject</option>' +
            subjects.map(s => `<option value="${escapeHtml(s.name)}" data-id="${escapeHtml(s.id)}">${escapeHtml(subjectLabel(s))}</option>`).join('');
    }
    await populateActivityDropdown();
    await populateInstructorDropdown();
}

async function populateActivityDropdown() {
    const subjectSelect = document.getElementById('subject');
    const subjectName = subjectSelect ? subjectSelect.value : '';
    const subjectId = subjectSelect?.selectedOptions?.[0]?.dataset?.id || '';
    const experiments = subjectId ? await getExperimentsBySubject(subjectId) : await getExperiments();

    const activitySelect = document.getElementById('activity');
    if (activitySelect) {
        activitySelect.innerHTML = '<option value="">Select Experiment or Activity</option>' +
            experiments.map(e => `<option value="${escapeHtml(e.name)}" data-id="${escapeHtml(e.id)}" data-groups="${Number(e.default_groups) || 8}">${escapeHtml(experimentLabel(e))}</option>`).join('');
    }
    await loadKit();
}

async function populateInstructorDropdown() {
    const subjectSelect = document.getElementById('subject');
    const subjectName = subjectSelect ? subjectSelect.value : '';
    const subjectId = subjectSelect?.selectedOptions?.[0]?.dataset?.id || '';
    // A subject with no instructor linked yet (e.g. newly imported from the Excel) shows everyone.
    let instructors = subjectId ? await getInstructorsBySubject(subjectId) : await getInstructors();
    if (subjectId && instructors.length === 0) instructors = await getInstructors();

    const instructorSelect = document.getElementById('instructor');
    if (instructorSelect) {
        instructorSelect.innerHTML = '<option value="">Select Instructor</option>' +
            instructors.map(i => `<option value="${i.name}">${i.name}</option>`).join('');
    }
}

/* ── Category-first item row ──────────────────────────────── */

const STOCK_SUFFIX = { low: ' (low stock)', out: ' (out of stock)' };

async function onCategoryChange(categorySelect) {
    const row = categorySelect.closest('.item-row');
    const itemSel = row.querySelector('.item-name');
    const category = categorySelect.value;

    if (!category) {
        itemSel.innerHTML = '<option value="">Select Category First</option>';
        itemSel.disabled = true;
        return;
    }

    itemSel.innerHTML = '<option value="">Loading...</option>';
    itemSel.disabled = true;

    const chemicals = await getChemicalsForForm();
    const filtered = chemicals.filter(c => c.category === category);

    itemSel.innerHTML = '<option value="">Select Item</option>' +
        filtered.map(c => `<option value="${escapeHtml(c.name)}" data-id="${escapeHtml(c.id || '')}" data-unit="${escapeHtml(c.unit || 'pcs')}">${escapeHtml(c.name)}${STOCK_SUFFIX[c.stock] || ''}</option>`).join('');
    itemSel.disabled = false;
}

function autoSetUnit(itemSelect) {
    const unit = itemSelect.selectedOptions?.[0]?.dataset?.unit;
    const row = itemSelect.closest('.item-row');
    const unitSel = row?.querySelector('.item-unit');
    if (unit && unitSel) {
        if (!unitSel.querySelector(`option[value="${unit}"]`)) {
            const o = document.createElement('option');
            o.value = unit; o.textContent = unit;
            unitSel.appendChild(o);
        }
        unitSel.value = unit;
    }
}

function buildItemRowHtml() {
    return `<div class="item-row">
        <div class="form-group">
            <label class="form-label">Category <span class="required">*</span></label>
            <select class="form-select item-category" required onchange="onCategoryChange(this)">
                ${CATEGORY_OPTS}
            </select>
        </div>
        <div class="form-group">
            <label class="form-label">Item Name <span class="required">*</span></label>
            <select class="form-select item-name" required disabled>
                <option value="">Select Category First</option>
            </select>
        </div>
        <div class="form-group">
            <label class="form-label">Quantity <span class="required">*</span></label>
            <input type="number" class="form-input item-quantity" placeholder="Qty" min="1" required>
        </div>
        <div class="form-group">
            <label class="form-label">Unit</label>
            <select class="form-select item-unit">${UNIT_OPTS}</select>
        </div>
        <div class="form-group item-reason-group" ${currentKit && currentKit.items.length ? '' : 'hidden'}>
            <label class="form-label">Reason</label>
            <select class="form-select item-reason">${reasonOptions()}</select>
        </div>
        <button type="button" class="btn btn-remove" onclick="this.closest('.item-row').remove()" title="Remove" aria-label="Remove item">✕</button>
    </div>`;
}

async function addItem() {
    const container = document.getElementById('items-container');
    const div = document.createElement('div');
    div.innerHTML = buildItemRowHtml();
    const newRow = div.firstElementChild;
    if (currentKit && currentKit.items.length) newRow.classList.add('has-reason');
    container.appendChild(newRow);
    newRow.querySelector('.item-name').addEventListener('change', function () {
        autoSetUnit(this);
    });
    return newRow;
}

/* ── Experiment kit ───────────────────────────────────────── */

const BASIS_LABEL = { per_group: 'per group', per_student: 'per student', per_class: 'per class' };

function selectedExperimentOption() {
    return document.getElementById('activity')?.selectedOptions?.[0] || null;
}
function groupCount() { return Number(document.getElementById('group-count')?.value) || 0; }
function studentCount() { return Number(document.getElementById('student-count')?.value) || 0; }
function kitNeedsStudents() { return !!(currentKit && currentKit.items.some(i => i.basis === 'per_student')); }

function fmtQty(n) {
    if (n == null) return '';
    return Number.isInteger(n) ? String(n) : String(Math.round(n * 1000) / 1000);
}

async function loadKit() {
    const opt = selectedExperimentOption();
    const expId = opt?.dataset?.id || '';
    const counts = document.getElementById('grp-kit-counts');
    kitOff.clear();
    if (!expId) { currentKit = null; renderKit(); return; }
    let items = [];
    try { items = await getExperimentItems(expId); }
    catch (err) { console.warn('Kit not loaded:', err); items = []; }
    try { await getChemicalsForForm(); } catch (err) { console.warn('Stock flags not loaded:', err); }
    // a newer selection may have happened while loading
    if ((selectedExperimentOption()?.dataset?.id || '') !== expId) return;
    currentKit = { experimentId: expId, defaultGroups: Number(opt.dataset.groups) || 8, items };

    const sel = document.getElementById('group-count');
    const max = Math.max(15, currentKit.defaultGroups);
    const keep = Number(sel.value);
    sel.innerHTML = Array.from({ length: max }, (_, i) => i + 1)
        .map(n => `<option value="${n}">${n} group${n > 1 ? 's' : ''}${n === currentKit.defaultGroups ? ' (standard)' : ''}</option>`).join('');
    sel.value = String(keep && sel.dataset.forExp === expId ? keep : currentKit.defaultGroups);
    sel.dataset.forExp = expId;
    if (counts) counts.hidden = items.length === 0;
    document.getElementById('grp-student-count').hidden = !kitNeedsStudents();
    renderKit();
}

function renderKit() {
    const section = document.getElementById('kit-section');
    const extraHead = document.getElementById('extra-head');
    const list = document.getElementById('kit-list');
    const hasKit = !!(currentKit && currentKit.items.length);
    if (section) section.hidden = !hasKit;
    if (extraHead) extraHead.hidden = !hasKit;
    const counts = document.getElementById('grp-kit-counts');
    if (counts) counts.hidden = !hasKit;

    // Manual rows: show the Reason select only when there is a kit to substitute from.
    document.querySelectorAll('.item-row').forEach(row => {
        row.classList.toggle('has-reason', hasKit);
        const grp = row.querySelector('.item-reason-group');
        if (grp) grp.hidden = !hasKit;
        const sel = row.querySelector('.item-reason');
        if (sel) { const v = sel.value; sel.innerHTML = reasonOptions(); sel.value = [...sel.options].some(o => o.value === v) ? v : ''; }
    });
    // With a kit, the blank starter row is optional: drop it if untouched.
    if (hasKit) {
        document.querySelectorAll('#items-container .item-row').forEach(row => {
            const touched = row.querySelector('.item-category')?.value || row.querySelector('.item-quantity')?.value;
            if (!touched) row.remove();
        });
    }
    const addBtn = document.getElementById('add-item-btn');
    if (addBtn) addBtn.textContent = hasKit ? '+ Add additional / substitute item' : '+ Add Another Item';
    if (!list) return;
    if (!hasKit) { list.innerHTML = ''; return; }

    const g = groupCount(), st = studentCount();
    const sub = document.getElementById('kit-sub');
    if (sub) sub.textContent = `Computed for ${g} group${g === 1 ? '' : 's'}${kitNeedsStudents() ? ` and ${st || '—'} students` : ''}. Uncheck anything you will not need.`;

    const groups = [['chem', 'Chemicals & reagents'], ['glass', 'Glassware'], ['equip', 'Equipment & supplies']];
    const outCount = currentKit.items.filter(it => !kitOff.has(it.id) && kitStock(it) === 'out').length;
    const stockNote = outCount
        ? `<p class="kit-stock-note">${outCount} material${outCount > 1 ? 's are' : ' is'} out of stock. Tap <strong>Request substitute</strong> to ask for a replacement.</p>`
        : '';
    list.innerHTML = stockNote + groups.map(([key, label]) => {
        const rows = currentKit.items.filter(i => kitGroupOf(i) === key);
        if (!rows.length) return '';
        return `<div class="kit-group"><div class="kit-group-label">${label}</div>${rows.map(it => {
            const total = ExperimentKits.kitQuantity(it, g, st);
            const off = kitOff.has(it.id);
            const per = it.qty != null ? `${fmtQty(Number(it.qty))}${it.unit ? ' ' + escapeHtml(it.unit) : ''} ${BASIS_LABEL[it.basis] || ''}` : '';
            // The Excel wording ("per class", "individual", "4/grp") is already shown as the basis.
            const BASIS_WORDING = /^(\d+(\.\d+)?\s*)?(pcs?\s*)?(\/\s*)?(per class|per group|per room|individual|ind|room|grp|group|class)\b/i;
            const note = it.note && !BASIS_WORDING.test(it.note.trim()) ? it.note : '';
            const meta = [per, note].filter(Boolean).map(escapeHtml).join(" · ");
            const stock = kitStock(it);
            const stockHtml = stock === 'out'
                ? `<span class="stock-badge out">Out of stock</span><button type="button" class="kit-sub-btn" data-sub-for="${escapeHtml(it.id)}">Request substitute</button>`
                : stock === 'low' ? '<span class="stock-badge low">Low stock</span>' : '';
            return `<label class="kit-row ${off ? 'is-off' : ''}">
                <input type="checkbox" data-kit-id="${escapeHtml(it.id)}" ${off ? '' : 'checked'} aria-label="Include ${escapeHtml(it.item_name)}">
                <span><span class="kit-name">${escapeHtml(it.item_name)}</span>${meta ? `<span class="kit-meta">${meta}</span>` : ''}${stockHtml ? `<span class="kit-stock">${stockHtml}</span>` : ''}</span>
                <span class="kit-qty ${total == null ? 'as-needed' : ''}">${total == null ? 'as needed' : fmtQty(total) + (it.unit ? ' ' + escapeHtml(it.unit) : '')}</span>
            </label>`;
        }).join('')}</div>`;
    }).join('');
    list.querySelectorAll('input[data-kit-id]').forEach(cb => cb.addEventListener('change', () => {
        cb.checked ? kitOff.delete(cb.dataset.kitId) : kitOff.add(cb.dataset.kitId);
        cb.closest('.kit-row').classList.toggle('is-off', !cb.checked);
        refreshReasonOptions();
    }));
    list.querySelectorAll('.kit-sub-btn').forEach(btn => btn.addEventListener('click', e => {
        e.preventDefault(); e.stopPropagation();
        requestSubstitute(btn.dataset.subFor);
    }));
}

// Inventory stock flag for a kit item (only for items linked to inventory).
function kitStock(it) {
    if (!it.inventory_item_id || !_chemicals) return null;
    const match = _chemicals.find(c => String(c.id) === String(it.inventory_item_id));
    return match ? match.stock || null : null;
}

function kitGroupOf(it) {
    const c = String(it.category || '').toLowerCase();
    if (c === 'glassware') return 'glass';
    if (c === 'equipment') return 'equip';
    if (c) return 'chem';
    return it.kind === 'equipment' ? 'equip' : 'chem';
}

// Out-of-stock kit item: leave it out and open an additional row marked "Substitute for: <item>".
async function requestSubstitute(kitItemId) {
    const it = currentKit && currentKit.items.find(i => String(i.id) === String(kitItemId));
    if (!it) return;
    kitOff.add(it.id);
    renderKit();
    const row = await addItem();
    const reason = row.querySelector('.item-reason');
    if (reason) reason.value = it.item_name;
    scheduleDraftSave();
    row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    row.querySelector('.item-category')?.focus({ preventScroll: true });
}

function reasonOptions() {
    const base = '<option value="">Additional item</option>';
    if (!currentKit || !currentKit.items.length) return base;
    return base + currentKit.items.map(it => `<option value="${escapeHtml(it.item_name)}">Substitute for: ${escapeHtml(it.item_name)}</option>`).join('');
}
function refreshReasonOptions() {
    document.querySelectorAll('.item-reason').forEach(sel => {
        const v = sel.value; sel.innerHTML = reasonOptions();
        sel.value = [...sel.options].some(o => o.value === v) ? v : '';
    });
}

/* ── Step progress ────────────────────────────────────────── */

function updateProgress() {
    for (let i = 1; i <= totalSteps; i++) {
        const indicator = document.getElementById('step-' + i + '-indicator');
        const section   = document.getElementById('step-' + i);
        if (i < currentStep) {
            indicator.classList.add('completed'); indicator.classList.remove('active');
        } else if (i === currentStep) {
            indicator.classList.add('active'); indicator.classList.remove('completed');
        } else {
            indicator.classList.remove('active', 'completed');
        }
        section.classList.toggle('active', i === currentStep);
    }
    document.getElementById('prev-btn').style.display   = currentStep > 1 ? 'inline-flex' : 'none';
    document.getElementById('next-btn').style.display   = currentStep < totalSteps ? 'inline-flex' : 'none';
    document.getElementById('submit-btn').style.display = currentStep === totalSteps ? 'inline-flex' : 'none';
    if (typeof scheduleDraftSave === 'function' && currentRequester) scheduleDraftSave();
}

/* ── Navigation ───────────────────────────────────────────── */

// Returns the problem with a step as a message, or '' when the step is complete.
function stepError(step) {
    if (step === 1) {
        const name       = document.getElementById('student-name').value.trim();
        const studentNum = document.getElementById('student-number').value.trim();
        const contact    = document.getElementById('contact-number').value.trim();
        const course     = document.getElementById('course').value;
        const yearLevel  = document.getElementById('year-level').value;
        if (requesterType === 'professor') return name ? '' : 'Please fill in Full Name.';
        return name && studentNum && contact && course && yearLevel ? '' : 'Please fill in all required fields in Student Information.';
    }
    if (step === 2) {
        const subject    = document.getElementById('subject').value;
        const activity   = document.getElementById('activity').value;
        const dateNeeded = document.getElementById('date-needed').value;
        const timeNeeded = document.getElementById('time-needed').value;
        const timeEnd    = document.getElementById('time-end').value;
        const instructor = document.getElementById('instructor').value;
        const room       = document.getElementById('room-assignment').value;
        if (!subject || !activity || !dateNeeded || !timeNeeded || !timeEnd || !instructor || !room) return 'Please fill in all required fields in Request Details.';
        if (timeEnd <= timeNeeded) return 'Time End must be after Time Start.';
        if (currentKit && currentKit.items.length) {
            if (!groupCount()) return 'Please choose the number of groups.';
            if (kitNeedsStudents() && !(studentCount() >= 1)) return 'Please enter the number of students. Some materials are given per student.';
        }
        return '';
    }
    if (step === 3) {
        let hasValidItem = false;
        let halfFilled = false;
        document.querySelectorAll('.item-row').forEach(item => {
            const category = item.querySelector('.item-category')?.value || '';
            const name     = (item.querySelector('.item-name')?.value || '').trim();
            const qty      = item.querySelector('.item-quantity')?.value;
            if (category && name && qty) hasValidItem = true;
            else if (category || name || qty) halfFilled = true;
        });
        const kitChosen = !!(currentKit && currentKit.items.some(i => !kitOff.has(i.id)));
        if (halfFilled) return 'Please complete or remove the unfinished additional item (category, name, and quantity).';
        if (!hasValidItem && !kitChosen) {
            return currentKit && currentKit.items.length
                ? 'Please keep at least one experiment material checked, or add an item.'
                : 'Please add at least one item with a category, name, and quantity.';
        }
        return '';
    }
    return '';
}

async function nextStep() {
    const err = stepError(currentStep);
    if (err) {
        alert(err);
        if (currentStep === 1) showRequesterFields();
        if (currentStep === 2 && /number of students/.test(err)) document.getElementById('student-count')?.focus();
        return;
    }
    if (currentStep === 2) renderKit();

    if (currentStep < totalSteps) {
        currentStep++;
        updateProgress();
        if (currentStep === 4) updateReviewSummary();
        scrollFormTop();
    }
}

function previousStep() {
    if (currentStep > 1) goToStep(currentStep - 1, false);
}

// Jump back to an earlier step (Edit buttons on the review step).
function goToStep(step, expandDetails = true) {
    if (step < 1 || step >= currentStep) return;
    currentStep = step;
    updateProgress();
    document.getElementById('print-btn').style.display = 'none';
    if (step === 1 && expandDetails) showRequesterFields();
    scrollFormTop();
}

function scrollFormTop() {
    const bar = document.querySelector('.progress-bar');
    if (bar && bar.getBoundingClientRect().top < 0) bar.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ── Submit ───────────────────────────────────────────────── */

function getFormRequestItems() {
    const CAT_ORDER_SUBMIT = ['Liquid Reagent','Solid Reagent','Glassware','Equipment','Antibiotic Disc'];
    const kitItems = [];
    if (currentKit && currentKit.items.length) {
        const g = groupCount(), st = studentCount();
        currentKit.items.forEach(it => {
            if (kitOff.has(it.id)) return;
            const total = ExperimentKits.kitQuantity(it, g, st);
            kitItems.push({
                name: it.item_name,
                quantity: total == null ? '' : String(total),
                unit: it.unit || '',
                category: it.category || (it.kind === 'equipment' ? 'Equipment' : 'Solid Reagent'),
                itemId: it.inventory_item_id || null,
                source: 'kit',
                basis: it.basis,
                perUnitQty: it.qty == null ? null : Number(it.qty),
                note: total == null ? 'as needed' : (it.note || ''),
            });
        });
    }
    const extra = [];
    document.querySelectorAll('.item-row').forEach(item => {
        const category = item.querySelector('.item-category')?.value || '';
        const nameSel  = item.querySelector('.item-name');
        const name     = (nameSel?.value || '').trim();
        const qty      = item.querySelector('.item-quantity')?.value;
        const unit     = item.querySelector('.item-unit')?.value;
        const reason   = item.querySelector('.item-reason')?.value || '';
        const itemId   = nameSel?.selectedOptions?.[0]?.dataset?.id || null;
        if (name && qty && unit) extra.push({
            name, quantity: qty, unit, category, itemId,
            source: currentKit && currentKit.items.length ? 'additional' : undefined,
            substituteFor: reason || undefined,
        });
    });
    extra.sort((a, b) => {
        const ai = CAT_ORDER_SUBMIT.indexOf(a.category); const bi = CAT_ORDER_SUBMIT.indexOf(b.category);
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
    return kitItems.concat(extra);
}

function collectCurrentRequestData(referenceNumber, dateSubmitted) {
    const roomEl   = document.getElementById('room-assignment');
    const roomVal  = roomEl ? roomEl.value : '';
    const roomName = roomEl && roomEl.selectedIndex > 0 ? roomEl.options[roomEl.selectedIndex].text : '';
    const items = getFormRequestItems();
    const firstCategory = items[0]?.category || '';

    return {
        requestId:          referenceNumber || '',
        requesterType:      requesterType,
        studentName:        document.getElementById('student-name').value.trim(),
        studentNumber:      document.getElementById('student-number').value.trim(),
        contactNumber:      document.getElementById('contact-number').value.trim(),
        course:             document.getElementById('course')?.value || '',
        yearLevel:          document.getElementById('year-level').value,
        section:            document.getElementById('section')?.value?.trim() || '',
        group:              document.getElementById('group')?.value?.trim() || '',
        projectTitle:       document.getElementById('project-title')?.value?.trim() || '',
        subject:            document.getElementById('subject')?.value?.trim() || '',
        activity:           document.getElementById('activity')?.value?.trim() || '',
        instructor:         document.getElementById('instructor')?.value?.trim() || '',
        dateNeeded:         document.getElementById('date-needed').value,
        timeNeeded:         document.getElementById('time-needed').value,
        timeEnd:            document.getElementById('time-end').value,
        experimentId:       selectedExperimentOption()?.dataset?.id || '',
        groupCount:         currentKit && currentKit.items.length ? groupCount() : null,
        studentCount:       currentKit && currentKit.items.length && kitNeedsStudents() ? studentCount() : null,
        roomAssignment:     roomVal,
        roomAssignmentName: roomName || 'AMS 204',
        requestType:        firstCategory || 'mixed',
        remarks:            document.getElementById('remarks').value.trim(),
        items,
        status:             'pending',
        dateSubmitted:      dateSubmitted || new Date().toISOString(),
        laboratory:         roomName || 'AMS 204',
    };
}

function makeReferenceNumber() {
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    return `REQ-${now.getFullYear()}-${pad(now.getMonth()+1)}${pad(now.getDate())}-${Math.floor(Math.random()*10000).toString().padStart(4,'0')}`;
}

// Remember the requester's details so the next request is prefilled. Never blocks submission.
function saveRequesterProfile() {
    if (!currentRequester || currentRequester.role === 'staff') return;
    const val = id => document.getElementById(id)?.value?.trim() || '';
    saveMyProfile({
        full_name:      val('student-name'),
        student_number: val('student-number'),
        contact_number: val('contact-number'),
        course:         val('course'),
        year_level:     val('year-level'),
        section:        val('section'),
        group_name:     val('group'),
    }).then(() => { Object.keys(sessionStorage).filter(k => k.startsWith('pl-me-')).forEach(k => sessionStorage.removeItem(k)); })
      .catch(err => console.warn('Profile save failed:', err));
}

function setSelectValue(id, value) {
    const el = document.getElementById(id);
    if (!el || !value) return;
    if (![...el.options].some(o => o.value === value)) {
        const o = document.createElement('option');
        o.value = value; o.textContent = value;
        el.appendChild(o);
    }
    el.value = value;
}

// Lock requester type to the signed-in role and prefill saved details.
async function applyRequester(me) {
    currentRequester = me;
    if (me.role === 'student' || me.role === 'professor') {
        setRequesterType(me.role);
        const toggleGroup = document.getElementById('requester-toggle')?.closest('.form-group');
        if (toggleGroup) toggleGroup.style.display = 'none';
        const nameEl = document.getElementById('student-name');
        if (nameEl && me.full_name) { nameEl.value = me.full_name; nameEl.readOnly = true; }
    }
    if (me.role === 'staff') return;
    const setText = (id, v) => { const el = document.getElementById(id); if (el && v && !el.value) el.value = v; };
    setText('student-number', me.student_number);
    setText('contact-number', me.contact_number);
    if (me.course) {
        setSelectValue('course', me.course);
        await populateSubjectDropdown();
    }
    setSelectValue('year-level', me.year_level);
    setSelectValue('section', me.section);
    setSelectValue('group', me.group_name);
}

async function submitForm() {
    const submitBtn = document.getElementById('submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

    const referenceNumber = makeReferenceNumber();

    let formData = collectCurrentRequestData(referenceNumber, new Date().toISOString());

    try {
        // Retry with a new reference number if the random one is already taken.
        for (let attempt = 0; ; attempt++) {
            try {
                await insertRequest(formData);
                break;
            } catch (err) {
                if (err && err.code === '23505' && attempt < 4) {
                    formData.requestId = makeReferenceNumber();
                    continue;
                }
                throw err;
            }
        }
        const savedRef = formData.requestId;
        saveRequesterProfile();
        draftDisabled = true;
        clearDraft();
        document.getElementById('draft-notice').hidden = true;

        document.getElementById('review-summary').style.display  = 'none';
        document.getElementById('success-message').style.display = 'block';
        document.getElementById('prev-btn').style.display        = 'none';
        document.getElementById('submit-btn').style.display      = 'none';

        const refEl = document.getElementById('reference-number-display');
        if (refEl) refEl.textContent = savedRef;

        const trackLink = document.getElementById('track-link');
        if (trackLink) trackLink.href = 'student-dashboard.html?ref=' + encodeURIComponent(savedRef);

        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
        console.error('Submit error:', err);
        alert('Error saving request: ' + (err.message || err));
        submitBtn.disabled = false;
        submitBtn.textContent = '✓ Submit Request';
    }
}

/* ── Print helpers ────────────────────────────────────────── */

function itemSourceLabel(it) {
    if (it.substituteFor) return 'Substitute for ' + it.substituteFor;
    if (it.source === 'additional') return 'Additional item';
    return '';
}

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
}

function formatRequestTime(hhmm) {
    if (!hhmm) return '-';
    const [h, m] = hhmm.split(':');
    const hr = parseInt(h, 10);
    return ((hr % 12) || 12) + ':' + m + ' ' + (hr >= 12 ? 'PM' : 'AM');
}

function buildPrintableRequestHtml(req, options = {}) {
    const title = options.title || 'Request Print Preview';
    const refNumber = req.requestId || 'Preview only - not submitted';
    const isProf = (req.requesterType || 'student') === 'professor';
    const courseDisplay = (req.course || '-') + (req.yearLevel ? ' - ' + req.yearLevel : '') + (req.section ? ', Section ' + req.section : '') + (!isProf && req.group ? ', ' + req.group : '');

    function fmtDate(s) {
        if (!s) return '-';
        return new Date(s).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    }

    const itemsHTML = (req.items || []).map(item => {
        const src = itemSourceLabel(item);
        const qty = item.quantity === '' || item.quantity == null ? 'as needed' : `${escapeHtml(item.quantity)} ${escapeHtml(item.unit)}`;
        return `<tr><td>${escapeHtml(item.name)}${src ? `<br><small style="color:#64748b;">${escapeHtml(src)}</small>` : ''}</td><td>${escapeHtml(item.category || '-')}</td><td style="text-align:right;">${qty}</td></tr>`;
    }).join('');
    const groupsInfo = req.groupCount ? `<p>Groups: <strong>${escapeHtml(req.groupCount)}${req.studentCount ? ' (' + escapeHtml(req.studentCount) + ' students)' : ''}</strong></p>` : '';
    const submitted = req.requestId ? `<p>Submitted: <strong>${new Date(req.dateSubmitted).toLocaleString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' })}</strong></p>` : '';
    const previewNote = req.requestId ? '' : '<div class="notice">This is a pre-submit print preview. Submit the request to generate a reference number.</div>';

    return `<!DOCTYPE html><html><head><title>${escapeHtml(title)} - ${escapeHtml(refNumber)}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;}body{font-family:Arial,sans-serif;padding:0;color:#1f2937;background:white;}
.header{text-align:center;margin-bottom:8px;border-bottom:2px solid #d1d5db;padding-bottom:6px;}
.brand{font-size:20px;font-weight:700;color:#6E52C4;}.title{font-size:13px;font-weight:700;margin-top:2px;color:#111827;}
.ref{background:#f8fafc;border:1px solid #e2e8f0;padding:6px;border-radius:6px;text-align:center;margin:6px 0 0;}
.ref-label{font-size:9px;color:#64748b;text-transform:uppercase;font-weight:700;letter-spacing:.05em;margin-bottom:1px;}
.ref-value{font-size:16px;font-weight:700;color:#5B41AE;font-family:'Courier New',monospace;}
.notice{padding:6px 10px;background:#fffbeb;border:1px solid #f59e0b;border-radius:6px;color:#92400e;font-size:11px;margin-bottom:8px;}
.section{border:1px solid #e5e7eb;border-radius:6px;margin-bottom:8px;overflow:hidden;break-inside:avoid;}
.section h3{font-size:12px;font-weight:700;background:#f8fafc;padding:4px 10px;color:#111827;border-bottom:1px solid #e5e7eb;}
.section-body{padding:6px 10px;}.section p{margin-bottom:3px;color:#374151;font-size:12px;}
table{width:100%;border-collapse:collapse;}th,td{padding:4px 8px;border-bottom:1px solid #e5e7eb;font-size:11px;}th{text-align:left;background:#f8fafc;color:#64748b;font-weight:700;}
html,body{height:auto;}@page{size:8.5in 13in;margin:0.4in;}@media print{.notice{border-color:#999;color:#111;background:white;}}
</style></head><body>
<div class="header"><div class="brand">PharmaLab IMS</div><div class="title">${escapeHtml(title)}</div>
<div class="ref"><div class="ref-label">Reference Number</div><div class="ref-value">${escapeHtml(refNumber)}</div></div></div>
${previewNote}
<div class="section"><h3>${isProf ? 'Professor' : 'Student'} Information</h3><div class="section-body">
<p>Name: <strong>${escapeHtml(req.studentName || '-')}</strong></p>
${!isProf ? '<p>Student Number: <strong>' + escapeHtml(req.studentNumber || '-') + '</strong></p>' : ''}
${!isProf ? '<p>Contact Number: <strong>' + escapeHtml(req.contactNumber || '-') + '</strong></p>' : ''}
<p>${isProf ? 'Department / Course' : 'Course'}: <strong>${escapeHtml(courseDisplay)}</strong></p>
${isProf && req.projectTitle ? '<p>Project / Research: <strong>' + escapeHtml(req.projectTitle) + '</strong></p>' : ''}</div></div>
<div class="section"><h3>Request Details</h3><div class="section-body">
<p>Subject: <strong>${escapeHtml(req.subject || '-')}</strong></p>
<p>Activity: <strong>${escapeHtml(req.activity || '-')}</strong></p>
<p>Instructor: <strong>${escapeHtml(req.instructor || '-')}</strong></p>
<p>Date Needed: <strong>${escapeHtml(fmtDate(req.dateNeeded))}</strong></p>
<p>Time: <strong>${escapeHtml(formatRequestTime(req.timeNeeded))} - ${escapeHtml(formatRequestTime(req.timeEnd))}</strong></p>
<p>Room: <strong>${escapeHtml(req.roomAssignmentName || req.laboratory || '-')}</strong></p>
${groupsInfo}
${submitted}</div></div>
<div class="section"><h3>Requested Items</h3>
<table><thead><tr><th>Item</th><th>Category</th><th style="text-align:right;">Qty</th></tr></thead>
<tbody>${itemsHTML || '<tr><td colspan="3" style="text-align:center;color:#94a3b8;">No items</td></tr>'}</tbody></table></div>
${req.remarks ? '<div class="section"><h3>Purpose / Remarks</h3><div class="section-body"><p>' + escapeHtml(req.remarks) + '</p></div></div>' : ''}
</body></html>`;
}

function openPrintableRequest(req, title) {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert('Please allow pop-ups to open the print preview.');
        return;
    }
    printWindow.document.write(buildPrintableRequestHtml(req, { title }));
    printWindow.document.close();
    setTimeout(() => { printWindow.focus(); printWindow.print(); }, 250);
}

function printSuccessPage() {
    const officialRefNumber = document.getElementById('reference-number-display').textContent;
    openPrintableRequest(collectCurrentRequestData(officialRefNumber), 'Official Request Copy');
}
function printReviewSummary() {
    openPrintableRequest(collectCurrentRequestData(''), 'Request Print Preview');
}

/* ── Review summary (step 4) ──────────────────────────────── */

function updateReviewSummary() {
    const name       = document.getElementById('student-name').value.trim() || '-';
    const studentNum = document.getElementById('student-number').value.trim() || '-';
    const contact    = document.getElementById('contact-number').value.trim() || '-';
    const course     = document.getElementById('course').value || '-';
    const yearLevel  = document.getElementById('year-level').value || '-';
    const section    = document.getElementById('section').value?.trim() || '';
    const group      = document.getElementById('group').value?.trim() || '';

    const isStudent = requesterType === 'student';
    const typeEl = document.getElementById('review-requester-type');
    if (typeEl) typeEl.textContent = isStudent ? 'Student' : 'Professor';

    document.getElementById('review-name').textContent           = name;
    document.getElementById('review-student-number').textContent = studentNum || '-';
    document.getElementById('review-contact').textContent        = contact;

    // ID label: Student Number vs Faculty Number
    const idLabelEl = document.getElementById('review-id-label');
    if (idLabelEl) idLabelEl.textContent = 'Student Number';
    const reviewIdRow = document.getElementById('review-student-number-row');
    if (reviewIdRow) reviewIdRow.style.display = isStudent ? '' : 'none';

    document.getElementById('review-course').textContent         =
        course + (yearLevel !== '-' ? ' - ' + yearLevel : '') + (section ? ', Section ' + section : '') + (isStudent && group ? ', ' + group : '');

    // Project / Research title (professor)
    const projectTitle = document.getElementById('project-title')?.value?.trim() || '';
    const projRow = document.getElementById('review-project-row');
    if (projRow) {
        if (!isStudent && projectTitle) {
            document.getElementById('review-project-title').textContent = projectTitle;
            projRow.style.display = '';
        } else {
            projRow.style.display = 'none';
        }
    }

    document.getElementById('review-subject').textContent    = document.getElementById('subject').value.trim()    || '-';
    document.getElementById('review-activity').textContent   = document.getElementById('activity').value.trim()   || '-';
    document.getElementById('review-instructor').textContent = document.getElementById('instructor').value.trim() || '-';

    const dateNeeded = document.getElementById('date-needed').value;
    document.getElementById('review-date').textContent = dateNeeded
        ? new Date(dateNeeded).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        : '-';

    function fmtTime(hhmm) {
        if (!hhmm) return '-';
        const [h, m] = hhmm.split(':');
        const hr = parseInt(h, 10);
        return ((hr % 12) || 12) + ':' + m + ' ' + (hr >= 12 ? 'PM' : 'AM');
    }
    document.getElementById('review-time').textContent     = fmtTime(document.getElementById('time-needed').value);
    document.getElementById('review-time-end').textContent = fmtTime(document.getElementById('time-end').value);

    const roomEl = document.getElementById('room-assignment');
    document.getElementById('review-room').textContent =
        roomEl && roomEl.selectedIndex > 0 ? roomEl.options[roomEl.selectedIndex].text : '-';

    const collectedItems = getFormRequestItems();
    const itemsTableBody = document.getElementById('items-table-body');
    itemsTableBody.innerHTML = '';
    if (collectedItems.length === 0) {
        itemsTableBody.innerHTML = '<tr><td colspan="3" style="padding:12px;color:#718096;text-align:center;">No items added yet</td></tr>';
    } else {
        collectedItems.forEach(it => {
            const row = document.createElement('tr');
            row.style.borderBottom = '1px solid #e2e8f0';
            const src = itemSourceLabel(it);
            row.innerHTML = `<td style="padding:12px;color:#2d3748;">${escapeHtml(it.name)}${src ? `<span class="review-source">${escapeHtml(src)}</span>` : ''}</td>` +
                `<td style="padding:12px;color:#718096;font-size:13px;">${escapeHtml(it.category)}</td>` +
                `<td style="text-align:right;padding:12px;color:#2d3748;">${it.quantity === '' ? 'as needed' : escapeHtml(it.quantity) + ' ' + escapeHtml(it.unit)}</td>`;
            itemsTableBody.appendChild(row);
        });
    }
    const groupsLine = document.getElementById('review-groups');
    if (groupsLine) {
        const g = currentKit && currentKit.items.length ? groupCount() : 0;
        groupsLine.textContent = g ? `${g} group${g > 1 ? 's' : ''}${kitNeedsStudents() ? `, ${studentCount()} students` : ''}` : '-';
        groupsLine.closest('p').style.display = g ? '' : 'none';
    }

    const remarks = document.getElementById('remarks').value.trim();
    const remarksReview = document.getElementById('remarks-review');
    if (remarks) { document.getElementById('review-remarks').textContent = remarks; remarksReview.style.display = 'block'; }
    else remarksReview.style.display = 'none';

    document.getElementById('print-btn').style.display = 'inline-flex';
}

/* ── Step 1: saved-details card ───────────────────────────── */

// Show a short "Is this still you?" card instead of the full form when the saved profile is complete.
function maybeCompactStep1() {
    if (!currentRequester || currentRequester.role === 'staff') return;
    const hasSaved = currentRequester.student_number || currentRequester.course || currentRequester.contact_number;
    if (!hasSaved || stepError(1)) return;
    renderMeCard();
    document.getElementById('me-card').hidden = false;
    document.getElementById('requester-fields').hidden = true;
}

function renderMeCard() {
    const val = id => document.getElementById(id)?.value?.trim() || '';
    const isStudent = requesterType === 'student';
    const courseLine = [val('course'), val('year-level')].filter(Boolean).join(' - ');
    const sectionLine = [val('section') ? 'Section ' + val('section') : '', isStudent ? val('group') : ''].filter(Boolean).join(', ');
    const rows = [
        ['Name', val('student-name')],
        isStudent ? ['Student No.', val('student-number')] : null,
        isStudent ? ['Contact', val('contact-number')] : null,
        [isStudent ? 'Course' : 'Department', courseLine],
        ['Section', sectionLine],
        !isStudent ? ['Project', val('project-title')] : null,
    ].filter(r => r && r[1]);
    document.getElementById('me-card-list').innerHTML = rows
        .map(([k, v]) => `<dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd>`).join('');
}

function showRequesterFields() {
    const card = document.getElementById('me-card');
    const fields = document.getElementById('requester-fields');
    if (!card || !fields || card.hidden) return;
    card.hidden = true;
    fields.hidden = false;
}

/* ── Draft auto-save (phone signal drops, accidental refresh) ── */

const DRAFT_MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000;
const DRAFT_FIELDS = ['student-number', 'contact-number', 'course', 'year-level', 'section', 'group', 'project-title',
    'date-needed', 'time-needed', 'time-end', 'instructor', 'room-assignment', 'remarks'];
let draftTimer = null;
let draftDisabled = false;   // set after a successful submit

function draftKey() {
    return 'pharmalab:request-draft:' + String(currentRequester?.email || 'guest').toLowerCase();
}

function collectDraft() {
    const fields = {};
    DRAFT_FIELDS.forEach(id => { fields[id] = document.getElementById(id)?.value || ''; });
    const extras = [];
    document.querySelectorAll('#items-container .item-row').forEach(row => {
        const e = {
            category: row.querySelector('.item-category')?.value || '',
            name: row.querySelector('.item-name')?.value || '',
            qty: row.querySelector('.item-quantity')?.value || '',
            unit: row.querySelector('.item-unit')?.value || '',
            reason: row.querySelector('.item-reason')?.value || '',
        };
        if (e.category || e.name || e.qty) extras.push(e);
    });
    return {
        v: 1, savedAt: Date.now(), step: currentStep, fields,
        subjectId: document.getElementById('subject')?.selectedOptions?.[0]?.dataset?.id || '',
        experimentId: selectedExperimentOption()?.dataset?.id || '',
        groupCount: document.getElementById('group-count')?.value || '',
        studentCount: document.getElementById('student-count')?.value || '',
        kitOff: [...kitOff], extras,
    };
}

function saveDraftNow() {
    if (draftDisabled || !currentRequester) return;
    const d = collectDraft();
    const hasContent = d.subjectId || d.fields['date-needed'] || d.fields.remarks || d.extras.length;
    try {
        if (hasContent) localStorage.setItem(draftKey(), JSON.stringify(d));
        else localStorage.removeItem(draftKey());
    } catch (_) { /* storage blocked: the form still works */ }
}

function scheduleDraftSave() {
    if (draftDisabled) return;
    clearTimeout(draftTimer);
    draftTimer = setTimeout(saveDraftNow, 400);
}

function clearDraft() {
    clearTimeout(draftTimer);
    try { localStorage.removeItem(draftKey()); } catch (_) {}
}

function readDraft() {
    try {
        const d = JSON.parse(localStorage.getItem(draftKey()) || 'null');
        if (!d || d.v !== 1 || !(Date.now() - d.savedAt < DRAFT_MAX_AGE_MS)) return null;
        return d;
    } catch (_) { return null; }
}

function setIfOption(sel, value) {
    if (sel && value && [...sel.options].some(o => o.value === value)) { sel.value = value; return true; }
    return false;
}

// Put a saved draft back into the form, following the same cascade the requester used.
async function restoreDraft() {
    const d = readDraft();
    if (!d) return false;
    const f = d.fields || {};
    ['student-number', 'contact-number', 'project-title'].forEach(id => {
        const el = document.getElementById(id);
        if (el && f[id] && !el.readOnly) el.value = f[id];
    });
    if (f.course && f.course !== document.getElementById('course').value) {
        setSelectValue('course', f.course);
        await populateSubjectDropdown();
    }
    ['year-level', 'section', 'group'].forEach(id => { if (f[id]) setSelectValue(id, f[id]); });

    const subjectSel = document.getElementById('subject');
    const subjOpt = [...subjectSel.options].find(o => o.dataset.id && o.dataset.id === d.subjectId);
    if (subjOpt) {
        subjectSel.value = subjOpt.value;
        await Promise.all([populateActivityDropdown(), populateInstructorDropdown()]);
        const actSel = document.getElementById('activity');
        const actOpt = [...actSel.options].find(o => o.dataset.id && o.dataset.id === d.experimentId);
        if (actOpt) {
            actSel.value = actOpt.value;
            await loadKit();
            setIfOption(document.getElementById('group-count'), d.groupCount);
            if (d.studentCount) document.getElementById('student-count').value = d.studentCount;
            if (currentKit) (d.kitOff || []).forEach(id => { if (currentKit.items.some(i => String(i.id) === String(id))) kitOff.add(id); });
            renderKit();
        }
    }
    setIfOption(document.getElementById('instructor'), f.instructor);
    setIfOption(document.getElementById('room-assignment'), f['room-assignment']);
    ['date-needed', 'time-needed', 'time-end', 'remarks'].forEach(id => { if (f[id]) document.getElementById(id).value = f[id]; });

    for (const e of d.extras || []) {
        const blank = [...document.querySelectorAll('#items-container .item-row')].find(r =>
            !r.querySelector('.item-category')?.value && !r.querySelector('.item-quantity')?.value);
        const row = blank || await addItem();
        const cat = row.querySelector('.item-category');
        if (!setIfOption(cat, e.category)) continue;
        await onCategoryChange(cat);
        const nameSel = row.querySelector('.item-name');
        if (setIfOption(nameSel, e.name)) autoSetUnit(nameSel);
        row.querySelector('.item-quantity').value = e.qty || '';
        const unitSel = row.querySelector('.item-unit');
        if (e.unit && unitSel && !setIfOption(unitSel, e.unit)) { unitSel.add(new Option(e.unit, e.unit)); unitSel.value = e.unit; }
        setIfOption(row.querySelector('.item-reason'), e.reason);
    }

    // Return to the step they were on, but never past a step that is no longer complete.
    let step = 1;
    while (step < Math.min(Number(d.step) || 1, 3) && !stepError(step)) step++;
    currentStep = step;
    updateProgress();

    const when = new Date(d.savedAt).toLocaleString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    document.getElementById('draft-notice-text').textContent = `Your unfinished request from ${when} was restored.`;
    document.getElementById('draft-notice').hidden = false;
    return true;
}

/* ── Success screen ───────────────────────────────────────── */

async function copyReference() {
    const ref = document.getElementById('reference-number-display').textContent.trim();
    const btn = document.getElementById('copy-ref-btn');
    let ok = false;
    try { await navigator.clipboard.writeText(ref); ok = true; }
    catch (_) {
        const ta = document.createElement('textarea');
        ta.value = ref; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        try { ok = document.execCommand('copy'); } catch (_) { ok = false; }
        ta.remove();
    }
    btn.textContent = ok ? 'Copied ✓' : 'Copy failed: please write it down';
    clearTimeout(btn._t);
    btn._t = setTimeout(() => { btn.textContent = 'Copy number'; }, 2500);
}

/* ── Init ─────────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', async function () {
    updateProgress();
    const me = await requireRequester();
    await populateDropdowns();
    await applyRequester(me);
    let restored = false;
    try { restored = await restoreDraft(); } catch (err) { console.warn('Draft not restored:', err); }
    if (currentStep === 1) maybeCompactStep1();
    document.body.dataset.requesterReady = '1';
    document.getElementById('rq-pending')?.remove();   // reveal the form only once it is filled in

    // Auto-save the draft on every change; discard it on request.
    const form = document.querySelector('.request-form');
    form?.addEventListener('input', scheduleDraftSave);
    form?.addEventListener('change', scheduleDraftSave);
    form?.addEventListener('click', e => { if (e.target.closest('.btn-remove')) scheduleDraftSave(); });
    document.getElementById('me-card-edit')?.addEventListener('click', () => {
        showRequesterFields();
        document.getElementById('contact-number')?.focus();
    });
    document.getElementById('draft-discard')?.addEventListener('click', () => {
        if (!confirm('Discard your unfinished request and start over?')) return;
        draftDisabled = true;
        clearDraft();
        location.reload();
    });
    if (restored) scheduleDraftSave();

    document.getElementById('course')?.addEventListener('change', () => populateSubjectDropdown());
    document.getElementById('subject')?.addEventListener('change', () => {
        populateActivityDropdown();
        populateInstructorDropdown();
    });
    document.getElementById('activity')?.addEventListener('change', () => loadKit());
    document.getElementById('group-count')?.addEventListener('change', () => renderKit());
    document.getElementById('student-count')?.addEventListener('input', () => renderKit());

    // Auto-set unit when item is selected (for initial row)
    document.getElementById('items-container')?.addEventListener('change', function (e) {
        if (e.target.classList.contains('item-name')) {
            autoSetUnit(e.target);
        }
    });

    // Wire up category change for the initial pre-rendered row
    document.querySelector('.item-category')?.addEventListener('change', function () {
        onCategoryChange(this);
    });
    // Wire up item-name unit sync for the initial pre-rendered row
    document.querySelector('.item-name')?.addEventListener('change', function () {
        autoSetUnit(this);
    });
});
