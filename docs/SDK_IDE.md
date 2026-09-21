# Duo Studio 3 — SDK and developer workspace

## Start here

Open `dist/duo-studio.html`, or the published GitHub Pages application. Choose **Developer Studio** in the simulator's upper toolbar. The developer workspace starts with Draftline's real source, a running CAD canvas and an inspector. Use the scheme selector to edit any of the twenty installed applications.

The workspace is original JavaScript software inspired by Xcode's navigator/editor/canvas/inspector/debug-area arrangement. It does not run Apple's Xcode binaries, compile Swift, produce an IPA, or implement all native Xcode/LLDB features. The device shell remains a foldable interaction simulator, not a physical iPhone emulator.

## End-to-end authoring

### Edit an existing application

Choose an application scheme. Its JavaScript controller is opened in the source editor. Every shipped app module is embedded as readable source, together with the SDK, host runtime, domain engines, shader strings and stylesheets. Edit the actual code and press **Run**, or Command/Control–R. The compiler validates all JavaScript with the embedded Acorn parser and validates interface/layout JSON before creating a candidate runtime.

A candidate runs in its own iframe. Only a successful ready handshake replaces the previous working runtime. Syntax errors show a file and source line in the Issues navigator. Execution errors during startup reject the candidate. A failed build does not overwrite or stop the last working application. A stopped preview must be built again before running. Shared extra `.js` files are loaded in path order after the SDK host adapter and before app registrations; these are classic scripts, not npm/ES-module dependency resolution.

The editor provides syntax colors, line numbers, source tabs, symbol navigation, full-project text search, per-file find/replace, source undo/redo, indentation, comment toggling and a compact SDK-completion menu. The completion menu is a local API list, not a language server. All twenty original app modules are formatted as readable source; formatting was checked against Acorn AST equivalence before commit.

### Design an existing app's live interface

Choose **Select** above the canvas and select a live UI element, or select it in the Hierarchy inspector. Change text, sizes, layout direction, spacing, padding, alignment, colors, typography, radius, opacity and borders. Drag the selection label to translate a view; drag the corner handle to resize it. These gestures use the running application's actual element geometry.

For the existing imperative applications, changes are recorded in `views/<app>.layout.json` as app-root-relative selector patches. They are reapplied after dynamic view reconstruction, not merely painted onto an unrelated mock canvas. Edits survive a complete build and standalone export. The library inserts real DuoKit views into the selected container. Canvas/SVG/3D content is edited through its application tools or source, not through the DOM layout inspector.

A selector referring to a structural child can become obsolete when the application code changes its structure. Prefer stable IDs/data attributes, inspect the saved layout file and rebuild after removing old overrides. Arbitrary JavaScript DOM-generation code is not automatically rewritten into declarative SwiftUI-style syntax. This is a persistent override system for those twenty adapters, not a lossless arbitrary-HTML AST designer.

### Create a new app

Choose **File → New**, name the product and select a template: interactive counter, document/notes editor, calculation dashboard or number puzzle. Creation adds a registered application scheme, JavaScript controller, `.view.json` interface and `.layout.json` override file. The app is also available in the edited simulator's launcher.

A view document is the source of truth for new declarative UI. It contains stable node identities, types, properties, bindings, named actions and children. Attribute changes, action/binding connections, insertion, duplication, deletion and sibling reordering update that JSON. Visual duplication generates fresh identities. The same descriptor goes through the same SDK renderer in the live canvas and exported app; there is no second imitation rendering path.

Example:

```json
{
  "type": "VStack",
  "id": "root",
  "props": {"style": {"padding": "24px", "gap": "16px"}},
  "children": [
    {"type": "Text", "id": "count", "props": {"text": "Count: {{count}}"}},
    {"type": "Button", "id": "increment", "props": {"text": "Add one", "action": "increment"}},
    {"type": "TextField", "id": "title", "props": {"label": "Title", "binding": "title"}}
  ]
}
```

```javascript
(function (K) {
  K.declarative({id: 'user-example', name: 'Example', category: 'Create'}, {
    seed: {count: 0, title: 'My project'},
    view: 'views/user-example.view.json',
    actions(state, ctx) {
      return {
        increment() {
          state.update(previous => ({...previous, count: previous.count + 1}));
        },
        async inspect() {
          const label = state.value.title;
          await ctx.debug.checkpoint('Before export', () => ({label}));
          ctx.services.download('example.json', JSON.stringify(state.value));
        }
      };
    }
  });
})(DuoKit);
```

