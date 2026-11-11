/**
 * PharmaLab IMS - Shared Data Layer (localStorage)
 * Used by: dashboard, inventory, equipment, reports, dispensing, audit
 */

const LAB_KEYS = {
  REQUESTS: 'labRequests',
  CHEMICALS: 'labChemicals',
  EQUIPMENT: 'labEquipment',
  SUPPLIES: 'labSupplies',
  AUDIT: 'auditLog',
  ROOM_SCHEDULE: 'roomSchedule',
  SECTIONS: 'labSections',
  COURSES: 'labCourses',
  SUBJECTS: 'labSubjects',
  EXPERIMENTS: 'labExperiments',
  INSTRUCTORS: 'labInstructors'
};

/* ----- Sections (for student request dropdown) ----- */
function getSections() {
  let data = JSON.parse(localStorage.getItem(LAB_KEYS.SECTIONS) || '[]');
  if (data.length === 0) {
    data = getDefaultSections();
    localStorage.setItem(LAB_KEYS.SECTIONS, JSON.stringify(data));
  }
  return data;
}
function saveSections(arr) { localStorage.setItem(LAB_KEYS.SECTIONS, JSON.stringify(arr)); }
function getDefaultSections() {
  return [
    { id: 'sec-a', name: 'A' },
    { id: 'sec-b', name: 'B' },
    { id: 'sec-c', name: 'C' }
  ];
}

/* ----- Courses ----- */
function getCourses() {
  let data = JSON.parse(localStorage.getItem(LAB_KEYS.COURSES) || '[]');
  if (data.length === 0) {
    data = getDefaultCourses();
    localStorage.setItem(LAB_KEYS.COURSES, JSON.stringify(data));
  }
  return data;
}
function saveCourses(arr) { localStorage.setItem(LAB_KEYS.COURSES, JSON.stringify(arr)); }
function getDefaultCourses() {
  return [
    { id: 'course-bspharm', name: 'BS Pharmacy' },
    { id: 'course-mspharm', name: 'MS Pharmacy' },
    { id: 'course-phdpharm', name: 'PhD Pharmacy' }
  ];
}

/* ----- Subjects (linked to courses) ----- */
function getSubjects() {
  let data = JSON.parse(localStorage.getItem(LAB_KEYS.SUBJECTS) || '[]');
  if (data.length === 0) {
    data = getDefaultSubjects();
    localStorage.setItem(LAB_KEYS.SUBJECTS, JSON.stringify(data));
  }
  return data;
}
function saveSubjects(arr) { localStorage.setItem(LAB_KEYS.SUBJECTS, JSON.stringify(arr)); }
function getDefaultSubjects() {
  return [
    { id: 'subj-1', name: 'Pharmaceutical Chemistry 1', courseId: 'course-bspharm' },
    { id: 'subj-2', name: 'Pharmacology 1', courseId: 'course-bspharm' },
    { id: 'subj-3', name: 'Pharmaceutics', courseId: 'course-bspharm' }
  ];
}
function getSubjectsByCourse(courseId) {
  return courseId ? getSubjects().filter(s => s.courseId === courseId) : getSubjects();
}

/* ----- Experiments / Activities (linked to subjects) ----- */
function getExperiments() {
  let data = JSON.parse(localStorage.getItem(LAB_KEYS.EXPERIMENTS) || '[]');
  if (data.length === 0) {
    data = getDefaultExperiments();
    localStorage.setItem(LAB_KEYS.EXPERIMENTS, JSON.stringify(data));
  }
  return data;
}
function saveExperiments(arr) { localStorage.setItem(LAB_KEYS.EXPERIMENTS, JSON.stringify(arr)); }
function getDefaultExperiments() {
  return [
    { id: 'exp-1', name: 'Acid-Base Titration', subjectId: 'subj-1' },
    { id: 'exp-2', name: 'Qualitative Analysis', subjectId: 'subj-1' },
    { id: 'exp-3', name: 'Dosage Form Preparation', subjectId: 'subj-3' }
  ];
}
function getExperimentsBySubject(subjectId) {
  return subjectId ? getExperiments().filter(e => e.subjectId === subjectId) : getExperiments();
}

