/**
 * Student Material Request - Form wizard and submission
 * Uses Supabase via supabase-data.js
 */
let currentStep = 1;
const totalSteps = 4;

let requesterType = 'student'; // 'student' | 'professor'

let _chemicals = null;

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
    if (!_chemicals) _chemicals = await getChemicals();
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
    const courses = await getCourses();
    const course = courses.find(c => c.name === courseName);
    const subjects = course ? await getSubjectsByCourse(course.id) : await getSubjects();

    const subjectSelect = document.getElementById('subject');
    if (subjectSelect) {
        subjectSelect.innerHTML = '<option value="">Select Subject</option>' +
            subjects.map(s => `<option value="${s.name}" data-id="${s.id}">${s.name}</option>`).join('');
    }
    await populateActivityDropdown();
    await populateInstructorDropdown();
}

async function populateActivityDropdown() {
    const subjectSelect = document.getElementById('subject');
    const subjectName = subjectSelect ? subjectSelect.value : '';
    const subjects = await getSubjects();
    const subject = subjects.find(s => s.name === subjectName);
    const experiments = subject ? await getExperimentsBySubject(subject.id) : await getExperiments();

    const activitySelect = document.getElementById('activity');
    if (activitySelect) {
        activitySelect.innerHTML = '<option value="">Select Experiment or Activity</option>' +
            experiments.map(e => `<option value="${e.name}">${e.name}</option>`).join('');
    }
}

async function populateInstructorDropdown() {
    const subjectSelect = document.getElementById('subject');
    const subjectName = subjectSelect ? subjectSelect.value : '';
    const subjects = await getSubjects();
    const subject = subjects.find(s => s.name === subjectName);
    const instructors = subject ? await getInstructorsBySubject(subject.id) : await getInstructors();

    const instructorSelect = document.getElementById('instructor');
    if (instructorSelect) {
        instructorSelect.innerHTML = '<option value="">Select Instructor</option>' +
            instructors.map(i => `<option value="${i.name}">${i.name}</option>`).join('');
    }
}

