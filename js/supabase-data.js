/**
 * PharmaLab IMS - Supabase Data Layer
 * Async replacement for data.js.
 * Requires: supabase-client.js loaded first (provides `db`).
 */

/* ── Helpers ───────────────────────────────────────────────── */

function formatDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateTime(str) {
  if (!str) return '—';
  const d = new Date(str);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function getTodayManilaDateStr() {
  const now = new Date();
  const d = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

function getCurrentTimeManilaHHmm() {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit', hour12: false
  });
  const parts = formatter.formatToParts(new Date());
  return parts.find(p => p.type === 'hour').value.padStart(2, '0') + ':' +
    parts.find(p => p.type === 'minute').value.padStart(2, '0');
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

/* ── Current user (persistent) ──────────────────────────── */

function getCurrentUser() {
  try {
    const raw = localStorage.getItem('labCurrentUser') || sessionStorage.getItem('labCurrentUser');
    const u = JSON.parse(raw || 'null');
    if (!u || !u.name) return null;
    let name = u.name;
    // strip email domain if stored as email
    if (name.includes('@')) name = name.split('@')[0];
    // return first segment only (e.g. "ong.karl88" → "Ong")
    const first = name.split(/[\s._]+/)[0];
    return first ? first.charAt(0).toUpperCase() + first.slice(1) : name;
  } catch (_) { return null; }
}
function setCurrentUser(name) {
  if (!name || !String(name).trim()) return false;
  const payload = JSON.stringify({ name: String(name).trim(), loginAt: new Date().toISOString() });
  localStorage.setItem('labCurrentUser', payload);
  return true;
}
function clearCurrentUser() {
  localStorage.removeItem('labCurrentUser');
  sessionStorage.removeItem('labCurrentUser');
}

/* ── Audit log ──────────────────────────────────────────────── */

async function addAuditEntry(action, details) {
  await db.from('audit_log').insert({
    action,
    details,
    user_name: getCurrentUser() || 'Unknown'
  });
}

async function getAuditLog() {
  const { data } = await db.from('audit_log').select('*').order('created_at', { ascending: false }).limit(500);
  return data || [];
}

/* ── Requests ───────────────────────────────────────────────── */

async function getRequests() {
  const { data } = await db.from('requests').select('*').order('date_submitted', { ascending: false });
  return (data || []).map(toClientRequest);
}

async function getRequestById(requestId) {
  const { data } = await db.from('requests').select('*').eq('request_id', requestId).maybeSingle();
  return data ? toClientRequest(data) : null;
}

// New requests are a plain insert: the public form may add a request but never read,
// overwrite or remove existing ones (the database only grants INSERT to visitors).
async function saveRequest(req) {
  const row = toDbRequest(req);
  const { error } = await db.from('requests').insert(row);
  if (error) throw error;
}

async function updateRequestStatus(requestId, status, extra = {}) {
  const { error } = await db.from('requests')
    .update({ status, ...extra })
    .eq('request_id', requestId);
  if (error) throw error;
}

async function getApprovedRequests() {
  const { data } = await db.from('requests').select('*').in('status', ['approved', 'released']);
  return (data || []).map(toClientRequest);
}

async function getApprovedNotReleased() {
  const { data } = await db.from('requests').select('*').eq('status', 'approved');
  return (data || []).map(toClientRequest);
}

// Convert DB row (snake_case) → client object (camelCase)
function toClientRequest(row) {
  return {
    requestId:          row.request_id,
    studentName:        row.student_name,
    studentNumber:      row.student_number,
    contactNumber:      row.contact_number,
    course:             row.course,
    yearLevel:          row.year_level,
    section:            row.section,
    subject:            row.subject,
    activity:           row.activity,
    instructor:         row.instructor,
    dateNeeded:         row.date_needed,
    timeNeeded:         row.time_needed ? row.time_needed.slice(0, 5) : '',
    timeEnd:            row.time_end    ? row.time_end.slice(0, 5)    : '',
    roomAssignment:     row.room_assignment,
    roomAssignmentName: row.room_assignment_name,
    requestType:        row.request_type,
    requesterType:      row.requester_type || 'student',
    projectTitle:       row.project_title || '',
    remarks:            row.remarks,
    items:              row.items || [],
    status:             row.status,
    dateSubmitted:      row.date_submitted,
    laboratory:         row.laboratory,
    rejectionReason:    row.rejection_reason,
  };
}

// Convert client object → DB row
function toDbRequest(req) {
  return {
    request_id:           req.requestId,
    student_name:         req.studentName,
    student_number:       req.studentNumber,
    contact_number:       req.contactNumber,
    course:               req.course,
    year_level:           req.yearLevel,
    section:              req.section,
    subject:              req.subject,
    activity:             req.activity,
    instructor:           req.instructor,
    date_needed:          req.dateNeeded   || null,
    time_needed:          req.timeNeeded   || null,
    time_end:             req.timeEnd      || null,
    room_assignment:      req.roomAssignment,
    room_assignment_name: req.roomAssignmentName,
    request_type:         req.requestType,
    requester_type:       req.requesterType || 'student',
    project_title:        req.projectTitle || null,
    remarks:              req.remarks,
    items:                req.items || [],
    status:               req.status || 'pending',
    date_submitted:       req.dateSubmitted || new Date().toISOString(),
    laboratory:           req.laboratory,
    rejection_reason:     req.rejectionReason || null,
  };
}

/* ── Chemicals ──────────────────────────────────────────────── */

async function getChemicals() {
  const { data } = await db.from('chemicals').select('*').order('name');
  return data || [];
}

async function getChemicalById(id) {
  const { data } = await db.from('chemicals').select('*').eq('id', id).single();
  return data || null;
}

async function saveChemicals(list) {
  // Full replace: upsert all
  const { error } = await db.from('chemicals').upsert(list, { onConflict: 'id' });
  if (error) throw error;
}

async function saveChemical(chem) {
  const { error } = await db.from('chemicals').upsert(chem, { onConflict: 'id' });
  if (error) throw error;
}

async function deleteChemical(id) {
  const { error } = await db.from('chemicals').delete().eq('id', id);
  if (error) throw error;
}

async function getExpiringChemicals(days = 30) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + days);
  const today = new Date().toISOString().slice(0, 10);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const { data } = await db.from('chemicals').select('*')
    .gte('expiry', today)
    .lte('expiry', cutoffStr)
    .order('expiry');
  return data || [];
}