/* ----- Instructors (with designated subjects) ----- */
function getInstructors() {
  let data = JSON.parse(localStorage.getItem(LAB_KEYS.INSTRUCTORS) || '[]');
  if (data.length === 0) {
    data = getDefaultInstructors();
    localStorage.setItem(LAB_KEYS.INSTRUCTORS, JSON.stringify(data));
  }
  return data;
}
function saveInstructors(arr) { localStorage.setItem(LAB_KEYS.INSTRUCTORS, JSON.stringify(arr)); }
function getDefaultInstructors() {
  return [
    { id: 'inst-1', name: 'Prof. Maria Santos', subjectIds: ['subj-1', 'subj-3'] },
    { id: 'inst-2', name: 'Prof. Juan Dela Cruz', subjectIds: ['subj-2'] },
    { id: 'inst-3', name: 'Dr. Ana Reyes', subjectIds: ['subj-1'] }
  ];
}
function getInstructorsBySubject(subjectId) {
  if (!subjectId) return getInstructors();
  return getInstructors().filter(i => (i.subjectIds || []).indexOf(subjectId) !== -1);
}

/* ----- Request items from inventory (chemicals + equipment) ----- */
function getRequestItemsForDropdown() {
  const chemicals = getChemicals().map(c => ({ id: 'ch-' + c.id, name: c.name, unit: c.unit || 'g', type: 'chemical', sourceId: c.id }));
  const equipment = getEquipment().map(e => ({ id: 'eq-' + e.id, name: e.name, unit: 'pcs', type: 'equipment', sourceId: e.id }));
  const supplies = (getSupplies() || []).filter(s => s && (s.name || s.id)).map(s => ({
    id: 'sp-' + (s.id || s.name),
    name: s.name || s.id,
    unit: s.unit || 'pcs',
    type: 'supply',
    sourceId: s.id || s.name
  }));
  return chemicals.concat(equipment).concat(supplies);
}

function getRequests() {
  return JSON.parse(localStorage.getItem(LAB_KEYS.REQUESTS) || '[]');
}

function saveRequests(arr) {
  localStorage.setItem(LAB_KEYS.REQUESTS, JSON.stringify(arr));
}

function getChemicals() {
  let data = JSON.parse(localStorage.getItem(LAB_KEYS.CHEMICALS) || '[]');
  if (data.length === 0) {
    data = getDefaultChemicals();
    localStorage.setItem(LAB_KEYS.CHEMICALS, JSON.stringify(data));
  }
  return data;
}

function saveChemicals(arr) {
  localStorage.setItem(LAB_KEYS.CHEMICALS, JSON.stringify(arr));
}

function getEquipment() {
  let data = JSON.parse(localStorage.getItem(LAB_KEYS.EQUIPMENT) || '[]');
  if (data.length === 0) {
    data = getDefaultEquipment();
    localStorage.setItem(LAB_KEYS.EQUIPMENT, JSON.stringify(data));
  }
  return data;
}

function saveEquipment(arr) {
  localStorage.setItem(LAB_KEYS.EQUIPMENT, JSON.stringify(arr));
}

