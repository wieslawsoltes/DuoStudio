/* GridSheet: virtualized editable cells, interpreted formulas and OOXML interchange. */
(function (D) {
    'use strict';
    const S = D.Studio, F = S.Formula, E = D.escape;
    D.SDK.register({ id: 'gridsheet', name: 'GridSheet', rank: 17, category: 'Create', pattern: 'Worksheet + analysis', description: 'Live formulas, editable XLSX, CSV and charts in a folding spreadsheet.', boundary: 'One worksheet, 200 rows × 52 columns. Documented formula and formatting subset, not complete Excel compatibility.' }, D.SDK.UIViewRepresentable(ctx => {
        const seed = { title: 'Launch budget', cells: { A1: 'Studio launch', B1: 'Quantity', C1: 'Unit cost', D1: 'Total', A2: 'Prototype', B2: '3', C2: '450', D2: '=B2*C2', A3: 'Materials', B3: '12', C3: '28', D3: '=B3*C3', A4: 'Production', B4: '8', C4: '95', D4: '=B4*C4', A5: 'Design', B5: '20', C5: '55', D5: '=B5*C5', A7: 'Budget', D7: '=SUM(D2:D5)', A8: 'Contingency', C8: '0.15', D8: '=ROUND(D7*C8,2)', A9: 'Grand total', D9: '=SUM(D7:D8)' }, selected: 'A1', rows: 60, cols: 18, formats: { A1: { bold: true }, B1: { bold: true }, C1: { bold: true }, D1: { bold: true }, D7: { bold: true, kind: 'currency' }, D8: { kind: 'currency' }, D9: { bold: true, kind: 'currency' }, C8: { kind: 'percent' } } };
        const doc = ctx.document(seed), m = doc.state;
        let anchor = m().selected, workbook, first = 0, selecting = false;
        ctx.root.innerHTML = doc.header('Formula workbench · local XLSX') + S.toolbar(S.button('sheet-import', 'Import CSV / XLSX') + S.button('sheet-csv', 'CSV ↓') + S.button('sheet-xlsx', 'XLSX ↓') + S.button('sheet-fill', 'Fill down') + S.button('sheet-bold', 'B') + S.button('sheet-sort', 'Sort A → Z')) + D.paneTabs('Worksheet', 'Analysis') + `<div class="duo-panes pro-panes sheet-panes"><section class="pane primary-pane"><div class="formula-bar"><input class="cell-address" aria-label="Cell address" value="A1"><span>ƒx</span><input class="cell-formula" aria-label="Cell formula" placeholder="Type a value or =SUM(A1:A10)"><button data-action="sheet-apply" class="pro-btn">↵</button></div><div class="sheet-scroll" tabindex="0" aria-label="Worksheet; arrows move, Shift selects a range, typing edits"><div class="sheet-grid"></div></div><div class="pro-status sheet-status"></div></section><aside class="pane secondary-pane pro-inspector"></aside></div>`;
        const q = s => ctx.root.querySelector(s), formula = q('.cell-formula'), address = q('.cell-address'), scroll = q('.sheet-scroll'), grid = q('.sheet-grid'), inspector = q('.pro-inspector');
        const range = () => { let a, b; try {
            a = F.coordinate(anchor);
            b = F.coordinate(m().selected);
        }
        catch {
            a = b = { row: 0, col: 0 };
        } return { r0: Math.min(a.row, b.row), r1: Math.max(a.row, b.row), c0: Math.min(a.col, b.col), c1: Math.max(a.col, b.col) }; };
        const each = fn => { const r = range(); for (let y = r.r0; y <= r.r1; y++)
            for (let x = r.c0; x <= r.c1; x++)
                fn(F.address(y, x), y, x); };
        const display = (value, format = {}) => typeof value === 'number' ? format.kind === 'currency' ? new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value) : format.kind === 'percent' ? (value * 100).toFixed(1) + '%' : format.kind === 'fixed' ? value.toFixed(2) : Number(value.toPrecision(11)).toLocaleString(undefined, { maximumFractionDigits: 8 }) : String(value);
        function drawGrid() { const model = m(), r = range(), visible = Math.min(Math.max(35, Math.ceil(scroll.clientHeight / 30) + 8), model.rows - first); let html = `<table class="sheet-table" role="grid" aria-rowcount="${model.rows + 1}" aria-colcount="${model.cols + 1}"><thead><tr><th class="corner"></th>${Array.from({ length: model.cols }, (_, c) => `<th>${F.column(c)}</th>`).join('')}</tr></thead><tbody>`; if (first)
            html += `<tr class="sheet-spacer" style="height:${first * 30}px"><td colspan="${model.cols + 1}"></td></tr>`; for (let y = first; y < first + visible; y++) {
            html += `<tr><th>${y + 1}</th>`;
            for (let x = 0; x < model.cols; x++) {
                const key = F.address(y, x), v = workbook.value(key), format = model.formats[key] || {}, selected = y >= r.r0 && y <= r.r1 && x >= r.c0 && x <= r.c1;
                html += `<td role="gridcell" aria-selected="${selected}" data-cell="${key}" class="${model.selected === key ? 'current' : ''} ${selected ? 'selected' : ''} ${typeof v === 'number' ? 'numeric' : ''} ${String(v).startsWith('#') ? 'cell-error' : ''}" style="font-weight:${format.bold ? 700 : 400};color:${S.color(format.color, '#dce5ed')}" title="${E(model.cells[key] || '')}">${E(display(v, format))}</td>`;
            }
            html += '</tr>';
        } const rest = model.rows - first - visible; if (rest > 0)
            html += `<tr class="sheet-spacer" style="height:${rest * 30}px"><td colspan="${model.cols + 1}"></td></tr>`; grid.innerHTML = html + '</tbody></table>'; }
        function stats() { const values = []; each(key => values.push(workbook.value(key))); const nums = values.filter(v => typeof v === 'number'), sum = nums.reduce((a, b) => a + b, 0), r = range(); q('.sheet-status').textContent = `${F.address(r.r0, r.c0)}:${F.address(r.r1, r.c1)} · ${values.length} cells · Sum ${Number(sum.toFixed(4))} · Average ${nums.length ? Number((sum / nums.length).toFixed(4)) : 0}`; }
        function chart() { const r = range(); let col = r.c1, start = r.r0, end = r.r1; if (start === end) {
            col = Math.min(3, m().cols - 1);
            start = Math.min(1, m().rows - 1);
            end = Math.min(4, m().rows - 1);
        } const rows = []; for (let y = start; y <= Math.min(end, start + 15); y++) {
            const v = workbook.value(F.address(y, col));
            if (typeof v === 'number')
                rows.push({ name: String(workbook.value(F.address(y, 0)) || ('Row ' + (y + 1))), v });
        } const max = Math.max(1, ...rows.map(x => Math.abs(x.v))), h = Math.max(170, rows.length * 35 + 45); return `<svg class="sheet-chart" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 ${h}" role="img" aria-label="Live values chart"><rect width="320" height="${h}" rx="14" fill="#101d25"/>${rows.map((r, i) => `<text x="14" y="${28 + i * 35}" fill="#bed3d7" font-family="sans-serif" font-size="11">${E(r.name.slice(0, 18))}</text><rect x="132" y="${15 + i * 35}" width="${Math.abs(r.v) / max * 108}" height="18" rx="4" fill="${r.v < 0 ? '#fb8494' : '#57d5b2'}"/><text x="${139 + Math.abs(r.v) / max * 108}" y="${28 + i * 35}" fill="white" font-size="10" font-family="sans-serif">${E(Number(r.v.toFixed(2)))}</text>`).join('')}<text x="14" y="${h - 12}" fill="#89a4ad" font-size="10" font-family="sans-serif">${rows.length ? 'Live computed values' : 'Select numeric cells to chart'}</text></svg>`; }
        function tools() { const model = m(), fmt = model.formats[model.selected] || {}; inspector.innerHTML = S.section('Workbook', S.field('title', 'Title', model.title, 'text') + S.field('rows', 'Rows', model.rows, 'number', 'min="1" max="200"') + S.field('cols', 'Columns', model.cols, 'number', 'min="1" max="52"')) + S.section('Cell ' + model.selected, S.select('kind', 'Number format', fmt.kind || 'general', ['general', 'currency', 'percent', 'fixed']) + S.field('color', 'Text color', S.color(fmt.color, '#dce5ed'), 'color') + S.toolbar(S.button('sheet-clear', 'Clear range') + S.button('sheet-fill-right', 'Fill right') + S.button('sheet-copy', 'Copy TSV'))) + S.section('Live chart', chart() + S.button('sheet-chart-export', 'Export chart SVG')) + S.section('Formula language', S.help('SUM, AVERAGE, MIN, MAX, COUNT, ROUND, IF, IFERROR, text functions, ranges and absolute references. Shift-click selects a range. Paste a table directly. Formulas never execute JavaScript.')); }
        function render() { const model = m(); workbook = new F.Workbook(model.cells, model.rows, model.cols); try {
            for (const key of [model.selected, anchor]) {
                const a = F.coordinate(key);
                if (a.row >= model.rows || a.col >= model.cols)
                    throw Error();
            }
        }
        catch {
            model.selected = anchor = 'A1';
        } first = Math.min(first, Math.max(0, model.rows - 1)); address.value = model.selected; if (document.activeElement !== formula)
            formula.value = model.cells[model.selected] || ''; drawGrid(); stats(); tools(); }
        function select(key, extend = false, ensure = false) { const p = F.coordinate(key); if (p.row >= m().rows || p.col >= m().cols)
            throw Error('Address outside the worksheet.'); if (!extend)
            anchor = key; m().selected = key; ctx.save(); address.value = key; formula.value = m().cells[key] || ''; if (ensure) {
            if (p.row * 30 < scroll.scrollTop)
                scroll.scrollTop = p.row * 30;
            if ((p.row + 2) * 30 > scroll.scrollTop + scroll.clientHeight)
                scroll.scrollTop = (p.row + 2) * 30 - scroll.clientHeight;
            first = Math.max(0, Math.floor(scroll.scrollTop / 30) - 3);
        } drawGrid(); stats(); tools(); }
        function mutate(fn) { doc.change(fn); render(); }
        function commit() { const value = formula.value.slice(0, 10000); if (value !== String(m().cells[m().selected] || ''))
            mutate(v => { if (value)
                v.cells[v.selected] = value;
            else
                delete v.cells[v.selected]; }); }
        function move(dr, dc, extend = false) { const p = F.coordinate(m().selected); select(F.address(Math.max(0, Math.min(m().rows - 1, p.row + dr)), Math.max(0, Math.min(m().cols - 1, p.col + dc))), extend, true); }
        ctx.scope.on(scroll, 'scroll', () => { const next = Math.min(m().rows - 1, Math.max(0, Math.floor(scroll.scrollTop / 30) - 3)); if (next !== first) {
            first = next;
            drawGrid();
        } });
        ctx.scope.on(scroll, 'pointerdown', e => { const cell = e.target.closest('[data-cell]'); if (!cell)
            return; commit(); select(cell.dataset.cell, e.shiftKey); selecting = true; scroll.focus({ preventScroll: true }); e.preventDefault(); });
        ctx.scope.on(scroll, 'pointerover', e => { if (selecting && e.buttons) {
            const cell = e.target.closest('[data-cell]');
            if (cell)
                select(cell.dataset.cell, true);
        } });
        ctx.scope.on(window, 'pointerup', () => selecting = false);
        ctx.scope.on(window, 'blur', () => selecting = false);
        ctx.scope.on(scroll, 'dblclick', () => { formula.focus(); formula.select(); });
        ctx.scope.on(formula, 'change', commit);
        ctx.scope.on(formula, 'keydown', e => { if (e.key === 'Enter') {
            e.preventDefault();
            commit();
            move(e.shiftKey ? -1 : 1, 0);
            scroll.focus();
        } if (e.key === 'Escape') {
            formula.value = m().cells[m().selected] || '';
            scroll.focus();
        } });
        ctx.scope.on(address, 'change', () => { try {
            select(address.value.toUpperCase(), false, true);
        }
        catch {
            D.toast('Enter an address inside this worksheet.');
            address.value = m().selected;
        } });
        ctx.scope.on(scroll, 'keydown', e => { const dirs = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1], Tab: [0, e.shiftKey ? -1 : 1], Enter: [e.shiftKey ? -1 : 1, 0] }; if (dirs[e.key]) {
            e.preventDefault();
            move(...dirs[e.key], e.shiftKey && !['Tab', 'Enter'].includes(e.key));
        }
        else if (['Delete', 'Backspace'].includes(e.key)) {
            e.preventDefault();
            mutate(model => each(key => delete model.cells[key]));
        }
        else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
            e.preventDefault();
            copy();
        }
        else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            formula.focus();
            formula.value = e.key;
        } });
        ctx.scope.on(scroll, 'paste', e => { const text = e.clipboardData.getData('text/plain'); if (!text)
            return; e.preventDefault(); try {
            const rows = S.CSV.parse(text, '\t'), start = F.coordinate(m().selected);
            mutate(model => rows.forEach((row, y) => row.forEach((value, x) => { if (start.row + y < model.rows && start.col + x < model.cols)
                model.cells[F.address(start.row + y, start.col + x)] = value.slice(0, 10000); })));
        }
        catch (err) {
            D.toast(err.message);
        } });
        ctx.scope.on(inspector, 'change', e => { const k = e.target.dataset.field; if (!k)
            return; mutate(model => { if (k === 'title')
            model.title = e.target.value.slice(0, 120);
        else if (k === 'rows' || k === 'cols') {
            model[k] = Math.round(S.finite(e.target.value, model[k], 1, k === 'rows' ? 200 : 52));
            for (const key of Object.keys(model.cells)) {
                const a = F.coordinate(key);
                if (a.row >= model.rows || a.col >= model.cols) {
                    delete model.cells[key];
                    delete model.formats[key];
                }
            }
        }
        else if (['kind', 'color'].includes(k))
            each(key => { model.formats[key] = { ...model.formats[key], [k]: k === 'color' ? S.color(e.target.value) : e.target.value }; }); }); });
        async function copy() { const r = range(), rows = []; for (let y = r.r0; y <= r.r1; y++) {
            const row = [];
            for (let x = r.c0; x <= r.c1; x++)
                row.push(workbook.value(F.address(y, x)));
            rows.push(row);
        } const text = S.CSV.stringify(rows, '\t'); try {
            await navigator.clipboard.writeText(text);
            D.toast('Range copied as TSV');
        }
        catch {
            D.download('selection.tsv', text, 'text/tab-separated-values');
        } }
        function fill(right) { const r = range(); mutate(model => { for (let y = r.r0; y <= r.r1; y++)
            for (let x = r.c0; x <= r.c1; x++) {
                const src = F.address(right ? y : r.r0, right ? r.c0 : x), target = F.address(y, x);
                model.cells[target] = F.translate(String(model.cells[src] || ''), right ? 0 : y - r.r0, right ? x - r.c0 : 0);
                model.formats[target] = S.clone(model.formats[src] || {});
            } }); }
        ctx.act('sheet-apply', commit);
        ctx.act('sheet-copy', copy);
        ctx.act('sheet-clear', () => mutate(model => each(key => delete model.cells[key])));
        ctx.act('sheet-fill', () => fill(false));
        ctx.act('sheet-fill-right', () => fill(true));
        ctx.act('sheet-bold', () => { const value = !m().formats[m().selected]?.bold; mutate(model => each(key => { model.formats[key] = { ...model.formats[key], bold: value }; })); });
        ctx.act('sheet-sort', () => { const r = range(); let start = r.r0, end = r.r1; if (start === end) {
            start = Math.min(1, m().rows - 1);
            end = Math.min(m().rows - 1, Math.max(start, ...Object.keys(m().cells).map(key => F.coordinate(key).row)));
        } const rows = Array.from({ length: end - start + 1 }, (_, i) => start + i).sort((a, b) => String(workbook.value(F.address(a, r.c1))).localeCompare(String(workbook.value(F.address(b, r.c1))), undefined, { numeric: true })); mutate(model => { const old = S.clone(model.cells), formats = S.clone(model.formats); rows.forEach((row, i) => { for (let c = 0; c < model.cols; c++) {
            const src = F.address(row, c), dest = F.address(start + i, c);
            model.cells[dest] = F.translate(old[src] || '', start + i - row, 0);
            model.formats[dest] = formats[src] || {};
        } }); }); });
        ctx.act('sheet-csv', () => { const r = Math.max(0, ...Object.keys(m().cells).map(k => F.coordinate(k).row)), c = Math.max(0, ...Object.keys(m().cells).map(k => F.coordinate(k).col)); D.download(m().title + '.csv', S.CSV.stringify(Array.from({ length: r + 1 }, (_, y) => Array.from({ length: c + 1 }, (_, x) => workbook.value(F.address(y, x))))), 'text/csv'); });
        ctx.act('sheet-xlsx', () => D.download(m().title + '.xlsx', S.Office.xlsx(m()), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'));
        ctx.act('sheet-import', () => S.pickFile('.csv,.tsv,.xlsx', async (file) => { let model; if (/\.xlsx$/i.test(file.name))
            model = await S.Office.readXlsx(await file.arrayBuffer());
        else {
            const rows = S.CSV.parse(await file.text(), /\.tsv$/i.test(file.name) ? '\t' : ','), cells = {};
            rows.forEach((row, y) => row.forEach((v, x) => cells[F.address(y, x)] = v));
            model = { ...S.clone(seed), cells, formats: {}, rows: Math.max(30, rows.length), cols: Math.max(12, ...rows.map(r => r.length)), selected: 'A1' };
        } model.title = file.name.replace(/\.[^.]+$/, ''); anchor = 'A1'; doc.load({ format: 'duo-project', version: 1, app: ctx.id, model }); }));
        ctx.act('sheet-chart-export', () => D.download(m().title + '-chart.svg', chart(), 'image/svg+xml'));
        ctx.listen('restore', id => { if (id === ctx.id) {
            anchor = m().selected;
            render();
        } });
        render();
        return { render, resume: render, suspend: commit, receive: artifact => { if (artifact.type === 'application/x-duo-project') {
                doc.load(S.parseJSON(artifact.text));
                return;
            } mutate(model => model.cells[model.selected] = String(artifact.text || artifact.title || '').slice(0, 10000)); }, get workbook() { return workbook; }, select, fill };
    }));
})(window.Duo);
