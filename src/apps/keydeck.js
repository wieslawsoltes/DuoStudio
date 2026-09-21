/* Authored SVG slides, keyboard presenter and editable Office text-slide interchange. */
(function (D) {
    'use strict';
    const S = D.Studio, E = D.escape;
    D.SDK.register({ id: 'keydeck', name: 'Keydeck', rank: 18, category: 'Create', pattern: 'Stage + director', description: 'Design slides, rehearse and export editable presentations.', boundary: 'Original slide compositions with basic text/color PPTX interchange. Does not reproduce arbitrary Office effects, charts or embedded objects.' }, D.SDK.UIViewRepresentable(ctx => {
        const slide = (title, body, layout = 'split', art = 'orbital') => ({ id: D.uid(), title, body, notes: 'Speak slowly. Leave room for the idea.', background: '#151d36', accent: '#d9b074', layout, art });
        const one = slide('More room.\nMore possibility.', 'A canvas that unfolds around your ideas.\nOne pocket. A complete creative studio.', 'split', 'dunes');
        const doc = ctx.document({ title: 'A larger kind of thinking', slides: [one, slide('Design together.', 'Precision drawing\nDimensional form\nMusic, motion and meaning', 'title', 'coast'), slide('The best tool\ngets out of the way.', 'Duo Studio · Built for the space between disciplines', 'quote', 'alpine')], selected: one.id }), m = doc.state;
        let presenting = null;
        const q = s => ctx.root.querySelector(s), current = () => m().slides.find(s => s.id === m().selected) || m().slides[0];
        ctx.root.innerHTML = doc.header('A pocket presentation studio') + S.toolbar(S.button('deck-present', '▶ Present') + S.button('deck-html', 'HTML deck ↓') + S.button('deck-pptx', 'PPTX ↓') + S.button('deck-import', 'Import PPTX') + S.button('deck-svg', 'Slide SVG ↓') + S.button('deck-png', 'PNG ↓')) + D.paneTabs('Stage', 'Director') + `<div class="duo-panes pro-panes"><section class="pane primary-pane"><div class="deck-stage"></div><div class="deck-filmstrip" aria-label="Slides"></div><div class="pro-status deck-status"></div></section><aside class="pane secondary-pane pro-inspector"></aside></div>`;
        function lines(text, max) { const out = []; for (const paragraph of String(text).split('\n')) {
            let line = '';
            for (const word of paragraph.split(' ')) {
                if (line.length + word.length > max && line) {
                    out.push(line);
                    line = '';
                }
                line += (line ? ' ' : '') + word;
            }
            out.push(line);
        } return out; }
        function svg(s) { const quote = s.layout === 'quote', image = s.layout === 'split', bg = S.color(s.background, '#151d36'), accent = S.color(s.accent, '#d9b074'), title = lines(s.title, image ? 21 : 32).slice(0, 4), body = lines(s.body, image ? 34 : 65).slice(0, 5), art = D.assets[s.art + '.jpg'] || D.assets['orbital.jpg']; return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540" role="img" aria-label="${E(s.title)}"><rect width="960" height="540" fill="${bg}"/>${image ? `<image href="${art}" x="535" y="0" width="425" height="540" preserveAspectRatio="xMidYMid slice"/><rect x="535" y="0" width="425" height="540" fill="${bg}" opacity=".12"/>` : `<circle cx="850" cy="65" r="215" fill="${accent}" opacity=".08"/><circle cx="70" cy="540" r="240" fill="${accent}" opacity=".04"/>`}<rect x="54" y="49" width="46" height="5" rx="2.5" fill="${accent}"/><text x="54" y="84" fill="${accent}" font-family="sans-serif" font-size="12" letter-spacing="3">${quote ? 'A DIFFERENT PERSPECTIVE' : 'DUO / CREATIVE STUDIO'}</text>${title.map((t, i) => `<text x="54" y="${150 + i * 48}" font-family="sans-serif" font-size="${quote ? 43 : 41}" font-weight="700" fill="white" letter-spacing="-1.5">${E(t)}</text>`).join('')}${body.slice(0, title.length > 3 ? 4 : 5).map((t, i) => `<text x="56" y="${Math.max(270, 165 + title.length * 48) + i * 25}" font-family="sans-serif" font-size="18" fill="#c5ceda">${E(t)}</text>`).join('')}<text x="54" y="503" font-family="sans-serif" font-size="11" fill="${accent}">${E(m().title.slice(0, 60))}</text><text x="${image ? 486 : 904}" y="503" text-anchor="end" font-family="sans-serif" font-size="12" fill="${accent}">${String(m().slides.indexOf(s) + 1).padStart(2, '0')}</text></svg>`; }
        function render() { const s = current(); m().selected = s.id; q('.deck-stage').innerHTML = svg(s); q('.deck-filmstrip').innerHTML = m().slides.map((v, i) => `<button class="deck-thumb ${v.id === s.id ? 'is-active' : ''}" data-slide="${v.id}" aria-label="Slide ${i + 1}: ${E(v.title)}">${svg(v)}<span>${i + 1}</span></button>`).join(''); q('.deck-status').textContent = `Slide ${m().slides.indexOf(s) + 1} / ${m().slides.length} · 16:9 · editable text + original artwork`; q('.pro-inspector').innerHTML = S.section('Deck', S.field('deck-title', 'Title', m().title, 'text')) + S.toolbar(S.button('deck-add', '+ Slide') + S.button('deck-duplicate', 'Duplicate') + S.button('deck-delete', 'Delete')) + S.section('Slide content', `<label class="pro-field"><span>Heading</span><textarea data-field="title" rows="3">${E(s.title)}</textarea></label><label class="pro-field"><span>Body</span><textarea data-field="body" rows="4">${E(s.body)}</textarea></label>` + S.select('layout', 'Composition', s.layout, ['split', 'title', 'quote']) + S.select('art', 'Artwork', s.art || 'orbital', ['dunes', 'coast', 'alpine', 'arches', 'golden', 'orbital']) + S.field('background', 'Background', s.background, 'color') + S.field('accent', 'Accent', s.accent, 'color')) + S.section('Speaker notes', `<textarea class="pro-textarea" data-field="notes" rows="4" aria-label="Speaker notes">${E(s.notes)}</textarea>`) + S.toolbar(S.button('deck-left', '← Earlier') + S.button('deck-right', 'Later →')) + S.help('HTML preserves visual compositions and keyboard navigation. PPTX preserves editable text and colors; arbitrary Office presentations are not imported losslessly.'); }
        function mutate(fn) { doc.change(fn); render(); }
        ctx.scope.on(ctx.root, 'click', e => { const b = e.target.closest('[data-slide]'); if (b) {
            m().selected = b.dataset.slide;
            ctx.save();
            render();
        } });
        ctx.scope.on(ctx.root, 'change', e => { const k = e.target.dataset.field; if (!['deck-title', 'title', 'body', 'notes', 'layout', 'art', 'background', 'accent'].includes(k))
            return; mutate(model => { if (k === 'deck-title')
            model.title = e.target.value.slice(0, 120);
        else
            current()[k] = e.target.value.slice(0, k === 'notes' ? 10000 : 2000); }); });
        ctx.act('deck-add', () => { if (m().slides.length >= 100)
            throw Error('100 slides maximum.'); mutate(model => { const s = slide('A new perspective.', 'Start with the idea.'); model.slides.splice(model.slides.indexOf(current()) + 1, 0, s); model.selected = s.id; }); });
        ctx.act('deck-duplicate', () => { if (m().slides.length >= 100)
            return; mutate(model => { const s = { ...S.clone(current()), id: D.uid() }; model.slides.splice(model.slides.indexOf(current()) + 1, 0, s); model.selected = s.id; }); });
        ctx.act('deck-delete', () => { if (m().slides.length === 1) {
            D.toast('Keep at least one slide.');
            return;
        } mutate(model => { const i = model.slides.indexOf(current()); model.slides.splice(i, 1); model.selected = model.slides[Math.min(i, model.slides.length - 1)].id; }); });
        const reorder = step => mutate(model => { const i = model.slides.indexOf(current()), j = Math.max(0, Math.min(model.slides.length - 1, i + step)); [model.slides[i], model.slides[j]] = [model.slides[j], model.slides[i]]; });
        ctx.act('deck-left', () => reorder(-1));
        ctx.act('deck-right', () => reorder(1));
        async function png() { const canvas = document.createElement('canvas'); canvas.width = 1920; canvas.height = 1080; const url = URL.createObjectURL(new Blob([svg(current())], { type: 'image/svg+xml' })), img = new Image(); try {
            img.src = url;
            await img.decode();
            canvas.getContext('2d').drawImage(img, 0, 0, 1920, 1080);
            return await S.downloadCanvas(canvas, m().title + '-slide.png');
        }
        finally {
            URL.revokeObjectURL(url);
        } }
        function htmlDeck() { return '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + E(m().title) + '</title><style>body{margin:0;background:#090c15;color:white;font:16px system-ui;display:grid;place-items:center;height:100dvh}main{width:min(100vw,177.7dvh)}section{display:none}section.active{display:block}svg{display:block;width:100%;height:auto}nav{position:fixed;bottom:10px;right:14px;display:flex;gap:12px;align-items:center}button{border:1px solid #ffffff55;background:#172034;color:white;padding:9px 15px;border-radius:10px;cursor:pointer}</style><main>' + m().slides.map((s, i) => '<section class="' + (i === 0 ? 'active' : '') + '">' + svg(s) + '</section>').join('') + '</main><nav><button id="prev" aria-label="Previous slide">←</button><span id="count"></span><button id="next" aria-label="Next slide">→</button></nav><script>const slides=[...document.querySelectorAll("section")];let n=0;function show(x){n=Math.max(0,Math.min(slides.length-1,x));slides.forEach((s,i)=>s.classList.toggle("active",i===n));document.getElementById("count").textContent=(n+1)+" / "+slides.length}document.getElementById("prev").onclick=()=>show(n-1);document.getElementById("next").onclick=()=>show(n+1);document.onkeydown=e=>{if(["ArrowRight"," ","PageDown"].includes(e.key)){e.preventDefault();show(n+1)}if(["ArrowLeft","PageUp"].includes(e.key)){e.preventDefault();show(n-1)}};show(0);<\/script></html>'; }
        ctx.act('deck-html', () => D.download(m().title + '.html', htmlDeck(), 'text/html'));
        ctx.act('deck-svg', () => D.download(m().title + '-slide.svg', svg(current()), 'image/svg+xml'));
        ctx.act('deck-png', png);
        ctx.act('deck-pptx', () => D.download(m().title + '.pptx', S.Office.pptx(m()), 'application/vnd.openxmlformats-officedocument.presentationml.presentation'));
        ctx.act('deck-import', () => S.pickFile('.pptx', async (f) => { const model = await S.Office.readPptx(await f.arrayBuffer()); model.title = f.name.replace(/\.pptx$/i, ''); doc.load({ format: 'duo-project', version: 1, app: ctx.id, model }); }));
        function present() { let index = m().slides.indexOf(current()), start = Date.now(), timer; const scope = D.scope(); D.dialog('Presenter · ' + m().title, `<div class="presenter-stage"></div><div class="presenter-controls"><button class="btn" data-present="previous">← Previous</button><span class="presenter-count"></span><button class="btn" data-present="next">Next →</button><button class="btn" data-present="fullscreen">Full screen</button></div><p class="presenter-notes"></p>`, body => { presenting = body; const paint = () => { const s = m().slides[index]; body.querySelector('.presenter-stage').innerHTML = svg(s); body.querySelector('.presenter-notes').textContent = s.notes || ''; body.querySelector('.presenter-count').textContent = `${index + 1} / ${m().slides.length} · ${Math.floor((Date.now() - start) / 60000)}:${String(Math.floor((Date.now() - start) / 1000) % 60).padStart(2, '0')}`; }; const next = d => { index = Math.max(0, Math.min(m().slides.length - 1, index + d)); paint(); }; scope.on(body, 'click', e => { const action = e.target.closest('[data-present]')?.dataset.present; if (action === 'next')
            next(1); if (action === 'previous')
            next(-1); if (action === 'fullscreen')
            body.requestFullscreen?.().catch(e => D.toast(e.message)); }); scope.on(document, 'keydown', e => { if (e.key === 'ArrowRight' || e.key === ' ') {
            e.preventDefault();
            next(1);
        } if (e.key === 'ArrowLeft') {
            e.preventDefault();
            next(-1);
        } }); timer = setInterval(() => { const count = body.querySelector('.presenter-count'); if (count)
            count.textContent = `${index + 1} / ${m().slides.length} · ${Math.floor((Date.now() - start) / 1000)} s`; }, 1000); paint(); return () => { clearInterval(timer); scope.dispose(); presenting = null; if (document.fullscreenElement === body)
            document.exitFullscreen?.().catch(() => { }); }; }); }
        ctx.act('deck-present', present);
        ctx.listen('restore', id => { if (id === ctx.id)
            render(); });
        render();
        return { render, png, svg: () => svg(current()), htmlDeck, receive: artifact => { if (artifact.type === 'application/x-duo-project' && artifact.app === ctx.id) {
                doc.load(S.parseJSON(artifact.text));
                return;
            } if (m().slides.length >= 100)
                throw Error('100 slides maximum.'); mutate(model => { const s = slide(String(artifact.title || 'Shared idea').slice(0, 120), String(artifact.text || '').slice(0, 1500), 'title'); model.slides.push(s); model.selected = s.id; }); }, dispose: () => { if (presenting)
                D.$('#system-dialog').close(); } };
    }));
})(window.Duo);