function getDefaultEquipment() {
  return [
    {
      id: 'eq1',
      name: 'Analytical Balance',
      storageLocation: 'AMS 204',
      quantity: 1,
      brand: 'Sartorius Entris',
      supplier: 'Sartorius Philippines',
      deliveryDate: '2024-03-15',
      calibrateDate: '2025-08-01',
      partsChecklist: [
        { name: 'Weighing pan', imageUrl: '' },
        { name: 'Display unit', imageUrl: '' },
        { name: 'Leveling feet', imageUrl: '' }
      ],
      remarksCertificates: 'Annual calibration certificate on file.',
      timesUsed: 142
    },
    {
      id: 'eq2',
      name: 'Compound Microscope',
      storageLocation: 'AMS 204 - Cab 2',
      quantity: 1,
      brand: 'Olympus CX23',
      supplier: 'Olympus Philippines',
      deliveryDate: '2023-06-20',
      calibrateDate: '2025-01-10',
      partsChecklist: [
        { name: 'Eyepiece (10x)', imageUrl: '' },
        { name: 'Objective lenses (4x, 10x, 40x)', imageUrl: '' },
        { name: 'Stage and clips', imageUrl: '' },
        { name: 'Light source', imageUrl: '' }
      ],
      remarksCertificates: 'Optical alignment verified.',
      timesUsed: 89
    },
    {
      id: 'eq3',
      name: 'pH Meter (Digital)',
      storageLocation: 'AMS 205',
      quantity: 2,
      brand: 'Hanna Instruments',
      supplier: 'Hanna Instruments PH',
      deliveryDate: '2024-01-08',
      calibrateDate: '2025-01-15',
      partsChecklist: [
        { name: 'Electrode', imageUrl: '' },
        { name: 'Display unit', imageUrl: '' },
        { name: 'Calibration buffers', imageUrl: '' }
      ],
      remarksCertificates: 'Calibration due Feb 2026.',
      timesUsed: 256
    },
    {
      id: 'eq4',
      name: 'Magnetic Stirrer Hotplate',
      storageLocation: 'AMS 301',
      quantity: 1,
      brand: 'IKA C-MAG HS7',
      supplier: 'IKA Philippines',
      deliveryDate: '2023-11-12',
      calibrateDate: '2024-11-01',
      partsChecklist: [
        { name: 'Hotplate surface', imageUrl: '' },
        { name: 'Stirrer magnet', imageUrl: '' },
        { name: 'Control panel', imageUrl: '' }
      ],
      remarksCertificates: 'Under maintenance - thermocouple replaced.',
      timesUsed: 312
    },
    {
      id: 'eq5',
      name: 'Centrifuge',
      storageLocation: 'AMS 301',
      quantity: 1,
      brand: 'Thermo Scientific',
      supplier: 'Thermo Fisher Scientific PH',
      deliveryDate: '2024-05-20',
      calibrateDate: '2025-06-01',
      partsChecklist: [
        { name: 'Rotor', imageUrl: '' },
        { name: 'Lid lock', imageUrl: '' },
        { name: 'Timer display', imageUrl: '' }
      ],
      remarksCertificates: 'Service contract active.',
      timesUsed: 78
    },
    {
      id: 'eq6',
      name: 'Micropipette Set',
      storageLocation: 'AMS 204 - Cab 1',
      quantity: 1,
      brand: 'Eppendorf Research Plus',
      supplier: 'Eppendorf PH',
      deliveryDate: '2024-02-28',
      calibrateDate: '2025-12-01',
      partsChecklist: [
        { name: '0.5-10 µL pipette', imageUrl: '' },
        { name: '10-100 µL pipette', imageUrl: '' },
        { name: '100-1000 µL pipette', imageUrl: '' },
        { name: 'Tips box', imageUrl: '' }
      ],
      remarksCertificates: 'Calibrated Dec 2025.',
      timesUsed: 445
    }
  ];
}

function getEquipmentById(id) {
  return getEquipment().find(e => e.id === id);
}

function getSupplies() {
  return JSON.parse(localStorage.getItem(LAB_KEYS.SUPPLIES) || '[]');
}

function saveSupplies(arr) {
  localStorage.setItem(LAB_KEYS.SUPPLIES, JSON.stringify(arr));
}

function getAuditLog() {
  return JSON.parse(localStorage.getItem(LAB_KEYS.AUDIT) || '[]');
}

function getCurrentUser() {
  try {
    const u = JSON.parse(localStorage.getItem('labCurrentUser') || 'null');
    return u && u.name ? u.name : null;
  } catch (_) { return null; }
}
function setCurrentUser(name) {
  if (!name || !String(name).trim()) return false;
  localStorage.setItem('labCurrentUser', JSON.stringify({ name: String(name).trim(), loginAt: new Date().toISOString() }));
  return true;
}
function clearCurrentUser() {
  localStorage.removeItem('labCurrentUser');
}

function addAuditEntry(action, details) {
  const log = getAuditLog();
  log.unshift({
    id: Date.now(),
    date: new Date().toISOString(),
    action,
    details,
    user: getCurrentUser() || 'Unknown'
  });
  localStorage.setItem(LAB_KEYS.AUDIT, JSON.stringify(log.slice(0, 500)));
}

