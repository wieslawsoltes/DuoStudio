(function (D) {
    'use strict';
    const filters = { original: 'none', warm: 'sepia(.32) saturate(1.15)', mono: 'grayscale(1)', vivid: 'saturate(1.55) contrast(1.06)' };
    D.SDK.register({ id: 'instagram', name: 'Instagram', rank: 6, pattern: 'Gallery + immersive detail', description: 'Browse a visual collection while the moment you chose stays large. Compare, save, comment, and publish original local images.', tip: 'Open a story, save an image, or create a local post from your own photograph. All imported images are resized and stored on this device.', boundary: 'This is an offline visual-sharing prototype. Original digital studies and fictional creators replace real Instagram content; no posts leave this browser.' }, D.SDK.UIViewRepresentable(ctx => {
        const { root, scope } = ctx;
        const seed = { posts: D.scenes.map((s, i) => ({ id: 'i' + i, art: s.id, name: s.creator, handle: s.handle, title: s.name, caption: s.text, likes: 312 + i * 73, liked: false, saved: false, following: i % 2 === 0, filter: 'original', comments: [{ name: i % 2 ? 'Sofia Chen' : 'Noah Rivers', text: i % 2 ? 'The light in this is everything.' : 'A little more of this, please.' }] })), selected: 'i0', filter: 'all', comment: '' };
        const m = () => ctx.get(seed);
        const selected = () => m().posts.find(p => p.id === m().selected) || m().posts[0];
        const media = (p, cls = '') => p.dataURL ? `<img class="${cls}" src="${D.escape(p.dataURL)}" alt="${D.escape(p.title)}" style="filter:${filters[p.filter] || 'none'}" draggable="false">` : D.image(p.art, p.title, cls).replace('<img ', `<img style="filter:${filters[p.filter] || 'none'}" `);
        function render() { const s = m(), p = selected(), posts = s.posts.filter(p => s.filter !== 'saved' || p.saved); root.innerHTML = D.appHeader('instagram', 'Your offline visual collection', D.ib('create-post', 'plus', 'Create a local photo post')) + D.paneTabs('Explore', 'The moment') + `<div class="duo-panes"><div class="pane primary-pane"><div class="story-row">${D.scenes.slice(0, 5).map((sc, i) => `<button class="story-button" data-action="story" data-index="${i}" aria-label="View ${D.escape(sc.creator)} story"><span class="story-ring">${D.image(sc.id, sc.name)}</span><span>${D.escape(sc.creator.split(' ')[0])}</span></button>`).join('')}</div><div class="pane-toolbar"><h2 class="social-heading">A different perspective.</h2>${D.ib('create-post', 'camera', 'Create a post')}</div><div class="chip-row">${[['all', 'For you'], ['saved', 'Saved']].map(([id, label]) => `<button class="chip ${s.filter === id ? 'active' : ''}" data-action="filter" data-filter="${id}">${label}</button>`).join('')}<span class="spacer"></span><span class="tiny muted" style="font-size:9px">${posts.length} moments</span></div><div class="scroll"><div class="insta-grid">${posts.map(post => `<button class="${p?.id === post.id ? 'active' : ''}" data-action="open-post" data-id="${post.id}" aria-label="Open ${D.escape(post.title)}">${media(post)}<span class="grid-count">${D.icon('heart', 11)}${post.likes + (post.liked ? 1 : 0)}</span></button>`).join('')}</div>${!posts.length ? D.empty('bookmark', 'Keep a little inspiration', 'Saved moments will appear here.') : ''}</div><div class="sample-footer">Original digital artwork · fictional creator profiles</div></div><div class="pane secondary-pane">${p ? `<div class="conversation-header">${D.avatar(p.name)}<div class="grow"><b>${D.escape(p.handle)}</b><p style="color:var(--muted)">${D.escape(p.dataURL ? 'Your local collection' : 'Original digital study')}</p></div>${D.btn('follow', null, p.following ? 'Following' : 'Follow', 'small ghost')}</div><div class="scroll"><div class="insta-detail-img">${media(p)}<span class="media-badge">${D.escape(p.title)}</span></div><div class="insta-caption"><div class="social-actions"><button data-action="like" class="${p.liked ? 'liked' : ''}" aria-label="${p.liked ? 'Unlike' : 'Like'} image">${D.icon('heart', 22)}</button><button data-action="focus-comment" aria-label="Add a comment">${D.icon('comment', 22)}</button><button data-action="share-post" aria-label="Share this moment">${D.icon('send', 22)}</button><span class="spacer"></span><button data-action="save" class="${p.saved ? 'saved' : ''}" aria-label="${p.saved ? 'Unsave' : 'Save'} image">${D.icon('bookmark', 22)}</button></div><b style="font-size:11px">${(p.likes + (p.liked ? 1 : 0)).toLocaleString()} local likes</b><p style="margin-top:7px"><b>${D.escape(p.handle)}</b> ${D.escape(p.caption)}</p><small>ORIGINAL STUDY · LOCAL PROTOTYPE</small></div>${p.comments.map(c => `<div class="reply">${D.avatar(c.name, 'tiny')}<div><b>${D.escape(c.name)}</b><p>${D.escape(c.text)}</p></div></div>`).join('')}</div><form class="composer" id="insta-comment"><div class="composer-box">${D.avatar('You', 'tiny you')}<input name="comment" placeholder="Add a little kindness…" aria-label="Comment on image" value="${D.escape(s.comment)}"><button class="send-btn" type="submit" aria-label="Post comment locally">${D.icon('arrow')}</button></div></form>` : D.empty('image', 'Your next moment', 'Create a local photo post to get started.')}</div></div>`; ctx.pane(root.dataset.activePane || 'primary'); }
        ctx.act('open-post', b => { m().selected = b.dataset.id; ctx.save(); render(); ctx.pane('secondary'); });
        ctx.act('filter', b => { m().filter = b.dataset.filter; ctx.save(); render(); });
        for (const [action, key] of [['like', 'liked'], ['save', 'saved'], ['follow', 'following']])
            ctx.act(action, () => { selected()[key] = !selected()[key]; ctx.save(); render(); });
        ctx.act('focus-comment', () => D.$('[name=comment]', root).focus());
        ctx.act('share-post', () => { const p = selected(); ctx.share(`${p.title}\n\n${p.caption}`, `A moment by ${p.name}`); });
        scope.on(root, 'input', e => { if (e.target.name === 'comment') {
            m().comment = e.target.value;
            ctx.save();
        } });
        scope.on(root, 'submit', e => { if (e.target.id === 'insta-comment') {
            e.preventDefault();
            const text = m().comment.trim();
            if (!text)
                return;
            selected().comments.push({ name: 'You', text });
            m().comment = '';
            ctx.save();
            render();
            D.$('.secondary-pane .scroll', root).scrollTop = 10000;
        } });
        ctx.act('story', b => {
            let index = +b.dataset.index;
            const show = () => { const s = D.scenes[index]; return `<div class="story-view">${D.image(s.id, s.name)}<div class="story-overlay"><div class="stack"><div class="story-progress">${D.scenes.map((_, i) => `<span class="${i <= index ? 'active' : ''}"></span>`).join('')}</div><div class="row">${D.avatar(s.creator, 'tiny')}<b class="tiny">${D.escape(s.handle)}</b><span class="spacer"></span><span class="tiny">Original study</span></div></div><div><h2>${D.escape(s.name)}.</h2><p style="font-size:12px;margin-top:13px;max-width:260px">${D.escape(s.text)}</p></div></div></div><div class="story-navigation"><button class="btn ghost" id="story-prev">${D.icon('back', 16)} Previous</button><button class="btn ghost" id="story-next">Next ${D.icon('chevron', 16)}</button></div>`; };
            D.dialog('A little story', show(), body => { const paint = () => { body.innerHTML = show(); }; body.onclick = e => { if (e.target.closest('#story-next')) {
                index = (index + 1) % D.scenes.length;
                paint();
            } if (e.target.closest('#story-prev')) {
                index = (index + D.scenes.length - 1) % D.scenes.length;
                paint();
            } }; const keyboard = e => { if (e.key === 'ArrowRight') {
                index = (index + 1) % D.scenes.length;
                paint();
            } if (e.key === 'ArrowLeft') {
                index = (index + D.scenes.length - 1) % D.scenes.length;
                paint();
            } }; body.addEventListener('keydown', keyboard); return () => body.removeEventListener('keydown', keyboard); });
        });
        ctx.act('create-post', () => {
            let localImage = null, scene = 'dunes', chosenFilter = 'original';
            D.dialog('Make a moment', `<p>Create a post with an original study or import your own photo. It stays in this browser.</p><div id="post-preview" style="height:180px;border-radius:14px;overflow:hidden;margin:15px 0">${D.image('dunes', 'Local post preview')}</div><div class="stack"><label class="field-label">Choose an original study<select id="post-scene" class="field">${D.scenes.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}</select></label><label class="field-label">Or import a photograph<input type="file" id="post-upload" accept="image/png,image/jpeg,image/webp,image/gif" class="field"></label><div class="row">${Object.keys(filters).map((id, i) => `<button class="btn small ${i ? 'ghost' : 'primary'}" data-filter="${id}">${id[0].toUpperCase() + id.slice(1)}</button>`).join('')}</div><label class="field-label">Caption<textarea id="post-caption" class="field" rows="3" maxlength="2000" placeholder="Tell a little story…"></textarea></label></div><div class="dialog-footer"><span class="tiny muted">No Instagram connection</span><button class="btn primary" id="publish-photo">Publish locally</button></div>`, body => {
                const preview = () => { D.$('#post-preview', body).innerHTML = localImage ? `<img src="${localImage}" alt="Your local photo">` : D.image(scene, 'Original study'); const im = D.$('#post-preview img', body); im.style.cssText = `width:100%;height:100%;object-fit:cover;filter:${filters[chosenFilter]}`; };
                preview();
                D.$('#post-scene', body).onchange = e => { scene = e.target.value; localImage = null; preview(); };
                D.$('#post-upload', body).onchange = async (e) => { try {
                    localImage = await D.readImage(e.target.files[0]);
                    preview();
                }
                catch (e) {
                    D.toast(e.message);
                } };
                body.addEventListener('click', e => { const b = e.target.closest('[data-filter]'); if (b) {
                    chosenFilter = b.dataset.filter;
                    D.$$('[data-filter]', body).forEach(x => { x.classList.toggle('primary', x === b); x.classList.toggle('ghost', x !== b); });
                    preview();
                } });
                D.$('#publish-photo', body).onclick = () => { D.store.checkpoint('instagram'); const caption = D.$('#post-caption', body).value.trim() || 'A moment worth keeping.'; const p = { id: D.uid(), art: scene, dataURL: localImage, name: 'You', handle: 'you', title: localImage ? 'Your perspective' : D.scenes.find(s => s.id === scene).name, caption, filter: chosenFilter, likes: 0, liked: false, saved: false, following: true, comments: [] }; m().posts.unshift(p); m().selected = p.id; m().filter = 'all'; ctx.save(); D.$('#system-dialog').close(); render(); ctx.pane('secondary'); D.toast('Your image was added to the local collection'); };
            });
        });
        render();
        return { render };
    }));
})(window.Duo);
