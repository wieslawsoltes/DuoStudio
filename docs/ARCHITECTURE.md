# Architecture

## Runtime boundary

The delivered HTML is a complete local application. Its only runtime dependency is a browser with the HTML/CSS/JavaScript features it uses. The build embeds six original JPEGs, three MP4s, SVG icon definitions, CSS and every script into one file. The larger source WAV is retained in the source package for media regeneration, not embedded at runtime.

The app layer uses DOM, CSS container queries and SVG. **WebGPU draws the procedural wallpaper; it is not a hidden replacement renderer for the ten app interfaces.** This keeps text editable, controls semantic and the applications operational if GPU initialization fails.

## Composition

```text
Studio controls ─────────────┐
Launcher / side dock ────────┼── shell.js: retained app-instance cache
Posture + real viewport ────┘              │
                                  primary / secondary slots
                                           │
                          core.js: mount scope + event delegation
                                           │
                                 ten independent app modules
                                  │         │          │
                              models     artifacts    algorithms
                                  │         │          │
                            SessionStore  share bus   data.js
                                  │         │
                           JSON / localStorage       receiver.receive()

Wallpaper: GPUBackdrop → compute texture → render pass
                              └── Canvas 2D fallback on failure
```

## App contract

`Duo.register(metadata, mount)` registers one application. The mount function receives a context containing `root`, `id`, `instanceId`, `scope`, `get`, `save`, `act`, `share`, `listen` and `pane`. It returns any applicable lifecycle hooks: `render`, `receive`, `resume`, `suspend`, `dispose`.

The context owns delegated `data-action` commands and `data-pane` navigation. Event subscriptions created through the scope are torn down together. Apps may attach additional resource cleanup callbacks. Each app uses a model accessor rather than retaining the model object forever, so a restored snapshot can replace the object without leaving stale references.

A minimal text-workspace extension follows the existing API:

```js
Duo.register({
  id: 'notes',
  name: 'Notes',
  rank: 11,
  pattern: 'Index + document',
  description: 'A local editable document.',
  tip: 'Edit the text and export your session.',
  boundary: 'No cloud synchronization.'
}, ctx => {
  const state = () => ctx.get({ text: '' });

  function render() {
    ctx.root.innerHTML =
      Duo.appHeader('notes', 'Local document') +
      '<textarea class="field" name="document" ' +
      'aria-label="Document">' +
      Duo.escape(state().text) + '</textarea>';
  }

  ctx.scope.on(ctx.root, 'input', event => {
    if (event.target.name !== 'document') return;
    state().text = event.target.value;
    ctx.save();
  });

  render();
  return {
    render,
    receive(artifact) {
      state().text = String(artifact.text || '');
      ctx.save();
      render();
    }
  };
});
```

A shipped extension must also be added to the builder's module order and session schema allowlist. Supply its icon, layout and appropriate metadata. The example does not silently bypass the strict importer for unknown application models.

## Fold continuity

The shell caches a single app instance per application ID. Moving between primary, secondary and parked states reparents its existing root. Parking uses a `DocumentFragment`; media-specific `suspend` hooks stop hidden playback where invoked.

Changing posture updates CSS geometry and state attributes, rather than recreating the root. Compact pane navigation changes visibility. A text selection or video element therefore survives an ordinary fold/unfold operation. App-specific user actions may deliberately rerender their content, and a complete session import disposes and remounts applications against the new models.

Each app is a named CSS size container. Narrow allocations switch to pane tabs instead of compressing two internal columns indefinitely. Tabletop applies a stacked presentation when an app owns the whole workspace. Split View uses distinct app IDs; same-app multiwindow is excluded by design.

## Sharing and commands

The shared event bus is an `EventTarget`. A transfer carries an artifact and target app ID. The shell opens that target, uses a second slot where the current layout permits it, then invokes the receiver's `receive` method.

Recipients place incoming content in a draft or pending context. They never infer permission to send it. The shared clipboard shelf retains up to eight items. User-invoked export builds a Blob, initiates a browser download and revokes the object URL. Clipboard access has a direct-copy fallback and a final manual-copy dialog when browser policy blocks programmatic access.