function getDefaultChemicals() {
  return [
    { id: 'ch1', name: 'Hydrochloric Acid', storage: 'Hazmat Cabinet A1', quantity: 2.5, unit: 'L', minQuantity: 0.5, supplier: 'Sigma-Aldrich', deliveryDate: '2025-01-15', expiry: '2026-12-15', msds: 'https://www.sigmaaldrich.com/MSDS/MSDS/DisplayMSDSPage.do' },
    { id: 'ch2', name: 'Sodium Hydroxide', storage: 'AMS 204 - Cab 3', quantity: 500, unit: 'g', minQuantity: 1000, supplier: 'Merck Philippines', deliveryDate: '2024-08-20', expiry: '2027-08-20', msds: 'https://www.merckmillipore.com/PH/en/product/msds/MDA_CHEM-106462' },
    { id: 'ch3', name: 'Ethanol (95%)', storage: 'Flammable Cabinet B2', quantity: 10, unit: 'L', minQuantity: 5, supplier: 'Chemline Scientific', deliveryDate: '2025-03-10', expiry: '2026-05-30', msds: '' },
    { id: 'ch4', name: 'Sulfuric Acid (98%)', storage: 'Hazmat Cabinet A2', quantity: 1.8, unit: 'L', minQuantity: 0.5, supplier: 'Sigma-Aldrich', deliveryDate: '2024-06-05', expiry: '2026-02-10', msds: 'https://www.sigmaaldrich.com/MSDS/MSDS/DisplayMSDSPage.do' },
    { id: 'ch5', name: 'Phenolphthalein', storage: 'AMS 204 - Cab 5', quantity: 50, unit: 'g', minQuantity: 100, supplier: 'LabChem Inc.', deliveryDate: '2025-02-01', expiry: '2026-11-18', msds: '' },
    { id: 'ch6', name: 'Methylene Blue', storage: 'AMS 205 - Cab 1', quantity: 100, unit: 'g', minQuantity: 50, supplier: 'Merck Philippines', deliveryDate: '2025-01-22', expiry: '2027-09-22', msds: '' },
    { id: 'ch7', name: 'Acetic Acid (Glacial)', storage: 'Hazmat Cabinet B1', quantity: 3.2, unit: 'L', minQuantity: 1, supplier: 'Chemline Scientific', deliveryDate: '2024-01-28', expiry: '2026-01-28', msds: '' },
    { id: 'ch8', name: 'Potassium Permanganate', storage: 'AMS 204 - Cab 2', quantity: 250, unit: 'g', minQuantity: 100, supplier: 'Sigma-Aldrich', deliveryDate: '2025-06-15', expiry: '2027-12-31', msds: '' }
  ];
}

function getChemicalById(id) {
  return getChemicals().find(c => c.id === id);
}

function getRequestById(requestId) {
  return getRequests().find(r => r.requestId === requestId);
}

function getApprovedRequests() {
  return getRequests().filter(r => r.status === 'approved' || r.status === 'released');
}

/** Approved but not yet released - ready for Lab Tech to dispense */
function getApprovedNotReleased() {
  return getRequests().filter(r => r.status === 'approved');
}

/** FIFO hint: chemical with soonest expiry for dispensing. Returns null if none. */
function getFIFOHintForChemical(chemicalName) {
  const chemicals = getChemicals().filter(c =>
    (c.name || '').toLowerCase().includes((chemicalName || '').toLowerCase())
  );
  if (chemicals.length === 0) return null;
  const withExpiry = chemicals.filter(c => c.expiry).sort((a, b) => new Date(a.expiry) - new Date(b.expiry));
  return withExpiry[0] || chemicals[0];
}

/** Deduct quantity from chemical (for dispensing). Returns true if successful. */
function deductChemicalQuantity(chemicalId, amount) {
  const list = getChemicals();
  const idx = list.findIndex(c => c.id === chemicalId);
  if (idx === -1) return false;
  const current = Number(list[idx].quantity) || 0;
  const deduct = Number(amount) || 0;
  if (deduct <= 0 || current < deduct) return false;
  list[idx].quantity = current - deduct;
  saveChemicals(list);
  return true;
}

/** Equipment due for calibration within days */
function getEquipmentDueCalibration(days) {
  const equipment = getEquipment();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + days);
  return equipment.filter(e => {
    const d = e.calibrateDate ? new Date(e.calibrateDate) : null;
    return d && d <= cutoff && d >= new Date();
  });
}

function getRoomSchedule() {
  return JSON.parse(localStorage.getItem(LAB_KEYS.ROOM_SCHEDULE) || '[]');
}

function saveRoomSchedule(arr) {
  localStorage.setItem(LAB_KEYS.ROOM_SCHEDULE, JSON.stringify(arr));
}

function getScheduleForRoom(roomType, roomId, dateStr) {
  const schedule = getRoomSchedule();
  return schedule.filter(
    (e) => e.roomType === roomType && e.roomId === String(roomId) && e.date === dateStr
  );
}

/**
 * Current time in Philippines as HH:mm (24h) for comparison with schedule start/end.
 */
