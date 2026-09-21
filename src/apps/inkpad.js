/* Layered, pressure-aware raster drawing. Raster data is preserved in project files. */
(function (D) {
    'use strict';
    const S = D.Studio, E = D.escape;
    D.SDK.register({ id: 'inkpad', name: 'Inkpad', rank: 19, category: 'Create', pattern: 'Canvas + palette', description: 'Pressure brushes, shapes, flood fill, layers and original raster artwork.', boundary: 'Local Canvas 2D paint engine, up to 12 layers. Not a Photoshop/Rebelle file-format implementation.' }, D.SDK.UIViewRepresentable(ctx => {
        const first = { id: D.uid(), name: 'Paper', visible: true, opacity: 1, imageData: '' }, second = { id: D.uid(), name: 'Ink', visible: true, opacity: 1, imageData: '' };
        const doc = ctx.document({ title: 'An unfolding thought', layers: [first, second], selected: second.id, color: '#685bef', size: 18, tool: 'brush', width: 900, height: 600, brushOpacity: 1 }), m = doc.state;
        let runtime = new Map(), loadGeneration = 0, loadedSize = '', stroke = null, preview = null, dirty = false, disposed = false;
        ctx.root.innerHTML = doc.header('Layered paint · pen pressure') + S.toolbar(['brush', 'eraser', 'line', 'rect', 'ellipse', 'fill', 'eyedropper'].map(t => S.button('ink-tool', t, false, `data-tool="${t}"`)).join('') + S.button('ink-import', 'Image +') + S.button('ink-png', 'PNG ↓')) + D.paneTabs('Canvas', 'Palette') + `<div class="duo-panes pro-panes"><section class="pane primary-pane"><div class="ink-viewport pro-viewport"></div><div class="pro-status ink-status"></div></section><aside class="pane secondary-pane pro-inspector"></aside></div>`;
        const q = s => ctx.root.querySelector(s), selected = () => m().layers.find(l => l.id === m().selected) || m().layers.at(-1), make = () => { const c = document.createElement('canvas'); c.width = m().width; c.height = m().height; return c; };
        function composite(target, extra = true) { const g = target.getContext('2d'); g.clearRect(0, 0, target.width, target.height); for (const layer of m().layers) {
            if (!layer.visible)
                continue;
            const c = runtime.get(layer.id)?.canvas;
            if (!c)
                continue;
            g.globalAlpha = layer.opacity;
            g.drawImage(extra && preview?.id === layer.id ? preview.canvas : c, 0, 0);
        } g.globalAlpha = 1; }
        function rect(w, h) { const scale = Math.max(.001, Math.min((w - 44) / m().width, (h - 44) / m().height)); return { x: (w - m().width * scale) / 2, y: (h - m().height * scale) / 2, w: m().width * scale, h: m().height * scale, scale }; }
        function draw(g, w, h) { g.fillStyle = '#111722'; g.fillRect(0, 0, w, h); const r = rect(w, h); g.save(); g.shadowColor = '#0008'; g.shadowBlur = 24; g.fillStyle = '#fff'; g.fillRect(r.x, r.y, r.w, r.h); g.restore(); g.save(); g.translate(r.x, r.y); g.scale(r.scale, r.scale); for (let y = 0; y < m().height; y += 24)
            for (let x = 0; x < m().width; x += 24) {
                g.fillStyle = ((x / 24 + y / 24) % 2) ? '#eef0f4' : '#fff';
                g.fillRect(x, y, Math.min(24, m().width - x), Math.min(24, m().height - y));
            } for (const l of m().layers) {
            const c = runtime.get(l.id)?.canvas;
            if (l.visible && c) {
                g.globalAlpha = l.opacity;
                g.drawImage(preview?.id === l.id ? preview.canvas : c, 0, 0);
            }
        } g.restore(); q('.ink-status').textContent = `${m().width} × ${m().height} · ${m().layers.length} layers · ${m().tool} · ${dirty ? 'Drawing…' : 'Local project'}`; }
        const surface = D.SDK.createSurface(q('.ink-viewport'), ctx.scope, draw, { label: 'Inkpad painting canvas' });
        async function sync() { const generation = ++loadGeneration, key = m().width + 'x' + m().height; if (key !== loadedSize) {
            runtime.clear();
            loadedSize = key;
        } for (const layer of m().layers) {
            const old = runtime.get(layer.id);
            if (old?.source === layer.imageData)
                continue;
            const canvas = make();
            if (layer.imageData) {
                const img = new Image();
                img.src = layer.imageData;
                await img.decode();
                if (generation !== loadGeneration || disposed)
                    return;
                canvas.getContext('2d').drawImage(img, 0, 0, m().width, m().height);
            }
            else if (layer.name === 'Paper') {
                canvas.getContext('2d').fillStyle = '#fffaf2';
                canvas.getContext('2d').fillRect(0, 0, canvas.width, canvas.height);
            }
            runtime.set(layer.id, { canvas, source: layer.imageData });
        } for (const key of runtime.keys())
            if (!m().layers.some(l => l.id === key))
                runtime.delete(key); surface.invalidate(); }
        function tools() { const layer = selected(); q('.pro-inspector').innerHTML = S.section('Artwork', S.field('title', 'Title', m().title, 'text') + S.field('color', 'Ink', m().color, 'color') + `<div class="ink-swatches">${['#191d2c', '#685bef', '#da5f91', '#e9904c', '#4fbaae', '#448ad0', '#ffffff', '#e9ce82'].map(c => `<button data-swatch="${c}" style="background:${c}" aria-label="Paint ${c}"></button>`).join('')}</div>` + S.field('size', 'Brush size', m().size, 'range', 'min="1" max="140"') + S.field('brushOpacity', 'Flow', m().brushOpacity ?? 1, 'range', 'min="0.05" max="1" step="0.05"')) + S.section('Layers', `<div class="ink-layers">${[...m().layers].reverse().map(l => `<button class="ink-layer ${l.id === layer.id ? 'is-active' : ''}" data-layer="${l.id}"><span>${l.visible ? '◉' : '○'}</span><b>${E(l.name)}</b><small>${Math.round(l.opacity * 100)}%</small></button>`).join('')}</div>` + S.toolbar(S.button('ink-layer-add', '+ Layer') + S.button('ink-layer-duplicate', 'Duplicate') + S.button('ink-layer-delete', 'Delete')) + S.field('layerName', 'Name', layer.name, 'text') + S.field('layerOpacity', 'Opacity', layer.opacity, 'range', 'min="0" max="1" step="0.05"') + S.toolbar(S.button('ink-layer-visibility', layer.visible ? 'Hide' : 'Show') + S.button('ink-up', '↑') + S.button('ink-down', '↓') + S.button('ink-merge', 'Merge down'))) + S.section('Canvas', S.toolbar(S.button('ink-clear', 'Clear layer') + S.button('ink-demo', 'Paint a landscape') + S.button('ink-share', 'Send to Instagram')) + S.help('Brush and eraser respond to pen pressure. Drag to draw a shape. Flood fill has a small color tolerance. Projects preserve individual bitmap layers.')); for (const b of ctx.root.querySelectorAll('[data-tool]'))
            b.classList.toggle('is-active', b.dataset.tool === m().tool); }
        function render() { tools(); sync().catch(e => D.toast('Layer could not load: ' + e.message)); }
        function mutate(fn) { finish(); doc.change(fn); render(); }
        const point = e => { const p = surface.point(e), r = rect(surface.width, surface.height); return { x: (p.x - r.x) / r.scale, y: (p.y - r.y) / r.scale, pressure: e.pointerType === 'pen' ? Math.max(.1, e.pressure) : .6 }; }, target = () => runtime.get(selected().id)?.canvas;
        function brush(a, b) { const c = target(); if (!c)
            return; const g = c.getContext('2d'); g.save(); g.globalCompositeOperation = m().tool === 'eraser' ? 'destination-out' : 'source-over'; g.strokeStyle = g.fillStyle = m().color; g.globalAlpha = m().brushOpacity ?? 1; g.lineCap = g.lineJoin = 'round'; g.lineWidth = m().size * (.35 + .9 * b.pressure); g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); if (a.x === b.x && a.y === b.y) {
            g.beginPath();
            g.arc(b.x, b.y, g.lineWidth / 2, 0, Math.PI * 2);
            g.fill();
        } g.restore(); dirty = true; surface.invalidate(); }
        function shape(a, b) { const base = target(); if (!base)
            return; const c = make(), g = c.getContext('2d'); g.drawImage(base, 0, 0); g.strokeStyle = m().color; g.lineWidth = m().size; g.globalAlpha = m().brushOpacity ?? 1; g.lineCap = 'round'; g.beginPath(); if (m().tool === 'line') {
            g.moveTo(a.x, a.y);
            g.lineTo(b.x, b.y);
        }
        else if (m().tool === 'rect')
            g.rect(a.x, a.y, b.x - a.x, b.y - a.y);
        else
            g.ellipse((a.x + b.x) / 2, (a.y + b.y) / 2, Math.abs(b.x - a.x) / 2, Math.abs(b.y - a.y) / 2, 0, 0, Math.PI * 2); g.stroke(); preview = { id: selected().id, canvas: c }; dirty = true; surface.invalidate(); }
        function flood(p) { const c = target(); if (!c)
            return; const w = c.width, h = c.height, x = Math.floor(p.x), y = Math.floor(p.y); if (x < 0 || x >= w || y < 0 || y >= h)
            return; const g = c.getContext('2d'), image = g.getImageData(0, 0, w, h), d = image.data, start = (y * w + x) * 4, old = Array.from(d.slice(start, start + 4)), color = m().color.match(/[\da-f]{2}/gi).map(v => parseInt(v, 16)).concat(Math.round((m().brushOpacity ?? 1) * 255)); if (old.every((v, i) => Math.abs(v - color[i]) <= 8))
            return; const visited = new Uint8Array(w * h), stack = new Int32Array(w * h); let size = 1; stack[0] = y * w + x; visited[stack[0]] = 1; const match = i => old.every((v, k) => Math.abs(d[i * 4 + k] - v) <= 16); while (size) {
            const i = stack[--size];
            if (!match(i))
                continue;
            for (let k = 0; k < 4; k++)
                d[i * 4 + k] = color[k];
            const xx = i % w;
            for (const n of [xx > 0 ? i - 1 : -1, xx < w - 1 ? i + 1 : -1, i >= w ? i - w : -1, i < w * (h - 1) ? i + w : -1])
                if (n >= 0 && !visited[n]) {
                    visited[n] = 1;
                    stack[size++] = n;
                }
        } g.putImageData(image, 0, 0); dirty = true; }
        function persist() { const layer = selected(), record = runtime.get(layer.id); if (!record)
            return; layer.imageData = record.canvas.toDataURL('image/png'); record.source = layer.imageData; ctx.save(); dirty = false; surface.invalidate(); }
        function finish() { if (!stroke)
            return; if (preview) {
            const item = runtime.get(preview.id);
            if (item)
                item.canvas = preview.canvas;
            preview = null;
        } persist(); stroke = null; surface.invalidate(); }
        ctx.scope.on(surface.canvas, 'pointerdown', e => { if (e.button !== 0 || !target())
            return; const p = point(e); if (p.x < 0 || p.y < 0 || p.x >= m().width || p.y >= m().height)
            return; surface.canvas.focus(); e.preventDefault(); if (m().tool === 'eyedropper') {
            const c = make();
            composite(c);
            const pixel = c.getContext('2d').getImageData(p.x, p.y, 1, 1).data;
            m().color = '#' + [...pixel.slice(0, 3)].map(n => n.toString(16).padStart(2, '0')).join('');
            ctx.save();
            tools();
            return;
        } if (!selected().visible) {
            D.toast('Show the selected layer before drawing.');
            return;
        } D.store.checkpoint(ctx.id); stroke = { start: p, last: p, id: e.pointerId }; try {
            surface.canvas.setPointerCapture(e.pointerId);
        }
        catch { } if (m().tool === 'fill') {
            flood(p);
            finish();
        }
        else if (['brush', 'eraser'].includes(m().tool))
            brush(p, p); });
        ctx.scope.on(surface.canvas, 'pointermove', e => { if (!stroke || stroke.id !== e.pointerId)
            return; if (['brush', 'eraser'].includes(m().tool)) {
            const samples = e.getCoalescedEvents?.();
            for (const event of samples?.length ? samples : [e]) {
                const p = point(event);
                brush(stroke.last, p);
                stroke.last = p;
            }
        }
        else
            shape(stroke.start, point(e)); });
        for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'])
            ctx.scope.on(surface.canvas, type, finish);
        ctx.scope.on(ctx.root, 'click', e => { const l = e.target.closest('[data-layer]'), swatch = e.target.closest('[data-swatch]'); if (l) {
            finish();
            m().selected = l.dataset.layer;
            ctx.save();
            tools();
        } if (swatch) {
            m().color = swatch.dataset.swatch;
            ctx.save();
            tools();
        } });
        ctx.scope.on(ctx.root, 'change', e => { const k = e.target.dataset.field; if (!k)
            return; mutate(model => { if (k === 'layerName')
            selected().name = e.target.value.slice(0, 80);
        else if (k === 'layerOpacity')
            selected().opacity = S.finite(e.target.value, 1, 0, 1);
        else if (k === 'size')
            model.size = S.finite(e.target.value, 18, 1, 140);
        else if (k === 'brushOpacity')
            model.brushOpacity = S.finite(e.target.value, 1, .05, 1);
        else if (k === 'color')
            model.color = S.color(e.target.value);
        else if (k === 'title')
            model.title = e.target.value.slice(0, 120); }); });
        ctx.act('ink-tool', b => { finish(); m().tool = b.dataset.tool; ctx.save(); tools(); });
        function add(name = 'Layer', imageData = '') { if (m().layers.length >= 12)
            throw Error('12 layers maximum.'); mutate(model => { const layer = { id: D.uid(), name, visible: true, opacity: 1, imageData }; model.layers.push(layer); model.selected = layer.id; }); }
        ctx.act('ink-layer-add', () => add('Layer ' + (m().layers.length + 1)));
        ctx.act('ink-layer-duplicate', () => add(selected().name + ' copy', target().toDataURL('image/png')));
        ctx.act('ink-layer-delete', () => { if (m().layers.length === 1)
            return; mutate(model => { model.layers = model.layers.filter(l => l.id !== model.selected); model.selected = model.layers.at(-1).id; }); });
        ctx.act('ink-layer-visibility', () => mutate(() => selected().visible = !selected().visible));
        const move = step => mutate(model => { const i = model.layers.indexOf(selected()), j = Math.max(0, Math.min(model.layers.length - 1, i + step)); [model.layers[i], model.layers[j]] = [model.layers[j], model.layers[i]]; });
        ctx.act('ink-up', () => move(1));
        ctx.act('ink-down', () => move(-1));
        ctx.act('ink-merge', () => { finish(); const i = m().layers.indexOf(selected()); if (i === 0) {
            D.toast('This is the bottom layer.');
            return;
        } const below = m().layers[i - 1], top = selected(); if (!below.visible || !top.visible)
            throw Error('Show both layers before merging.'); const c = make(), g = c.getContext('2d'); g.globalAlpha = below.opacity; g.drawImage(runtime.get(below.id).canvas, 0, 0); g.globalAlpha = top.opacity; g.drawImage(target(), 0, 0); mutate(model => { below.imageData = c.toDataURL('image/png'); below.opacity = 1; model.layers.splice(i, 1); model.selected = below.id; }); });
        ctx.act('ink-clear', () => { finish(); D.store.checkpoint(ctx.id); target().getContext('2d').clearRect(0, 0, m().width, m().height); persist(); });
        ctx.act('ink-demo', () => { finish(); D.store.checkpoint(ctx.id); const c = target(), g = c.getContext('2d'), w = c.width, h = c.height, grad = g.createLinearGradient(0, 0, 0, h); grad.addColorStop(0, '#9cb1f1'); grad.addColorStop(1, '#f9cfb8'); g.fillStyle = grad; g.fillRect(0, 0, w, h); g.fillStyle = '#fff0cb'; g.beginPath(); g.arc(w * .7, h * .3, h * .09, 0, Math.PI * 2); g.fill(); for (let k = 0; k < 5; k++) {
            g.fillStyle = ['#999bc6', '#7d88b4', '#626d9c', '#4f557e', '#373c60'][k];
            g.beginPath();
            g.moveTo(0, h);
            for (let x = 0; x <= w; x += 8)
                g.lineTo(x, h * (.4 + k * .105) + Math.sin(x / w * 7 + k * 1.5) * h * .1 + Math.sin(x / w * 17 + k) * h * .015);
            g.lineTo(w, h);
            g.fill();
        } persist(); });
        ctx.act('ink-import', () => S.pickFile('image/*', async (f) => add(f.name, await D.readImage(f))));
        async function output() { finish(); await sync(); const c = make(); composite(c, false); return c; }
        ctx.act('ink-png', async () => S.downloadCanvas(await output(), m().title + '.png'));
        ctx.act('ink-share', async () => { const c = await output(); D.emit('transfer', { app: 'instagram', artifact: { type: 'image', title: m().title, imageData: c.toDataURL('image/jpeg', .85), text: m().title } }); D.shell.pair('instagram'); });
        ctx.listen('restore', id => { if (id === ctx.id) {
            stroke = preview = null;
            render();
        } });
        render();
        return { render, resume: () => surface.invalidate(), suspend: finish, output, receive: artifact => { if (artifact.type === 'application/x-duo-project') {
                doc.load(S.parseJSON(artifact.text));
                return;
            } if (artifact.imageData && /^data:image\/(png|jpeg|webp);base64,/.test(artifact.imageData))
                add(artifact.title || 'Shared image', artifact.imageData);
            else
                D.toast('Inkpad accepts image transfers and Inkpad projects.'); }, dispose() { disposed = true; ++loadGeneration; runtime.clear(); } };
    }));
})(window.Duo);