async function getLowStockChemicals() {
  const { data } = await db.from('chemicals').select('*');
  return (data || []).filter(c => Number(c.quantity) <= Number(c.min_quantity));
}

async function deductChemicalQuantity(chemicalId, amount) {
  const chem = await getChemicalById(chemicalId);
  if (!chem) return false;
  const current = Number(chem.quantity) || 0;
  const deduct  = Number(amount) || 0;
  if (deduct <= 0 || current < deduct) return false;
  const { error } = await db.from('chemicals').update({ quantity: current - deduct }).eq('id', chemicalId);
  return !error;
}

async function getFIFOHintForChemical(chemicalName) {
  const { data } = await db.from('chemicals').select('*')
    .ilike('name', `%${chemicalName}%`)
    .order('expiry');
  if (!data || data.length === 0) return null;
  return data[0];
}

/* ── Equipment ──────────────────────────────────────────────── */

async function getEquipment() {
  const { data } = await db.from('equipment').select('*').order('name');
  return data || [];
}

async function getEquipmentById(id) {
  const { data } = await db.from('equipment').select('*').eq('id', id).single();
  return data || null;
}

async function saveEquipment(equip) {
  const { error } = await db.from('equipment').upsert(equip, { onConflict: 'id' });
  if (error) throw error;
}

async function deleteEquipment(id) {
  const { error } = await db.from('equipment').delete().eq('id', id);
  if (error) throw error;
}

async function getEquipmentDueCalibration(days = 30) {
  const today  = new Date().toISOString().slice(0, 10);
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() + days);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const { data } = await db.from('equipment').select('*')
    .gte('calibrate_date', today)
    .lte('calibrate_date', cutoffStr);
  return data || [];
}

/* ── Supplies ───────────────────────────────────────────────── */

async function getSupplies() {
  const { data } = await db.from('supplies').select('*').order('name');
  return data || [];
}

async function saveSupply(supply) {
  const { error } = await db.from('supplies').upsert(supply, { onConflict: 'id' });
  if (error) throw error;
}

/* ── Request items dropdown (combined) ─────────────────────── */

