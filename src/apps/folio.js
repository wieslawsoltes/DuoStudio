(function (D) {
    'use strict';
    const S = D.Studio;
    D.SDK.register({ id: 'folio', name: 'Folio', rank: 16, category: 'Create', pattern: 'Document + outline', description: 'Write and format real documents with selection-aware editing, outlines, find/replace, tables and DOCX/HTML/Markdown interchange.', boundary: 'DOCX interchange covers text, headings and basic inline formatting. It does not promise lossless Word layout, tracked changes, embedded objects or pagination.' }, D.SDK.UIViewRepresentable(ctx => {
        const doc = ctx.document({ title: 'A manifesto for making', html: '<h1>Make room<br>for possibility.</h1><p><strong>DUO STUDIO / FIELD NOTES 01</strong></p><p>The most interesting ideas rarely fit inside a single window. They begin at the edge of a sketch, in the silence between two notes, or in a sentence that asks a better question.</p><h2>A studio that unfolds with you</h2><p>Keep the thing you are making beside the things that help you make it. A drawing and its dimensions. A melody and its rhythm. A story and its structure.</p><blockquote>Less switching. More connecting.</blockquote><h2>Three things to remember</h2><ul><li>Make the work tangible.</li><li>Keep your context close.</li><li>Leave a little space for surprise.</li></ul><p>Your next chapter starts here.</p>' }), m = doc.state;
        let editor, mounted = false, range = null, lastEdit = 0;
        function save() { m().html = S.sanitize(editor.innerHTML); ctx.save(); outline(); }
        function remember() { const s = getSelection(); if (s?.rangeCount && editor?.contains(s.anchorNode))
            range = s.getRangeAt(0).cloneRange(); }
        function restoreRange() { editor.focus(); const selection = getSelection(); selection.removeAllRanges(); if (range && editor.contains(range.commonAncestorContainer))
            selection.addRange(range);
        else {
            const r = document.createRange();
            r.selectNodeContents(editor);
            r.collapse(false);
            selection.addRange(r);
            range = r;
        } return selection.getRangeAt(0); }
        function transaction(fn) { D.store.checkpoint(ctx.id); fn(); save(); lastEdit = 0; }
        function wrap(tag) { transaction(() => { const r = restoreRange(), node = document.createElement(tag); if (r.collapsed)
            node.textContent = '\u200b';
        else
            node.append(r.extractContents()); r.insertNode(node); r.selectNodeContents(node); getSelection().removeAllRanges(); getSelection().addRange(r); range = r.cloneRange(); }); }
        function insert(html) { transaction(() => { const r = restoreRange(); r.deleteContents(); const fragment = r.createContextualFragment(S.sanitize(html)), last = fragment.lastChild; r.insertNode(fragment); if (last) {
            r.setStartAfter(last);
            r.collapse(true);
        } getSelection().removeAllRanges(); getSelection().addRange(r); range = r.cloneRange(); }); }
        function block(tag) { transaction(() => { const r = restoreRange(); let node = r.startContainer.nodeType === 1 ? r.startContainer : r.startContainer.parentElement; node = node.closest('p,h1,h2,h3,blockquote,li'); if (node && editor.contains(node)) {
            const replacement = document.createElement(tag);
            replacement.innerHTML = node.innerHTML;
            node.replaceWith(replacement);
            r.selectNodeContents(replacement);
        }
        else {
            const replacement = document.createElement(tag);
            replacement.append(r.extractContents());
            r.insertNode(replacement);
            r.selectNodeContents(replacement);
        } getSelection().removeAllRanges(); getSelection().addRange(r); range = r.cloneRange(); }); }
        function markdown() { const root = new DOMParser().parseFromString(S.sanitize(m().html), 'text/html'); return [...root.body.children].map(node => { const prefix = /^H[1-4]$/.test(node.tagName) ? '#'.repeat(+node.tagName[1]) + ' ' : node.tagName === 'BLOCKQUOTE' ? '> ' : ''; if (['UL', 'OL'].includes(node.tagName))
            return [...node.children].map((li, i) => (node.tagName === 'OL' ? (i + 1) + '. ' : '- ') + li.textContent).join('\n'); return prefix + node.textContent; }).join('\n\n'); }
        function render() { if (!mounted) {
            ctx.root.innerHTML = doc.header('Writing, with room to think', S.button('export-docx', 'DOCX ↓')) + D.paneTabs('Document', 'Outline & tools') + `<div class="duo-panes pro-panes"><div class="pane primary-pane folio-main"><div class="pro-toolbar folio-toolbar">${[['bold', 'Bold'], ['italic', 'Italic'], ['underline', 'Underline'], ['h1', 'Title'], ['h2', 'Heading'], ['p', 'Body'], ['list', 'List'], ['quote', 'Quote']].map(([id, label]) => S.button(id, label)).join('')}</div><div class="document-scroll"><article class="folio-page" contenteditable="true" role="textbox" aria-multiline="true" aria-label="Document editor" spellcheck="true"></article></div><div class="pro-status folio-status"></div></div><div class="pane secondary-pane pro-inspector"></div></div>`;
            editor = D.$('.folio-page', ctx.root);
            mounted = true;
            ctx.scope.on(document, 'selectionchange', remember);
            ctx.scope.on(editor, 'beforeinput', () => { if (Date.now() - lastEdit > 800) {
                D.store.checkpoint(ctx.id);
                lastEdit = Date.now();
            } });
            ctx.scope.on(editor, 'input', save);
            ctx.scope.on(editor, 'paste', e => { e.preventDefault(); const html = e.clipboardData.getData('text/html'), text = e.clipboardData.getData('text/plain'); insert(html || '<p>' + D.escape(text).replaceAll('\n', '<br>') + '</p>'); });
            ctx.scope.on(editor, 'drop', e => e.preventDefault());
            ctx.scope.on(D.$('.folio-toolbar', ctx.root), 'pointerdown', e => { if (e.target.closest('button'))
                e.preventDefault(); });
            ctx.scope.on(editor, 'keydown', e => { if (e.ctrlKey || e.metaKey) {
                if (e.key.toLowerCase() === 'z') {
                    e.preventDefault();
                    e.stopPropagation();
                    e.shiftKey ? D.store.redo(ctx.id) : D.store.undo(ctx.id);
                }
                const tag = { b: 'strong', i: 'em', u: 'u' }[e.key.toLowerCase()];
                if (tag) {
                    e.preventDefault();
                    wrap(tag);
                }
            } });
        } if (editor.innerHTML !== m().html) {
            editor.innerHTML = S.sanitize(m().html);
            range = null;
        } outline(); ctx.pane(ctx.root.dataset.activePane || 'primary'); }
        function outline() { const words = (editor.innerText || editor.textContent).trim().split(/\s+/).filter(Boolean).length, characters = (editor.textContent || '').length; D.$('.folio-status', ctx.root).textContent = `${words} words · ${characters} characters · ${Math.max(1, Math.ceil(words / 220))} min read · autosaved locally`; const old = D.$('.pro-inspector', ctx.root), query = D.$('[name=find]', old)?.value || '', replacement = D.$('[name=replace]', old)?.value || ''; old.innerHTML = S.section('DOCUMENT', S.field('title', 'Title', m().title, 'text')) + S.section('OUTLINE', `<div class="document-outline">${D.$$('h1,h2,h3', editor).map((h, i) => `<button data-action="goto-heading" data-heading="${i}" class="outline-${h.tagName.toLowerCase()}">${D.escape(h.textContent)}</button>`).join('') || S.help('Add a heading to create an outline.')}</div>`) + S.section('FIND / REPLACE', `<input class="field" name="find" aria-label="Find in document" placeholder="Find text" value="${D.escape(query)}"><input class="field" name="replace" aria-label="Replacement text" placeholder="Replace with" value="${D.escape(replacement)}"><div class="pro-row">${S.button('find', 'Find next')}${S.button('replace-all', 'Replace all')}</div>`) + S.section('INSERT', `<div class="pro-row">${S.button('table', '3 × 3 table')}${S.button('divider', 'Divider')}${S.button('date', 'Date')}</div>`) + S.section('FILES', `<div class="pro-row">${S.button('import-document', 'Import document')}${S.button('export-docx', 'DOCX ↓')}</div><div class="pro-row">${S.button('export-html', 'HTML ↓')}${S.button('export-md', 'Markdown ↓')}${S.button('share-text', 'Share text')}</div>`) + S.help('Rich text stays local. DOCX imports are sanitized and retain text, headings, bold, italic and underline. Complex Word features are flattened.'); }
        let lastFind = '', findIndex = -1;
        function find() { const query = D.$('[name=find]', ctx.root).value; if (!query)
            return; if (query !== lastFind) {
            lastFind = query;
            findIndex = -1;
        } const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT), matches = []; let node; while ((node = walker.nextNode())) {
            let at = 0;
            while ((at = node.textContent.toLowerCase().indexOf(query.toLowerCase(), at)) >= 0) {
                matches.push({ node, at });
                at += query.length;
            }
        } if (!matches.length) {
            D.toast('No matching text');
            return;
        } findIndex = (findIndex + 1) % matches.length; const item = matches[findIndex], r = document.createRange(); r.setStart(item.node, item.at); r.setEnd(item.node, item.at + query.length); getSelection().removeAllRanges(); getSelection().addRange(r); range = r; item.node.parentElement.scrollIntoView({ block: 'center' }); }
        ctx.act('bold', () => wrap('strong'));
        ctx.act('italic', () => wrap('em'));
        ctx.act('underline', () => wrap('u'));
        for (const tag of ['h1', 'h2', 'p'])
            ctx.act(tag, () => block(tag));
        ctx.act('quote', () => block('blockquote'));
        ctx.act('list', () => { const text = range?.toString() || 'A new idea'; insert('<ul>' + text.split('\n').map(t => '<li>' + D.escape(t) + '</li>').join('') + '</ul>'); });
        ctx.act('table', () => insert('<table><tbody>' + Array.from({ length: 3 }, (_, r) => '<tr>' + Array.from({ length: 3 }, (_, c) => '<' + (r ? 'td' : 'th') + '>' + (r ? 'Content' : 'Column ' + (c + 1)) + '</' + (r ? 'td' : 'th') + '>').join('') + '</tr>').join('') + '</tbody></table><p><br></p>'));
        ctx.act('divider', () => insert('<hr><p><br></p>'));
        ctx.act('date', () => insert('<p>' + new Date().toLocaleDateString(undefined, { dateStyle: 'long' }) + '</p>'));
        ctx.act('goto-heading', b => { ctx.pane('primary'); D.$$('h1,h2,h3', editor)[+b.dataset.heading]?.scrollIntoView({ block: 'start', behavior: 'smooth' }); });
        ctx.act('find', find);
        ctx.act('replace-all', () => { const query = D.$('[name=find]', ctx.root).value, replacement = D.$('[name=replace]', ctx.root).value; if (!query)
            return; transaction(() => { const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT); let node, count = 0; while ((node = walker.nextNode())) {
            count += node.textContent.split(query).length - 1;
            node.textContent = node.textContent.split(query).join(replacement);
        } D.toast('Replaced ' + count + ' occurrences'); }); });
        ctx.act('export-docx', () => D.download(m().title + '.docx', S.Office.docx(m()), 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'));
        ctx.act('export-html', () => D.download(m().title + '.html', '<!doctype html><meta charset="utf-8"><title>' + D.escape(m().title) + '</title><style>body{font:17px/1.7 system-ui;max-width:800px;margin:60px auto;padding:24px;color:#24324a}h1{font-size:48px;line-height:1.15}blockquote{border-left:4px solid #aaa4da;padding-left:24px}table{border-collapse:collapse}td,th{border:1px solid #b8bcc6;padding:12px}</style>' + S.sanitize(m().html), 'text/html'));
        ctx.act('export-md', () => D.download(m().title + '.md', markdown(), 'text/markdown'));
        ctx.act('share-text', () => ctx.share(markdown(), m().title));
        ctx.act('import-document', () => S.pickFile('.docx,.html,.htm,.txt,.md', async (f) => { let html; if (/\.docx$/i.test(f.name))
            html = await S.Office.readDocx(await f.arrayBuffer());
        else {
            const text = await f.text();
            html = /\.html?$/i.test(f.name) ? S.sanitize(text) : text.split(/\r?\n/).map(line => { const match = /^(#{1,3}) (.*)/.exec(line); return match ? `<h${match[1].length}>${D.escape(match[2])}</h${match[1].length}>` : '<p>' + D.escape(line || ' ') + '</p>'; }).join('');
        } doc.change(s => { s.title = f.name.replace(/\.[^.]+$/, ''); s.html = html; }); render(); }));
        ctx.scope.on(ctx.root, 'change', e => { if (e.target.dataset.field === 'title')
            doc.change(s => s.title = e.target.value.slice(0, 100)); });
        function receive(a) { try {
            const value = S.parseJSON(a.text);
            if (value.app === 'folio') {
                doc.load(value);
                return;
            }
        }
        catch { } doc.change(s => { s.html += '<h2>' + D.escape(a.title || 'Shared reference') + '</h2><p>' + D.escape(a.text || '').replaceAll('\n', '<br>') + '</p>'; }); render(); ctx.pane('primary'); }
        render();
        return { render, receive, markdown };
    }));
})(window.Duo);
