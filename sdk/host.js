/* DuoKit host adapter: shared app context, lifecycle, documents and drawing surfaces. MIT. */
(function (K) {
    'use strict';
    K.install = function (D) {
        if (D.SDK)
            return D.SDK;
        const S = D.Studio;
        K.host = D;
        D.SDK = K;
        const register = D.register;
        K.register = (meta, representation) => {
            const mount = typeof representation === 'function' ? representation : representation.mount;
            if (typeof mount !== 'function')
                throw Error('Missing app scene factory');
            return register({ ...meta, sdkVersion: K.version, sourcePath: 'src/apps/' + meta.id + '.js' }, mount);
        };
        K.launch = app => K.register(app, app.scene.type === 'UIViewRepresentable' ? app.scene : ctx => { const content = typeof app.scene.body === 'function' ? () => app.scene.body(ctx) : app.scene.body; return K.render(ctx.root, content, { scope: ctx.scope, environment: ctx.environment, context: ctx }); });
        K.createDocument = (ctx, seed) => {
            const state = () => ctx.get(seed);
            const doc = { state, change(fn, notify = true) {
                    const before = S.clone(state()), future = D.store.future.slice();
                    D.store.checkpoint(ctx.id);
                    const entry = D.store.history.at(-1);
                    try {
                        fn(state());
                        if (JSON.stringify(before) === JSON.stringify(state())) {
                            const index = D.store.history.indexOf(entry);
                            if (index >= 0)
                                D.store.history.splice(index, 1);
                            D.store.future = future;
                            return false;
                        }
                        ctx.save();
                        if (notify)
                            D.emit('document-changed', { app: ctx.id, title: state().title });
                    }
                    catch (e) {
                        D.store.data.apps[ctx.id] = before;
                        D.store.history.pop();
                        throw e;
                    }
                }, load(value) {
                    if (value.format !== 'duo-project' || value.app !== ctx.id || value.version !== 1)
                        throw Error('Choose a ' + D.apps.get(ctx.id).name + ' project.');
                    const next = S.clone(D.store.data);
                    next.apps[ctx.id] = value.model;
                    D.store.validate(next);
                    D.store.checkpoint(ctx.id);
                    D.store.data.apps[ctx.id] = S.clone(value.model);
                    ctx.save();
                    D.emit('restore', ctx.id);
                }, export() { const value = S.textArtifact(ctx.id, state().title || ctx.id, state()); D.download((state().title || ctx.id) + '.duo.json', value.text, 'application/json'); }, async save() { const record = S.textArtifact(ctx.id, state().title || ctx.id, state()); const id = 'project-' + ctx.id + '-' + encodeURIComponent(state().title || ctx.id); await S.files.put({ id, name: (state().title || ctx.id) + '.duo.json', type: 'application/json', app: ctx.id, data: record.text }); D.notify?.({ app: ctx.id, title: 'Project saved', text: state().title || ctx.id }); D.toast('Saved to Files · ' + (S.files.persistent ? 'IndexedDB' : 'session memory')); }, open() { return S.files.picker(ctx.id, record => doc.load(S.parseJSON(record.data))); }, header(subtitle, actions = '') { return D.appHeader(ctx.id, subtitle, actions) + S.toolbar(S.button('project-save', 'Save') + S.button('project-open', 'Open') + S.button('project-export', 'Project ↓') + '<span class="pro-spacer"></span>' + S.button('project-undo', '↶ Undo') + S.button('project-redo', '↷ Redo')); } };
            ctx.act('project-save', () => doc.save());
            ctx.act('project-open', () => doc.open());
            ctx.act('project-export', () => doc.export());
            ctx.act('project-undo', () => D.store.undo(ctx.id) || D.toast('Nothing to undo'));
            ctx.act('project-redo', () => D.store.redo(ctx.id) || D.toast('Nothing to redo'));
            ctx.act('share-app', () => D.share(S.textArtifact(ctx.id, state().title, state())));
            return doc;
        };
        K.createSurface = (container, scope, draw, options = {}) => {
            const canvas = document.createElement('canvas');
            canvas.className = 'pro-canvas';
            canvas.tabIndex = 0;
            canvas.setAttribute('aria-label', options.label || 'Interactive drawing canvas');
            container.append(canvas);
            const g = canvas.getContext('2d', { alpha: options.alpha !== false });
            let frame = 0, disposed = false, w = 1, h = 1;
            const resize = () => { w = Math.max(1, container.clientWidth); h = Math.max(1, container.clientHeight); const d = Math.min(devicePixelRatio || 1, 2); canvas.width = Math.round(w * d); canvas.height = Math.round(h * d); g.setTransform(d, 0, 0, d, 0, 0); draw(g, w, h); };
            const invalidate = () => {
                if (!disposed && !frame)
                    frame = requestAnimationFrame(() => { frame = 0; resize(); });
            };
            const ro = new ResizeObserver(invalidate);
            ro.observe(container);
            const api = { canvas, g, invalidate, draw: resize, get width() { return w; }, get height() { return h; }, point(e) { const r = canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) * w / (r.width || 1), y: (e.clientY - r.top) * h / (r.height || 1), pressure: e.pressure || .5 }; }, dispose() { disposed = true; cancelAnimationFrame(frame); ro.disconnect(); canvas.remove(); } };
            scope?.cleanup(api.dispose);
            invalidate();
            return api;
        };
        D.mount = (host, id, instanceId) => {
            const def = D.apps.get(id);
            if (!def)
                throw Error('Unknown app: ' + id);
            const root = document.createElement('section');
            root.className = 'app-root';
            root.dataset.app = id;
            root.dataset.activePane = 'primary';
            root.setAttribute('aria-label', def.name + ' prototype');
            host.append(root);
            const scope = D.scope();
            const actions = {}, listened = new Set();
            const environment = new K.Environment({ scenePhase: 'inactive', horizontalSizeClass: 'regular', verticalSizeClass: 'regular', posture: D.store.data.prefs.posture, colorScheme: D.store.data.prefs.dark ? 'dark' : 'light' });
            const ctx = { root, id, instanceId, scope, actions, environment, sdk: K, services: { files: S.files, store: D.store, download: D.download, share: D.share }, get: (seed) => D.store.get(id, seed), save: () => D.store.save(), act: (name, fn) => { actions[name] = (...args) => K.debugger?.invoke ? K.debugger.invoke(ctx, name, fn, args) : fn(...args); return actions[name]; }, toast: D.toast,
                share: (text, title = def.name) => D.share({ type: 'text', title, text, source: id }),
                listen: (type, fn) => { listened.add(type); scope.on(D.bus, type, e => fn(e.detail)); },
                pane: p => { root.dataset.activePane = p; D.$$('[data-pane]', root).forEach(b => b.classList.toggle('active', b.dataset.pane === p)); },
            };
            scope.on(root, 'click', e => {
                const pane = e.target.closest('[data-pane]');
                if (pane) {
                    ctx.pane(pane.dataset.pane);
                    return;
                }
                const b = e.target.closest('[data-action]');
                if (!b || b.disabled)
                    return;
                const f = actions[b.dataset.action];
                if (f) {
                    Promise.resolve().then(() => f(b, e)).catch(err => { console.error(err); D.toast(err.message || 'This action could not finish.'); });
                }
                else if (b.dataset.action === 'share-app') {
                    ctx.share(def.description);
                }
                else if (b.dataset.action === 'app-menu') {
                    D.dialog(def.name + ' · prototype', `<p>${D.escape(def.description)}</p><div class="callout">${D.escape(def.boundary)}</div><p class="muted">Use the pane tabs in compact layouts. All data stays in this browser. External services are not connected.</p>`);
                }
            });
            ctx.commands = { perform: (name, ...args) => {
                    if (!actions[name])
                        throw Error('Unknown command: ' + name);
                    return actions[name](...args);
                }, names: () => Object.keys(actions) };
            ctx.debug = { checkpoint: (label, locals) => K.debugger?.checkpoint?.(ctx, label, locals) || Promise.resolve() };
            ctx.state = (seed) => {
                const state = new K.State(ctx.get(seed));
                scope.cleanup(state.subscribe(() => { D.store.data.apps[id] = state.value; ctx.save(); }));
                ctx.listen('restore', app => {
                    if (app === id)
                        state.value = D.store.data.apps[id];
                });
                return state;
            };
            ctx.document = seed => K.createDocument(ctx, seed);
            ctx.listen('posture-changed', p => environment.update({ posture: p.posture }));
            ctx.listen('workspace-changed', () => { const scheme = D.store.data.prefs.dark ? 'dark' : 'light'; if (environment.get('colorScheme') !== scheme)
                environment.set('colorScheme', scheme); });
            const observer = new ResizeObserver(() => environment.update({ horizontalSizeClass: root.clientWidth < 650 ? 'compact' : 'regular', verticalSizeClass: root.clientHeight < 500 ? 'compact' : 'regular', colorScheme: D.store.data.prefs.dark ? 'dark' : 'light' }));
            observer.observe(root);
            scope.cleanup(() => observer.disconnect());
            let api;
            try {
                api = def.mount(ctx) || {};
            }
            catch (error) {
                scope.dispose();
                root.remove();
                throw error;
            }
            const resume = api.resume?.bind(api), suspend = api.suspend?.bind(api);
            api.resume = () => { environment.set('scenePhase', 'active'); return resume?.(); };
            api.suspend = () => { environment.set('scenePhase', 'background'); return suspend?.(); };
            if (!root.querySelector('.pane-tabs') && root.querySelector('.duo-panes')) {
                const holder = document.createElement('div');
                holder.innerHTML = D.paneTabs('Workspace', 'Inspector');
                root.querySelector('.duo-panes').before(holder.firstElementChild);
            }
            if (!listened.has('restore'))
                scope.on(D.bus, 'restore', e => {
                    if (e.detail === id)
                        api.render?.();
                });
            return { root, id, api, actions, ctx, dispose: () => { scope.dispose(); api.dispose?.(); root.remove(); }, receive: artifact => api.receive?.(artifact) };
        };
        S.document = (ctx, seed) => K.createDocument(ctx, seed);
        S.surface = (...args) => K.createSurface(...args);
        K.declarative = (meta, { seed = {}, view, actions = () => ({}), draw = {} }) => K.register(meta, ctx => {
            const state = ctx.state(seed), handlers = actions(state, ctx);
            for (const [name, fn] of Object.entries(handlers))
                ctx.act(name, fn);
            ctx.root.classList.add('dk-application');
            const host = document.createElement('div');
            host.className = 'dk-scene';
            ctx.root.append(host);
            const tree = typeof view === 'string' ? D.views?.[view] : view;
            K.validateView(tree);
            const renderer = K.render(host, () => K.fromJSON(tree, { state, actions: ctx.actions, draw }), { scope: ctx.scope, environment: ctx.environment, context: ctx });
            return { render: renderer.update, state, view: tree };
        });
        return K;
    };
})(globalThis.DuoKit);
globalThis.DuoKit.install(window.Duo);