async function getRequestItemsForDropdown() {
  const [chemicals, equipment, supplies] = await Promise.all([
    getChemicals(), getEquipment(), getSupplies()
  ]);
  return [
    ...chemicals.map(c => ({ id: 'ch-' + c.id,  name: c.name, unit: c.unit || 'g',   type: 'chemical',  sourceId: c.id })),
    ...equipment.map(e => ({ id: 'eq-' + e.id,  name: e.name, unit: 'pcs',           type: 'equipment', sourceId: e.id })),
    ...supplies .map(s => ({ id: 'sp-' + s.id,  name: s.name, unit: s.unit || 'pcs', type: 'supply',    sourceId: s.id })),
  ];
}

/* ── Sections / Courses / Subjects / Experiments / Instructors */

async function getSections() {
  const { data } = await db.from('sections').select('*').order('name');
  return data || [];
}

async function getCourses() {
  const { data } = await db.from('courses').select('*').order('name');
  return data || [];
}

async function getSubjects() {
  const { data } = await db.from('subjects').select('*').order('name');
  return data || [];
}

async function getSubjectsByCourse(courseId) {
  if (!courseId) return getSubjects();
  const { data } = await db.from('subjects').select('*').eq('course_id', courseId).order('name');
  return data || [];
}

async function getExperiments() {
  const { data } = await db.from('experiments').select('*').order('name');
  return data || [];
}

async function getExperimentsBySubject(subjectId) {
  if (!subjectId) return getExperiments();
  const { data } = await db.from('experiments').select('*').eq('subject_id', subjectId).order('name');
  return data || [];
}

async function getInstructors() {
  const { data } = await db.from('instructors').select('*').order('name');
  return data || [];
}

async function getInstructorsBySubject(subjectId) {
  if (!subjectId) return getInstructors();
  const { data } = await db.from('instructors').select('*');
  return (data || []).filter(i => (i.subject_ids || []).includes(subjectId));
}

/* ── Breakages ──────────────────────────────────────────────── */

async function getBreakages() {
  const { data, error } = await db.from('breakages').select('*').order('date_reported', { ascending: false });
  if (error) throw error;
  return data || [];
}

async function addBreakage(entry) {
  const row = {
    id:             entry.id || ('brk-' + Date.now()),
    request_id:     entry.requestId     || null,
    student_name:   entry.studentName   || '',
    student_number: entry.studentNumber || '',
    group_name:     entry.groupName     || '',
    item_name:      entry.itemName      || '',
    quantity:       entry.quantity      || null,
    unit:           entry.unit          || '',
    incident_type:  entry.incidentType  || 'breakage',
    description:    entry.description   || '',
    logbook_image_url: entry.logbookImageUrl || null,
    damage_image_url:  entry.damageImageUrl  || null,
    reported_by:    getCurrentUser()    || 'Admin',
    date_reported:  new Date().toISOString(),
    date_occurred: entry.dateOccurred || null,
    date_resolved: entry.dateResolved || null,
  };
  const { error } = await db.from('breakages').insert(row);
  if (error) throw error;
  return row;
}

async function uploadIncidentImages(incidentId, logbookFile, damageFile) {
  const bucket = db.storage.from('incident-evidence');
  async function upload(file, kind) {
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    const path = incidentId + '/' + kind + '.' + ext;
    const { error } = await bucket.upload(path, file, { upsert: true, contentType: file.type || 'image/jpeg' });
    if (error) throw error;
    const { data } = bucket.getPublicUrl(path);
    return data.publicUrl;
  }
  return { logbook: await upload(logbookFile, 'logbook'), damage: await upload(damageFile, 'damage') };
}

async function deleteBreakage(id) {
  const { error } = await db.from('breakages').delete().eq('id', id);
  if (error) throw error;
}

async function updateBreakageDates(id, dateOccurred, dateResolved) {
  const { error } = await db.from('breakages').update({
    date_occurred: dateOccurred || null,
    date_resolved: dateResolved || null,
  }).eq('id', id);
  if (error) throw error;
}

/* ── Year Levels ────────────────────────────────────────────── */

async function getYearLevels() {
  const { data } = await db.from('year_levels').select('*').order('name');
  return data || [];
}

/* ── Inventory History ──────────────────────────────────────── */

async function getItemHistory(chemicalId) {
  const { data } = await db.from('inventory_history')
    .select('*')
    .eq('chemical_id', chemicalId)
    .order('month');
  return data || [];
}

