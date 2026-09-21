(function (D) {
    'use strict';
    // A deliberately fictional coordinate system. No map tiles, GPS, or network dependencies.
    const graph = {};
    for (let r = 0; r < 7; r++)
        for (let c = 0; c < 9; c++)
            graph[`${r}-${c}`] = { x: 65 + c * 88, y: 65 + r * 88, edges: [] };
    for (let r = 0; r < 7; r++)
        for (let c = 0; c < 9; c++) {
            const id = `${r}-${c}`;
            for (const [dr, dc] of [[0, 1], [1, 0]]) {
                const rr = r + dr, cc = c + dc, to = `${rr}-${cc}`;
                if (!graph[to] || (dc === 1 && c === 3 && ![2, 5].includes(r)))
                    continue;
                const bridge = dc === 1 && c === 3;
                const cost = 88;
                graph[id].edges.push({ to, cost, bridge });
                graph[to].edges.push({ to: id, cost, bridge });
            }
        }
    const places = [{ id: 'cafe', name: 'Aperture Coffee', type: 'Coffee & breakfast', node: '2-2', art: 'arches', rating: '4.9', note: 'A quiet courtyard, warm pastries, and room for one more cup.' }, { id: 'gallery', name: 'The Light Gallery', type: 'Art & architecture', node: '2-6', art: 'orbital', rating: '4.8', note: 'A small collection of big ideas, beyond the east bridge.' }, { id: 'garden', name: 'Riverside Gardens', type: 'Parks & walks', node: '4-5', art: 'coast', rating: '4.9', note: 'Follow the path between the trees and the water.' }, { id: 'lookout', name: 'Horizon Terrace', type: 'Scenic viewpoint', node: '0-7', art: 'dunes', rating: '4.9', note: 'The best place in this imagined city to watch the light change.' }, { id: 'market', name: 'Alba Market', type: 'Food & local makers', node: '5-6', art: 'golden', rating: '4.7', note: 'Small stalls, seasonal colors, and an unhurried lunch.' }, { id: 'studio', name: 'Northside Studio', type: 'Design & books', node: '0-1', art: 'alpine', rating: '4.8', note: 'A reading room for the creatively curious.' }, { id: 'station', name: 'Central Station', type: 'Transport', node: '6-2', art: 'arches', rating: '4.5', note: 'A good place to begin. All journeys here are simulations.' }];
    D.demoMap = { graph, places };
    D.SDK.register({ id: 'maps', name: 'Google Maps', rank: 8, pattern: 'Explore + route canvas', description: 'A pan-and-zoom vector city beside searchable places and a graph-derived, multi-stop route. Add stops, change travel mode, and simulate the journey.', tip: 'Choose a place, add it to the route, and press Simulate. The path is calculated through streets and bridges, not drawn as a straight line.', boundary: 'Porto Alba is fictional. Routing uses a local street graph, not Google Maps, GPS, live traffic, real geographic coordinates, or real travel advice.' }, D.SDK.UIViewRepresentable(ctx => {
        const { root, scope } = ctx;
        const seed = { selected: 'cafe', query: '', filter: 'all', favorites: [], stops: ['cafe', 'gallery'], mode: 'walk', style: 'light', view: { x: 0, y: 0, w: 835, h: 690 } };
        let s = ctx.get(seed), route = { path: [], cost: 0 }, raf = 0, running = false, startTime = 0, progress = 0, drag = null;
        function calculate() { let from = '6-2', cost = 0; const path = [from]; for (const id of s.stops) {
            const p = places.find(p => p.id === id);
            if (!p)
                continue;
            const g = s.mode === 'car' ? Object.fromEntries(Object.entries(graph).map(([id, n]) => [id, { ...n, edges: n.edges.map(e => ({ ...e, cost: e.cost * (e.bridge ? 1.35 : 1) })) }])) : graph;
            const result = D.engine.shortestPath(g, from, p.node);
            path.push(...result.path.slice(1));
            cost += result.cost;
            from = p.node;
        } route = { path, cost }; return route; }
        const distance = () => route.path.slice(1).reduce((n, id, i) => n + Math.hypot(graph[id].x - graph[route.path[i]].x, graph[id].y - graph[route.path[i]].y), 0) * 2;
        const duration = () => Math.max(1, Math.round(distance() / ({ walk: 78, bike: 240, car: 430 }[s.mode] || 78)));
        const selected = () => places.find(p => p.id === s.selected) || places[0];
        function mapMarkup() {
            const terrain = s.style === 'terrain';
            let blocks = '', roads = '';
            for (let r = 0; r < 6; r++)
                for (let c = 0; c < 8; c++) {
                    if (c === 3)
                        continue;
                    const x = 65 + c * 88 + 13, y = 65 + r * 88 + 13, park = (r === 3 && c === 4) || (r === 1 && c === 1);
                    blocks += `<rect x="${x}" y="${y}" width="62" height="62" rx="${park ? 15 : 5}" fill="${park ? '#bdd1a7' : terrain ? '#d6d1b9' : '#dddeda'}"/>`;
                    if (park)
                        for (let t = 0; t < 6; t++)
                            blocks += `<circle cx="${x + 12 + (t % 3) * 18}" cy="${y + 14 + Math.floor(t / 3) * 28}" r="8" fill="#8fae83" opacity=".65"/>`;
                    else {
                        blocks += `<rect x="${x + 7}" y="${y + 7}" width="18" height="44" rx="2" fill="${terrain ? '#c5bca6' : '#cccec9'}"/><rect x="${x + 34}" y="${y + 7}" width="20" height="27" rx="2" fill="${terrain ? '#c5bca6' : '#cccec9'}"/>`;
                    }
                }
            for (const [id, n] of Object.entries(graph))
                for (const e of n.edges)
                    if (id < e.to) {
                        const to = graph[e.to];
                        roads += `<path d="M${n.x} ${n.y}L${to.x} ${to.y}" stroke="${e.bridge ? '#d0c6af' : '#c6c9c4'}" stroke-width="${e.bridge ? 20 : 17}"/><path d="M${n.x} ${n.y}L${to.x} ${to.y}" stroke="#fcfbf5" stroke-width="${e.bridge ? 14 : 12}"/>`;
                    }
            const coords = route.path.map(id => `${graph[id].x},${graph[id].y}`).join(' ');
            return `<svg class="map-svg" viewBox="${s.view.x} ${s.view.y} ${s.view.w} ${s.view.h}" role="img" aria-label="Interactive fictional Porto Alba street map; blue line shows a calculated route"><rect x="-1500" y="-1500" width="4000" height="4000" fill="${terrain ? '#e6e0c9' : '#eceee7'}"/><path d="M366 -150L425 -150C395 150 440 300 414 460C410 560 432 680 445 900L370 900C370 680 337 550 356 422C382 244 339 113 366 -150Z" fill="${terrain ? '#88b6aa' : '#aad2d6'}"/><path d="M381 -150C350 250 404 320 383 500S413 850 416 900" stroke="#ffffff32" fill="none" stroke-width="2"/>${blocks}<g fill="none" stroke-linecap="round">${roads}</g><g font-family="system-ui,sans-serif" font-size="9" fill="#999e91" letter-spacing="1.5"><text x="167" y="198">OLD TOWN</text><text x="576" y="199">EAST QUARTER</text><text x="515" y="552">RIVERSIDE</text><text x="173" y="98">STUDIO DISTRICT</text></g><g font-size="8" fill="#a6aaa3" font-family="system-ui,sans-serif"><text x="104" y="236">Willow Street</text><text x="505" y="500">Market Avenue</text><text x="511" y="61">Horizon Walk</text></g>${coords ? `<polyline id="route-halo" points="${coords}" fill="none" stroke="white" stroke-width="13" stroke-linejoin="round" stroke-linecap="round"/><polyline id="route-line" points="${coords}" fill="none" stroke="#4283e3" stroke-width="8" stroke-linejoin="round" stroke-linecap="round"/>` : ''}${places.map(p => { const n = graph[p.node], sel = s.selected === p.id; return `<g data-action="map-place" data-id="${p.id}" tabindex="0" role="button" aria-label="${D.escape(p.name)}" style="cursor:pointer"><circle cx="${n.x}" cy="${n.y}" r="${sel ? 17 : 13}" fill="${sel ? '#386fe5' : s.stops.includes(p.id) ? '#427dac' : '#78946e'}" stroke="white" stroke-width="3"/><text x="${n.x}" y="${n.y + 4}" text-anchor="middle" font-size="11" fill="white" font-weight="700">${places.indexOf(p) + 1}</text><text x="${n.x + 21}" y="${n.y + 4}" font-family="system-ui,sans-serif" font-size="10" font-weight="550" fill="#576854" stroke="#f8faf5" stroke-width="3" paint-order="stroke">${D.escape(p.name)}</text></g>`; }).join('')}<circle cx="241" cy="593" r="18" fill="#4283e333"/><circle cx="241" cy="593" r="7" fill="#4283e3" stroke="white" stroke-width="3"/><g id="route-traveler" transform="translate(241 593)" style="pointer-events:none"><circle r="13" fill="#2873f0" stroke="white" stroke-width="4"/><path d="M0 -5L4 5L0 3L-4 5Z" fill="white"/></g></svg>`;
        }
        function renderList() { const q = s.query.toLowerCase(), matches = places.filter(p => (s.filter !== 'saved' || s.favorites.includes(p.id)) && (!q || [p.name, p.type, p.note].join(' ').toLowerCase().includes(q))); D.$('.place-list', root).innerHTML = matches.map(p => `<button class="place-row ${s.selected === p.id ? 'active' : ''}" data-action="place" data-id="${p.id}"><div class="grow"><h3>${D.escape(p.name)}</h3><div class="rating">${p.rating} ★ <span style="color:var(--muted)">· illustrative</span></div><p>${D.escape(p.type)}</p><div class="place-type">${s.stops.includes(p.id) ? 'On your route' : s.favorites.includes(p.id) ? 'Saved place' : 'Discover somewhere new'}</div></div><div class="place-image">${D.image(p.art, p.name)}</div></button>`).join('') || D.empty('search', 'Try a different direction', 'Search coffee, art, gardens, or a place name.'); }
        function panel() { const p = selected(), el = D.$('.map-route-panel', root); el.innerHTML = `<div class="route-heading"><div><h2>${s.stops.length ? duration() + ' min' : 'Your next stop'}</h2><small>${s.stops.length ? (distance() / 1000).toFixed(1) + ' km · ' + s.stops.length + ' stop' + (s.stops.length === 1 ? '' : 's') + ' · simulated estimate' : 'Choose places to build a local route'}</small></div>${D.btn('simulate', running ? 'pause' : 'navigate', running ? 'Pause' : 'Simulate', 'small primary')}</div><div class="route-stops"><span class="route-stop">${D.icon('pin', 12)}Station</span>${s.stops.map((id, i) => `<span class="route-stop">${D.escape(places.find(p => p.id === id)?.name || id)}<button data-action="earlier" data-id="${id}" aria-label="Move stop earlier">${D.icon('up', 11)}</button><button data-action="remove-stop" data-id="${id}" aria-label="Remove stop">${D.icon('close', 11)}</button></span>`).join('')}</div><div class="route-progress"><i style="width:${progress * 100}%"></i></div><div class="row"><span class="grow" style="font-size:11px"><b>${D.escape(p.name)}</b></span>${D.ib('favorite', 'bookmark', s.favorites.includes(p.id) ? 'Unsave place' : 'Save place')}${D.btn('add-stop', 'plus', s.stops.includes(p.id) ? 'Added' : 'Add stop', 'small ghost')}${D.ib('share-route', 'share', 'Share route')}</div>`; }
        function render() { s = ctx.get(seed); stop(); calculate(); root.innerHTML = D.appHeader('maps', 'A new direction. A wider perspective.', D.ib('export-route', 'download', 'Export calculated route')) + D.paneTabs('Explore', 'Map & route') + `<div class="duo-panes maps-panes"><section class="pane primary-pane"><h2 class="map-search-title">Good places. Great company.</h2><p class="map-search-subtitle">Explore Porto Alba · an imagined city</p><div class="map-search"><label class="search-box">${D.icon('search', 16)}<input name="search" aria-label="Search fictional places" placeholder="Coffee, art, a little adventure…" value="${D.escape(s.query)}"></label></div><div class="chip-row"><button class="chip ${s.filter === 'all' ? 'active' : ''}" data-action="filter" data-filter="all">Explore</button><button class="chip ${s.filter === 'saved' ? 'active' : ''}" data-action="filter" data-filter="saved">Saved</button><span class="spacer"></span>${[['walk', 'walk'], ['bike', 'bike'], ['car', 'car']].map(([id, icon]) => `<button class="chip ${s.mode === id ? 'active' : ''}" data-action="mode" data-mode="${id}" aria-label="Travel by ${id}">${D.icon(icon, 15)}</button>`).join('')}</div><div class="place-list scroll"></div><div class="map-info-inline">Fictional places · no live Google Maps, GPS, or travel data</div></section><section class="pane secondary-pane"><div class="map-surface">${mapMarkup()}<div class="map-top-pill"><span>${D.icon('globe', 12)} Porto Alba · offline vector map</span><span>${D.icon('route', 12)} Dijkstra routing</span></div><div class="map-controls">${D.btn('zoom-in', 'plus', '', '', 'aria-label="Zoom map in"')}${D.btn('zoom-out', 'minus', '', '', 'aria-label="Zoom map out"')}${D.btn('center', 'navigate', '', '', 'aria-label="Reset map view"')}${D.btn('style', 'layers', '', '', 'aria-label="Toggle terrain colors"')}</div><div class="map-scale"><span></span>Fictional coordinate system</div></div><div class="map-route-panel"></div></section></div>`; renderList(); panel(); ctx.pane(root.dataset.activePane || 'primary'); }
        function stop() { running = false; cancelAnimationFrame(raf); raf = 0; }
        function repaintMap() { D.$('.map-svg', root).outerHTML = mapMarkup(); panel(); }
        function choose(id, pane = true) { s.selected = id; ctx.save(); renderList(); repaintMap(); if (pane)
            ctx.pane('secondary'); }
        function updateRoute() { stop(); progress = 0; calculate(); ctx.save(); renderList(); repaintMap(); }
        ctx.act('place', b => choose(b.dataset.id));
        ctx.act('map-place', b => choose(b.dataset.id, false));
        ctx.act('filter', b => { s.filter = b.dataset.filter; ctx.save(); render(); ctx.pane('primary'); });
        ctx.act('mode', b => { s.mode = b.dataset.mode; ctx.save(); render(); });
        ctx.act('favorite', () => { const id = selected().id; s.favorites = s.favorites.includes(id) ? s.favorites.filter(x => x !== id) : [...s.favorites, id]; ctx.save(); renderList(); panel(); D.toast(s.favorites.includes(id) ? 'Place saved locally' : 'Place removed from saved'); });
        ctx.act('add-stop', () => { const id = selected().id; if (s.stops.includes(id))
            return D.toast('This place is already on your route'); s.stops.push(id); updateRoute(); });
        ctx.act('remove-stop', b => { s.stops = s.stops.filter(id => id !== b.dataset.id); updateRoute(); });
        ctx.act('earlier', b => { const i = s.stops.indexOf(b.dataset.id); if (i > 0) {
            [s.stops[i - 1], s.stops[i]] = [s.stops[i], s.stops[i - 1]];
            updateRoute();
        }
        else
            D.toast('This is already your first stop'); });
        function view() { const svg = D.$('.map-svg', root); svg.setAttribute('viewBox', `${s.view.x} ${s.view.y} ${s.view.w} ${s.view.h}`); ctx.save(); }
        function zoom(f, cx = .5, cy = .5) { const v = s.view, w = D.clamp(v.w * f, 180, 1600), ratio = w / v.w, h = v.h * ratio; v.x += (v.w - w) * cx; v.y += (v.h - h) * cy; v.w = w; v.h = h; view(); }
        ctx.act('zoom-in', () => zoom(.8));
        ctx.act('zoom-out', () => zoom(1.25));
        ctx.act('center', () => { s.view = { x: 0, y: 0, w: 835, h: 690 }; view(); });
        ctx.act('style', () => { s.style = s.style === 'terrain' ? 'light' : 'terrain'; ctx.save(); repaintMap(); });
        ctx.act('simulate', () => { if (running) {
            stop();
            panel();
            return;
        } if (route.path.length < 2)
            return D.toast('Add a place to your route first'); if (progress >= 1)
            progress = 0; running = true; startTime = performance.now() - progress * 18000; panel(); const coords = route.path.map(id => graph[id]); const lengths = coords.slice(1).map((p, i) => Math.hypot(p.x - coords[i].x, p.y - coords[i].y)), total = lengths.reduce((a, b) => a + b, 0); const tick = now => { if (!running)
            return; progress = D.clamp((now - startTime) / 18000, 0, 1); let remain = progress * total, index = 0; while (index < lengths.length - 1 && remain > lengths[index])
            remain -= lengths[index++]; const f = lengths[index] ? remain / lengths[index] : 0, a = coords[index], b = coords[index + 1] || a; D.$('#route-traveler', root)?.setAttribute('transform', `translate(${a.x + (b.x - a.x) * f} ${a.y + (b.y - a.y) * f})`); const bar = D.$('.route-progress i', root); if (bar)
            bar.style.width = progress * 100 + '%'; if (progress < 1)
            raf = requestAnimationFrame(tick);
        else {
            stop();
            panel();
            D.toast('You arrived — simulated journey complete');
        } }; raf = requestAnimationFrame(tick); });
        const summary = () => `A little route around fictional Porto Alba\n\nStart: Central Station\n${s.stops.map((id, i) => `${i + 1}. ${places.find(p => p.id === id)?.name}`).join('\n')}\n\n${(distance() / 1000).toFixed(1)} km · about ${duration()} minutes by ${s.mode}.\nCalculated through a local street graph. These places and estimates are fictional, not travel advice.`;
        ctx.act('share-route', () => ctx.share(summary(), 'A plan for Porto Alba'));
        ctx.act('share-app', () => ctx.actions['share-route']());
        ctx.act('export-route', () => D.download('porto-alba-route.json', JSON.stringify({ fictional: true, coordinateSystem: 'Local drawing coordinates; not geographic', mode: s.mode, stops: s.stops, path: route.path.map(id => ({ id, x: graph[id].x, y: graph[id].y })), illustrativeMeters: distance(), illustrativeMinutes: duration() }, null, 2), 'application/json'));
        scope.on(root, 'input', e => { if (e.target.name === 'search') {
            s.query = e.target.value;
            ctx.save();
            renderList();
        } });
        scope.on(root, 'wheel', e => { const svg = e.target.closest('.map-svg'); if (!svg)
            return; e.preventDefault(); const r = svg.getBoundingClientRect(); zoom(e.deltaY > 0 ? 1.12 : .9, (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height); }, { passive: false });
        scope.on(root, 'pointerdown', e => { const svg = e.target.closest('.map-svg'); if (!svg || e.target.closest('[data-action]'))
            return; svg.setPointerCapture(e.pointerId); svg.classList.add('dragging'); drag = { id: e.pointerId, x: e.clientX, y: e.clientY, v: { ...s.view }, rect: svg.getBoundingClientRect() }; });
        scope.on(root, 'pointermove', e => { if (!drag || e.pointerId !== drag.id)
            return; s.view.x = drag.v.x - (e.clientX - drag.x) * s.view.w / drag.rect.width; s.view.y = drag.v.y - (e.clientY - drag.y) * s.view.h / drag.rect.height; view(); });
        const end = () => { drag = null; D.$('.map-svg', root)?.classList.remove('dragging'); };
        scope.on(root, 'pointerup', end);
        scope.on(root, 'pointercancel', end);
        scope.on(root, 'keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('g[data-action]')) {
            e.preventDefault();
            choose(e.target.dataset.id, false);
        } });
        scope.on(document, 'visibilitychange', () => { if (document.hidden) {
            stop();
            if (root.isConnected)
                panel();
        } });
        render();
        return { render, suspend() { stop(); panel(); }, dispose: stop };
    }));
})(window.Duo);