New apps can also use the shared CAD, geometry, audio, format and filesystem engines, or supply their own imperative UI through `UIViewRepresentable`. JavaScript runs as authored; the templates are not a restriction on the controller's capabilities.

## SDK extraction and migration

The core in `sdk/duokit.js` has no simulator or DOM dependency at import time. It supports browser scripts, browser ESM, Node ESM and CommonJS. `index.d.ts` describes the public API. The optional `sdk/host.js` is an explicit adapter to Duo Studio services.

| Familiar Apple concept | DuoKit implementation | Important distinction |
|---|---|---|
| State and Binding | Observable state, projected/mapped bindings, dependency-tracked effects | JavaScript objects, not Swift property wrappers |
| View composition | Immutable view descriptors and fluent modifiers | DOM/CSS renderer, not SwiftUI's native engine |
| VStack/HStack/ZStack | Flex/grid composition | Browser layout and text metrics |
| NavigationSplitView | Responsive navigation/detail layout | Does not implement all UIKit navigation transitions |
| App and WindowGroup | Application/scene descriptors | Local simulator registration, not an OS process |
| UIViewRepresentable | Imperative mount adapter | Adapts existing web views, not UIKit objects |
| Environment/scene phase | Observable size classes, appearance, posture and lifecycle values | Browser/simulator fixtures, not hardware sensors |
| Task lifetime | AbortController-based Scope with owned events, timers, effects and cleanup | Cancellation is cooperative |
| Documents/undo | Host file cabinet, validated project documents, transactions and undo | Local storage, not NSDocument/iCloud |

All twenty app registrations go through `DuoKit.register(..., DuoKit.UIViewRepresentable(...))`. The common mount context, delegated commands, environment, scope lifetime, document wrapper and drawing-surface lifecycle were physically extracted into the SDK; this is not only a metadata marker. Existing domain engines and UI implementations remain in the app/engine directories. Original behavior is guarded by the existing 39 and 77 browser regression suites.

The adapter supplies `ctx.sdk`, `ctx.environment`, `ctx.state`, `ctx.document`, `ctx.commands`, `ctx.debug`, `ctx.scope` and `ctx.services`. Compatibility aliases remain for downstream code, but migrated applications consume SDK-owned surfaces/documents and registrations. Existing imperative apps are not falsely described as full declarative rewrites.

## Debugging: two complementary paths

### In-IDE cooperative command debugger

Set a breakpoint on an SDK action in the breakpoint navigator or on an action-bearing source line in the gutter. The next matching action pauses **before mutation**. Continue executes it. Step executes the current command and pauses after completion. Nested commands use a command-frame stack; queued top-level commands cannot mutate the app while another command is paused.

Variables show the application model and explicitly supplied checkpoint locals. The command stack shows action names and source locations. Watch expressions run inside the preview using `state`, `locals` and `Duo`; they do not evaluate in the host IDE. The model editor validates replacement JSON through the application's session schema and SDK restore path.

For a point inside an asynchronous algorithm, use `await ctx.debug.checkpoint(label, () => ({localVariables}))`. Explicit checkpoints preserve the real suspended function and its lexical values. They are not fabricated execution traces. Arbitrary synchronous functions are not converted into asynchronous code, and ordinary JavaScript is not silently rewritten to change its scheduling semantics.

### Native browser JavaScript debugger

Edited modules are separate inline scripts with `duokit:///...` source URLs. Open browser DevTools to use the engine's real JavaScript debugger, breakpoints, call frames, stepping, exceptions and profiling. The **JS** control emits a real `debugger` statement inside the preview. Native debugger behavior was exercised through Chromium's Debugger protocol, including inspection of the actual app registry while paused. Browsers may compile lazy functions only when first used; open the app to populate its native source/debug view.

The in-page IDE cannot acquire the browser's privileged debugger protocol by itself. It therefore does not claim arbitrary-line native stepping or full lexical-scope introspection through its own controls. LLDB, native Swift debugging, device provisioning, Instruments, source-control remotes and Swift package resolution are outside this browser implementation.