async function saveItemHistory(chemicalId, entries) {
  const rows = entries.map(e => ({
    id:           chemicalId + '_' + e.month,
    chemical_id:  chemicalId,
    month:        e.month,
    consumption:  Number(e.consumption) || 0,
    acquisition:  Number(e.acquisition) || 0,
    notes:        e.notes || '',
  }));
  const { error } = await db.from('inventory_history').upsert(rows, { onConflict: 'id' });
  if (error) throw error;
}

/* ── Groups ─────────────────────────────────────────────────── */

async function getGroups() {
  const { data } = await db.from('groups').select('*').order('name');
  return data || [];
}

/* ── Room Schedule ──────────────────────────────────────────── */

async function getRoomSchedule() {
  const { data } = await db.from('room_schedule').select('*');
  return (data || []).map(r => ({
    id:        r.id,
    roomType:  r.room_type,
    roomId:    r.room_id,
    date:      r.date,
    startTime: r.start_time ? r.start_time.slice(0, 5) : '',
    endTime:   r.end_time   ? r.end_time.slice(0, 5)   : '',
    requestId: r.request_id,
  }));
}

async function getScheduleForRoom(roomType, roomId, dateStr) {
  const { data } = await db.from('room_schedule').select('*')
    .eq('room_type', roomType)
    .eq('room_id', String(roomId))
    .eq('date', dateStr);
  return (data || []).map(r => ({
    id: r.id, roomType: r.room_type, roomId: r.room_id,
    date: r.date,
    startTime: r.start_time ? r.start_time.slice(0, 5) : '',
    endTime:   r.end_time   ? r.end_time.slice(0, 5)   : '',
    requestId: r.request_id,
  }));
}

async function addScheduleEntry(entry) {
  const id = 'sched-' + Date.now();
  const row = {
    id,
    room_type:  entry.roomType,
    room_id:    String(entry.roomId),
    date:       entry.date,
    start_time: entry.startTime || '08:00',
    end_time:   entry.endTime   || '10:00',
    request_id: entry.requestId || null,
  };
  const { error } = await db.from('room_schedule').insert(row);
  if (error) throw error;
  return { ...entry, id };
}

async function updateScheduleEntry(id, updates) {
  const row = {};
  if (updates.roomType)  row.room_type  = updates.roomType;
  if (updates.roomId)    row.room_id    = String(updates.roomId);
  if (updates.date)      row.date       = updates.date;
  if (updates.startTime) row.start_time = updates.startTime;
  if (updates.endTime)   row.end_time   = updates.endTime;
  const { error } = await db.from('room_schedule').update(row).eq('id', id);
  if (error) throw error;
}

async function deleteScheduleEntry(id) {
  await db.from('room_schedule').delete().eq('id', id);
}

async function isRoomOccupiedOnDate(roomType, roomId, dateStr) {
  const entries = await getScheduleForRoom(roomType, roomId, dateStr);
  if (entries.length === 0) return false;
  const todayStr = getTodayManilaDateStr();
  if (dateStr < todayStr) return false;
  if (dateStr > todayStr) return true;
  const nowHHmm = getCurrentTimeManilaHHmm();
  return entries.some(e => nowHHmm >= (e.startTime || '00:00') && nowHHmm < (e.endTime || '23:59'));
}

async function getActiveScheduleForRoom(roomType, roomId, dateStr) {
  const entries = await getScheduleForRoom(roomType, roomId, dateStr);
  if (entries.length === 0) return [];
  const todayStr = getTodayManilaDateStr();
  if (dateStr < todayStr) return [];
  if (dateStr > todayStr) return entries;
  const nowHHmm = getCurrentTimeManilaHHmm();
  return entries.filter(e => nowHHmm >= (e.startTime || '00:00') && nowHHmm < (e.endTime || '23:59'));
}

/* ── Real-time subscription helper ─────────────────────────── */

/**
 * Subscribe to any table change. Call on pages that need live updates.
 * Returns an unsubscribe function.
 *
 * Usage:
 *   const unsub = onTableChange('requests', () => loadRequests());
 *   // call unsub() to stop listening
 */
function onTableChange(table, callback) {
  const channel = db.channel('realtime-' + table)
    .on('postgres_changes', { event: '*', schema: 'public', table }, callback)
    .subscribe();
  return () => db.removeChannel(channel);
}
