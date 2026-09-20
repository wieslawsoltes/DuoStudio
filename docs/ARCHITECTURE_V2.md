# Architecture · Creative OS 2.0

The standalone build concatenates ordered, readable modules into one script and embeds all runtime artwork/films. It does not use a bundler, service backend, dynamically downloaded code or package loader.

```
core / icons / local data
 ├─ SessionStore + bounded validation + app-scoped history
 ├─ application registry + mounted-instance scopes
 ├─ structured handoff events + dialogs + clipboard shelf
 └─ wallpaper (WGSL compute + presentation / Canvas fallback)
Studio engines
 ├─ studio: project documents, safe HTML, file cabinet, Canvas surfaces
 ├─ formula: lexer → bounded Pratt AST → cell/range interpreter
 ├─ formats: ZIP/CRC → OOXML text, worksheet and slide adapters
 ├─ geometry: matrices, primitives, triangulation, lathe, extrusion, interchange
 ├─ renderer3d: GPU depth/solid/edge passes and CPU triangle projection
 └─ audio: clock scheduler, synth voices, offline render, WAV/SMF encoders
20 independent app mount functions
shell
 ├─ cached application instances and scoped resource disposal
 ├─ active/hidden/locked transition state machine
 ├─ continuous inner display / cover / posture fixture geometry
 └─ primary + secondary slots, horizontal or vertical allocation
simulator
 ├─ categories, dock, Spotlight, app switcher, workspaces
 ├─ Files, validated full-studio backups, notifications
 ├─ fixture events, accessibility overlays and diagnostics
 ├─ validated data-only scenario capture/replay
 └─ permission-gated display capture and opt-in PWA registration
```

## Application contract

`Duo.register(metadata, mount)` supplies an isolated root, a scope containing an AbortController and cleanup callbacks, an action table, session access and bus listeners. A mount returns render/receive/lifecycle hooks. The shell keeps the mount alive while folding, rotating or changing pane allocation. Closing an app disposes its event scope, observers, timers, media and GPU resources but retains its document model.

`Duo.mount` adds a generic restoration listener only when the app did not register its own. Application actions handle rejected promises visibly. `Studio.document` checkpoints app-specific state, avoids no-op undo entries, validates imported models before replacing state, and rolls back failed mutations. Undo/redo is app-scoped; activity in another app does not consume this app's revision stack.

The shell records active-state transitions to avoid repeatedly calling resume/suspend while resizing. It pauses hidden/parked apps and locks. Compact pairs activate only the focused app. The browser's visibility lifecycle is combined with the simulated device lifecycle. It is not a host process scheduler.

## Data and persistence

The session retains schema version 1 for compatibility with the initial build; product version is 2.0.0. Known app shapes are validated, with bounded strings, nesting, collections, dimensions, geometry, media identifiers and formula grid extents. Prototype keys and unsafe image URLs are rejected. Each creative project uses `{format:'duo-project', version:1, app, model}`. Cross-app mesh/image/route artifacts carry real payloads, not labels standing in for content.

Small session state uses localStorage when allowed; potentially larger imported files use the IndexedDB cabinet. The cabinet's in-memory fallback is labeled. `putMany` stages a complete batch and commits it in one IDB transaction; only afterward are memory mirrors changed. Full studio backups include a session JSON file, metadata and independent cabinet byte entries. ZIP CRCs, paths, counts and sizes are checked before use. JSON project exports and full ZIP backups are deliberately different products.

## Rendering, audio and safety

The 3D backend has indexed model data expanded into typed vertex buffers for flat-lit solid/edge rendering, an explicit depth attachment, dynamic camera uniforms, compilation diagnostics and device-loss fallback. The software backend projects the same geometry. CPU painter-order rendering is not equivalent to hardware depth buffering in every overlapping case. Substrate/UI work stays in semantic DOM/CSS; video compositing and 2D drawing use Canvas. No native text renderer or iOS compositor is emulated.

Pulse schedules short windows against AudioContext time rather than using timer callbacks as note clocks. Timers feed the scheduling horizon; generation tokens prevent late asynchronous work from reviving a suspended/disposed instrument. OfflineAudioContext generates export samples. Cutroom references immutable export settings while recording actual composited frames and audio and cancels on lifecycle transitions.

The formula engine cannot resolve properties, call arbitrary JS or access host globals. OOXML parsers do not evaluate macros or external links. HTML imports use a tag/style whitelist. Scenario playback accepts a small typed event language and never evaluates supplied JavaScript. Real camera/display APIs still require browser permission. No API tokens are bundled or requested.
