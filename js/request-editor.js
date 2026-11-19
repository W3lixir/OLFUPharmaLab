// Staff may edit pending requests; saving never changes approval status.
// While editing, Approve and Save Draft save the edits first (window.saveRequestEdits).
(function () {
    const CATEGORIES = ['Liquid Reagent', 'Solid Reagent', 'Glassware', 'Equipment', 'Antibiotic Disc'];
    const css = document.createElement('style');
    css.textContent = `
        .rq-edit-fields { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px 14px; }
        .rq-edit-fields label { display: flex; flex-direction: column; gap: 4px; font-size: 12px; font-weight: 600; color: #6b6290; }
        .rq-edit-in { width: 100%; box-sizing: border-box; padding: 7px 9px; font: inherit; font-size: 13px; color: #2d2650;
            background: #fff; border: 1px solid #ddd6f3; border-radius: 9px; }
        .rq-edit-in:focus { outline: none; border-color: #8b6fe0; box-shadow: 0 0 0 3px rgba(139,111,224,.18); }
        .rq-edit-table { width: 100%; table-layout: fixed; border-collapse: separate; border-spacing: 0 6px; }
        .rq-edit-table th { font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: #8a82ab; text-align: left; padding: 0 4px; }
        .rq-edit-table td { padding: 0 4px; vertical-align: middle; }
        .rq-edit-table tr.rq-bad .rq-edit-in { border-color: #e0567a; background: #fff5f7; }
        .rq-edit-tag { display: block; font-size: 10.5px; color: #8a82ab; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .rq-edit-x { width: 30px; height: 30px; border-radius: 50%; border: 1px solid #f1c9d3; background: #fff; color: #c2385d;
            font-size: 17px; line-height: 1; cursor: pointer; }
        .rq-edit-x:hover { background: #fde8ee; }
        #request-edit-controls { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-top: 10px; }
        #request-edit-controls .rq-edit-msg { color: #c2385d; font-size: 13px; flex-basis: 100%; }
        .modal-actions .btn:disabled { opacity: .5; cursor: not-allowed; }
        @media (max-width: 640px) {
            .rq-edit-table colgroup { display: none; }
            .rq-edit-table, .rq-edit-table tbody, .rq-edit-table tr, .rq-edit-table td { display: block; width: 100%; }
            .rq-edit-table thead { display: none; }
            .rq-edit-table tr { display: grid; grid-template-columns: 1fr 1fr 34px; gap: 6px; padding: 8px; border: 1px solid #ece7fa; border-radius: 12px; margin-bottom: 8px; }
            .rq-edit-table td:nth-child(2) { grid-column: 1 / 3; grid-row: 1; }
            .rq-edit-table td:nth-child(5) { grid-column: 3; grid-row: 1; }
        }`;
    document.head.appendChild(css);

    let active = null;   // { save: async () => boolean } while a request is being edited

    // Called by Approve / Save Draft. Returns true when there is nothing to save or the save worked.
    window.saveRequestEdits = async function () { return active ? active.save() : true; };
    window.isEditingRequest = function () { return !!active; };

    window.editPendingRequest = function () {
        const request = currentRequestData;
        if (!request || request.status !== 'pending') return;
        const sections = document.querySelectorAll('#requestModal .info-section');
        const fields = [['subject', 'Subject'], ['activity', 'Experiment'], ['instructor', 'Instructor'],
            ['dateNeeded', 'Date Needed', 'date'], ['timeNeeded', 'Start Time', 'time'],
            ['timeEnd', 'End Time', 'time'], ['laboratory', 'Laboratory'], ['remarks', 'Remarks']];
        const title = sections[1].querySelector('.info-section-title');
        sections[1].replaceChildren();
        if (title) sections[1].append(title);
        const grid = document.createElement('div'); grid.className = 'rq-edit-fields';
        sections[1].append(grid);
        const inputs = {};
        fields.forEach(([key, label, type]) => {
            const wrapper = document.createElement('label');
            wrapper.textContent = label;
            const input = document.createElement('input');
            input.className = 'rq-edit-in';
            input.type = type || 'text';
            let v = request[key] || '';
            if (type === 'date') v = String(v).slice(0, 10);
            if (type === 'time') v = String(v).slice(0, 5);
            input.value = v;
            wrapper.append(input);
            grid.append(wrapper);
            inputs[key] = input;
        });

        // Items: one tidy table replacing the read-only one
        const oldTable = sections[2].querySelector('table');
        const table = document.createElement('table');
        table.className = 'rq-edit-table';
        table.innerHTML = '<colgroup><col style="width:22%"><col><col style="width:13%"><col style="width:12%"><col style="width:40px"></colgroup>' +
            '<thead><tr><th>Category</th><th>Item name</th><th>Qty</th><th>Unit</th><th></th></tr></thead><tbody></tbody>';
        oldTable.hidden = true;
        oldTable.after(table);
        const tbody = table.tBodies[0];

        function addRow(item = {}) {
            const row = tbody.insertRow();
            row.dataset.meta = JSON.stringify({ itemId: item.itemId, source: item.source, substituteFor: item.substituteFor,
                basis: item.basis, perUnitQty: item.perUnitQty, originalName: item.name });
            const cat = document.createElement('select');
            cat.className = 'rq-edit-in'; cat.dataset.field = 'category'; cat.setAttribute('aria-label', 'Category');
            if (!item.category) cat.add(new Option('Choose…', ''));
            const cats = !item.category || CATEGORIES.includes(item.category) ? CATEGORIES : [item.category, ...CATEGORIES];
            cats.forEach(c => cat.add(new Option(c, c)));
            cat.value = item.category || '';
            row.insertCell().append(cat);
            ['name', 'quantity', 'unit'].forEach(key => {
                const input = document.createElement('input');
                input.className = 'rq-edit-in';
                input.dataset.field = key;
                input.setAttribute('aria-label', key === 'name' ? 'Item name' : key === 'quantity' ? 'Quantity' : 'Unit');
                input.value = item[key] ?? '';
                if (key === 'name') input.title = input.value;
                if (key === 'quantity') { input.type = 'number'; input.min = '0'; input.step = 'any'; if (item.source === 'kit') input.placeholder = 'as needed'; }
                const cell = row.insertCell(); cell.append(input);
                if (key === 'name' && (item.substituteFor || item.source === 'additional')) {
                    const tag = document.createElement('span'); tag.className = 'rq-edit-tag';
                    tag.textContent = item.substituteFor ? 'Substitute for ' + item.substituteFor : 'Additional item';
                    cell.append(tag);
                }
            });
            const remove = document.createElement('button');
            remove.type = 'button'; remove.className = 'rq-edit-x'; remove.textContent = '×';
            remove.title = 'Remove item'; remove.setAttribute('aria-label', 'Remove ' + (item.name || 'item'));
            remove.onclick = () => row.remove();
            row.insertCell().append(remove);
            return row;
        }
        (request.items || []).forEach(item => addRow(item));

        document.getElementById('edit-request-btn').style.display = 'none';
        const controls = document.createElement('div');
        controls.id = 'request-edit-controls';
        const msg = document.createElement('div'); msg.className = 'rq-edit-msg'; msg.setAttribute('role', 'alert');
        function button(label, cls, action) {
            const btn = document.createElement('button'); btn.type = 'button';
            btn.className = 'btn ' + cls; btn.textContent = label; btn.onclick = action;
            controls.append(btn); return btn;
        }
        button('+ Add Item', 'btn-secondary', () => { const r = addRow(); r.querySelector('select').focus(); });
        // Put the read-only view back (openRequestDetail refills it).
        function teardown() { active = null; table.remove(); controls.remove(); oldTable.hidden = false; }
        button('Cancel Edit', 'btn-secondary', () => { teardown(); openRequestDetail(request.requestId); });
        const saveBtn = button('Save Changes', 'btn-primary', () => active && active.save());
        controls.append(msg);
        sections[2].append(controls);

        async function save() {
            msg.textContent = '';
            tbody.querySelectorAll('tr.rq-bad').forEach(r => r.classList.remove('rq-bad'));
            const fail = (text, row) => {
                msg.textContent = text;
                if (row) { row.classList.add('rq-bad'); row.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
                return false;
            };
            const items = [];
            for (const [n, row] of Array.from(tbody.rows).entries()) {
                const meta = JSON.parse(row.dataset.meta || '{}');
                const item = {};
                row.querySelectorAll('[data-field]').forEach(input => item[input.dataset.field] = input.value.trim());
                // Same item: keep its inventory link and kit labels. Renamed: it is a different item now.
                if (meta.originalName && meta.originalName === item.name) {
                    ['itemId', 'source', 'substituteFor', 'basis', 'perUnitQty'].forEach(k => { if (meta[k] != null) item[k] = meta[k]; });
                } else if (meta.source) item.source = 'additional';
                const asNeeded = item.quantity === '' && meta.source === 'kit';
                item.quantity = asNeeded ? '' : Number(item.quantity);
                if (!item.name) return fail(`Row ${n + 1}: enter the item name.`, row);
                if (!item.category) return fail(`Row ${n + 1} (${item.name}): choose a category.`, row);
                if (!asNeeded && (!Number.isFinite(item.quantity) || item.quantity <= 0)) return fail(`Row ${n + 1} (${item.name}): enter a quantity above 0.`, row);
                if (!asNeeded && !item.unit) return fail(`Row ${n + 1} (${item.name}): enter the unit (pcs, mL, g…).`, row);
                items.push(item);
            }
            if (!items.length) return fail('Add at least one item.');
            const extra = { items };
            fields.forEach(([key]) => extra[key] = inputs[key].value.trim());
            if (!extra.subject) return fail('Enter the subject.');
            if (!extra.activity) return fail('Enter the experiment.');
            if (!extra.dateNeeded) return fail('Enter the date needed.');
            if (extra.timeEnd && extra.timeNeeded && extra.timeEnd <= extra.timeNeeded) return fail('End time must be after start time.');
            saveBtn.disabled = true; saveBtn.textContent = 'Saving…';
            try {
                const row = toDbRequest({ ...request, ...extra });
                const patch = { items: row.items };
                ['subject', 'activity', 'instructor', 'date_needed', 'time_needed', 'time_end', 'laboratory', 'remarks'].forEach(key => patch[key] = row[key]);
                const { data, error } = await db.from('requests').update(patch)
                    .eq('request_id', request.requestId).eq('status', 'pending').select('request_id');
                if (error) throw error;
                if (!data || !data.length) throw new Error('This request is no longer pending. Reload the page.');
                try { await addAuditEntry('Request Edited', request.requestId + ' — details and items updated before approval'); } catch (_) {}
                teardown();
                await loadRequests();
                openRequestDetail(request.requestId);
                return true;
            } catch (error) {
                return fail('Not saved: ' + (error.message || error));
            } finally { saveBtn.disabled = false; saveBtn.textContent = 'Save Changes'; }
        }
        active = { save, teardown };
    };

    // Opening a request (or closing the modal) ends any edit in progress; unsaved edits are dropped.
    window.endRequestEdit = function () { if (active) active.teardown(); };
})();
