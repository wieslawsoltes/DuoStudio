/* Developer Studio workspace, source compiler and view-document validation. MIT. */
(function (D) {
    'use strict';
    const V = D.Dev = { version: '3.0.0' }, K = DuoKit, clone = x => structuredClone(x);
    const pathOK = path => typeof path === 'string' && path.length < 220 && !path.startsWith('/') && !path.includes('\\') && !path.split('/').some(p => !p || p === '.' || p === '..') && /^[\w./-]+$/.test(path);
    const scriptJSON = x => JSON.stringify(x).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
    V.scriptJSON = scriptJSON;
    V.pathOK = pathOK;
    V.validateResources = records => {
        if (!Array.isArray(records) || records.length > 300)
            throw Error('Too many project resources');
        const ids = new Set();
        let total = 0;
        for (const r of records) {
            K.safeData(r);
            if (!r || typeof r.id !== 'string' || r.id.length > 220 || ids.has(r.id) || !['text', 'base64'].includes(r.encoding) || typeof r.data !== 'string' || r.data.length > 32e6)
                throw Error('Invalid project resource');
            if (r.encoding === 'base64' && !/^[A-Za-z0-9+/]*={0,2}$/.test(r.data))
                throw Error('Malformed resource bytes');
            ids.add(r.id);
            total += r.data.length;
        }
        if (total > 40e6)
            throw Error('Portable resources exceed the 40 MB encoded limit');
        return records;
    };
    V.encodeResources = async (records) => {
        const result = [];
        for (const r of records) {
            let data = r.data, encoding = 'text';
            if (typeof data !== 'string') {
                const bytes = new Uint8Array(await new Blob([data]).arrayBuffer());
                let binary = '';
                for (let i = 0; i < bytes.length; i += 32768)
                    binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
                data = btoa(binary);
                encoding = 'base64';
            }
            result.push({ id: r.id, name: r.name, type: r.type, app: r.app, updated: r.updated, data, encoding });
        }
        return V.validateResources(result);
    };
    V.findView = (tree, id) => {
        let found;
        function visit(node, parent = null) {
            if (node.id === id)
                found = { node, parent };
            (node.children || []).forEach(c => visit(c, node));
        }
        visit(tree);
        return found;
    };
    V.changeView = (workspace, app, fn) => {
        const path = 'views/' + app + '.view.json';
        if (!workspace.files[path])
            return null;
        const tree = JSON.parse(workspace.files[path]);
        fn(tree);
        K.validateView(tree);
        workspace.set(path, JSON.stringify(tree, null, 2) + '\n');
        return tree;
    };
    class Workspace extends EventTarget {
        constructor(bundle) { super(); this.bundle = bundle; this.files = clone(bundle.files); this.openFiles = ['src/apps/draftline.js']; this.active = this.openFiles[0]; this.app = 'draftline'; this.custom = []; this.breaks = []; this.resources = []; this.runtimeSession = null; this.revision = 0; this.past = []; this.future = []; this.savedRevision = 0; this.storageKey = 'duo.developer.workspace.v3'; this.dirty = new Set(); this.persistent = true; }
        notify(detail = {}) { this.revision++; this.dispatchEvent(new CustomEvent('change', { detail })); }
        set(path, text, { history = true } = {}) {
            if (!pathOK(path) || typeof text !== 'string' || text.length > 3e6)
                throw Error('Invalid or oversized source file');
            if (this.files[path] === text)
                return false;
            if (history) {
                this.past.push({ path, before: this.files[path], after: text });
                if (this.past.length > 100)
                    this.past.shift();
                this.future = [];
            }
            this.files[path] = text;
            this.dirty.add(path);
            this.notify({ path });
            return true;
        }
        undo() {
            const item = this.past.pop();
            if (!item)
                return false;
            this.future.push(item);
            if (item.before === undefined)
                delete this.files[item.path];
            else
                this.files[item.path] = item.before;
            this.notify({ path: item.path });
            return true;
        }
        redo() {
            const item = this.future.pop();
            if (!item)
                return false;
            this.past.push(item);
            this.files[item.path] = item.after;
            this.notify({ path: item.path });
            return true;
        }
        select(path) {
            if (!Object.hasOwn(this.files, path))
                throw Error('File not found');
            this.active = path;
            if (!this.openFiles.includes(path))
                this.openFiles.push(path);
            this.dispatchEvent(new CustomEvent('select', { detail: { path } }));
        }
        snapshot() { return { format: 'duokit-workspace', version: 1, files: clone(this.files), custom: clone(this.custom), app: this.app, active: this.active, openFiles: this.openFiles.slice(), breaks: clone(this.breaks), resources: clone(this.resources), runtimeSession: clone(this.runtimeSession) }; }
        validate(value) {
            K.safeData(value);
            if (value?.format !== 'duokit-workspace' || value.version !== 1 || !value.files || Array.isArray(value.files))
                throw Error('Not a DuoKit workspace');
            const entries = Object.entries(value.files);
            if (entries.length > 300 || JSON.stringify(value).length > 48e6)
                throw Error('Workspace exceeds import limit');
            for (const [path, text] of entries)
                if (!pathOK(path) || typeof text !== 'string' || text.length > 3e6)
                    throw Error('Unsafe workspace file: ' + path);
            for (const path of this.bundle.order)
                if (typeof value.files[path] !== 'string')
                    throw Error('Missing runtime file: ' + path);
            if (!Array.isArray(value.custom) || value.custom.length > 60 || value.custom.some(id => !/^user-[a-z0-9-]{1,60}$/.test(id)))
                throw Error('Invalid custom app registry');
            V.validateResources(value.resources || []);
            if (value.runtimeSession && (typeof value.runtimeSession.apps !== 'object' || Array.isArray(value.runtimeSession.apps)))
                throw Error('Invalid runtime session');
            return value;
        }
        restore(value) { this.validate(value); this.files = clone(value.files); this.custom = value.custom.slice(); this.resources = clone(value.resources || []); this.runtimeSession = clone(value.runtimeSession || null); this.app = value.app || 'draftline'; this.active = Object.hasOwn(this.files, value.active) ? value.active : 'src/apps/draftline.js'; this.openFiles = (value.openFiles || [this.active]).filter(p => Object.hasOwn(this.files, p)); this.breaks = Array.isArray(value.breaks) ? value.breaks.filter(b => typeof b.app === 'string' && typeof b.action === 'string').slice(0, 300) : []; this.past = []; this.future = []; this.notify({ restore: true }); }
        save() {
            try {
                localStorage.setItem(this.storageKey, JSON.stringify(this.snapshot()));
                this.savedRevision = this.revision;
                this.dirty.clear();
                this.persistent = true;
                return true;
            }
            catch (e) {
                this.persistent = false;
                return false;
            }
        }
        load() {
            try {
                const text = localStorage.getItem(this.storageKey);
                if (text)
                    this.restore(JSON.parse(text));
                return !!text;
            }
            catch (e) {
                this.persistent = false;
                return false;
            }
        }
        resetFile(path) {
            if (!Object.hasOwn(this.bundle.files, path))
                throw Error('No bundled original for this file');
            this.set(path, this.bundle.files[path]);
        }
        layout(app) { const path = 'views/' + app + '.layout.json'; return JSON.parse(this.files[path] || '{"version":1,"patches":[]}'); }
        setLayout(app, value) { validateLayout(value); this.set('views/' + app + '.layout.json', JSON.stringify(value, null, 2) + '\n'); }
        editElement(app, selector, change) {
            const layout = this.layout(app);
            let patch = layout.patches.find(p => p.selector === selector);
            if (!patch) {
                patch = { selector, style: {} };
                layout.patches.push(patch);
            }
            if (change.style)
                patch.style = { ...patch.style, ...change.style };
            if (change.text !== undefined)
                patch.text = change.text;
            if (change.hidden !== undefined)
                patch.hidden = change.hidden;
            if (change.append)
                patch.append = [...(patch.append || []), change.append];
            this.setLayout(app, layout);
            return layout;
        }
        addApp(name, template = 'counter') {
            const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'app';
            let id = 'user-' + slug, n = 1;
            while (this.files['src/apps/' + id + '.js'])
                id = 'user-' + slug + '-' + (++n);
            const { seed, view, actions } = V.template(template, name);
            const viewPath = 'views/' + id + '.view.json';
            this.custom.push(id);
            this.set(viewPath, JSON.stringify(view, null, 2) + '\n');
            this.set('views/' + id + '.layout.json', '{"version":1,"patches":[]}\n');
            this.set('src/apps/' + id + '.js', `/* ${name.replace(/\*\//g, '')} — DuoKit application. Edit this source and Run. */\n(function(K) {\n  'use strict';\n  K.declarative({id:${JSON.stringify(id)},name:${JSON.stringify(name)},rank:100,category:'Create',description:'An original DuoKit app.'}, {\n    seed: ${JSON.stringify(seed, null, 2)},\n    view: ${JSON.stringify(viewPath)},\n    actions(state, ctx) {\n      return {\n${actions}\n      };\n    }\n  });\n})(DuoKit);\n`);
            this.app = id;
            this.select('src/apps/' + id + '.js');
            return id;
        }
    }
    function validateLayout(layout) {
        K.safeData(layout);
        if (layout?.version !== 1 || !Array.isArray(layout.patches) || layout.patches.length > 1000)
            throw Error('Invalid layout patch document');
        for (const p of layout.patches) {
            if (typeof p.selector !== 'string' || p.selector.length > 1800)
                throw Error('Invalid element selector');
            if (p.text !== undefined && (typeof p.text !== 'string' || p.text.length > 50000))
                throw Error('Invalid element text');
            if (p.style && typeof p.style !== 'object')
                throw Error('Invalid styles');
            if (p.append) {
                if (!Array.isArray(p.append) || p.append.length > 200)
                    throw Error('Too many inserted views');
                p.append.forEach(n => K.validateView(n));
            }
        }
        return layout;
    }
    V.validateLayout = validateLayout;
    V.Workspace = Workspace;
    const node = (type, id, props = {}, children = []) => ({ type, id, props, children });
    V.component = (type, id = 'view-' + D.uid().slice(0, 8)) => node(type, id, type === 'Text' ? { text: 'New text', style: { fontSize: '20px' } } : type === 'Button' ? { text: 'New button', action: 'increment', style: { padding: '12px', borderRadius: '10px', background: '#1677e8', color: 'white' } } : type === 'TextField' ? { label: 'Enter text', binding: 'note' } : type === 'Toggle' ? { label: 'Enabled', binding: 'enabled' } : { style: { padding: '12px', minHeight: '40px' } }, ['VStack', 'HStack', 'ScrollView', 'ZStack'].includes(type) ? [node('Text', id + '-text', { text: type })] : []);
    V.template = (kind, name) => {
        let seed = { count: 0, note: 'Hello, Duo.', enabled: true }, actions = `        increment() { state.update(s => ({...s, count: s.count + 1})); },\n        decrement() { state.update(s => ({...s, count: s.count - 1})); },\n        reset() { state.update(s => ({...s, count: 0})); },\n        async inspect() { await ctx.debug.checkpoint('inspect', () => ({count: state.value.count})); ctx.toast('Count: ' + state.value.count); }`;
        let contents = [node('Text', 'title', { text: name, style: { fontSize: '32px', fontWeight: '700' } }), node('Text', 'subtitle', { text: 'Made for a little more possibility.', style: { color: '#70778d' } }), node('Text', 'count', { text: '{{count}}', style: { fontSize: '76px', fontWeight: '700' } }), node('HStack', 'buttons', {}, [node('Button', 'less', { text: '−', action: 'decrement' }), node('Button', 'more', { text: 'Add one', action: 'increment' }), node('Button', 'reset', { text: 'Reset', action: 'reset' })]), node('Button', 'inspect', { text: 'Inspect count', action: 'inspect' }), node('TextField', 'note', { label: 'Your note', binding: 'note' }), node('Text', 'note-preview', { text: '{{note}}' })];
        if (kind === 'notes') {
            seed = { note: 'A thought worth keeping.', saved: 'Not saved yet' };
            actions = `        save() { state.update(s => ({...s, saved: 'Saved ' + new Date().toLocaleTimeString()})); ctx.commands.perform('export'); },\n        export() { ctx.services.download('note.txt', state.value.note); },\n        clear() { state.update(s => ({...s, note: ''})); }`;
            contents = [node('Text', 'title', { text: name, style: { fontSize: '30px' } }), node('TextEditor', 'editor', { binding: 'note', style: { minHeight: '260px', width: '100%' } }), node('HStack', 'buttons', {}, [node('Button', 'save', { text: 'Export note', action: 'save' }), node('Button', 'clear', { text: 'Clear', action: 'clear' })]), node('Text', 'status', { text: '{{saved}}' })];
        }
        if (kind === 'dashboard') {
            seed = { price: 12, quantity: 3, total: 36 };
            actions = `        calculate() { state.update(s => ({...s, total: (Number(s.price) * Number(s.quantity)).toFixed(2)})); }`;
            contents = [node('Text', 'title', { text: name, style: { fontSize: '30px' } }), node('TextField', 'price', { label: 'Price', binding: 'price' }), node('Slider', 'quantity', { binding: 'quantity', min: 1, max: 100, step: 1 }), node('Text', 'qty', { text: 'Quantity: {{quantity}}' }), node('Button', 'calculate', { text: 'Calculate', action: 'calculate' }), node('Text', 'total', { text: 'Total: {{total}}', style: { fontSize: '48px' } })];
        }
        if (kind === 'game') {
            seed = { score: 0, target: Math.ceil(Math.random() * 10), guess: '5', message: 'Guess a number from 1 to 10' };
            actions = `        guess() { state.update(s => { const ok=Number(s.guess)===s.target; return {...s, score:s.score+(ok?1:0), target:ok?Math.ceil(Math.random()*10):s.target, message:ok?'Correct! Try the next number.':Number(s.guess)<s.target?'Higher!':'Lower!'}; }); }`;
            contents = [node('Text', 'title', { text: name, style: { fontSize: '32px' } }), node('Text', 'score', { text: 'Score: {{score}}', style: { fontSize: '36px' } }), node('Text', 'message', { text: '{{message}}' }), node('TextField', 'guess', { label: 'Your guess', binding: 'guess' }), node('Button', 'submit', { text: 'Make a guess', action: 'guess' })];
        }
        return { seed, actions, view: node('VStack', 'root', { style: { padding: '28px', gap: '18px', height: '100%', overflow: 'auto', background: '#f7f8fc', color: '#192238' } }, contents) };
    };
    function parseSource(source, path) { return acorn.parse(source, { ecmaVersion: 'latest', sourceType: 'script', locations: true, allowHashBang: true }); }
    function walk(node, visit) {
        if (!node || typeof node !== 'object')
            return;
        if (node.type)
            visit(node);
        for (const [k, v] of Object.entries(node)) {
            if (['loc', 'start', 'end'].includes(k))
                continue;
            if (Array.isArray(v))
                v.forEach(n => walk(n, visit));
            else if (v && typeof v === 'object')
                walk(v, visit);
        }
    }
    V.analyze = (source, path) => {
        const symbols = [], actions = [];
        let tree;
        try {
            tree = parseSource(source, path);
        }
        catch (e) {
            return { symbols, actions, error: { path, line: e.loc?.line || 1, column: (e.loc?.column || 0) + 1, message: e.message } };
        }
        walk(tree, n => {
            if (n.type === 'FunctionDeclaration' && n.id)
                symbols.push({ name: n.id.name, line: n.loc.start.line, kind: 'function' });
            if (n.type === 'ClassDeclaration')
                symbols.push({ name: n.id.name, line: n.loc.start.line, kind: 'class' });
            if (n.type === 'CallExpression' && n.callee?.type === 'MemberExpression' && n.callee.property?.name === 'act' && n.arguments[0]?.type === 'Literal')
                actions.push({ action: n.arguments[0].value, line: n.loc.start.line });
            if (n.type === 'Property' && n.value?.type === 'FunctionExpression')
                symbols.push({ name: n.key.name || n.key.value, line: n.loc.start.line, kind: 'method' });
        });
        return { symbols, actions };
    };
    class Compiler {
        constructor(bundle) { this.bundle = bundle; }
        validate(workspace) {
            const errors = [], actions = {};
            for (const [path, text] of Object.entries(workspace.files)) {
                if (path.endsWith('.js')) {
                    const data = V.analyze(text, path);
                    if (data.error)
                        errors.push(data.error);
                    if (path.startsWith('src/apps/'))
                        actions[path.slice(9, -3)] = data.actions;
                }
                if (path.endsWith('.json'))
                    try {
                        const value = JSON.parse(text);
                        K.safeData(value);
                        if (path.endsWith('.view.json'))
                            K.validateView(value);
                        if (path.endsWith('.layout.json'))
                            validateLayout(value);
                    }
                    catch (e) {
                        errors.push({ path, line: 1, column: 1, message: e.message });
                    }
            }
            return { errors, actions };
        }
        build(workspace, { token = '', app = workspace.app, bridge = true, session = null } = {}) {
            const analysis = this.validate(workspace);
            if (analysis.errors.length) {
                const error = Error('Build failed: ' + analysis.errors.length + ' source issue(s)');
                error.diagnostics = analysis.errors;
                throw error;
            }
            const files = workspace.files, order = this.bundle.order.slice(), custom = workspace.custom.map(id => 'src/apps/' + id + '.js');
            const extra = Object.keys(files).filter(p => p.endsWith('.js') && !order.includes(p) && !custom.includes(p)).sort();
            order.splice(order.indexOf('sdk/host.js') + 1, 0, ...extra);
            order.splice(order.indexOf('src/shell.js'), 0, ...custom);
            const views = {}, layouts = {};
            for (const [path, text] of Object.entries(files)) {
                if (path.endsWith('.view.json'))
                    views[path] = JSON.parse(text);
                if (path.endsWith('.layout.json'))
                    layouts[path.split('/').at(-1).replace('.layout.json', '')] = JSON.parse(text);
            }
            const blocks = [];
            for (const path of order) {
                let code = '/* SOURCE: ' + path + ' */\n' + files[path] + '\n';
                if (path === 'src/icons.js')
                    code += 'window.Duo.assets=' + scriptJSON(D.assets) + ';\n';
                if (path === 'sdk/host.js')
                    code += 'window.Duo.views=' + scriptJSON(views) + ';\n';
                blocks.push(code + '\n//# sourceURL=duokit:///' + path + '\n');
            }
            const config = { token, app, layouts, session, resources: workspace.resources, breaks: workspace.breaks, actions: analysis.actions };
            blocks.unshift("window.__duoBootFailure=function(event){parent.postMessage({duokit:3,token:" + scriptJSON(token) + ",type:'runtime-error',message:event.message||String(event.reason),stack:event.error?.stack},'*');};addEventListener('error',window.__duoBootFailure);addEventListener('unhandledrejection',window.__duoBootFailure);\n");
            blocks.push('window.DuoPreviewConfig=' + scriptJSON(config) + ';\n' + this.bundle.runtime + '\n' + (!bridge ? 'window.DuoPreview?.detach();\n' : '') + '//# sourceURL=duokit:///preview/runtime.js\n');
            // Separate inline scripts retain original source identities in real browser DevTools.
            // Escape user-controlled terminators per block, then join using only trusted separators.
            const js = blocks.map(code => code.replace(/<\/script/gi, '<\\/script')).join('<' + '/script>\n<' + 'script>');
            const css = ['src/styles.css', 'src/studio.css', 'sdk/duokit.css'].map(p => files[p] || '').join('\n') + '\n' + this.bundle.previewCSS;
            let html = files['src/template.html'].replace('/*__STYLES__*/', () => css).replace('/*__SCRIPTS__*/', () => js);
            const csp = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' blob:; style-src 'unsafe-inline'; img-src data: blob:; media-src data: blob:; font-src data:; connect-src 'none'; worker-src blob:; frame-src blob: data:; form-action 'none'; base-uri 'none'">`;
            html = html.replace('<head>', '<head>' + csp);
            return { html, actions: analysis.actions, revision: workspace.revision, bytes: new TextEncoder().encode(html).length };
        }
    }
    V.Compiler = Compiler;
})(window.Duo);
