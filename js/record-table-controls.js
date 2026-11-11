/** Search, column filters, and sorting for record tables, including async rerenders. */
(function () {
    const states = new Map();
    const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });
    const selector = 'main table.table, main table.data-table, main table.logs-table';
    const observer = new MutationObserver(refresh);
    function observe() { observer.observe(document.querySelector('main') || document.body, { childList: true, subtree: true }); }
    function text(cell) { return cell ? cell.textContent.trim() : ''; }
    function labelControl(label, element) {
        element.setAttribute('aria-label', label);
        const wrapper = document.createElement('label');
        wrapper.className = 'filter-group';
        const caption = document.createElement('span');
        caption.className = 'filter-label'; caption.textContent = label;
        wrapper.append(caption, element);
        return wrapper;
    }
    function select() { const el = document.createElement('select'); el.className = 'filter-select'; return el; }
    function option(el, label, value) { el.add(new Option(label, value)); }
    function apply(state) {
        observer.disconnect();
        const query = state.search.value.trim().toLowerCase();
        const index = Number(state.column.value);
        const chosen = state.value.value;
        let rows = Array.from(state.table.tBodies[0].rows).filter(row => !row.querySelector('[colspan]'));
        rows.forEach(row => {
            row.hidden = !!((query && !Array.from(row.cells).slice(0, state.headers.length).map(text).join(' ').toLowerCase().includes(query)) ||
                (index >= 0 && chosen && text(row.cells[index]) !== chosen));
        });
        const sortIndex = Number(state.sort.value);
        if (sortIndex < 0 && state.originalRows) {
            state.originalRows.filter(row => rows.includes(row)).forEach(row => state.table.tBodies[0].appendChild(row));
        }
        if (sortIndex >= 0) {
            const isDate = /date|maintenance/i.test(state.headers[sortIndex]);
            rows.sort((a, b) => {
                const x = text(a.cells[sortIndex]), y = text(b.cells[sortIndex]);
                const dx = Date.parse(x), dy = Date.parse(y);
                if (isDate && Number.isFinite(dx) !== Number.isFinite(dy)) return Number.isFinite(dx) ? -1 : 1;
                const comparison = isDate && Number.isFinite(dx) && Number.isFinite(dy) ? dx - dy : collator.compare(x, y);
                return comparison * (state.direction.value === 'desc' ? -1 : 1);
            });
            rows.forEach(row => state.table.tBodies[0].appendChild(row));
        }
        const visible = rows.filter(row => !row.hidden).length;
        state.count.textContent = visible + ' of ' + rows.length + ' records';
        state.empty.hidden = !rows.length || !!visible;
        observe();
    }
    function values(state) {
        const previous = state.value.value;
        state.value.replaceChildren(); option(state.value, 'All Values', '');
        const index = Number(state.column.value);
        if (index >= 0) {
            const unique = new Set(Array.from(state.table.tBodies[0].rows).filter(row => !row.querySelector('[colspan]')).map(row => text(row.cells[index])));
            Array.from(unique).filter(Boolean).sort(collator.compare).forEach(value => option(state.value, value, value));
        }
        state.value.value = Array.from(state.value.options).some(o => o.value === previous) ? previous : '';
        state.value.disabled = index < 0;
    }
    function refresh() {
        observer.disconnect();
        states.forEach(state => {
            if (!state.table.isConnected) { state.bar.remove(); state.empty.remove(); }
        });
        document.querySelectorAll(selector).forEach((table, tableIndex) => {
            if (table.closest('[role="dialog"], .modal, .lab-modal')) return;
            if (!table.tHead || !table.tBodies[0]) return;
            const headers = Array.from(table.tHead.rows[0].cells).map(text);
            const key = table.tBodies[0].id || headers.join('|') + ':' + tableIndex;
            let state = states.get(key);
            if (!state) {
                const bar = document.createElement('div'); bar.className = 'record-table-controls filters no-print';
                const search = document.createElement('input'); search.className = 'filter-input'; search.type = 'search'; search.placeholder = 'Quick search all columns...';
                const column = select(), value = select(), sort = select(), direction = select();
                option(column, 'All Columns', '-1'); option(sort, 'Default Order', '-1');
                headers.forEach((header, index) => {
                    if (!header || /actions/i.test(header)) return;
                    option(column, header, String(index)); option(sort, header, String(index));
                });
                option(direction, 'Ascending', 'asc'); option(direction, 'Descending', 'desc');
                const reset = document.createElement('button'); reset.type = 'button'; reset.className = 'btn btn-secondary'; reset.textContent = 'Reset Table';
                const count = document.createElement('span'); count.setAttribute('aria-live', 'polite');
                const empty = document.createElement('p'); empty.className = 'no-print'; empty.textContent = 'No records match the table filters.'; empty.hidden = true;
                bar.append(labelControl('Quick Search', search), labelControl('Filter Column', column), labelControl('Filter Value', value), labelControl('Sort By', sort), labelControl('Order', direction), reset, count);
                state = { table, headers, bar, search, column, value, sort, direction, count, empty };
                states.set(key, state);
                search.addEventListener('input', () => apply(state));
                column.addEventListener('change', () => { state.value.value = ''; values(state); apply(state); });
                [value, sort, direction].forEach(el => el.addEventListener('change', () => apply(state)));
                reset.addEventListener('click', () => {
                    search.value = ''; column.value = '-1'; value.value = ''; sort.value = '-1'; direction.value = 'asc';
                    // Restore the original order from the latest page render.
                    state.originalRows.forEach(row => state.table.tBodies[0].appendChild(row));
                    values(state); apply(state);
                });
            }
            state.table = table;
            const currentRows = Array.from(table.tBodies[0].rows);
            if (!state.originalRows || currentRows.length !== state.originalRows.length || currentRows.some(row => !state.originalRows.includes(row))) state.originalRows = currentRows;
            const container = table.closest('.table-container') || table;
            if (container.previousElementSibling !== state.bar) container.before(state.bar);
            if (container.nextElementSibling !== state.empty) container.after(state.empty);
            values(state); apply(state);
        });
        observer.takeRecords();
        observe();
    }
    refresh();
})();
