/* Duo Developer Studio — editable source, live Interface Builder and cooperative debugger. */
(function (D, V) {
    'use strict';
    const e = D.escape, icon = (n, s = 16) => D.icon(n, s), button = (a, t, title = t) => `<button type="button" data-dev="${a}" title="${e(title)}" aria-label="${e(title)}">${t}</button>`;
    class IDE {
        constructor(bundle) {
            this.bundle = bundle;
            this.project = new V.Workspace(bundle);
            this.project.load();
            this.compiler = new V.Compiler(bundle);
            this.root = null;
            this.mode = 'simulator';
            this.tab = 'split';
            this.nav = 'project';
            this.inspector = 'attributes';
            this.logs = [];
            this.outline = [];
            this.commands = [];
            this.selection = null;
            this.snapshot = this.project.runtimeSession;
            this.lastGood = null;
            this.frame = null;
            this.pending = null;
            this.token = '';
            this.layoutTimer = 0;
            this.autoSave = 0;
            this.debugState = 'Stopped';
            this.destination = 'unfolded';
            this.consoleTab = 'console';
            this.watch = [];
            this.bootTime = 0;
            this.selectedNode = -1;
            this.search = '';
            this.errors = [];
            this.changedText = false;
            this.request = 0;
            this.awaiters = new Map();
            this.builtRevision = -1;
            this.buildRequest = 0;
            addEventListener('message', event => this.message(event));
            document.addEventListener('click', event => {
                if (event.target.closest('[data-open-ide]'))
                    this.enter();
            });
            addEventListener('beforeunload', () => this.project.save());
        }
        $(selector) { return this.root?.querySelector(selector); }
        mount() {
            if (this.root)
                return;
            const root = this.root = document.createElement('section');
            root.id = 'developer-studio';
            root.setAttribute('aria-label', 'Duo Developer Studio');
            root.innerHTML = `
 <div class="ide-menu"><strong>Duo Studio</strong>${button('new', 'File')}${button('edit-menu', 'Edit')}${button('view-menu', 'View')}${button('run', 'Product')}${button('debug-menu', 'Debug')}${button('help', 'Help')}<span class="ide-menu-note">JavaScript + DuoKit · Xcode-inspired workspace</span></div>
 <header class="ide-toolbar"><div class="ide-traffic">${button('simulator', '<i></i>', 'Return to simulator')}${button('toggle-nav', '<i></i>', 'Toggle navigator')}${button('fullscreen', '<i></i>', 'Toggle fullscreen')}</div>${button('toggle-nav', icon('menu'), 'Show or hide navigator')}<div class="ide-run-buttons">${button('run', icon('play', 20), 'Build and run · ⌘R')}${button('stop', '■', 'Stop preview')}</div><select id="ide-scheme" aria-label="Application scheme"></select><span class="ide-toolbar-chevron">›</span><select id="ide-destination" aria-label="Preview destination"><option value="unfolded">iPhone Duo · Unfolded</option><option value="folded">iPhone Duo · Folded</option><option value="tabletop">iPhone Duo · Tabletop</option><option value="desktop">Desktop · 1280 × 800</option></select><div class="ide-build-status"><i></i><span id="ide-status">Ready to build</span></div>${button('new', icon('plus'), 'New application')}${button('save', icon('check'), 'Save workspace · ⌘S')}${button('export-menu', icon('share'), 'Export workspace or standalone app')}${button('simulator', 'Simulator ↗', 'Switch to full simulator')}</header>
 <div class="ide-workarea"><aside class="ide-navigator"><div class="ide-nav-tabs">${[['project', 'file'], ['search', 'search'], ['symbols', 'code'], ['issues', 'warning'], ['tests', 'check'], ['breaks', 'bookmark']].map(([a, i]) => button('nav-' + a, icon(i), a + ' navigator')).join('')}</div><div class="ide-nav-heading"><b id="ide-nav-title">Project</b>${button('new-file', '＋', 'New source file')}</div><input id="ide-file-filter" placeholder="Filter files" aria-label="Filter navigator"><div id="ide-nav-content"></div><div class="ide-nav-footer"><span id="ide-file-count"></span>${button('import', icon('folder'), 'Import workspace')}</div></aside><div class="ide-resize ide-nav-resize" role="separator" tabindex="0" aria-label="Resize project navigator"></div>
 <main class="ide-main"><div class="ide-file-tabs" id="ide-file-tabs"></div><div class="ide-jumpbar"><span id="ide-breadcrumb"></span><div class="ide-segment">${button('tab-code', 'Code')}${button('tab-split', 'Split')}${button('tab-design', 'Design')}</div>${button('toggle-console', icon('terminal'), 'Show debug console')}${button('toggle-inspector', icon('settings'), 'Show inspector')}</div>
 <div class="ide-editing" data-tab="split"><section class="ide-source"><div class="ide-find" hidden><input id="ide-find" placeholder="Find in file" aria-label="Find in file"><input id="ide-replace" placeholder="Replace with" aria-label="Replace with">${button('find-next', 'Next')}${button('replace', 'Replace')}${button('replace-all', 'All')}${button('find-close', '×')}</div><div class="ide-editor"><div id="ide-gutter" aria-label="Action breakpoints"></div><div class="ide-text-layer"><pre id="ide-highlight" aria-hidden="true"></pre><textarea id="ide-code" aria-label="Source code editor" autocapitalize="off" autocomplete="off" spellcheck="false" wrap="off"></textarea></div><div id="ide-completions" hidden></div></div><div class="ide-editor-status"><span id="ide-caret">Ln 1, Col 1</span><span>UTF-8　 JavaScript / JSON / CSS</span>${button('find-open', 'Find · ⌘F')}${button('reset-file', 'Revert file')}</div></section>
 <section class="ide-canvas"><div class="ide-canvas-toolbar"><b>Canvas</b><div class="ide-segment">${button('interact', 'Live')}${button('select', 'Select')}</div>${button('preview-home', icon('home'), 'Preview home screen')}${button('preview-dark', icon('moon'), 'Preview dark appearance')}${button('rebuild', icon('refresh'), 'Rebuild preview')}<span class="ide-scale" id="ide-scale">Fit</span></div><div id="ide-preview-area"><div class="ide-device-title">iPhone Duo <span>•</span> continuous display</div><div id="ide-preview-fit"><div id="ide-preview-device"><div class="ide-preview-empty"><div class="ide-app-emblem">⌘</div><h2>Your ideas. Running.</h2><p>Edit an app, shape its interface,<br>then bring it to life on Duo.</p>${button('run', '▶ Build & Run')}</div></div></div><div class="ide-canvas-caption">Live runtime · locally compiled · network isolated</div></div><div class="ide-design-tools">${button('add-component', '＋ Library')}${button('delete-element', 'Delete')}${button('duplicate-element', 'Duplicate')}${button('move-up', '↑', 'Move view before sibling')}${button('move-down', '↓', 'Move view after sibling')}${button('layout-source', 'View source')}<span>Drag label to move · corner to resize</span></div></section></div>
 <div class="ide-resize ide-console-resize" role="separator" tabindex="0" aria-label="Resize debug console"></div><section class="ide-debug"><div class="ide-debug-toolbar">${button('resume', icon('play'), 'Continue command')}${button('pause', icon('pause'), 'Pause before next command')}${button('step', icon('next'), 'Step current command / checkpoint')}<span id="ide-debug-state">Action debugger · stopped</span><div class="ide-debug-tabs">${button('console-console', 'Console')}${button('console-state', 'Variables')}${button('console-stack', 'Call stack')}${button('console-watch', 'Watch')}</div>${button('native-break', 'JS', 'Break in browser DevTools')}${button('clear-console', 'Clear')}</div><div id="ide-debug-output" role="log" aria-label="Debug output"></div><form id="ide-evaluate"><span>›</span><input aria-label="Evaluate expression" placeholder="Evaluate in isolated runtime: state · locals · Duo" autocomplete="off" spellcheck="false">${button('watch-add', '＋ Watch')}</form></section>
 </main><div class="ide-resize ide-inspector-resize" role="separator" tabindex="0" aria-label="Resize inspector"></div><aside class="ide-inspector"><div class="ide-inspector-tabs">${button('inspector-attributes', 'Attributes')}${button('inspector-hierarchy', 'Hierarchy')}${button('inspector-library', 'Library')}</div><div id="ide-inspector-content"></div></aside></div><footer class="ide-statusbar"><span id="ide-project-status">DuoKit 3.0 · 20 applications</span><span id="ide-storage-status">Local workspace</span><span>⌘R Run　 ⌘B Build　 ⌘S Save　 ⌘⇧Z Redo</span></footer>`;
            document.body.append(root);
            root.addEventListener('click', event => {
                const b = event.target.closest('[data-dev]');
                if (b) {
                    event.preventDefault();
                    Promise.resolve(this.action(b.dataset.dev, b, event)).catch(error => this.log('error', error.message));
                }
            });
            this.$('#ide-scheme').onchange = event => { this.project.app = event.target.value; const path = 'src/apps/' + this.project.app + '.js'; this.selectFile(path); this.send('launch', { app: this.project.app }); this.saveSoon(); };
            this.$('#ide-destination').onchange = event => { this.destination = event.target.value; this.resize(); this.send('posture', { posture: { folded: 'closed', tabletop: 'tabletop' }[this.destination] || 'open' }); };
            this.$('#ide-code').addEventListener('input', () => { const code = this.$('#ide-code'); this.project.set(this.project.active, code.value); this.highlight(); this.caret(); this.saveSoon(); this.updateTabs(); });
            this.$('#ide-code').addEventListener('scroll', () => { const c = this.$('#ide-code'); this.$('#ide-highlight').scrollTop = c.scrollTop; this.$('#ide-highlight').scrollLeft = c.scrollLeft; this.$('#ide-gutter').scrollTop = c.scrollTop; });
            this.$('#ide-code').addEventListener('keydown', event => this.editorKey(event));
            this.$('#ide-code').addEventListener('click', () => this.caret());
            this.$('#ide-code').addEventListener('keyup', () => this.caret());
            this.$('#ide-gutter').onclick = event => {
                const line = event.target.closest('[data-line]');
                if (line)
                    this.breakAt(+line.dataset.line);
            };
            this.$('#ide-file-filter').oninput = event => { this.search = event.target.value; this.renderNavigator(); };
            this.$('#ide-nav-content').onclick = event => {
                const path = event.target.closest('[data-file]');
                if (path)
                    this.selectFile(path.dataset.file, +path.dataset.line || 1);
                const bp = event.target.closest('[data-break-action]');
                if (bp)
                    this.toggleBreak(bp.dataset.app, bp.dataset.breakAction);
            };
            this.$('#ide-file-tabs').onclick = event => {
                const tab = event.target.closest('[data-file]');
                if (tab)
                    this.selectFile(tab.dataset.file);
            };
            this.$('#ide-inspector-content').onclick = event => {
                const row = event.target.closest('[data-node]');
                if (row) {
                    const node = this.outline[+row.dataset.node];
                    this.send('select', node);
                    this.selectedNode = +row.dataset.node;
                }
                const type = event.target.closest('[data-component]');
                if (type)
                    this.addComponent(type.dataset.component);
            };
            this.$('#ide-inspector-content').addEventListener('dragstart', event => {
                const c = event.target.closest('[data-component]');
                if (c) {
                    event.dataTransfer.setData('application/x-duokit-view', c.dataset.component);
                    event.dataTransfer.effectAllowed = 'copy';
                    this.send('design', { enabled: true });
                }
            });
            this.$('#ide-inspector-content').addEventListener('change', event => this.propertyChanged(event));
            this.$('#ide-evaluate').onsubmit = event => { event.preventDefault(); const input = event.target.querySelector('input'); this.evaluate(input.value); input.value = ''; };
            root.addEventListener('keydown', event => {
                const mod = event.metaKey || event.ctrlKey;
                if (!mod)
                    return;
                const key = event.key.toLowerCase();
                if (['r', 'b', 's', 'f'].includes(key)) {
                    event.preventDefault();
                    event.stopPropagation();
                    this.action(({ r: 'run', b: 'build', s: 'save', f: 'find-open' })[key]);
                }
            });
            this.project.addEventListener('select', () => { this.updateEditor(); this.renderNavigator(); });
            this.project.addEventListener('change', () => { this.$('#ide-project-status').textContent = 'DuoKit 3.0 · ' + (20 + this.project.custom.length) + ' apps · revision ' + this.project.revision; });
            this.resizeObserver = new ResizeObserver(() => this.resize());
            this.resizeObserver.observe(this.$('#ide-preview-area'));
            this.bindResizer('.ide-nav-resize', '--ide-nav', 170, 440, 'x', 1);
            this.bindResizer('.ide-inspector-resize', '--ide-inspector', 210, 420, 'x', -1);
            this.bindResizer('.ide-console-resize', '--ide-console', 90, 480, 'y', -1);
            this.renderSchemes();
            this.updateEditor();
            this.renderNavigator();
            this.renderInspector();
            this.setTab(this.tab);
        }
        enter() {
            this.mount();
            this.mode = 'ide';
            this.send('presentation', { mode: 'canvas' });
            document.body.classList.add('ide-mode');
            document.body.classList.remove('ide-sim-running');
            this.root.hidden = false;
            D.shell.setHostActive(false);
            this.resize();
            if (!this.lastGood && !this.pending)
                this.run();
        }
        exit() {
            this.mode = 'simulator';
            document.body.classList.remove('ide-mode');
            if (!this.frame) {
                this.root.hidden = true;
                D.shell.setHostActive(true);
                return;
            }
            this.root.hidden = false;
            document.body.classList.add('ide-sim-running');
            let host = document.querySelector('#ide-running-simulator');
            if (!host) {
                host = document.createElement('div');
                host.id = 'ide-running-simulator';
                host.innerHTML = '<div class="ide-running-bar"><b>DuoKit · Edited build</b><span>Running your workspace locally</span><button data-open-ide>⌘ Developer Studio</button><button id="ide-return-original">Original simulator</button></div>';
                document.body.append(host);
                host.querySelector('#ide-return-original').onclick = () => { this.send('suspend'); document.body.classList.remove('ide-sim-running'); this.root.hidden = true; D.shell.setHostActive(true); };
            }
            this.send('design', { enabled: false });
            this.send('presentation', { mode: 'simulator' });
        }
        bindResizer(selector, variable, min, max, axis, direction) {
            const handle = this.$(selector);
            handle.onpointerdown = e => { e.preventDefault(); const start = axis === 'x' ? e.clientX : e.clientY, value = parseFloat(getComputedStyle(this.root).getPropertyValue(variable)); handle.setPointerCapture(e.pointerId); const move = ev => { const delta = (axis === 'x' ? ev.clientX : ev.clientY) - start; this.root.style.setProperty(variable, Math.max(min, Math.min(max, value + delta * direction)) + 'px'); }; const end = () => { handle.removeEventListener('pointermove', move); handle.removeEventListener('pointerup', end); }; handle.addEventListener('pointermove', move); handle.addEventListener('pointerup', end); };
            handle.onkeydown = ev => {
                if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(ev.key))
                    return;
                ev.preventDefault();
                const v = parseFloat(getComputedStyle(this.root).getPropertyValue(variable));
                this.root.style.setProperty(variable, Math.max(min, Math.min(max, v + (['ArrowLeft', 'ArrowDown'].includes(ev.key) ? -10 : 10))) + 'px');
            };
        }
        renderSchemes() { this.$('#ide-scheme').innerHTML = [...D.apps.values()].map(a => `<option value="${a.id}">${e(a.name)}</option>`).join('') + this.project.custom.map(id => `<option value="${id}">${e(id.replace('user-', ''))}</option>`).join(''); this.$('#ide-scheme').value = this.project.app; }
        selectFile(path, line = 1) { this.project.select(path); const text = this.$('#ide-code'), offset = text.value.split('\n').slice(0, line - 1).join('\n').length + (line > 1 ? 1 : 0); text.setSelectionRange(offset, offset); text.scrollTop = Math.max(0, (line - 5) * 20); this.caret(); }
        updateEditor() {
            if (!this.root)
                return;
            this.$('#ide-code').value = this.project.files[this.project.active] || '';
            this.$('#ide-code').scrollTop = 0;
            this.$('#ide-highlight').scrollTop = 0;
            this.$('#ide-breadcrumb').textContent = 'DuoStudio › ' + this.project.active.replaceAll('/', ' › ');
            this.highlight();
            this.updateTabs();
            this.caret();
        }
        updateTabs() { this.$('#ide-file-tabs').innerHTML = this.project.openFiles.map(path => `<button data-file="${e(path)}" class="${path === this.project.active ? 'active' : ''}"><span class="ide-file-dot ${path.endsWith('.json') ? 'json' : ''}"></span>${e(path.split('/').at(-1))}${this.project.dirty.has(path) ? '<i>●</i>' : ''}</button>`).join(''); }
        highlight() {
            const text = this.$('#ide-code').value, path = this.project.active;
            let html = '';
            if (path.endsWith('.js')) {
                try {
                    const tokens = [], comments = [];
                    const tokenizer = acorn.tokenizer(text, { ecmaVersion: 'latest', onComment: (block, value, start, end) => comments.push({ start, end, cls: 'comment' }) });
                    while (true) {
                        const t = tokenizer.getToken();
                        if (t.type.label === 'eof')
                            break;
                        tokens.push({ start: t.start, end: t.end, cls: t.type.keyword ? 'keyword' : ['string', 'template', '`'].includes(t.type.label) ? 'string' : t.type.label === 'num' ? 'number' : t.type.label === 'name' ? 'name' : 'punct' });
                    }
                    const ranges = [...tokens, ...comments].sort((a, b) => a.start - b.start);
                    let at = 0;
                    for (const t of ranges) {
                        if (t.start < at)
                            continue;
                        html += e(text.slice(at, t.start)) + `<span class="syntax-${t.cls}">${e(text.slice(t.start, t.end))}</span>`;
                        at = t.end;
                    }
                    html += e(text.slice(at));
                }
                catch {
                    html = e(text);
                }
            }
            else
                html = e(text);
            this.$('#ide-highlight').innerHTML = html + '\n';
            const breaks = this.project.breaks.filter(b => 'src/apps/' + b.app + '.js' === path), analysis = path.endsWith('.js') ? V.analyze(text, path) : { actions: [] };
            this.$('#ide-gutter').innerHTML = text.split('\n').map((_, i) => `<button data-line="${i + 1}" class="${analysis.actions.some(a => a.line === i + 1) ? 'has-action' : ''} ${breaks.some(b => b.line === i + 1) ? 'breakpoint' : ''}" title="${analysis.actions.filter(a => a.line === i + 1).map(a => e(a.action)).join(', ') || 'No command boundary on this line'}">${i + 1}</button>`).join('');
        }
        caret() {
            const c = this.$('#ide-code');
            if (!c)
                return;
            const before = c.value.slice(0, c.selectionStart), lines = before.split('\n');
            this.$('#ide-caret').textContent = 'Ln ' + lines.length + ', Col ' + (lines.at(-1).length + 1);
        }
        editorKey(event) {
            const c = event.target;
            if (event.key === 'Tab') {
                event.preventDefault();
                const start = c.selectionStart, end = c.selectionEnd;
                if (start === end && !event.shiftKey)
                    c.setRangeText('  ', start, end, 'end');
                else {
                    const begin = c.value.lastIndexOf('\n', start - 1) + 1, chunk = c.value.slice(begin, end);
                    const next = chunk.split('\n').map(l => event.shiftKey ? l.replace(/^ {1,2}/, '') : '  ' + l).join('\n');
                    c.setRangeText(next, begin, end, 'select');
                }
                c.dispatchEvent(new Event('input'));
            }
            if ((event.metaKey || event.ctrlKey) && event.key === '/') {
                event.preventDefault();
                const begin = c.value.lastIndexOf('\n', c.selectionStart - 1) + 1, end = c.value.indexOf('\n', c.selectionEnd), stop = end < 0 ? c.value.length : end, chunk = c.value.slice(begin, stop), uncomment = chunk.split('\n').every(l => /^\s*\/\//.test(l));
                c.setRangeText(chunk.split('\n').map(l => uncomment ? l.replace(/^(\s*)\/\/ ?/, '$1') : '// ' + l).join('\n'), begin, stop, 'select');
                c.dispatchEvent(new Event('input'));
            }
            if (event.ctrlKey && event.code === 'Space') {
                event.preventDefault();
                this.complete();
            }
        }
        complete() {
            const c = this.$('#ide-code'), prefix = /[\w.]*$/.exec(c.value.slice(0, c.selectionStart))[0], names = ['DuoKit.State', 'DuoKit.Binding', 'DuoKit.VStack', 'DuoKit.HStack', 'DuoKit.Text', 'DuoKit.Button', 'DuoKit.NavigationSplitView', 'DuoKit.declarative', 'ctx.document', 'ctx.commands.perform', 'ctx.debug.checkpoint', 'state.update', 'ctx.services.files', 'ctx.scope.on'];
            const matches = names.filter(n => n.toLowerCase().includes(prefix.toLowerCase())).slice(0, 8), box = this.$('#ide-completions');
            box.hidden = !matches.length;
            box.innerHTML = matches.map(n => `<button>${e(n)}</button>`).join('');
            box.onclick = ev => {
                if (ev.target.tagName !== 'BUTTON')
                    return;
                c.setRangeText(ev.target.textContent, c.selectionStart - prefix.length, c.selectionStart, 'end');
                c.dispatchEvent(new Event('input'));
                box.hidden = true;
                c.focus();
            };
        }
        renderNavigator() {
            const host = this.$('#ide-nav-content');
            if (!host)
                return;
            this.$('#ide-nav-title').textContent = ({ project: 'Project navigator', search: 'Find in workspace', symbols: 'Symbol navigator', issues: 'Build issues', tests: 'Validation', breaks: 'Action breakpoints' })[this.nav];
            const query = this.search.toLowerCase();
            let html = '';
            if (this.nav === 'project') {
                let group = '';
                for (const path of Object.keys(this.project.files).sort()) {
                    if (query && !path.toLowerCase().includes(query))
                        continue;
                    const category = path.startsWith('src/apps/') ? 'Applications' : path.startsWith('views/') ? 'Interfaces' : path.startsWith('sdk/') ? 'DuoKit SDK' : path.startsWith('src/engines/') ? 'Engines' : 'Runtime & styles';
                    if (group !== category) {
                        group = category;
                        html += `<h4 class="ide-folder">⌄　${category}</h4>`;
                    }
                    html += `<button data-file="${path}" class="ide-nav-file ${path === this.project.active ? 'active' : ''}"><span class="ide-file-dot ${path.endsWith('.json') ? 'json' : ''}"></span><span>${e(path.split('/').at(-1))}</span>${this.project.dirty.has(path) ? '<small>M</small>' : ''}</button>`;
                }
            }
            if (this.nav === 'search') {
                if (query.length < 2)
                    html = '<p class="ide-empty">Type at least two characters to search every source file.</p>';
                else
                    for (const [path, text] of Object.entries(this.project.files)) {
                        let count = 0;
                        text.split('\n').forEach((line, i) => {
                            if (count < 30 && line.toLowerCase().includes(query)) {
                                count++;
                                html += `<button class="ide-search-result" data-file="${path}" data-line="${i + 1}"><b>${e(path.split('/').at(-1))}:${i + 1}</b><span>${e(line.slice(Math.max(0, line.toLowerCase().indexOf(query) - 20), line.toLowerCase().indexOf(query) + 95))}</span></button>`;
                            }
                        });
                    }
            }
            if (this.nav === 'symbols') {
                const a = V.analyze(this.project.files[this.project.active] || '', this.project.active);
                html = a.symbols.map(s => `<button class="ide-nav-file" data-file="${this.project.active}" data-line="${s.line}"><span class="ide-symbol">ƒ</span>${e(s.name)}<small>${s.line}</small></button>`).join('') || '<p class="ide-empty">Select a JavaScript source file.</p>';
            }
            if (this.nav === 'issues')
                html = this.errors.map(issue => `<button class="ide-search-result error" data-file="${e(issue.path)}" data-line="${issue.line}"><b>● ${e(issue.path.split('/').at(-1))}:${issue.line}</b><span>${e(issue.message)}</span></button>`).join('') || '<p class="ide-empty success">✓ No build issues</p>';
            if (this.nav === 'tests') {
                const report = this.compiler.validate(this.project);
                html = `<div class="ide-test-report"><b>${report.errors.length ? 'Build validation failed' : '✓ Source validation passed'}</b><p>${Object.keys(this.project.files).length} editable files</p><p>${20 + this.project.custom.length} application schemes</p><p>${[...D.apps.values()].filter(a => a.sdkVersion).length} built-in SDK migrations</p><p>Runtime: ${e(this.debugState)}</p><p>WebGPU availability depends on your browser and adapter.</p><small>These live checks are not the repository CI suite.</small></div>`;
            }
            if (this.nav === 'breaks') {
                html = '<p class="ide-empty">Commands pause before mutation. Add breakpoints from the gutter or the action list.</p>' + this.project.breaks.map(b => `<button class="ide-nav-file active" data-break-action="${e(b.action)}" data-app="${e(b.app)}">◆ ${e(b.app)} · ${e(b.action)}</button>`).join('');
                for (const app of this.commands)
                    if (app.app === this.project.app)
                        html += '<h4>Available commands</h4>' + app.actions.map(action => `<button class="ide-nav-file" data-break-action="${e(action)}" data-app="${app.app}">◇ ${e(action)}</button>`).join('');
            }
            host.innerHTML = html;
            this.$('#ide-file-count').textContent = Object.keys(this.project.files).length + ' files';
            this.root.querySelectorAll('[data-dev^="nav-"]').forEach(b => b.classList.toggle('active', b.dataset.dev === 'nav-' + this.nav));
        }
        setTab(tab) {
            this.tab = tab;
            this.$('.ide-editing').dataset.tab = tab;
            for (const b of this.root.querySelectorAll('[data-dev^="tab-"]'))
                b.classList.toggle('active', b.dataset.dev === 'tab-' + tab);
            this.resize();
        }
        status(text, state = 'idle') {
            if (!this.root)
                return;
            this.$('#ide-status').textContent = text;
            this.$('.ide-build-status').dataset.state = state;
        }
        async run() {
            this.mount();
            this.stopPending();
            const request = ++this.buildRequest;
            let output;
            try {
                if (!this.lastGood && !this.project.resources.length)
                    this.project.resources = await V.encodeResources(await D.Studio.files.list());
                if (request !== this.buildRequest)
                    return false;
                output = this.compiler.build(this.project, { token: D.uid(), session: this.previewSession() });
                this.errors = [];
                this.renderNavigator();
            }
            catch (error) {
                this.errors = error.diagnostics || [];
                this.nav = 'issues';
                this.renderNavigator();
                this.status('Build failed', 'error');
                this.log('error', error.message);
                return false;
            }
            this.stopPending();
            const frame = document.createElement('iframe');
            const token = JSON.parse(/window.DuoPreviewConfig=(.*?);\n/.exec(output.html)?.[1] || '{}').token;
            frame.name = 'duokit-' + token;
            frame.title = 'DuoKit isolated application preview';
            frame.setAttribute('sandbox', 'allow-scripts allow-downloads');
            frame.setAttribute('allow', 'fullscreen');
            frame.className = 'ide-live-frame';
            frame.style.cssText = 'position:absolute;inset:0;opacity:0;pointer-events:none;width:100%;height:100%;border:0';
            this.pending = { frame, token, output };
            this.$('#ide-preview-device').append(frame);
            frame.srcdoc = output.html;
            this.bootTime = performance.now();
            this.status('Building ' + this.project.app + '…', 'building');
            this.log('build', 'Compile successful · ' + output.bytes.toLocaleString() + ' bytes · booting isolated runtime');
            this.resize();
            this.pending.timer = setTimeout(() => {
                if (this.pending?.frame === frame) {
                    this.log('error', 'Preview did not initialize. Previous successful build retained.');
                    this.stopPending();
                    this.status('Runtime startup failed', 'error');
                }
            }, 20000);
            return true;
        }
        previewSession() {
            if (!this.snapshot)
                return structuredClone(D.store.data);
            return { ...structuredClone(D.store.data), apps: structuredClone(this.snapshot.apps) };
        }
        stopPending() {
            if (this.pending) {
                clearTimeout(this.pending.timer);
                this.pending.frame.remove();
                this.pending = null;
            }
        }
        stop() { this.buildRequest++; this.stopPending(); this.frame?.remove(); this.frame = null; this.token = ''; this.debugState = 'Stopped'; this.status('Stopped'); this.updateDebug(); }
        send(type, data = {}) { this.frame?.contentWindow.postMessage({ duokit: 3, token: this.token, type, ...data }, '*'); }
        message(event) {
            const m = event.data;
            if (!m || m.duokit !== 3)
                return;
            const candidate = this.pending && event.source === this.pending.frame.contentWindow && m.token === this.pending.token;
            const active = this.frame && event.source === this.frame.contentWindow && m.token === this.token;
            if (!candidate && !active)
                return;
            if (candidate && m.type === 'ready') {
                const pending = this.pending;
                clearTimeout(pending.timer);
                this.frame?.remove();
                this.selection = null;
                this.renderInspector();
                this.frame = pending.frame;
                this.token = pending.token;
                this.lastGood = pending.output;
                this.builtRevision = pending.output.revision;
                this.pending = null;
                this.frame.style.cssText = 'width:100%;height:100%;border:0;';
                this.$('.ide-preview-empty')?.remove();
                this.debugState = 'Running';
                this.status('Build succeeded · ' + Math.round(performance.now() - this.bootTime) + ' ms', 'success');
                this.log('build', 'Running ' + this.project.app + ' with ' + m.apps.length + ' SDK apps');
                this.send('design', { enabled: this.designMode });
                this.resize();
            }
            if (m.type === 'open-ide')
                this.enter();
            if (m.type === 'selection') {
                this.selection = m.selection;
                this.inspector = 'attributes';
                this.renderInspector();
            }
            if (m.type === 'outline') {
                this.outline = m.nodes;
                this.commands = m.commands;
                if (this.inspector === 'hierarchy')
                    this.renderInspector();
                if (this.nav === 'breaks')
                    this.renderNavigator();
            }
            if (m.type === 'state' || m.type === 'ready') {
                this.snapshot = m.snapshot;
                this.project.runtimeSession = m.snapshot;
                this.saveSoon();
                if (this.consoleTab === 'state')
                    this.updateDebug();
            }
            if (m.type === 'console')
                this.log(m.level, ...m.values);
            if (m.type === 'runtime-error') {
                this.log('error', m.message);
                if (m.stack)
                    this.log('stack', m.stack);
                if (candidate) {
                    this.stopPending();
                    this.status('Runtime startup failed', 'error');
                }
            }
            if (m.type === 'files') {
                try {
                    V.validateResources(m.resources);
                    this.project.resources = m.resources;
                    this.saveSoon();
                }
                catch (e) {
                    this.log('error', e.message);
                }
            }
            if (m.type === 'component-drop') {
                if (['VStack', 'HStack', 'ZStack', 'ScrollView', 'Text', 'Button', 'TextField', 'TextEditor', 'Toggle', 'Slider', 'Picker', 'Spacer', 'Divider'].includes(m.component)) {
                    this.selection = m.selection;
                    this.addComponent(m.component);
                }
            }
            if (m.type === 'element-change')
                this.patch(m.app, m.selector, m.change);
            if (m.type === 'paused') {
                this.paused = m;
                this.debugState = 'Paused ' + m.phase + ' ' + m.action;
                this.consoleTab = 'state';
                this.updateDebug();
                if (m.location && this.project.files[m.location.path])
                    this.selectFile(m.location.path, m.location.line);
                for (const expression of this.watch)
                    this.evaluate(expression, true);
            }
            if (m.type === 'armed') {
                this.debugState = 'Pause armed — next command';
                this.updateDebug();
            }
            if (m.type === 'resumed') {
                this.paused = null;
                this.debugState = 'Running';
                this.updateDebug();
            }
            if (m.type === 'action' && m.phase === 'after') {
                if (this.snapshot)
                    this.snapshot.apps[m.app] = m.state;
                this.log('trace', m.app + ' › ' + m.action);
                for (const expression of this.watch)
                    this.evaluate(expression, true);
            }
            if (m.type === 'evaluation') {
                const callback = this.awaiters.get(m.request);
                if (callback) {
                    this.awaiters.delete(m.request);
                    callback(m);
                }
                this.log(m.error ? 'error' : 'result', m.error || m.value);
            }
        }
        resize() {
            if (!this.root || this.mode !== 'ide')
                return;
            const sizes = { unfolded: [1068, 751], folded: [466, 678], tabletop: [751, 1068], desktop: [1280, 800] }, [w, h] = sizes[this.destination], area = this.$('#ide-preview-area');
            const scale = Math.max(.1, Math.min((area.clientWidth - 48) / (w + 18), (area.clientHeight - 78) / (h + 18), 1));
            const device = this.$('#ide-preview-device'), fit = this.$('#ide-preview-fit');
            device.style.width = w + 'px';
            device.style.height = h + 'px';
            device.style.transform = 'scale(' + scale + ')';
            fit.style.width = w * scale + 'px';
            fit.style.height = h * scale + 'px';
            this.$('#ide-scale').textContent = Math.round(scale * 100) + '%';
        }
        patch(app, selector, change) {
            const path = 'views/' + app + '.view.json', id = selector.match(/^\[data-view-id="([\w.-]+)"\]$/)?.[1];
            if (id && this.project.files[path]) {
                const tree = JSON.parse(this.project.files[path]);
                let node;
                function visit(n) {
                    if (n.id === id)
                        node = n;
                    (n.children || []).forEach(visit);
                }
                visit(tree);
                if (node) {
                    node.props ||= {};
                    if (change.style)
                        node.props.style = { ...node.props.style, ...change.style };
                    if (change.text !== undefined)
                        node.props.text = change.text;
                    if (change.action !== undefined)
                        node.props.action = change.action;
                    if (change.binding !== undefined)
                        node.props.binding = change.binding;
                    if (change.hidden !== undefined)
                        node.props.style = { ...node.props.style, display: change.hidden ? 'none' : '' };
                    if (change.append)
                        node.children = [...(node.children || []), change.append];
                    DuoKit.validateView(tree);
                    this.project.set(path, JSON.stringify(tree, null, 2) + '\n');
                    this.send('view-document', { app, tree });
                    this.saveSoon();
                    this.updateTabs();
                    if (this.project.active === path)
                        this.updateEditor();
                    return;
                }
            }
            const layout = this.project.editElement(app, selector, change);
            this.send('layout', { app, layout });
            this.saveSoon();
            this.updateTabs();
            if (this.project.active === 'views/' + app + '.layout.json')
                this.updateEditor();
        }
        propertyChanged(event) {
            if (!this.selection)
                return;
            const target = event.target, style = target.dataset.style;
            if (style)
                this.patch(this.selection.app, this.selection.selector, { style: { [style]: target.value } });
            if (target.dataset.property)
                this.patch(this.selection.app, this.selection.selector, { [target.dataset.property]: target.value });
        }
        renderInspector() {
            const host = this.$('#ide-inspector-content');
            if (!host)
                return;
            this.root.querySelectorAll('[data-dev^="inspector-"]').forEach(b => b.classList.toggle('active', b.dataset.dev === 'inspector-' + this.inspector));
            if (this.inspector === 'library') {
                host.innerHTML = '<div class="ide-inspector-heading"><b>View library</b><p>Insert a real DuoKit view into the selected container. Configure bindings and actions in its layout source.</p></div><div class="ide-library">' + ['VStack', 'HStack', 'ZStack', 'ScrollView', 'Text', 'Button', 'TextField', 'TextEditor', 'Toggle', 'Slider', 'Picker', 'Spacer', 'Divider'].map(type => `<button draggable="true" data-component="${type}"><span>${({ VStack: '☰', HStack: '▥', Text: 'T', Button: '⌘', Toggle: '⏽', Slider: '⊖' })[type] || '□'}</span><b>${type}</b><small>Insert view</small></button>`).join('') + '</div>';
                return;
            }
            if (this.inspector === 'hierarchy') {
                host.innerHTML = '<div class="ide-inspector-heading"><b>Live view hierarchy</b><p>Select elements here or directly on the canvas.</p></div>' + this.outline.map((n, i) => `<button class="ide-outline-row ${n.selector === this.selection?.selector && n.app === this.selection?.app ? 'active' : ''}" data-node="${i}" style="padding-left:${Math.min(n.depth, 10) * 12 + 12}px;opacity:${n.visible ? 1 : .45}"><span>◇</span><b>${e(n.tag)}</b> ${e(n.label.slice(0, 34))}</button>`).join('');
                return;
            }
            const s = this.selection;
            if (!s) {
                host.innerHTML = '<div class="ide-inspector-empty"><span>◇</span><h3>No selection</h3><p>Choose <b>Select</b> above the canvas,<br>then select a view to inspect it.</p><button data-dev="select">Select a view</button><hr><p>Visual edits are stored as source-controlled layout documents and reapplied to live, dynamic app views.</p></div>';
                return;
            }
            const field = (name, label) => `<label class="ide-property"><span>${label}</span><input data-style="${name}" value="${e(s.style[name] || '')}" aria-label="${label}"></label>`;
            host.innerHTML = `<div class="ide-inspector-heading"><b>${e(s.kind)}</b><small>${e(s.app)} · ${Math.round(s.bounds.width)} × ${Math.round(s.bounds.height)}</small></div><details open><summary>Identity & content</summary><label class="ide-property vertical"><span>Element selector</span><code>${e(s.selector)}</code></label><label class="ide-property vertical"><span>Text</span><textarea data-property="text" aria-label="Selected element text">${e(s.text)}</textarea></label><label class="ide-property"><span>Action</span><input data-property="action" value="${e(s.action || '')}" aria-label="Action connection" ${s.viewId ? '' : 'disabled'}></label><label class="ide-property"><span>Binding</span><input data-property="binding" value="${e(s.binding || '')}" aria-label="State binding" ${s.viewId ? '' : 'disabled'}></label></details><details open><summary>Size & layout</summary>${field('width', 'Width')}${field('height', 'Height')}${field('minHeight', 'Minimum height')}${field('display', 'Display')}${field('flexDirection', 'Direction')}${field('gap', 'Gap')}${field('padding', 'Padding')}${field('margin', 'Margin')}${field('alignItems', 'Alignment')}${field('justifyContent', 'Distribution')}${field('translate', 'Offset')}</details><details open><summary>Appearance</summary>${field('background', 'Background')}${field('color', 'Foreground')}${field('fontSize', 'Font size')}${field('fontWeight', 'Font weight')}${field('borderRadius', 'Corner radius')}${field('border', 'Border')}${field('opacity', 'Opacity')}</details><div class="ide-property-actions">${button('layout-source', 'Open layout source')}${button('delete-element', 'Hide view')}${button('clear-layout', 'Reset app layout')}</div>`;
        }
        addComponent(type) {
            if (!this.selection) {
                const first = this.outline.find(n => n.app === this.project.app && n.selector === ':root');
                if (!first) {
                    this.log('error', 'Run an app and select an insertion container first.');
                    return;
                }
                this.selection = { ...first };
            }
            let { app, selector } = this.selection;
            const path = 'views/' + app + '.view.json';
            if (this.project.files[path]) {
                const tree = JSON.parse(this.project.files[path]);
                const id = this.selection.viewId || selector.match(/data-view-id="([\w.-]+)"/)?.[1];
                let found = V.findView(tree, id);
                if (found && !['VStack', 'HStack', 'ZStack', 'ScrollView', 'List', 'NavigationSplitView'].includes(found.node.type))
                    found = found.parent ? { node: found.parent } : null;
                selector = '[data-view-id="' + (found?.node.id || tree.id) + '"]';
            }
            const component = V.component(type);
            this.patch(app, selector, { append: component });
            this.log('design', 'Inserted ' + type + ' · ' + component.id);
            return component;
        }
        viewOperation(operation) {
            const s = this.selection;
            if (!s)
                return;
            const id = s.viewId || s.selector.match(/data-view-id="([\w.-]+)"/)?.[1];
            const tree = V.changeView(this.project, s.app, tree => {
                const found = V.findView(tree, id);
                if (!found?.parent)
                    throw Error('Select a child in a declarative view document to ' + operation);
                const list = found.parent.children, index = list.indexOf(found.node);
                if (operation === 'delete')
                    list.splice(index, 1);
                if (operation === 'up' && index > 0)
                    list.splice(index - 1, 0, list.splice(index, 1)[0]);
                if (operation === 'down' && index < list.length - 1)
                    list.splice(index + 1, 0, list.splice(index, 1)[0]);
                if (operation === 'duplicate') {
                    const copy = structuredClone(found.node), suffix = '-' + D.uid().slice(0, 8);
                    function rename(n) { n.id = n.id.slice(0, 80) + suffix; (n.children || []).forEach(rename); }
                    rename(copy);
                    list.splice(index + 1, 0, copy);
                }
            });
            if (!tree)
                return false;
            this.send('view-document', { app: s.app, tree });
            this.saveSoon();
            if (this.project.active === 'views/' + s.app + '.view.json')
                this.updateEditor();
            return true;
        }
        log(level, ...values) {
            this.logs.push({ time: new Date().toLocaleTimeString(), level, text: values.map(v => typeof v === 'string' ? v : JSON.stringify(v, null, 2)).join(' ') });
            if (this.logs.length > 400)
                this.logs.splice(0, this.logs.length - 400);
            if (this.root && this.consoleTab === 'console')
                this.updateDebug();
        }
        updateDebug() {
            if (!this.root)
                return;
            this.$('#ide-debug-state').textContent = 'Action debugger · ' + this.debugState;
            const out = this.$('#ide-debug-output');
            this.root.querySelectorAll('[data-dev^="console-"]').forEach(b => b.classList.toggle('active', b.dataset.dev === 'console-' + this.consoleTab));
            if (this.consoleTab === 'console') {
                out.innerHTML = this.logs.map(l => `<div class="ide-log ${l.level}"><time>${l.time}</time><b>${l.level}</b><pre>${e(l.text)}</pre></div>`).join('');
                out.scrollTop = out.scrollHeight;
            }
            if (this.consoleTab === 'state') {
                const app = this.paused?.app || this.project.app, state = this.paused?.state || this.snapshot?.apps?.[app];
                out.innerHTML = `<div class="ide-variables"><div><b>${e(app)} · model</b><pre>${e(JSON.stringify(state || {}, null, 2))}</pre></div><div><b>Checkpoint locals</b><pre>${e(JSON.stringify(this.paused?.locals || {}, null, 2))}</pre>${button('edit-state', 'Edit model JSON')}</div></div>`;
            }
            if (this.consoleTab === 'stack')
                out.innerHTML = (this.paused?.frames || []).map((f, i) => `<div class="ide-log"><b>${i}</b><pre>${e(f.app)} › ${e(f.action)}　${e(f.path)}:${f.line}</pre></div>`).join('') || '<p class="ide-empty">The command stack is available while paused.</p>';
            if (this.consoleTab === 'watch')
                out.innerHTML = this.watch.map((w, i) => `<div class="ide-log"><b>${i}</b><pre>${e(w)}</pre>${button('watch-' + i, 'Evaluate')}</div>`).join('') || '<p class="ide-empty">Enter an expression below and select + Watch.</p>';
        }
        evaluate(expression, watch = false) {
            if (!expression.trim())
                return Promise.resolve(null);
            if (!this.frame) {
                this.log('error', 'Run the app before evaluating expressions.');
                return Promise.resolve(null);
            }
            const request = ++this.request;
            if (!watch)
                this.log('input', expression);
            this.send('evaluate', { expression, request });
            return new Promise(resolve => {
                this.awaiters.set(request, resolve);
                setTimeout(() => {
                    if (this.awaiters.delete(request))
                        resolve({ error: 'Evaluation timed out' });
                }, 5000);
            });
        }
        toggleBreak(app, action, line = 1) {
            const index = this.project.breaks.findIndex(b => b.app === app && b.action === action);
            if (index >= 0)
                this.project.breaks.splice(index, 1);
            else
                this.project.breaks.push({ app, action, line });
            this.send('breaks', { breaks: this.project.breaks });
            this.highlight();
            this.renderNavigator();
            this.saveSoon();
        }
        breakAt(line) {
            const app = this.project.active.match(/^src\/apps\/(.+)\.js$/)?.[1];
            const actions = V.analyze(this.project.files[this.project.active], this.project.active).actions.filter(a => a.line === line);
            if (!app || !actions.length) {
                this.log('info', 'Gutter breakpoints attach to ctx.act command registrations. Use the Breakpoints navigator for runtime commands or await ctx.debug.checkpoint for locals.');
                return;
            }
            this.toggleBreak(app, actions[0].action, line);
        }
        saveSoon() {
            clearTimeout(this.autoSave);
            this.autoSave = setTimeout(() => {
                const ok = this.project.save();
                if (this.root)
                    this.$('#ide-storage-status').textContent = ok ? 'Workspace saved locally' : 'Storage unavailable — export workspace';
                this.updateTabs();
            }, 650);
        }
        findNext() {
            const input = this.$('#ide-find').value, c = this.$('#ide-code');
            if (!input)
                return;
            let at = c.value.indexOf(input, c.selectionEnd);
            if (at < 0)
                at = c.value.indexOf(input);
            if (at < 0) {
                this.log('info', 'No matches');
                return;
            }
            c.focus();
            c.setSelectionRange(at, at + input.length);
            c.scrollTop = Math.max(0, (c.value.slice(0, at).split('\n').length - 5) * 20);
            this.caret();
        }
        async action(action, buttonEl) {
            if (action.startsWith('nav-')) {
                this.nav = action.slice(4);
                this.renderNavigator();
                return;
            }
            if (action.startsWith('tab-')) {
                this.setTab(action.slice(4));
                return;
            }
            if (action.startsWith('inspector-')) {
                this.inspector = action.slice(10);
                this.renderInspector();
                return;
            }
            if (action.startsWith('console-')) {
                this.consoleTab = action.slice(8);
                this.updateDebug();
                return;
            }
            if (/^watch-\d+$/.test(action))
                return this.evaluate(this.watch[+action.slice(6)]);
            switch (action) {
                case 'run':
                case 'rebuild': return this.run();
                case 'stop': return this.stop();
                case 'simulator': return this.exit();
                case 'build': {
                    const result = this.compiler.validate(this.project);
                    this.errors = result.errors;
                    this.nav = 'issues';
                    this.renderNavigator();
                    this.status(this.errors.length ? 'Build failed' : 'Build succeeded', this.errors.length ? 'error' : 'success');
                    this.log('build', this.errors.length + ' source issues');
                    break;
                }
                case 'new':
                    D.dialog('New DuoKit application', `<div class="ide-new-form"><div class="ide-app-emblem">⌘</div><h2>Make something new.</h2><p>Every template is editable source, a two-way view document, and a working app.</p><label>Product name<input id="new-app-name" value="My Duo App"></label><label>Template<select id="new-app-kind"><option value="counter">Interactive counter + debugger</option><option value="notes">Document & notes editor</option><option value="dashboard">Calculation dashboard</option><option value="game">Number puzzle game</option></select></label><button id="create-app">Create application</button></div>`, body => { body.querySelector('#create-app').onclick = () => { const name = body.querySelector('#new-app-name').value.trim().slice(0, 70) || 'My App'; this.project.addApp(name, body.querySelector('#new-app-kind').value); this.renderSchemes(); this.renderNavigator(); this.saveSoon(); D.$('#system-dialog').close(); this.run(); }; });
                    break;
                case 'new-file':
                    D.dialog('Add source file', '<label class="ide-new-form">Relative path<input id="new-file-name" value="views/shared.json"><button id="new-file-create">Add file</button></label>', body => {
                        body.querySelector('button').onclick = () => {
                            const path = body.querySelector('input').value;
                            try {
                                if (this.project.files[path] !== undefined)
                                    throw Error('File already exists');
                                this.project.set(path, path.endsWith('.json') ? '{}\n' : '/* Shared source */\n');
                                this.project.select(path);
                                D.$('#system-dialog').close();
                                this.saveSoon();
                            }
                            catch (error) {
                                this.log('error', error.message);
                            }
                        };
                    });
                    break;
                case 'save': {
                    const ok = this.project.save();
                    this.$('#ide-storage-status').textContent = ok ? 'Workspace saved locally' : 'Storage unavailable — export workspace';
                    this.updateTabs();
                    break;
                }
                case 'undo':
                    this.project.undo();
                    this.updateEditor();
                    this.saveSoon();
                    break;
                case 'redo':
                    this.project.redo();
                    this.updateEditor();
                    this.saveSoon();
                    break;
                case 'reset-file':
                    this.project.resetFile(this.project.active);
                    this.updateEditor();
                    this.saveSoon();
                    break;
                case 'select':
                case 'interact':
                    this.designMode = action === 'select';
                    this.send('design', { enabled: this.designMode });
                    this.$('[data-dev=select]').classList.toggle('active', this.designMode);
                    this.$('[data-dev=interact]').classList.toggle('active', !this.designMode);
                    break;
                case 'preview-home':
                    this.send('home');
                    break;
                case 'preview-dark':
                    this.darkPreview = !this.darkPreview;
                    this.send('theme', { dark: this.darkPreview });
                    break;
                case 'native-break':
                case 'pause':
                case 'resume':
                case 'step':
                    this.send(action);
                    break;
                case 'clear-console':
                    this.logs = [];
                    this.updateDebug();
                    break;
                case 'watch-add': {
                    const input = this.$('#ide-evaluate input'), value = input.value.trim();
                    if (value && !this.watch.includes(value)) {
                        this.watch.push(value);
                        this.evaluate(value, true);
                        input.value = '';
                    }
                    this.consoleTab = 'watch';
                    this.updateDebug();
                    break;
                }
                case 'toggle-console':
                    this.root.classList.toggle('ide-console-hidden');
                    break;
                case 'toggle-nav':
                    this.root.classList.toggle('ide-nav-hidden');
                    break;
                case 'toggle-inspector':
                    this.root.classList.toggle('ide-inspector-hidden');
                    break;
                case 'find-open':
                    this.$('.ide-find').hidden = false;
                    this.$('#ide-find').focus();
                    break;
                case 'find-close':
                    this.$('.ide-find').hidden = true;
                    break;
                case 'find-next':
                    this.findNext();
                    break;
                case 'replace': {
                    const c = this.$('#ide-code');
                    if (c.value.slice(c.selectionStart, c.selectionEnd) === this.$('#ide-find').value)
                        c.setRangeText(this.$('#ide-replace').value, c.selectionStart, c.selectionEnd, 'end');
                    c.dispatchEvent(new Event('input'));
                    this.findNext();
                    break;
                }
                case 'replace-all': {
                    const find = this.$('#ide-find').value;
                    if (find) {
                        this.project.set(this.project.active, this.project.files[this.project.active].split(find).join(this.$('#ide-replace').value));
                        this.updateEditor();
                        this.saveSoon();
                    }
                    break;
                }
                case 'add-component':
                    this.inspector = 'library';
                    this.renderInspector();
                    break;
                case 'layout-source':
                    if (this.selection) {
                        const nativePath = 'views/' + this.selection.app + '.view.json';
                        const path = this.project.files[nativePath] ? nativePath : 'views/' + this.selection.app + '.layout.json';
                        if (!this.project.files[path])
                            this.project.setLayout(this.selection.app, { version: 1, patches: [] });
                        this.project.select(path);
                        this.setTab('split');
                    }
                    break;
                case 'move-up': return this.viewOperation('up');
                case 'move-down': return this.viewOperation('down');
                case 'delete-element':
                    if (this.selection && this.project.files['views/' + this.selection.app + '.view.json'])
                        return this.viewOperation('delete');
                    if (this.selection)
                        this.patch(this.selection.app, this.selection.selector, { hidden: true });
                    break;
                case 'duplicate-element':
                    if (this.selection && this.project.files['views/' + this.selection.app + '.view.json'])
                        return this.viewOperation('duplicate');
                    if (this.selection)
                        this.patch(this.selection.app, this.selection.selector === ':root' ? ':root' : this.selection.selector.split(' > ').slice(0, -1).join(' > ') || ':root', { append: { type: 'Text', id: 'copy-' + D.uid().slice(0, 8), props: { text: this.selection.text || 'Copy', style: this.selection.style }, children: [] } });
                    break;
                case 'clear-layout':
                    this.project.setLayout(this.project.app, { version: 1, patches: [] });
                    this.saveSoon();
                    this.run();
                    break;
                case 'edit-state': {
                    const app = this.paused?.app || this.project.app;
                    D.dialog('Edit runtime model', `<textarea class="ide-model-editor" aria-label="Runtime model JSON">${e(JSON.stringify(this.snapshot?.apps[app] || {}, null, 2))}</textarea><button id="apply-model">Validate and apply</button>`, body => { body.querySelector('button').onclick = () => { this.send('state-edit', { app, json: body.querySelector('textarea').value }); D.$('#system-dialog').close(); }; });
                    break;
                }
                case 'export-menu':
                    D.dialog('Export developer workspace', `<div class="ide-export-options"><button data-export="html">Standalone runnable HTML<small>Edited app + runtime + bundled media. No IDE or CDN needed.</small></button><button data-export="json">Editable workspace JSON<small>All source files, custom apps, views and breakpoints.</small></button><button data-export="zip">Source project ZIP<small>Readable source tree plus ready-to-open index.html.</small></button></div>`, body => {
                        body.onclick = ev => {
                            const b = ev.target.closest('[data-export]');
                            if (b) {
                                this.export(b.dataset.export);
                                D.$('#system-dialog').close();
                            }
                        };
                    });
                    break;
                case 'import':
                    D.Studio.pickFile('.json,.zip', async (file) => {
                        let text;
                        if (file.name.endsWith('.zip')) {
                            const archive = await D.Studio.ZIP.read(new Uint8Array(await file.arrayBuffer()));
                            text = new TextDecoder().decode(archive['workspace.json']);
                        }
                        else
                            text = await file.text();
                        this.project.restore(JSON.parse(text));
                        this.renderSchemes();
                        this.updateEditor();
                        this.renderNavigator();
                        this.saveSoon();
                        this.run();
                    }, 48e6);
                    break;
                case 'fullscreen':
                    if (!document.fullscreenElement)
                        document.documentElement.requestFullscreen?.();
                    else
                        document.exitFullscreen?.();
                    break;
                case 'edit-menu':
                    D.dialog('Edit workspace', `<div class="ide-export-options"><button id="edit-undo">Undo source change</button><button id="edit-redo">Redo source change</button></div>`, body => { body.querySelector('#edit-undo').onclick = () => { this.action('undo'); D.$('#system-dialog').close(); }; body.querySelector('#edit-redo').onclick = () => { this.action('redo'); D.$('#system-dialog').close(); }; });
                    break;
                case 'view-menu':
                    this.inspector = 'hierarchy';
                    this.renderInspector();
                    this.setTab('design');
                    break;
                case 'debug-menu':
                    this.nav = 'breaks';
                    this.renderNavigator();
                    this.root.classList.remove('ide-console-hidden');
                    break;
                case 'help':
                    D.dialog('Duo Developer Studio', `<h3>Source → build → live canvas → source</h3><p>Edit every bundled app, runtime module, shader string, stylesheet and DuoKit interface. Run builds an isolated local simulator. Select mode inspects live elements; layout edits are saved in views/*.layout.json, not ephemeral DOM changes.</p><h3>Debugging</h3><p>Breakpoints pause at SDK command boundaries. Continue runs the selected command; Step pauses after it. Use <code>await ctx.debug.checkpoint('label', () => ({localValue}))</code> inside async actions for explicit checkpoints and local-variable inspection. Watch expressions execute only in the preview.</p><p>This is an original JavaScript IDE inspired by Xcode, not Apple's Xcode, Swift compiler, LLDB, or native iOS SDK. Arbitrary synchronous JavaScript cannot be single-stepped by this in-page cooperative debugger. Browser DevTools remains available for native JavaScript debugging.</p>`);
                    break;
            }
        }
        export(kind) {
            if (kind === 'json') {
                D.download('duokit-workspace.json', JSON.stringify(this.project.snapshot(), null, 2), 'application/json');
                return;
            }
            const build = this.compiler.build(this.project, { bridge: false, session: this.previewSession() });
            if (kind === 'html')
                D.download(this.project.app + '.html', build.html, 'text/html');
            else {
                const entries = { ...this.project.files, 'index.html': build.html, 'workspace.json': JSON.stringify(this.project.snapshot(), null, 2), 'README.md': '# DuoKit application workspace\nOpen index.html to run offline. Import workspace.json into Duo Developer Studio to keep editing.\n' };
                D.download('duokit-app-source.zip', D.Studio.ZIP.create(entries), 'application/zip');
            }
        }
    }
    V.IDE = IDE;
    D.ide = new IDE(window.DuoSources);
    const launch = document.querySelector('[data-open-ide]');
    if (launch)
        launch.title = 'Open full developer workspace';
})(window.Duo, window.Duo.Dev);