## Models, persistence and import

`SessionStore` stores versioned preferences, app models, saved pairs, recent apps and clipboard items. Writes are debounced by 180 ms and flushed on page hide. An unavailable/quota-limited storage API switches the application to in-memory behavior; a user can still export a JSON backup.

Explicit checkpoints retain up to 40 undo snapshots. Undo restores the selected app model and emits a `restore` event so the app can render it. Ordinary textarea editing retains browser-native editing behavior where appropriate.

The importer rejects unknown application IDs and validates nested required model fields. It also limits session size, depth, array length and strings; constrains identifiers; rejects prototype-related keys; requires supported data-URL image formats; and checks domain-specific structures such as map viewport dimensions and nonempty video queues. Settings require confirmation before replacing a session, with an export action available first.

These are defense-in-depth checks, not a claim of a complete adversarial security audit. Any extension that adds renderable URLs or a new model must extend validation as well as rendering-time escaping. Never interpolate untrusted model text into HTML without escaping.

## Media and local devices

Bundled videos use normal `HTMLVideoElement` playback, not a timer pretending to be a media player. Controls operate on playback position, pause, mute, rate and chapters. YouTube's notebook retains timestamped notes per clip; captions use the local timed transcript. Imported video files are temporary object URLs and are excluded from session serialization.

Image imports validate type/size, decode locally, reduce to a maximum 1000-pixel dimension and re-encode JPEG. The original uploaded file does not leave the browser.

Camera and microphone requests only occur after an explicit enable gesture. The local preview implements resource cleanup on modal replacement/close and protects against a stream resolving after the dialog has been disposed. No WebRTC signaling server, remote peer or calling service is implemented.

## WebGPU implementation

`GPUBackdrop` requests a low-power adapter and device, checks compilation information, creates a compute pipeline and a presentation pipeline, and scopes validation errors. The WGSL compute entry point uses **8 × 8 workgroups** to write an `rgba8unorm` storage texture. A full-screen triangle samples that texture in a render pass.

The 32-byte uniform layout is eight 32-bit floats:

| Byte offset | WGSL field | Data |
| --- | --- | --- |
| 0 | `size: vec2f` | Render width and height |
| 8 | `time: f32` | Animation time |
| 12 | `palette: f32` | One of four palettes |
| 16 | `pointer: vec2f` | Normalized pointer position |
| 24 | `energy: f32` | Reserved intensity parameter |
| 28 | `pad: f32` | Explicit final padding |

The pointer affects a subtle local light field on the GPU path. The Canvas fallback is a different, original ribbon composition rather than a bit-identical CPU implementation of the shader.

Decorative rendering targets 30 updates per second, caps the backing-store dimension at 1536 and effective device pixel ratio at 1.5, and respects reduced motion and document visibility. Continuous animation pauses when the wallpaper is behind an application. Dirty frames still update relevant state. This is a bounded workload, not a measured device-performance guarantee.

A canvas cannot switch from a WebGPU context to a 2D context. On failure the renderer replaces only the decorative canvas, preserves the semantic app tree, destroys GPU resources and installs its Canvas renderer. Disposal cancels animation, disconnects the resize observer and pointer/visibility listeners, and destroys GPU resources.

The included environment could exercise only Canvas 2D. The WGSL implementation is present and compilation/error handling is implemented, but hardware execution is an explicit outstanding verification item.

## Algorithms

The offline search engine ranks tokens with additional weight for titles and tags. It searches the original bundled corpus, not the Internet.

The AI-like engines classify a small set of intentions and fill local templates using supplied context. They are intentionally inspectable, deterministic workflows, not hidden model calls or a substitute for actual model reasoning.

The map has 63 graph vertices, neighboring street connections and two allowed bridge crossings. Dijkstra computes minimum-cost graph paths for each consecutive route segment. Travel modes adjust weights/estimates; animation interpolates along the computed polyline. The positions, distances and estimates belong to a fictional city and have no navigation authority.