## Build, state and resource lifecycle

The source bundle contains all runtime inputs needed to build offline. Acorn 8.15.0 is vendored, including its MIT license. Builds do not fetch a CDN, npm packages or cloud compiler. Original images and videos remain inline in the standalone distribution.

A rebuild snapshots application models and carries portable filesystem resources into a fresh sandbox. Binary resources are encoded as base64 in portable workspaces and hydrated as actual byte arrays before media applications mount. Resource IDs, names, MIME types and timestamps accompany the bytes. The preview's filesystem is isolated from the original simulator's IndexedDB namespace.

Switching between full IDE and full simulator changes CSS layout without reparenting the iframe: reparenting would destroy its browsing context. The same JavaScript realm, media elements, selected application and edited data remain active. Original simulator mode is separately accessible. Stop destroys the edited runtime rather than only hiding its image.

Workspace autosave includes source files, app registry, view documents, breakpoints, latest model snapshot and resources. Browser localStorage is used when available. Large projects can exceed browser quota; the UI reports storage failure rather than claiming persistence. Use workspace JSON or ZIP export for a durable portable backup. Files are subject to the simulator's per-file limits, the portable resource limit (40 MB encoded) and workspace import limit (48 MB); very large production media projects need a streaming storage/backend extension.

Exports: a standalone runnable HTML app with edited sources/layout/resources, workspace JSON for re-import, and a ZIP containing readable source plus `index.html` and `workspace.json`. The repository distribution also includes the independent npm-packable SDK.

## Security and limitations

Candidate previews use `sandbox="allow-scripts allow-downloads"`, without `allow-same-origin`, top navigation or parent storage access. A restrictive CSP blocks network connections, remote scripts, forms and external resource loads. The bridge verifies the sender window, per-build token and message channel. Imports reject traversal paths, prototype-pollution keys, duplicate view identities, invalid view types, malformed resources and oversized structures. Host UI renders user text through escaped text content.

This is origin isolation, not a hard CPU/process sandbox. Trusted authored JavaScript can still contain an infinite loop, consume excessive memory or intentionally break its own UI. Use browser process controls/DevTools for that case. The core SDK does not sanitize arbitrary application JavaScript. No account secrets or server credentials are sent into previews. Existing social/email/AI app studies remain local prototypes.

WebGPU uses the existing actual renderer where the browser/context provides an adapter; Canvas fallbacks remain available. Headless software-adapter validation is not physical-device performance certification. Physical iPhone, Safari, VoiceOver, arbitrary media codecs and complete Microsoft Office/CAD interoperability are not asserted by this SDK/IDE release.

## Verification commands

```sh
python3 scripts/build.py
node scripts/check.mjs
node tests/test_sdk.mjs
npx -p typescript@5.8.3 tsc --noEmit --strict --lib ES2022,DOM sdk/index.d.ts
python3 tests/test_browser.py --chromium "$CHROMIUM"
python3 tests/test_creative.py --chromium "$CHROMIUM"
python3 tests/test_ide.py --chromium "$CHROMIUM"
python3 tests/test_hosted.py --chromium "$CHROMIUM"
python3 scripts/capture_v3.py --chromium "$CHROMIUM"
python3 scripts/package_repository.py
```

Hosted tests exercise reload persistence, real GPU execution/device loss, PWA offline startup, retained developer resources and offline rebuilding of a custom application. A missing adapter is reported explicitly; successful storage checks do not substitute for successful GPU checks. Reports and generated distributions are uploaded by CI. The Pages verifier checks the live HTML against its build manifest and every archived source file against SHA-256.

## Primary API references

Apple SwiftUI documentation: https://developer.apple.com/documentation/swiftui
State: https://developer.apple.com/documentation/swiftui/state
Binding: https://developer.apple.com/documentation/swiftui/binding
Navigation: https://developer.apple.com/documentation/swiftui/navigationsplitview
Xcode: https://developer.apple.com/xcode/
Acorn parser source/license: https://github.com/acornjs/acorn/tree/8.15.0

These references informed naming and interaction conventions; they are not a claim of Apple endorsement or API compatibility.
