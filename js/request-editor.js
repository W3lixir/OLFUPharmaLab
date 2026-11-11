// Staff may edit pending requests; saving never changes approval status.
function editPendingRequest() {
    const request = currentRequestData;
    if (!request || request.status !== 'pending') return;
    const sections = document.querySelectorAll('.info-section');
    const fields = [['subject', 'Subject'], ['activity', 'Experiment'], ['instructor', 'Instructor'],
        ['dateNeeded', 'Date Needed', 'date'], ['timeNeeded', 'Start Time', 'time'],
        ['timeEnd', 'End Time', 'time'], ['laboratory', 'Laboratory'], ['remarks', 'Remarks']];
    sections[1].replaceChildren();
    const inputs = {};
    fields.forEach(([key, label, type]) => {
        const wrapper = document.createElement('label');
        wrapper.className = 'info-row';
        wrapper.textContent = label;
        const input = document.createElement('input');
        input.className = 'form-input';
        input.type = type || 'text';
        input.value = request[key] || '';
        wrapper.append(input);
        sections[1].append(wrapper);
        inputs[key] = input;
    });
    const tbody = sections[2].querySelector('tbody');
    tbody.replaceChildren();
    function addRow(item = {}) {
        const row = tbody.insertRow();
        ['category', 'name', 'quantity', 'unit'].forEach(key => {
            const input = document.createElement('input');
            input.className = 'form-input';
            input.dataset.field = key;
            input.setAttribute('aria-label', key);
            input.value = item[key] ?? '';
            input.style.width = '100%';
            if (key === 'quantity') { input.type = 'number'; input.min = '0.001'; input.step = 'any'; }
            row.insertCell().append(input);
        });
        const remove = document.createElement('button');
        remove.type = 'button'; remove.className = 'btn btn-danger'; remove.textContent = 'Remove';
        remove.onclick = () => row.remove();
        row.insertCell().append(remove);
    }
    (request.items || []).forEach(addRow);
    const edit = document.getElementById('edit-request-btn');
    edit.style.display = 'none';
    document.getElementById('approve-btn').disabled = true;
    const controls = document.createElement('div');
    controls.id = 'request-edit-controls';
    function button(label, action) {
        const btn = document.createElement('button'); btn.type = 'button';
        btn.className = 'btn btn-secondary'; btn.textContent = label; btn.onclick = action;
        controls.append(btn); return btn;
    }
    button('Add Item', () => addRow());
    button('Cancel Edit', () => { controls.remove(); openRequestDetail(request.requestId); });
    const save = button('Save Changes', async () => {
        try {
            const items = Array.from(tbody.rows).map(row => {
                const item = {};
                row.querySelectorAll('input').forEach(input => item[input.dataset.field] = input.value.trim());
                item.quantity = Number(item.quantity);
                if (!item.name || !item.category || !item.unit || !Number.isFinite(item.quantity) || item.quantity <= 0)
                    throw new Error('Each item needs a category, name, positive quantity, and unit.');
                return item;
            });
            if (!items.length) throw new Error('Add at least one item.');
            const extra = { items };
            fields.forEach(([key]) => extra[key] = inputs[key].value.trim());
            if (!extra.subject || !extra.activity || !extra.dateNeeded) throw new Error('Subject, experiment, and date needed are required.');
            if (extra.timeEnd && extra.timeNeeded && extra.timeEnd <= extra.timeNeeded) throw new Error('End time must be after start time.');
            save.disabled = true;
            const row = toDbRequest({ ...request, ...extra });
            const patch = { items: row.items };
            ['subject', 'activity', 'instructor', 'date_needed', 'time_needed', 'time_end', 'laboratory', 'remarks'].forEach(key => patch[key] = row[key]);
            const { data, error } = await db.from('requests').update(patch)
                .eq('request_id', request.requestId).eq('status', 'pending').select('request_id');
            if (error) throw error;
            if (!data || !data.length) throw new Error('This request is no longer pending. Reload before editing.');
            await addAuditEntry('Request Edited', request.requestId + ' — details and items updated before approval');
            await loadRequests();
            controls.remove();
            openRequestDetail(request.requestId);
        } catch (error) { alert('Unable to save: ' + error.message); }
        finally { save.disabled = false; }
    });
    sections[2].append(controls);
}
