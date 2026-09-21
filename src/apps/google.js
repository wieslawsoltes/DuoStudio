(function (D) {
    'use strict';
    D.SDK.register({ id: 'google', name: 'Google', rank: 3, pattern: 'Search + source preview', description: 'Keep your search results on one side and read the source on the other. Save, compare, and pass references into your working apps.', tip: 'Search “design”, “coast”, or “WebGPU”. Preview an article, save it, then use Send to hand the reference to ChatGPT or Gmail.', boundary: 'Search indexes an original offline collection using weighted token matching. It is not Google Search, does not access the web, and does not contain live results.' }, D.SDK.UIViewRepresentable(ctx => {
        const { root, scope } = ctx;
        const m = () => ctx.get({ query: '', draft: '', selected: 'travel', tab: 'all', saved: [], compare: null });
        const chosen = () => D.documents.find(d => d.id === m().selected) || D.documents[0];
        function article(doc, compact = false) { return `<article><img class="reader-photo" src="${D.assets[doc.image + '.jpg']}" alt="Original ${D.escape(doc.image)} illustration"><div class="reader-article"><span class="eyebrow">${D.escape(doc.site)} · ORIGINAL DEMO ESSAY</span><h1${compact ? ' style="font-size:23px"' : ''}>${D.escape(doc.title)}</h1><p class="reader-deck">${D.escape(doc.summary)}</p><div class="reader-body">${doc.body.map(p => `<p>${D.escape(p)}</p>`).join('')}</div></div></article>`; }
        function render() { const s = m(), doc = chosen(); const docs = D.engine.rank(s.query).filter(d => s.tab !== 'saved' || s.saved.includes(d.id)); root.innerHTML = D.appHeader('google', 'Offline search collection', D.ib('reset-search', 'refresh', 'Reset search')) + D.paneTabs('Search results', 'Source preview') + `<div class="duo-panes"><div class="pane primary-pane"><form class="google-search-form" id="google-search"><div class="google-wordmark" aria-label="Google"><span>G</span><span>o</span><span>o</span><span>g</span><span>l</span><span>e</span></div><div class="search-box">${D.icon('search')}<input name="query" placeholder="Find a little inspiration…" value="${D.escape(s.draft)}" aria-label="Search the offline collection"><button class="icon-btn" type="submit" aria-label="Search local collection" style="width:24px;height:24px">${D.icon('arrow', 16)}</button></div></form><div class="chip-row">${[['all', 'All'], ['images', 'Images'], ['saved', 'Saved']].map(([id, label]) => `<button data-action="tab" data-tab="${id}" class="chip ${s.tab === id ? 'active' : ''}">${label}</button>`).join('')}</div><div class="result-count">${docs.length} original demo ${s.tab === 'images' ? 'images' : 'essays'} ${s.query ? 'for “' + D.escape(s.query) + '”' : '· made for curious minds'}</div><div class="scroll">${s.tab === 'images' ? `<div class="image-results">${docs.map(d => `<button class="image-result" data-action="open-result" data-id="${d.id}">${D.image(d.image, d.title)}<p>${D.escape(d.title)}</p></button>`).join('')}</div>` : docs.map(d => `<button class="search-result ${d.id === s.selected ? 'active' : ''}" data-action="open-result" data-id="${d.id}"><div class="result-domain"><span class="result-favicon">${D.escape(d.site[0])}</span><span>${D.escape(d.site)}<br><small style="font-size:8px">Offline collection / ${D.escape(d.category.toLowerCase())}</small></span>${s.saved.includes(d.id) ? D.icon('bookmark', 13) : ''}</div><h3>${D.escape(d.title)}</h3><p>${D.escape(d.summary)}</p></button>`).join('')}${!docs.length ? D.empty('search', 'Not in this collection yet', 'Try “design”, “coast”, “weekend”, “architecture”, or “WebGPU”. This search works offline.') : ''}</div><div class="sample-footer">Local search · no internet request · ${D.documents.length} original essays</div></div><div class="pane secondary-pane"><div class="pane-toolbar"><div class="grow"><h3>${s.compare ? 'Compare your references' : 'A closer look'}</h3><small>Keep the source in view</small></div><div class="row" style="gap:2px">${D.ib('save-result', 'bookmark', s.saved.includes(doc.id) ? 'Unsave article' : 'Save article')}${D.ib('compare', 'split', s.compare ? 'Close comparison' : 'Compare with next result')}${D.ib('share-result', 'send', 'Send article to another app')}</div></div><div class="scroll">${s.compare ? `<div style="display:grid;grid-template-columns:1fr 1fr;gap:1px;background:var(--border)"><div style="background:var(--app-bg)">${article(doc, true)}</div><div style="background:var(--app-bg)">${article(D.documents.find(d => d.id === s.compare) || D.documents[1], true)}</div></div>` : article(doc)}</div><div class="pane-toolbar"><span class="tiny muted" style="font-size:9px">${s.saved.includes(doc.id) ? 'Saved to your reading collection' : 'An original sample essay, not a web result'}</span>${D.btn('share-result', 'send', 'Send to…', 'small ghost')}</div></div></div>`; ctx.pane(root.dataset.activePane || 'primary'); }
        ctx.act('open-result', b => { m().selected = b.dataset.id; m().compare = null; ctx.save(); render(); ctx.pane('secondary'); });
        ctx.act('tab', b => { m().tab = b.dataset.tab; ctx.save(); render(); });
        ctx.act('save-result', () => { const s = m(), id = chosen().id; s.saved = s.saved.includes(id) ? s.saved.filter(x => x !== id) : [...s.saved, id]; ctx.save(); render(); });
        ctx.act('share-result', () => { const d = chosen(); ctx.share(`${d.title}\n${d.site} · Original offline essay\n\n${d.body.join('\n\n')}`, d.title); });
        ctx.act('compare', () => { const s = m(); if (s.compare)
            s.compare = null;
        else {
            const all = D.engine.rank(s.query);
            const i = all.findIndex(d => d.id === s.selected);
            s.compare = (all[(i + 1) % all.length] || D.documents[1]).id;
            if (s.compare === s.selected)
                s.compare = D.documents.find(d => d.id !== s.selected).id;
        } ctx.save(); render(); });
        ctx.act('reset-search', () => { Object.assign(m(), { query: '', draft: '', tab: 'all', compare: null }); ctx.save(); render(); ctx.pane('primary'); });
        scope.on(root, 'input', e => { if (e.target.name === 'query') {
            m().draft = e.target.value;
            ctx.save();
        } });
        scope.on(root, 'submit', e => { if (e.target.id === 'google-search') {
            e.preventDefault();
            m().query = m().draft.trim();
            m().compare = null;
            const results = D.engine.rank(m().query);
            if (results.length)
                m().selected = results[0].id;
            ctx.save();
            render();
        } });
        render();
        return { render };
    }));
})(window.Duo);
