(function (D) {
    'use strict';
    const S = D.Studio, G = S.Geometry;
    D.SDK.register({ id: 'scenelab', name: 'SceneLab', rank: 12, category: 'Create', pattern: '3D scene + outliner', description: 'Build original 3D compositions with parametric primitives, editable transforms, ray picking, animation and mesh export.', boundary: 'Real triangle rendering and scene editing, not a path tracer, CAD B-rep kernel or general animation package.' }, D.SDK.UIViewRepresentable(ctx => {
        const object = (id, type, color, position, scale = [1, 1, 1], rotation = [0, 0, 0]) => ({ id, name: type[0].toUpperCase() + type.slice(1), type, color, position, scale, rotation, visible: true });
        const doc = ctx.document({ title: 'Objects of tomorrow', objects: [object('plinth', 'cube', '#63768a', [0, -1.25, 0], [4, .4, 3]), object('arch', 'torus', '#c8b2ff', [-.4, .1, 0], [1.8, 1.8, 1.8], [90, 0, 0]), object('orb', 'sphere', '#efa68c', [1.05, -.1, .35], [1.3, 1.3, 1.3]), object('column', 'cylinder', '#76d9ce', [-1.35, -.3, .45], [.7, 1.5, .7])], selected: 'arch', camera: { yaw: .6, pitch: .3, distance: 7, target: [0, 0, 0] }, mode: 'solid', animate: false }), m = doc.state;
        let mounted = false, view, animation = 0, last = 0, active = true;
        const selected = () => m().objects.find(o => o.id === m().selected);
        function render() { if (!mounted) {
            ctx.root.innerHTML = doc.header('3D composition · editable scene', S.button('fit-scene', 'Reset view')) + D.paneTabs('Viewport', 'Scene') + `<div class="duo-panes pro-panes"><div class="pane primary-pane"><div class="pro-toolbar scene-tools"></div><div class="pro-viewport scene-viewport"></div><div class="pro-status">Orbit: drag · Pan: Shift drag · Zoom: wheel / pinch · Tap to select</div></div><div class="pane secondary-pane pro-inspector"></div></div>`;
            view = new S.View3D(D.$('.scene-viewport', ctx.root), ctx.scope, { camera: m().camera, onCamera: () => ctx.save(), onPick: id => { m().selected = id; ctx.save(); render(); } });
            mounted = true;
        } D.$('.scene-tools', ctx.root).innerHTML = ['cube', 'sphere', 'cylinder', 'cone', 'torus'].map(type => S.button('add-object', '＋ ' + type, false, `data-type="${type}"`)).join(''); inspector(); view.updateCamera(m().camera); view.setObjects(m().objects, m().selected, m().mode === 'wire'); ctx.pane(ctx.root.dataset.activePane || 'primary'); startAnimation(); }
        function inspector() { const o = selected(); D.$('.pro-inspector', ctx.root).innerHTML = S.section('SCENE', S.field('title', 'Name', m().title, 'text') + `<div class="pro-row">${S.button('wire', 'Wireframe', m().mode === 'wire')}${S.button('animate', m().animate ? 'Pause orbit' : 'Animate', m().animate)}</div><div class="scene-outliner">${m().objects.map(o => `<div class="scene-object ${o.id === m().selected ? 'selected' : ''}"><button data-action="select-object" data-object="${o.id}"><i style="background:${S.color(o.color)}"></i><span>${D.escape(o.name)}</span></button><button data-action="visibility" data-object="${o.id}" aria-label="Toggle ${D.escape(o.name)} visibility">${o.visible === false ? '○' : '●'}</button></div>`).join('')}</div>`) + S.section('OBJECT', o ? S.field('name', 'Name', o.name, 'text') + S.field('color', 'Material', S.color(o.color), 'color') + ['position', 'rotation', 'scale'].map(key => `<p class="pro-overline">${key.toUpperCase()}</p><div class="transform-row">${['X', 'Y', 'Z'].map((axis, i) => S.field(key + '-' + i, axis, o[key][i], 'number', `step="${key === 'rotation' ? 5 : .1}"`)).join('')}</div>`).join('') + `<div class="pro-row">${S.button('duplicate-object', 'Duplicate')}${S.button('delete-object', 'Delete')}</div>` : S.help('Choose an object in the viewport or outliner.')) + S.section('INTERCHANGE', `<div class="pro-row">${S.button('import-obj', 'Import OBJ')}${S.button('export-obj', 'OBJ ↓')}${S.button('export-stl', 'STL ↓')}</div><div class="pro-row">${S.button('scene-png', 'Image ↓')}${S.button('open-polyform', 'Open Polyform')}</div>`) + S.help('Primitives, polygon meshes and Polyform constructions remain editable. Mesh exports bake all transforms and omit hidden objects.'); }
        function stopAnimation() { cancelAnimationFrame(animation); animation = 0; last = 0; }
        function startAnimation() { if (animation || !m().animate || !active)
            return; const loop = time => { animation = 0; if (!m().animate || !active || document.hidden)
            return; const dt = last ? Math.min(.05, (time - last) / 1000) : 0; last = time; m().camera.yaw += dt * .24; view.invalidate(); animation = requestAnimationFrame(loop); }; animation = requestAnimationFrame(loop); }
        ctx.act('add-object', b => { doc.change(s => { if (s.objects.length >= 100)
            throw Error('Scene limit: 100 objects.'); const id = D.uid(), n = s.objects.length; s.objects.push(object(id, b.dataset.type, ['#b3a2ff', '#79dbc7', '#ed9d8a', '#82b5ef'][n % 4], [(n % 3 - 1) * 1.2, 0, 0])); s.selected = id; }); render(); });
        ctx.act('select-object', b => { m().selected = b.dataset.object; ctx.save(); render(); });
        ctx.act('visibility', b => { doc.change(s => { const o = s.objects.find(o => o.id === b.dataset.object); o.visible = o.visible === false; }); render(); });
        ctx.act('wire', () => { m().mode = m().mode === 'wire' ? 'solid' : 'wire'; ctx.save(); render(); });
        ctx.act('animate', () => { m().animate = !m().animate; if (!m().animate)
            stopAnimation(); ctx.save(); render(); });
        ctx.act('fit-scene', () => { m().camera = { yaw: .6, pitch: .35, distance: 7, target: [0, 0, 0] }; ctx.save(); render(); });
        ctx.act('duplicate-object', () => { const o = selected(); if (!o)
            return; doc.change(s => { if (s.objects.length >= 100)
            throw Error('Scene limit: 100 objects.'); const copy = S.clone(o); copy.id = D.uid(); copy.name += ' copy'; copy.position[0] += .7; s.objects.push(copy); s.selected = copy.id; }); render(); });
        ctx.act('delete-object', () => { doc.change(s => { s.objects = s.objects.filter(o => o.id !== s.selected); s.selected = s.objects[0]?.id || ''; }); render(); });
        ctx.act('export-obj', () => D.download(m().title + '.obj', G.obj(m().objects), 'text/plain'));
        ctx.act('export-stl', () => D.download(m().title + '.stl', G.stl(m().objects), 'model/stl'));
        ctx.act('scene-png', () => view.snapshot());
        ctx.act('open-polyform', () => D.shell.open('polyform', 'secondary'));
        function addMesh(mesh, name) { G.validateMesh(mesh); doc.change(s => { if (s.objects.length >= 100)
            throw Error('Scene limit: 100 objects.'); const id = D.uid(); s.objects.push({ id, name, type: 'mesh', mesh, color: '#c5adff', position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1], visible: true }); s.selected = id; }); render(); }
        ctx.act('import-obj', () => S.pickFile('.obj', async (f) => addMesh(G.parseOBJ(await f.text()), f.name), 8e6));
        ctx.scope.on(ctx.root, 'change', e => { const key = e.target.dataset.field; if (!key)
            return; doc.change(s => { if (key === 'title') {
            s.title = e.target.value.slice(0, 100);
            return;
        } const o = selected(); if (!o)
            return; if (key === 'name')
            o.name = e.target.value.slice(0, 80);
        else if (key === 'color')
            o.color = S.color(e.target.value);
        else {
            const [field, index] = key.split('-');
            o[field][+index] = S.finite(e.target.value, field === 'scale' ? 1 : 0, field === 'scale' ? .05 : field === 'rotation' ? -360 : -100, field === 'scale' ? 20 : field === 'rotation' ? 360 : 100);
        } }); render(); });
        ctx.scope.on(document, 'visibilitychange', () => { if (document.hidden)
            stopAnimation();
        else
            startAnimation(); });
        function receive(a) { if (a.type === 'mesh' && a.mesh) {
            addMesh(a.mesh, a.title || 'Shared mesh');
            return;
        } try {
            const value = S.parseJSON(a.text);
            if (value.app === 'scenelab') {
                doc.load(value);
                return;
            }
            if (value.app === 'polyform') {
                const p = value.model;
                addMesh(p.method === 'lathe' ? G.lathe(p.profile, p.segments) : G.extrude(p.profile, p.depth, p.twist), p.title);
                return;
            }
            throw Error('Unsupported scene reference.');
        }
        catch (e) {
            D.toast('This item is not a supported scene or mesh project.');
        } }
        render();
        return { render, receive, get renderer() { return view; }, suspend() { active = false; stopAnimation(); }, resume() { active = true; view.invalidate(); startAnimation(); }, dispose: stopAnimation };
    }));
})(window.Duo);
