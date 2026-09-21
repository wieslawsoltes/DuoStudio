/* Sandboxed preview bridge. This file is embedded in edited builds, not run in the host IDE. */
(function (D, K, cfg) {
    'use strict';
    removeEventListener('error', window.__duoBootFailure);
    removeEventListener('unhandledrejection', window.__duoBootFailure);
    let publishTimer = 0;
    let attached = !!cfg.token, design = false, selected = null, selectedApp = '', selectedSelector = '', overlay, observer, scheduled = 0, lastOutline = 0;
    let breaks = cfg.breaks || [], breakNext = false, paused = null, step = false, sequence = 0;
    const frames = [], insertions = new Map();
    const send = (type, data = {}) => {
        if (attached)
            parent.postMessage({ duokit: 3, token: cfg.token, type, ...data }, '*');
    };
    const serial = (value) => {
        const seen = new WeakSet();
        try {
            return JSON.parse(JSON.stringify(value, (k, v) => {
                if (typeof v === 'function')
                    return '[Function ' + (v.name || 'anonymous') + ']';
                if (typeof v === 'bigint')
                    return String(v) + 'n';
                if (v instanceof Element)
                    return '<' + v.tagName.toLowerCase() + '>';
                if (v && typeof v === 'object') {
                    if (seen.has(v))
                        return '[Circular]';
                    seen.add(v);
                }
                return v;
            }));
        }
        catch {
            return String(value);
        }
    };
    const snapshot = () => ({ apps: serial(D.store.data.apps), shell: D.shell.getState() });
    function location(app, action) { const exact = (cfg.actions?.[app] || []).find(x => x.action === action); return { path: 'src/apps/' + app + '.js', line: exact?.line || 1 }; }
    async function wait(ctx, label, locals, phase) {
        if (paused)
            throw Error('Another command is already paused');
        const values = () => serial(typeof locals === 'function' ? locals() : locals || {});
        return new Promise(resolve => { paused = { ctx, label, values, resolve, phase }; send('paused', { app: ctx.id, action: label, phase, location: location(ctx.id, label), locals: values(), state: serial(D.store.data.apps[ctx.id]), frames: serial(frames) }); });
    }
    let queue = Promise.resolve();
    const debug = {
        invoke(ctx, name, fn, args) {
            const execute = async () => {
                const frame = { app: ctx.id, action: name, ...location(ctx.id, name) };
                frames.push(frame);
                try {
                    if (breakNext || breaks.some(b => b.app === ctx.id && (b.action === name || b.action === '*'))) {
                        breakNext = false;
                        await wait(ctx, name, {}, 'before');
                    }
                    send('action', { app: ctx.id, action: name, phase: 'before', location: frame });
                    const value = await fn(...args);
                    send('action', { app: ctx.id, action: name, phase: 'after', state: serial(D.store.data.apps[ctx.id]) });
                    if (step) {
                        step = false;
                        await wait(ctx, name, {}, 'after');
                    }
                    return value;
                }
                catch (e) {
                    send('runtime-error', { message: e.message, stack: e.stack, location: frame });
                    throw e;
                }
                finally {
                    frames.pop();
                    publish();
                }
            };
            // Nested commands must run immediately within their parent to avoid a queue deadlock.
            if (frames.length && !paused)
                return execute();
            const result = queue.then(execute, execute);
            queue = result.catch(() => { });
            return result;
        },
        checkpoint(ctx, label, locals) { return wait(ctx, label, locals, 'checkpoint'); }
    };
    if (attached)
        K.debugger = debug;
    function selector(el, root) {
        if (el === root)
            return ':root';
        if (el.dataset.viewId)
            return '[data-view-id="' + CSS.escape(el.dataset.viewId) + '"]';
        const parts = [];
        let current = el;
        while (current && current !== root) {
            let part = current.tagName.toLowerCase();
            if (current.id) {
                parts.unshift('#' + CSS.escape(current.id));
                break;
            }
            for (const key of ['action', 'field', 'pane'])
                if (current.dataset[key]) {
                    part += '[data-' + key + '="' + CSS.escape(current.dataset[key]) + '"]';
                    break;
                }
            const same = [...current.parentElement.children].filter(x => x.tagName === current.tagName);
            if (same.length > 1)
                part += ':nth-of-type(' + (same.indexOf(current) + 1) + ')';
            parts.unshift(part);
            current = current.parentElement;
        }
        return parts.join(' > ');
    }
    function find(app, path) {
        const root = document.querySelector('[data-app="' + CSS.escape(app) + '"]');
        if (!root)
            return null;
        try {
            return path === ':root' ? root : root.querySelector(path);
        }
        catch {
            return null;
        }
    }
    const cssFields = ['width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight', 'padding', 'margin', 'gap', 'background', 'color', 'fontSize', 'fontWeight', 'borderRadius', 'border', 'display', 'flexDirection', 'alignItems', 'justifyContent', 'gridTemplateColumns', 'position', 'left', 'top', 'opacity', 'translate', 'overflow'];
    function describe(el, app) {
        const root = el.closest('[data-app]'), style = getComputedStyle(el), r = el.getBoundingClientRect();
        const props = {};
        for (const key of cssFields)
            props[key] = el.style[key] || style[key];
        return { app, selector: selector(el, root), tag: el.tagName.toLowerCase(), kind: el.dataset.duokit || el.tagName.toLowerCase(), viewId: el.dataset.viewId || '', text: el instanceof HTMLInputElement ? el.value : el.children.length ? '' : el.textContent.slice(0, 4000), style: props, bounds: { x: r.x, y: r.y, width: r.width, height: r.height }, action: el.dataset.dkAction || el.dataset.action || '', binding: el.dataset.dkBinding || '', classes: el.className?.baseVal ?? el.className ?? '' };
    }
    function select(el) {
        if (!el || !el.closest('[data-app]'))
            return;
        selected = el;
        selectedApp = el.closest('[data-app]').dataset.app;
        selectedSelector = selector(el, el.closest('[data-app]'));
        send('selection', { selection: describe(el, selectedApp) });
        drawSelection();
    }
    function makeOverlay() { overlay = document.createElement('div'); overlay.dataset.devtools = 'true'; overlay.className = 'dk-selection'; overlay.innerHTML = '<span class="dk-selection-label"></span><i data-resize="true"></i>'; document.body.append(overlay); overlay.addEventListener('pointerdown', beginDrag); }
    function drawSelection() {
        if (!overlay)
            return;
        if (!design || !selected?.isConnected) {
            overlay.hidden = true;
            return;
        }
        const r = selected.getBoundingClientRect();
        overlay.hidden = false;
        overlay.style.cssText = `position:fixed;left:${r.x}px;top:${r.y}px;width:${r.width}px;height:${r.height}px;`;
        overlay.querySelector('span').textContent = selected.dataset.duokit || selected.tagName.toLowerCase();
    }
    function beginDrag(event) {
        if (!selected || event.button !== 0)
            return;
        event.preventDefault();
        event.stopPropagation();
        const start = { x: event.clientX, y: event.clientY, w: selected.getBoundingClientRect().width, h: selected.getBoundingClientRect().height, translate: selected.style.translate || '0px 0px' }, resize = !!event.target.dataset.resize;
        const base = start.translate.split(' ').map(v => parseFloat(v) || 0);
        let patch = {};
        overlay.setPointerCapture(event.pointerId);
        const move = e => { const dx = e.clientX - start.x, dy = e.clientY - start.y; patch = resize ? { width: Math.max(10, Math.round(start.w + dx)) + 'px', height: Math.max(10, Math.round(start.h + dy)) + 'px', flex: 'none' } : { translate: Math.round(base[0] + dx) + 'px ' + Math.round((base[1] || 0) + dy) + 'px' }; Object.assign(selected.style, patch); drawSelection(); };
        const end = e => {
            overlay.removeEventListener('pointermove', move);
            overlay.removeEventListener('pointerup', end);
            overlay.removeEventListener('pointercancel', end);
            if (Object.keys(patch).length)
                send('element-change', { app: selectedApp, selector: selectedSelector, change: { style: patch } });
            if (selected?.isConnected)
                send('selection', { selection: describe(selected, selectedApp) });
        };
        overlay.addEventListener('pointermove', move);
        overlay.addEventListener('pointerup', end);
        overlay.addEventListener('pointercancel', end);
    }
    function applyLayouts() {
        observer?.disconnect();
        try {
            for (const [app, layout] of Object.entries(cfg.layouts || {}))
                for (const p of layout.patches || []) {
                    const el = find(app, p.selector);
                    if (!el)
                        continue;
                    if (p.hidden)
                        el.style.setProperty('display', 'none', 'important');
                    else if (p.hidden === false && el.style.getPropertyPriority('display'))
                        el.style.removeProperty('display');
                    for (const [key, value] of Object.entries(p.style || {}))
                        if (typeof value === 'string' || typeof value === 'number') {
                            if (el.style[key] !== String(value))
                                el.style[key] = String(value);
                        }
                    if (p.text !== undefined) {
                        if (el instanceof HTMLInputElement) {
                            if (el.value !== p.text)
                                el.value = p.text;
                        }
                        else if (el.textContent !== p.text)
                            el.textContent = p.text;
                    }
                    for (const n of p.append || []) {
                        const key = app + '/' + n.id;
                        const old = insertions.get(key);
                        if (old?.host.isConnected)
                            continue;
                        old?.render.dispose();
                        const host = document.createElement('div');
                        host.dataset.designAddition = n.id;
                        el.append(host);
                        const instance = D.shell.getInstance(app);
                        let state = instance?.api.state;
                        if (!(state instanceof K.State))
                            state = new K.State(D.store.data.apps[app] || {});
                        const render = K.render(host, () => K.fromJSON(n, { state, actions: instance?.actions || {} }), { context: instance?.ctx });
                        insertions.set(key, { host, render });
                    }
                }
            for (const [key, item] of insertions)
                if (!item.host.isConnected) {
                    item.render.dispose();
                    insertions.delete(key);
                }
        }
        finally {
            observer?.observe(document.querySelector('#workspace'), { subtree: true, childList: true });
        }
        drawSelection();
    }
    function publish(force = false) {
        if (!attached)
            return;
        const now = performance.now();
        if (!force && now - lastOutline < 250) {
            clearTimeout(publishTimer);
            publishTimer = setTimeout(() => publish(true), 250 - (now - lastOutline));
            return;
        }
        clearTimeout(publishTimer);
        lastOutline = now;
        const nodes = [];
        for (const root of document.querySelectorAll('.app-root')) {
            let count = 0;
            const app = root.dataset.app;
            function visit(el, depth) {
                if (++count > 600 || depth > 15 || ['SVG', 'PATH', 'STYLE', 'SCRIPT'].includes(el.tagName) || el.dataset.devtools)
                    return;
                const r = el.getBoundingClientRect();
                nodes.push({ app, selector: selector(el, root), depth, tag: el.dataset.duokit || el.tagName.toLowerCase(), label: (el.getAttribute('aria-label') || el.dataset.action || el.dataset.field || el.dataset.viewId || el.textContent?.trim()).slice(0, 65), visible: !!r.width && !!r.height });
                for (const c of el.children)
                    visit(c, depth + 1);
            }
            visit(root, 0);
        }
        send('outline', { nodes, commands: D.shell.listInstances().map(i => ({ app: i.id, actions: Object.keys(i.actions) })) });
        send('state', { snapshot: snapshot() });
        drawSelection();
    }
    function schedule() {
        if (scheduled)
            return;
        scheduled = requestAnimationFrame(() => { scheduled = 0; applyLayouts(); publish(); });
    }
    function handle(event) {
        if (!attached || event.source !== parent || event.data?.duokit !== 3 || event.data.token !== cfg.token)
            return;
        const m = event.data;
        try {
            switch (m.type) {
                case 'design':
                    design = !!m.enabled;
                    document.body.classList.toggle('dk-design', design);
                    drawSelection();
                    publish(true);
                    break;
                case 'select':
                    select(find(m.app, m.selector));
                    break;
                case 'layout':
                    cfg.layouts[m.app] = m.layout;
                    applyLayouts();
                    publish(true);
                    if (selected?.isConnected)
                        send('selection', { selection: describe(selected, selectedApp) });
                    break;
                case 'view-document': {
                    K.validateView(m.tree);
                    const i = D.shell.getInstance(m.app);
                    if (!i?.api.view)
                        throw Error('This app uses the imperative view adapter; edit its layout overrides.');
                    const tree = i.api.view;
                    for (const key of Object.keys(tree))
                        delete tree[key];
                    Object.assign(tree, m.tree);
                    i.api.render();
                    selected = find(selectedApp, selectedSelector);
                    if (selected)
                        send('selection', { selection: describe(selected, selectedApp) });
                    schedule();
                    break;
                }
                case 'launch':
                    D.shell.open(m.app);
                    schedule();
                    break;
                case 'presentation': {
                    const full = m.mode === 'simulator';
                    document.body.classList.toggle('duo-preview', !full);
                    if (D.shell.getState().directTouch === full)
                        D.shell.touch();
                    D.shell.setHostActive(true);
                    schedule();
                    break;
                }
                case 'suspend':
                    D.shell.setHostActive(false);
                    break;
                case 'home':
                    D.shell.home();
                    schedule();
                    break;
                case 'posture':
                    D.shell.setPosture(m.posture);
                    break;
                case 'theme':
                    D.store.data.prefs.dark = !!m.dark;
                    D.shell.refresh();
                    break;
                case 'breaks':
                    breaks = m.breaks || [];
                    break;
                case 'native-break':
                    debugger;
                    send('console', { level: 'info', values: ['Native JavaScript breakpoint resumed. Open browser DevTools to use named duokit:/// sources.'] });
                    break;
                case 'pause':
                    breakNext = true;
                    send('armed');
                    break;
                case 'resume':
                case 'step':
                    step = m.type === 'step';
                    if (paused) {
                        const p = paused;
                        paused = null;
                        p.resolve();
                        send('resumed');
                    }
                    else
                        breakNext = true;
                    break;
                case 'invoke': {
                    const i = D.shell.getInstance(m.app), button = i?.root.querySelector('[data-action="' + CSS.escape(m.action) + '"]');
                    if (!i?.actions[m.action])
                        throw Error('Unknown action');
                    Promise.resolve(i.actions[m.action](button || { dataset: {} }, new Event('click'))).catch(() => { });
                    break;
                }
                case 'evaluate': {
                    if (typeof m.expression !== 'string' || m.expression.length > 10000)
                        throw Error('Expression exceeds limit');
                    const app = paused?.ctx.id || D.shell.getState().primary;
                    const locals = paused?.values() || {};
                    const result = Function('Duo', 'state', 'locals', '"use strict"; return (' + m.expression + '\n);')(D, D.store.data.apps[app], locals);
                    Promise.resolve(result).then(v => send('evaluation', { request: m.request, value: serial(v) }), e => send('evaluation', { request: m.request, error: e.message }));
                    break;
                }
                case 'state-edit': {
                    const data = JSON.parse(m.json);
                    K.safeData(data);
                    const next = structuredClone(D.store.data);
                    next.apps[m.app] = data;
                    D.store.validate(next);
                    D.store.checkpoint(m.app);
                    D.store.data.apps[m.app] = data;
                    D.emit('restore', m.app);
                    publish(true);
                    break;
                }
                case 'snapshot':
                    publish(true);
                    break;
            }
        }
        catch (e) {
            send('runtime-error', { message: e.message, stack: e.stack });
        }
    }
    if (attached) {
        document.addEventListener('click', e => { if (e.target.closest('[data-open-ide]'))
            send('open-ide'); });
        for (const method of ['log', 'info', 'warn', 'error']) {
            const original = console[method].bind(console);
            console[method] = (...args) => { original(...args); send('console', { level: method, values: args.map(serial) }); };
        }
        addEventListener('message', handle);
        addEventListener('error', e => send('runtime-error', { message: e.message, stack: e.error?.stack }));
        addEventListener('unhandledrejection', e => send('runtime-error', { message: e.reason?.message || String(e.reason), stack: e.reason?.stack }));
        document.addEventListener('click', e => {
            if (!design || e.target.closest('[data-devtools]'))
                return;
            const el = e.target.closest('[data-app]') ? e.target : null;
            if (el) {
                e.preventDefault();
                e.stopImmediatePropagation();
                select(el);
            }
        }, true);
    }
    // Hydrate portable bytes synchronously before any source-media app mounts.
    // Preview runs never share the parent application's IndexedDB namespace.
    D.Studio.files.dbPromise = Promise.resolve(null);
    for (const record of cfg.resources || []) {
        const { encoding, ...r } = record;
        r.data = encoding === 'base64' ? Uint8Array.from(atob(record.data), c => c.charCodeAt(0)) : record.data;
        D.Studio.files.memory.set(r.id, r);
    }
    let fileSync = Promise.resolve();
    function publishFiles() {
        fileSync = fileSync.then(async () => {
            const records = [];
            for (const r of await D.Studio.files.list()) {
                let data = r.data, encoding = 'text';
                if (typeof data !== 'string') {
                    const bytes = new Uint8Array(await new Blob([data]).arrayBuffer());
                    let binary = '';
                    for (let i = 0; i < bytes.length; i += 32768)
                        binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
                    data = btoa(binary);
                    encoding = 'base64';
                }
                records.push({ id: r.id, name: r.name, type: r.type, app: r.app, updated: r.updated, data, encoding });
            }
            send('files', { resources: records });
        }).catch(e => send('runtime-error', { message: e.message }));
    }
    D.bus.addEventListener('files-changed', publishFiles);
    if (attached) {
        document.addEventListener('dragover', event => {
            if ([...event.dataTransfer.types].includes('application/x-duokit-view') && event.target.closest('[data-app]'))
                event.preventDefault();
        });
        document.addEventListener('drop', event => {
            const type = event.dataTransfer.getData('application/x-duokit-view');
            if (!type || !event.target.closest('[data-app]'))
                return;
            event.preventDefault();
            select(event.target);
            send('component-drop', { component: type, selection: describe(event.target, selectedApp) });
        });
    }
    if (cfg.session)
        try {
            D.store.import(JSON.stringify(cfg.session));
        }
        catch (e) {
            send('console', { level: 'warn', values: ['Preview state could not be restored: ' + e.message] });
        }
    D.shell.touch();
    document.body.classList.add('duo-preview');
    if (D.apps.has(cfg.app))
        D.shell.open(cfg.app);
    makeOverlay();
    observer = new MutationObserver(schedule);
    observer.observe(document.querySelector('#workspace'), { subtree: true, childList: true });
    D.bus.addEventListener('workspace-changed', schedule);
    addEventListener('resize', drawSelection);
    addEventListener('scroll', drawSelection, true);
    applyLayouts();
    send('ready', { apps: [...D.apps.values()].map(({ id, name, sdkVersion }) => ({ id, name, sdkVersion })), snapshot: snapshot() });
    publish(true);
    window.DuoPreview = { send, publish, select, applyLayouts, get paused() { return paused; }, detach() {
            attached = false;
            K.debugger = null;
            removeEventListener('message', handle);
            if (paused) {
                paused.resolve();
                paused = null;
            }
        }, get config() { return cfg; } };
})(window.Duo, globalThis.DuoKit, window.DuoPreviewConfig);