/* ── Category-first item row ──────────────────────────────── */

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
        filtered.map(c => `<option value="${c.name}" data-unit="${c.unit || 'pcs'}">${c.name}</option>`).join('');
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
        <button type="button" class="btn btn-remove" onclick="this.closest('.item-row').remove()" title="Remove">✕</button>
    </div>`;
}

async function addItem() {
    const container = document.getElementById('items-container');
    const div = document.createElement('div');
    div.innerHTML = buildItemRowHtml();
    const newRow = div.firstElementChild;
    container.appendChild(newRow);
    newRow.querySelector('.item-name').addEventListener('change', function () {
        autoSetUnit(this);
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
}

/* ── Navigation ───────────────────────────────────────────── */

async function nextStep() {
    if (currentStep === 1) {
        const name       = document.getElementById('student-name').value.trim();
        const studentNum = document.getElementById('student-number').value.trim();
        const contact    = document.getElementById('contact-number').value.trim();
        const course     = document.getElementById('course').value;
        const yearLevel  = document.getElementById('year-level').value;
        if (requesterType === 'professor') {
            if (!name) {
                alert('Please fill in Full Name.');
                return;
            }
        } else {
            if (!name || !studentNum || !contact || !course || !yearLevel) {
                alert('Please fill in all required fields in Student Information.');
                return;
            }
        }
    } else if (currentStep === 2) {
        const subject    = document.getElementById('subject').value;
        const activity   = document.getElementById('activity').value;
        const dateNeeded = document.getElementById('date-needed').value;
        const timeNeeded = document.getElementById('time-needed').value;
        const timeEnd    = document.getElementById('time-end').value;
        const instructor = document.getElementById('instructor').value;
        const room       = document.getElementById('room-assignment').value;
        if (!subject || !activity || !dateNeeded || !timeNeeded || !timeEnd || !instructor || !room) {
            alert('Please fill in all required fields in Request Details.');
            return;
        }
        if (timeEnd && timeNeeded && timeEnd <= timeNeeded) {
            alert('Time End must be after Time Start.');
            return;
        }
    } else if (currentStep === 3) {
        let hasValidItem = false;
        document.querySelectorAll('.item-row').forEach(item => {
            const category = item.querySelector('.item-category')?.value || '';
            const name     = (item.querySelector('.item-name')?.value || '').trim();
            const qty      = item.querySelector('.item-quantity')?.value;
            if (category && name && qty) hasValidItem = true;
        });
        if (!hasValidItem) {
            alert('Please add at least one item with a category, name, and quantity.');
            return;
        }
    }

    if (currentStep < totalSteps) {
        currentStep++;
        updateProgress();
        if (currentStep === 4) updateReviewSummary();
    }
}

function previousStep() {
    if (currentStep > 1) {
        currentStep--;
        updateProgress();
        if (currentStep !== 4) document.getElementById('print-btn').style.display = 'none';
    }
}

/* ── Submit ───────────────────────────────────────────────── */

function getFormRequestItems() {
    const CAT_ORDER_SUBMIT = ['Liquid Reagent','Solid Reagent','Glassware','Equipment','Antibiotic Disc'];
    const items = [];
    document.querySelectorAll('.item-row').forEach(item => {
        const category = item.querySelector('.item-category')?.value || '';
        const name     = (item.querySelector('.item-name')?.value || '').trim();
        const qty      = item.querySelector('.item-quantity')?.value;
        const unit     = item.querySelector('.item-unit')?.value;
        if (name && qty && unit) items.push({ name, quantity: qty, unit, category });
    });
    items.sort((a, b) => {
        const ai = CAT_ORDER_SUBMIT.indexOf(a.category); const bi = CAT_ORDER_SUBMIT.indexOf(b.category);
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
    return items;
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

async function submitForm() {
    const submitBtn = document.getElementById('submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const referenceNumber = `REQ-${now.getFullYear()}-${pad(now.getMonth()+1)}${pad(now.getDate())}-${Math.floor(Math.random()*10000).toString().padStart(4,'0')}`;

    const formData = collectCurrentRequestData(referenceNumber, new Date().toISOString());

    try {
        await saveRequest(formData);

        document.getElementById('review-summary').style.display  = 'none';
        document.getElementById('success-message').style.display = 'block';
        document.getElementById('prev-btn').style.display        = 'none';
        document.getElementById('submit-btn').style.display      = 'none';

        const refEl = document.getElementById('reference-number-display');
        if (refEl) refEl.textContent = referenceNumber;

        const trackLink = document.getElementById('track-link');
        if (trackLink) trackLink.href = 'student-dashboard.html?ref=' + encodeURIComponent(referenceNumber);

        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
        console.error('Submit error:', err);
        alert('Error saving request: ' + (err.message || err));
        submitBtn.disabled = false;
        submitBtn.textContent = '✓ Submit Request';
    }
}

/* ── Print helpers ────────────────────────────────────────── */

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

    const itemsHTML = (req.items || []).map(item =>
        `<tr><td>${escapeHtml(item.name)}</td><td>${escapeHtml(item.category || '-')}</td><td style="text-align:right;">${escapeHtml(item.quantity)} ${escapeHtml(item.unit)}</td></tr>`
    ).join('');
    const submitted = req.requestId ? `<p>Submitted: <strong>${new Date(req.dateSubmitted).toLocaleString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' })}</strong></p>` : '';
    const previewNote = req.requestId ? '' : '<div class="notice">This is a pre-submit print preview. Submit the request to generate a reference number.</div>';

    return `<!DOCTYPE html><html><head><title>${escapeHtml(title)} - ${escapeHtml(refNumber)}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;}body{font-family:Arial,sans-serif;padding:0;color:#1f2937;background:white;}
.header{text-align:center;margin-bottom:8px;border-bottom:2px solid #d1d5db;padding-bottom:6px;}
.brand{font-size:20px;font-weight:700;color:#0d9488;}.title{font-size:13px;font-weight:700;margin-top:2px;color:#111827;}
.ref{background:#f8fafc;border:1px solid #e2e8f0;padding:6px;border-radius:6px;text-align:center;margin:6px 0 0;}
.ref-label{font-size:9px;color:#64748b;text-transform:uppercase;font-weight:700;letter-spacing:.05em;margin-bottom:1px;}
.ref-value{font-size:16px;font-weight:700;color:#0f766e;font-family:'Courier New',monospace;}
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

    const CAT_ORDER = ['Liquid Reagent','Solid Reagent','Glassware','Equipment','Antibiotic Disc'];
    const collectedItems = [];
    document.querySelectorAll('.item-row').forEach(item => {
        const cat = item.querySelector('.item-category')?.value || '';
        const n   = item.querySelector('.item-name')?.value.trim() || '';
        const q   = item.querySelector('.item-quantity')?.value || '';
        const u   = item.querySelector('.item-unit')?.value || '';
        if (n && q && u) collectedItems.push({ cat, n, q, u });
    });
    collectedItems.sort((a, b) => {
        const ai = CAT_ORDER.indexOf(a.cat); const bi = CAT_ORDER.indexOf(b.cat);
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
    const itemsTableBody = document.getElementById('items-table-body');
    itemsTableBody.innerHTML = '';
    if (collectedItems.length === 0) {
        itemsTableBody.innerHTML = '<tr><td colspan="3" style="padding:12px;color:#718096;text-align:center;">No items added yet</td></tr>';
    } else {
        collectedItems.forEach(({ cat, n, q, u }) => {
            const row = document.createElement('tr');
            row.style.borderBottom = '1px solid #e2e8f0';
            row.innerHTML = `<td style="padding:12px;color:#2d3748;">${n}</td><td style="padding:12px;color:#718096;font-size:13px;">${cat}</td><td style="text-align:right;padding:12px;color:#2d3748;">${q} ${u}</td>`;
            itemsTableBody.appendChild(row);
        });
    }

    const remarks = document.getElementById('remarks').value.trim();
    const remarksReview = document.getElementById('remarks-review');
    if (remarks) { document.getElementById('review-remarks').textContent = remarks; remarksReview.style.display = 'block'; }
    else remarksReview.style.display = 'none';

    document.getElementById('print-btn').style.display = 'inline-flex';
}

/* ── Init ─────────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', async function () {
    updateProgress();
    await populateDropdowns();

    document.getElementById('course')?.addEventListener('change', () => populateSubjectDropdown());
    document.getElementById('subject')?.addEventListener('change', () => {
        populateActivityDropdown();
        populateInstructorDropdown();
    });

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
