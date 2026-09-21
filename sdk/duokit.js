/* DuoKit — independent, dependency-free JavaScript application and view runtime. MIT. */
(function (global, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports)
        module.exports = api;
    else
        global.DuoKit = api;
})(globalThis, function () {
    'use strict';
    let tracking = null, batchDepth = 0;
    const pending = new Set();
    const flush = () => {
        if (batchDepth)
            return;
        let iterations = 0;
        while (pending.size) {
            if (++iterations > 100)
                throw Error('Reactive update cycle');
            const jobs = [...pending];
            pending.clear();
            jobs.forEach(fn => fn());
        }
    };
    function batch(fn) {
        batchDepth++;
        try {
            return fn();
        }
        finally {
            batchDepth--;
            flush();
        }
    }
    class State {
        constructor(value) { this._value = value; this.listeners = new Set(); }
        get value() {
            if (tracking) {
                this.listeners.add(tracking);
                tracking.dependencies.add(this);
            }
            return this._value;
        }
        set value(value) {
            if (Object.is(value, this._value))
                return;
            this._value = value;
            for (const fn of this.listeners)
                pending.add(fn);
            flush();
        }
        get wrappedValue() { return this.value; }
        set wrappedValue(v) { this.value = v; }
        get projectedValue() { return new Binding(() => this.value, v => this.value = v); }
        update(fn) { this.value = fn(this.value); return this.value; }
        subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
    }
    class Binding {
        constructor(get, set) {
            if (typeof get !== 'function' || typeof set !== 'function')
                throw TypeError('Binding needs get and set');
            this.get = get;
            this.set = set;
        }
        get value() { return this.get(); }
        set value(v) { this.set(v); }
        get wrappedValue() { return this.value; }
        set wrappedValue(v) { this.value = v; }
        map(key) { return new Binding(() => this.value[key], v => this.value = { ...this.value, [key]: v }); }
        static constant(value) { return new Binding(() => value, () => { }); }
    }
    function effect(fn) {
        let disposed = false, running = false;
        const run = () => {
            if (disposed || running)
                return;
            running = true;
            for (const s of run.dependencies)
                s.listeners.delete(run);
            run.dependencies.clear();
            const old = tracking;
            tracking = run;
            try {
                fn();
            }
            finally {
                tracking = old;
                running = false;
            }
        };
        run.dependencies = new Set();
        run();
        return () => {
            disposed = true;
            pending.delete(run);
            for (const s of run.dependencies)
                s.listeners.delete(run);
            run.dependencies.clear();
        };
    }
    function computed(fn) { const state = new State(); const dispose = effect(() => state.value = fn()); return Object.assign(new Binding(() => state.value, () => { throw Error('Computed value is read-only'); }), { dispose }); }
    class Scope {
        constructor() { this.controller = new AbortController(); this.signal = this.controller.signal; this.callbacks = []; this.disposed = false; }
        on(target, type, fn, options = {}) {
            if (this.disposed)
                throw Error('Scope already disposed');
            target.addEventListener(type, fn, { ...options, signal: this.signal });
            return () => target.removeEventListener(type, fn, options);
        }
        cleanup(fn) {
            if (this.disposed)
                fn();
            else
                this.callbacks.push(fn);
            return fn;
        }
        timeout(fn, ms) {
            const id = setTimeout(() => {
                if (!this.disposed)
                    fn();
            }, ms);
            this.cleanup(() => clearTimeout(id));
            return id;
        }
        interval(fn, ms) {
            const id = setInterval(() => {
                if (!this.disposed)
                    fn();
            }, ms);
            this.cleanup(() => clearInterval(id));
            return id;
        }
        task(fn) { return Promise.resolve().then(() => fn(this.signal)); }
        child() { const child = new Scope(); this.cleanup(() => child.dispose()); return child; }
        dispose() {
            if (this.disposed)
                return;
            this.disposed = true;
            this.controller.abort();
            const errors = [];
            for (const fn of this.callbacks.splice(0).reverse()) {
                try {
                    fn();
                }
                catch (e) {
                    errors.push(e);
                }
            }
            if (errors.length)
                console.warn('DuoKit cleanup', errors);
        }
    }
    class Environment {
        constructor(values = {}, parent = null) { this.values = new State({ ...values }); this.parent = parent; }
        get(key) { const value = this.values.value; return Object.hasOwn(value, key) ? value[key] : this.parent?.get(key); }
        set(key, value) { this.values.value = { ...this.values.value, [key]: value }; }
        update(values) { batch(() => { this.values.value = { ...this.values.value, ...values }; }); }
        child(values = {}) { return new Environment(values, this); }
    }
    class UndoManager {
        constructor(get, set, limit = 80) { this.get = get; this.set = set; this.limit = limit; this.past = []; this.future = []; }
        transaction(fn) {
            const before = structuredClone(this.get());
            try {
                const result = fn();
                if (JSON.stringify(before) !== JSON.stringify(this.get())) {
                    this.past.push(before);
                    if (this.past.length > this.limit)
                        this.past.shift();
                    this.future = [];
                }
                return result;
            }
            catch (e) {
                this.set(before);
                throw e;
            }
        }
        undo() {
            if (!this.past.length)
                return false;
            this.future.push(structuredClone(this.get()));
            this.set(this.past.pop());
            return true;
        }
        redo() {
            if (!this.future.length)
                return false;
            this.past.push(structuredClone(this.get()));
            this.set(this.future.pop());
            return true;
        }
    }
    const unwrap = v => v instanceof State || v instanceof Binding ? v.value : typeof v === 'function' ? v() : v;
    class View {
        constructor(type, props = {}, children = []) { this.type = type; this.props = props; this.children = children.flat(Infinity).filter(x => x !== null && x !== undefined && x !== false); }
        modifier(props) { return new View(this.type, { ...this.props, ...props, style: { ...this.props.style, ...props.style } }, this.children); }
        id(id) { return this.modifier({ id }); }
        padding(value = 16) { return this.modifier({ style: { padding: typeof value === 'number' ? value + 'px' : value } }); }
        frame({ width, height, minWidth, minHeight, maxWidth, maxHeight } = {}) {
            const style = {};
            for (const [k, v] of Object.entries({ width, height, minWidth, minHeight, maxWidth, maxHeight }))
                if (v !== undefined)
                    style[k] = v === Infinity ? '100%' : typeof v === 'number' ? v + 'px' : v;
            return this.modifier({ style });
        }
        background(value) { return this.modifier({ style: { background: value } }); }
        foregroundStyle(value) { return this.modifier({ style: { color: value } }); }
        font(value) { const sizes = { largeTitle: 32, title: 25, title2: 21, headline: 17, body: 16, caption: 12 }; return this.modifier({ style: typeof value === 'number' ? { fontSize: value + 'px' } : Object.hasOwn(sizes, value) ? { fontSize: sizes[value] + 'px' } : { fontFamily: value } }); }
        bold() { return this.modifier({ style: { fontWeight: '700' } }); }
        cornerRadius(value) { return this.modifier({ style: { borderRadius: value + 'px' } }); }
        opacity(value) { return this.modifier({ style: { opacity: value } }); }
        disabled(value = true) { return this.modifier({ disabled: value }); }
        accessibilityLabel(label) { return this.modifier({ ariaLabel: label }); }
        onTapGesture(action) { return this.modifier({ onClick: action }); }
        navigationTitle(title) { return this.modifier({ ariaLabel: title }); }
        tag(value) { return this.id(value); }
    }
    const container = type => (...children) => new View(type, {}, children);
    const VStack = container('VStack'), HStack = container('HStack'), ZStack = container('ZStack'), ScrollView = container('ScrollView');
    const Text = text => new View('Text', { text }), Button = (text, action) => new View('Button', { text, onClick: action });
    const TextField = (label, binding) => new View('TextField', { label, binding });
    const TextEditor = binding => new View('TextEditor', { binding });
    const Toggle = (label, binding) => new View('Toggle', { label, binding });
    const Slider = (binding, range = [0, 1], step = .01) => new View('Slider', { binding, min: range[0], max: range[1], step });
    const Picker = (label, binding, options) => new View('Picker', { label, binding, options });
    const Spacer = () => new View('Spacer');
    const Divider = () => new View('Divider');
    const List = (items, row, key = item => item.id) => new View('List', {}, unwrap(items).map((v, i) => row(v, i).id(key(v) ?? i)));
    const ForEach = (items, row, key = item => item.id) => unwrap(items).map((v, i) => row(v, i).id(key(v) ?? i));
    const NavigationSplitView = (sidebar, detail) => new View('NavigationSplitView', {}, [sidebar, detail]);
    const TabView = (tabs, binding) => new View('TabView', { tabs, binding });
    const Canvas = (draw) => new View('Canvas', { draw });
    const ImageView = (src, alt = '') => new View('Image', { src, alt });
    const WindowGroup = body => ({ type: 'WindowGroup', body });
    const UIViewRepresentable = mount => ({ type: 'UIViewRepresentable', mount });
    const tags = { Text: 'span', Button: 'button', TextField: 'input', TextEditor: 'textarea', Toggle: 'input', Slider: 'input', Picker: 'select', Image: 'img', Divider: 'hr', Canvas: 'canvas' };
    const baseStyles = { VStack: { display: 'flex', flexDirection: 'column', gap: '12px' }, HStack: { display: 'flex', alignItems: 'center', gap: '12px' }, ZStack: { display: 'grid' }, ScrollView: { overflow: 'auto', minHeight: '0' }, Spacer: { flex: '1' }, NavigationSplitView: { display: 'grid', gridTemplateColumns: 'minmax(160px,1fr) minmax(0,2fr)', gap: '16px' }, List: { display: 'flex', flexDirection: 'column', gap: '6px' } };
    function render(host, body, { scope = new Scope(), environment = new Environment(), context = {} } = {}) {
        const doc = host.ownerDocument;
        let tree = null;
        function patch(parent, old, node) {
            if (typeof node === 'string' || typeof node === 'number')
                node = Text(String(node));
            if (!(node instanceof View))
                throw TypeError('A view body must return DuoKit views');
            const tag = tags[node.type] || 'div';
            let record = old;
            if (!record || record.type !== node.type) {
                const el = doc.createElement(tag);
                record = { el, type: node.type, children: [], styleKeys: [], observers: [] };
                if (old) {
                    parent.replaceChild(el, old.el);
                    destroy(old);
                }
                else
                    parent.append(el);
            }
            const el = record.el, p = node.props;
            el.dataset.duokit = node.type;
            if (p.action)
                el.dataset.dkAction = p.action;
            else
                delete el.dataset.dkAction;
            if (p.bindingName)
                el.dataset.dkBinding = p.bindingName;
            else
                delete el.dataset.dkBinding;
            if (p.id !== undefined)
                el.dataset.viewId = String(p.id);
            else
                delete el.dataset.viewId;
            if (p.ariaLabel || p.label)
                el.setAttribute('aria-label', unwrap(p.ariaLabel || p.label));
            const style = { ...baseStyles[node.type], ...(unwrap(p.style) || {}) };
            for (const key of record.styleKeys)
                if (!(key in style))
                    el.style[key] = '';
            for (const [key, value] of Object.entries(style))
                el.style[key] = String(unwrap(value) ?? '');
            record.styleKeys = Object.keys(style);
            if (node.type === 'NavigationSplitView' && environment.get('horizontalSizeClass') === 'compact')
                el.style.gridTemplateColumns = 'minmax(0,1fr)';
            const text = unwrap(p.text);
            if (text !== undefined && el.textContent !== String(text))
                el.textContent = String(text);
            el.disabled = !!unwrap(p.disabled);
            el.onclick = p.onClick ? (event) => p.onClick(event, context) : null;
            if (node.type === 'Button')
                el.type = 'button';
            if (['TextField', 'TextEditor', 'Slider', 'Toggle', 'Picker'].includes(node.type)) {
                if (node.type === 'Toggle')
                    el.type = 'checkbox';
                else if (node.type === 'Slider') {
                    el.type = 'range';
                    el.min = p.min;
                    el.max = p.max;
                    el.step = p.step;
                }
                else if (node.type === 'TextField') {
                    el.type = 'text';
                    el.placeholder = unwrap(p.label) || '';
                }
                if (node.type === 'Picker') {
                    const options = unwrap(p.options) || [];
                    const json = JSON.stringify(options);
                    if (record.options !== json) {
                        el.replaceChildren(...options.map(v => { const o = doc.createElement('option'); o.value = Array.isArray(v) ? v[0] : v; o.textContent = Array.isArray(v) ? v[1] : v; return o; }));
                        record.options = json;
                    }
                }
                const value = unwrap(p.binding);
                if (node.type === 'Toggle')
                    el.checked = !!value;
                else if (el.value !== String(value ?? ''))
                    el.value = String(value ?? '');
                el.oninput = () => {
                    if (p.binding instanceof Binding || p.binding instanceof State)
                        p.binding.value = node.type === 'Toggle' ? el.checked : node.type === 'Slider' ? Number(el.value) : el.value;
                };
            }
            if (node.type === 'Image') {
                const src = unwrap(p.src) || '';
                if (!/^(data:image\/(png|jpeg|gif|webp);base64,|blob:)/.test(src) && src)
                    throw Error('Image requires a local data or blob URL');
                if (el.src !== src)
                    el.src = src;
                el.alt = unwrap(p.alt) || '';
            }
            if (node.type === 'Canvas') {
                record.draw = p.draw;
                if (!record.resize) {
                    const resize = () => { const r = el.getBoundingClientRect(), d = Math.min(globalThis.devicePixelRatio || 1, 2); el.width = Math.max(1, r.width * d); el.height = Math.max(1, r.height * d); const g = el.getContext('2d'); g.setTransform(d, 0, 0, d, 0, 0); record.draw?.(g, { width: r.width, height: r.height }, context); };
                    record.resize = new ResizeObserver(resize);
                    record.resize.observe(el);
                    record.observers.push(record.resize);
                }
                queueMicrotask(() => {
                    if (el.isConnected) {
                        const g = el.getContext('2d');
                        record.draw?.(g, { width: el.clientWidth, height: el.clientHeight }, context);
                    }
                });
            }
            let children = node.children;
            if (node.type === 'TabView') {
                const tabs = unwrap(p.tabs) || [], selected = unwrap(p.binding) || tabs[0]?.id;
                children = [HStack(...tabs.map(t => Button(t.title, () => p.binding.value = t.id).background(t.id === selected ? '#dceaff' : 'transparent'))), tabs.find(t => t.id === selected)?.view || Text('')];
            }
            if (children.length || record.children.length) {
                const keyed = new Map(record.children.map((r, i) => [r.key ?? i, r])), next = [];
                children.forEach((child, i) => {
                    const key = child?.props?.id ?? i;
                    if (next.some(r => r.key === key))
                        throw Error('Duplicate view identity: ' + key);
                    const r = patch(el, keyed.get(key), child);
                    keyed.delete(key);
                    r.key = key;
                    next.push(r);
                    if (el.children[i] !== r.el)
                        el.insertBefore(r.el, el.children[i] || null);
                });
                for (const r of keyed.values()) {
                    r.el.remove();
                    destroy(r);
                }
                record.children = next;
            }
            return record;
        }
        function destroy(record) { record.observers.forEach(o => o.disconnect()); record.children.forEach(destroy); }
        const update = () => { tree = patch(host, tree, typeof body === 'function' ? body() : body); };
        const stop = effect(update);
        scope.cleanup(() => {
            stop();
            if (tree) {
                destroy(tree);
                tree.el.remove();
                tree = null;
            }
        });
        return { update, dispose: () => scope.dispose() };
    }
    const viewTypes = new Set(['VStack', 'HStack', 'ZStack', 'ScrollView', 'Text', 'Button', 'TextField', 'TextEditor', 'Toggle', 'Slider', 'Picker', 'Spacer', 'Divider', 'List', 'NavigationSplitView', 'Canvas', 'Image']);
    function validateView(node) {
        let count = 0;
        const ids = new Set();
        function walk(n, depth) {
            if (++count > 1500 || depth > 32)
                throw Error('View tree exceeds limits');
            if (!n || !viewTypes.has(n.type) || typeof n.id !== 'string' || !/^[\w.-]{1,100}$/.test(n.id) || ids.has(n.id))
                throw Error('Invalid or duplicate view id/type');
            ids.add(n.id);
            if (n.props && (!isPlain(n.props) || JSON.stringify(n.props).length > 1e6))
                throw Error('Invalid view properties');
            safeData(n.props || {});
            if (n.children && !Array.isArray(n.children))
                throw Error('Invalid view children');
            (n.children || []).forEach(c => walk(c, depth + 1));
        }
        walk(node, 0);
        return node;
    }
    function isPlain(value) { return value !== null && typeof value === 'object' && !Array.isArray(value) && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null); }
    function safeData(value, depth = 0) {
        if (depth > 40)
            throw Error('Data too deep');
        if (value && typeof value === 'object')
            for (const key of Object.keys(value)) {
                if (['__proto__', 'prototype', 'constructor'].includes(key))
                    throw Error('Unsafe data key');
                safeData(value[key], depth + 1);
            }
        if (typeof value === 'number' && !Number.isFinite(value))
            throw Error('Non-finite data');
        return value;
    }
    function fromJSON(node, { state, actions = {}, draw = {} } = {}) {
        const p = { ...node.props };
        const key = p.binding;
        p.bindingName = key;
        if (key) {
            if (!/^[\w.-]+$/.test(key))
                throw Error('Invalid binding');
            p.binding = new Binding(() => state.value[key], v => state.value = { ...state.value, [key]: v });
        }
        if (p.text !== undefined) {
            const text = p.text;
            p.text = () => String(text).replace(/\{\{([\w.-]+)\}\}/g, (_, k) => String(state?.value?.[k] ?? ''));
        }
        if (p.action)
            p.onClick = event => actions[p.action]?.(event?.currentTarget, event);
        if (p.draw)
            p.draw = draw[p.draw];
        return new View(node.type, p, (node.children || []).map(n => fromJSON(n, { state, actions, draw }))).id(node.id);
    }
    function App(meta, scene) { return { ...meta, scene }; }
    const api = { version: '3.0.0', State, Binding, Scope, Environment, UndoManager, effect, computed, batch, View, VStack, HStack, ZStack, Text, Button, TextField, TextEditor, Toggle, Slider, Picker, Spacer, Divider, List, ForEach, ScrollView, NavigationSplitView, TabView, Canvas, Image: ImageView, WindowGroup, UIViewRepresentable, App, render, validateView, fromJSON, safeData, ScenePhase: { active: 'active', inactive: 'inactive', background: 'background' }, HorizontalSizeClass: { compact: 'compact', regular: 'regular' } };
    return api;
});