function getCurrentTimeManilaHHmm() {
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit', hour12: false });
  const parts = formatter.formatToParts(new Date());
  const hour = parts.find(function (p) { return p.type === 'hour'; }).value;
  const minute = parts.find(function (p) { return p.type === 'minute'; }).value;
  return String(hour).padStart(2, '0') + ':' + String(minute).padStart(2, '0');
}

/**
 * Today's date in Philippines as YYYY-MM-DD.
 */
function getTodayManilaDateStr() {
  const now = new Date();
  const d = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

function getRequestNeededDateTime(request) {
  if (!request || !request.dateNeeded) return null;
  const time = String(request.timeNeeded || '00:00').slice(0, 5);
  const d = new Date(request.dateNeeded + 'T' + time + ':00+08:00');
  return isNaN(d.getTime()) ? null : d;
}

function isLateRequest(request) {
  const needed = getRequestNeededDateTime(request);
  if (!needed) return false;
  const submitted = request.dateSubmitted ? new Date(request.dateSubmitted) : new Date();
  if (isNaN(submitted.getTime())) return false;
  const diffMs = needed.getTime() - submitted.getTime();
  return diffMs < 24 * 60 * 60 * 1000;
}

/**
 * Room is occupied only if there is a schedule and (for today) current time is within start–end.
 * Past date = gray. Today but current time past end = gray. Today and current time within slot = green.
 * Future date with schedule = green (scheduled).
 */
function isRoomOccupiedOnDate(roomType, roomId, dateStr) {
  const entries = getScheduleForRoom(roomType, roomId, dateStr);
  if (entries.length === 0) return false;

  const todayStr = getTodayManilaDateStr();
  if (dateStr < todayStr) return false; // past date → available (gray)
  if (dateStr > todayStr) return true;  // future date → occupied if has schedule (green)

  // Today: green only if current time is within [startTime, endTime) of at least one entry
  const nowHHmm = getCurrentTimeManilaHHmm();
  for (let i = 0; i < entries.length; i++) {
    const start = entries[i].startTime || '00:00';
    const end = entries[i].endTime || '23:59';
    if (nowHHmm >= start && nowHHmm < end) return true;
  }
  return false; // all slots for today have ended → available (gray)
}

/**
 * Entries to show in room modal: today = only active (now within start–end); past = none (finished, see logs); future = all.
 */
function getActiveScheduleForRoom(roomType, roomId, dateStr) {
  const entries = getScheduleForRoom(roomType, roomId, dateStr);
  if (entries.length === 0) return [];
  const todayStr = getTodayManilaDateStr();
  if (dateStr < todayStr) return []; // past: don't show in rooms (see Room Usage Logs)
  if (dateStr > todayStr) return entries; // future: show all scheduled
  const nowHHmm = getCurrentTimeManilaHHmm();
  return entries.filter(function (e) {
    const start = e.startTime || '00:00';
    const end = e.endTime || '23:59';
    return nowHHmm >= start && nowHHmm < end;
  });
}

function addScheduleEntry(entry) {
  const schedule = getRoomSchedule();
  const newEntry = {
    id: 'sched-' + Date.now(),
    roomType: entry.roomType,
    roomId: String(entry.roomId),
    date: entry.date,
    startTime: entry.startTime || '08:00',
    endTime: entry.endTime || '10:00',
    requestId: entry.requestId || null
  };
  schedule.push(newEntry);
  saveRoomSchedule(schedule);
  return newEntry;
}

function updateScheduleEntry(id, updates) {
  const schedule = getRoomSchedule();
  const i = schedule.findIndex((e) => e.id === id);
  if (i === -1) return null;
  schedule[i] = { ...schedule[i], ...updates };
  saveRoomSchedule(schedule);
  return schedule[i];
}

function deleteScheduleEntry(id) {
  let schedule = getRoomSchedule();
  schedule = schedule.filter((e) => e.id !== id);
  saveRoomSchedule(schedule);
}

function formatDate(str) {
  if (!str) return '-';
  return new Date(str).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateTime(str) {
  if (!str) return '-';
  const d = new Date(str);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function getExpiringChemicals(days = 30) {
  const chemicals = getChemicals();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + days);
  return chemicals.filter(c => new Date(c.expiry) <= cutoff && new Date(c.expiry) >= new Date()).sort((a, b) => new Date(a.expiry) - new Date(b.expiry));
}

function getLowStockChemicals() {
  return getChemicals().filter(c => Number(c.quantity) <= Number(c.minQuantity));
}
