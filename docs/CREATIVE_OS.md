# Creative OS 2.0 · Working guide

## Start in the simulator

All apps are immediately available from the launcher. Click **Create** to isolate the nine creative production apps; **Play** contains Arcade and its three games. The **Everyday** category holds the original ten. Use Search/Spotlight to launch applications or device commands. Right-click or long-press a launcher tile to place it in the four-app dock. Drag a tile onto another to reorder the launcher.

Use **Workspaces** for prepared pairs: shape + scene, sketch + document, music + film, worksheet + slides, research + writing, and paint + inspiration. The resize separator supports keyboard arrows and Home; Device lab switches its axis between horizontal and vertical. In a compact paired layout, the task bar changes the active app, and that app's pane tabs switch between work and inspector. Pane tabs avoid squeezing four editors into a phone viewport.

**Ctrl/Cmd+K** opens Spotlight; **Alt+Tab** opens the local app switcher; **Ctrl/Cmd+S** saves the focused project/workspace to Files. These are browser-hosted shortcuts and may conflict with browser/OS bindings. Never assume they intercept an OS-reserved key. Each application exposes explicit buttons as alternatives.

## Precision and form

Draftline's canvas accepts pointer drawing and selection. Commands include `line 10 20 130 80`, `rect 0 0 100 60`, `circle 0 0 40`, `fit`, `undo`, and `redo`. Wheel zoom is centered on the pointer; Space-drag pans. Line/rectangle/circle/dimension tools use endpoint snapping and an optional grid. Select an entity to edit its coordinates, geometry, layer, color or text. Layer toggles change drawing visibility. DXF import reports omitted record types instead of promising lossless conversion.

SceneLab's primitives and imported meshes are real vertex/triangle data. Drag the viewport to orbit, Shift-drag to pan, wheel to zoom, and click geometry to select. Edit translation, rotation and scale in the inspector. Polyform has an independently editable profile beside the generated mesh: select/move profile points, add/remove/subdivide, choose lathe or extrusion and adjust segments/depth/twist. Invalid polygon constructions report errors. Use **Send to SceneLab** for actual mesh transfer.

## Music and motion

Pulse is a live synthesized instrument, not playback of a prerecorded song. Tap step cells, select a track, change its instrument/pitch/filter/level/pan, and use Mute/Solo. The piano auditions the selected instrument. WAV export uses an offline audio context and writes interleaved stereo PCM; MIDI exports tempo and note events. The Play button is a Play/Pause toggle. Audio stops when its app becomes hidden or locked.

Cutroom's film monitor displays actual source frames. Select a timeline clip to edit its in/out interval, rate, sound level, caption and look. Split at the program playhead; reorder or remove clips. Import local video into Files, with project references to the cabinet entry. A session-only JSON export does not include cabinet video bytes; use the full studio ZIP backup to transport those together. Video export plays/render-records the edit in real time. Stop, close or hide the app to cancel. Browser codec support determines WebM/MP4 availability; the application does not promise a particular codec on every browser.

## Office and painting

Folio uses contenteditable with explicit document commands. Select text, then apply formatting. The outline navigates headings; find cycles through matches and replace changes text nodes. Pasted/imported HTML is sanitized before editing. DOCX import/export retains the supported text structure; Markdown is a simplified text representation.

GridSheet has a formula bar above a virtualized sheet. Click a cell, edit, then Enter. Shift extends a range. Arrow/Tab navigation works in the sheet; double-click moves into the formula bar. Fill down/right translates relative references while keeping dollar-prefixed components fixed. The analysis pane reports range statistics and visualizes numeric data. Size limits are 200 rows × 52 columns. XLSX is one worksheet; no macros or external workbook links are executed.

Keydeck provides an editable filmstrip, slide composition, speaker notes and presenter. Slides use original embedded artwork; the standalone HTML deck preserves those compositions and keyboard navigation. PPTX keeps editable text/basic colors, not every visual/layout effect. SVG/PNG export captures an individual slide.

Inkpad keeps each layer as a separate bitmap in its project model. Paint or erase with pointer pressure; select shapes, flood fill or eyedropper. Reorder, hide, duplicate, change opacity, or merge layers. Export PNG for a flattened lossless image; project JSON preserves layers. Image handoffs to Instagram use a composed image. Default limits are twelve layers and 1,600 × 1,600 pixels. Undo snapshots consume memory; image projects are intentionally bounded.

## Diagnostics, capture and recorded scenarios

Device lab offers logical viewport size, simulated battery/charging/location/network and accessibility/layout overlays. These fixture values are accessible via `Duo.simulator.signals` and `simulator-signals` events on `Duo.bus`; they do not replace browser native APIs. Low-power mode reduces wallpaper updates, not the host CPU/GPU clock. FPS measures JavaScript frame cadence, not a native GPU profiler.

Capture invokes a real display/tab picker. Select this tab to record the simulator; selecting another authorized surface captures that surface instead. The application cannot silently choose a screen. The capture banner exposes Stop; tracks are released afterward. Permission denial yields visible feedback. Browser/iOS support varies.

Scenario capture includes a starting session, local button operations, field changes, app launches, folding and bounded normalized canvas gestures. Exports, file choosers, playback and permission prompts are excluded. Replay reestablishes the start state, then dispatches validated event kinds with bounded delays. Missing targets fail visibly rather than executing arbitrary script. It is an interaction regression aid, not pixel-exact replay across arbitrary app versions or a recording of host OS events.

Backups validate all records before an atomic cabinet transaction. Session persistence is separate: browser quota/denial can leave state in memory, with an explicit warning. Keep downloaded backups for durable storage. A service worker caches the hosted application only after opt-in installation; the single HTML file does not contact a CDN.
