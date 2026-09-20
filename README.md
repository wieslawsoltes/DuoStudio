# Duo Studio

**Ten familiar apps, reimagined for one continuous canvas.**

An independent, local-first iPhone Duo form-factor laboratory built with HTML, CSS, JavaScript, SVG and WebGPU. Open the launcher, explore ten interactive app studies, fold the display without remounting the app, create a two-app workspace, and move real local content between apps.

This is a functional browser prototype, **not iOS, an emulator, an official application, or a claim of complete commercial-app feature parity**. AI responses are deterministic local templates. Sample conversations, people, weather, engagement statistics, city and media are demonstration content. There are no accounts, API keys, tracking SDKs, external runtime dependencies or service connections.

## Start

Open **`dist/duo-studio.html`** in a browser. This single file includes all code, icons, artwork and three playable films with original synthesized audio. No installation or network is needed for the local app workflows.

For the most reliable browser origin, persistent storage and permission handling:

```sh
python3 scripts/serve.py
```

Then open `http://localhost:8000/duo-studio.html`. Windows users may substitute `python` for `python3`.

WebGPU requires a supporting browser, available graphics adapter and a secure context. The **renderer badge reports the path actually in use**. If WebGPU cannot initialize or loses its device, a Canvas 2D wallpaper keeps the applications functional. Directly opening a file has browser-dependent storage and permission behavior. On a phone, use a proper HTTPS host; plain HTTP on a LAN address is not equivalent to localhost.

A file previewer, including a messaging attachment preview, may not execute JavaScript. Open the HTML in a full browser rather than an attachment preview. **Direct touch** removes the scaled studio enclosure and fits the interface to the current phone or tablet viewport.

## What to try

1. Open **ChatGPT** and choose **Build an HTML component**. Edit its source in the adjoining canvas, preview it in the sandbox, and export the result. Fold and unfold: the editor instance and selection survive.
2. Open **Google Maps**, add places to the route and start the route animation. Share the itinerary to **WhatsApp**: an actual route artifact opens in the neighboring app, ready to send locally.
3. Open **YouTube**, play an included film, select a chapter and add a timestamped note. Select **Tabletop** to put the film above the notes.
4. Publish an original or imported photo in **Instagram**. Compose a message in **Gmail**, save it to the local Sent folder, then export the session and restore it.

All results stay in the browser. “Save to Sent” never sends email; camera and microphone controls are explicit local preview tests, not network calls.

## Ten application studies

The selection follows Apple's published **U.S. 2025 free-iPhone-app download chart**, not a live worldwide active-user ranking. See [Sources](docs/SOURCES.md).

| App | Expanded-display workflow | Implemented local interactions |
| --- | --- | --- |
| ChatGPT | Conversation + editable artifact | Template-based prompts, context import, code/text editing, sandboxed preview, export, sharing |
| Threads | Feed + selected conversation | Search, compose, replies, likes, reposts, follows, saved posts |
| Google | Results + source reader | Weighted offline search, article reading, saved sources, side-by-side source comparison |
| TikTok | Playing film + social context | Three actual videos, seeking, sound, swipe/next, likes, saves, follows, comments |
| WhatsApp | Conversations + active chat | Drafts, new contacts, messages, image/text attachments, routed artifacts, local camera/mic preview |
| Instagram | Gallery + post detail | Stories, photo import, filters, publishing, captions, likes, saves, comments |
| YouTube | Film + chapters/queue/notebook | Real playback, chapters, timed captions, local video import, timestamped notes, cinema mode, exports |
| Google Maps | Place/route planning + map | Fictional street graph, Dijkstra routing, multiple stops, travel modes, pan/zoom, simulated travel, route export |
| Gmail | Mailbox + message or draft | Search, folders, drafts, attachments, reply/forward, local Sent, archive, delete/undo, text EML export |
| Gemini | Creative conversation + visual board | Template-generated storyboards, editable cards, original artwork, reordering, color copying, Markdown/JSON export |

The detailed [feature and service-boundary matrix](docs/FEATURE_MATRIX.md) distinguishes implemented behavior from unconnected services.

## Simulator

The metal enclosure, glass-like launcher surfaces, side dock, vertical activity pill, status corners and familiar iconography are an **iOS-inspired design study**, not pixel-exact reproduction of Apple's OS.

The reference display aspect ratios are preserved in studio mode. Four manually selected postures are available: **Unfolded, Book, Tabletop and Folded**. Hinge angle, rotation, theme, wallpaper palette, brightness, focus and reduced motion are adjustable. The hinge is a visual/layout control, not a hardware sensor or a mechanical 3D model.

Two different apps can share a resizable workspace. Swap sides, choose the focused slot when compact, and save named pairs. Share sheets transfer actual text, code, images or route context into compatible local apps. There is an eight-item clipboard shelf, app switcher, launcher search, local settings, visual lock screen, StandBy view and permission-gated camera preview.

Unlike the native capability described by Apple, this prototype does **not** instantiate two independent windows of the same app. Each app has one persistent mounted instance and one local data model.

## Keyboard

| Shortcut | Action |
| --- | --- |
| `Alt+1` through `Alt+0` | Open the ten apps in ranking order |
| `Ctrl/Cmd+K` | Find an app |
| `Alt+F` | Cycle posture |
| `Alt+R` | Rotate |
| `Alt+S` | Choose a Split View pair |
| `Alt+H` / `Escape` | Home; Escape also closes a modal |
| `Ctrl/Cmd+Z` outside a text editor | Undo a supported app action |
| Left/right arrows with divider focused | Adjust the split ratio |
| `Home` with divider focused | Return to an equal split |

Native text editing keeps its own undo behavior. Reduced-motion and browser visibility are respected by the decorative renderer. Screen-reader/real-device accessibility remains an explicit manual-testing boundary.

## Source layout

```text
src/
  template.html       Studio and device shell markup
  styles.css          App styles, container-query layouts, themes and postures
  icons.js            Original inline SVG interface and app-symbol interpretations
  core.js             App registration, mount scopes, dialogs, sharing, session store
  data.js             Original demo corpus, deterministic templates, graph algorithms
  gpu.js              WGSL compute + render pipeline and Canvas 2D fallback
  shell.js            Launcher, cached app instances, pairs, controls, continuity
  apps/               Ten independent application modules
assets/               Original JPEGs, three MP4s and synthesized source WAV
scripts/
  build.py            Standard-library single-file builder
  serve.py            Standard-library local static server
  check.mjs           Dependency-free JavaScript and build checks
  generate_assets.py  Reproducible procedural media generation
  package.py          Source ZIP builder
  capture.py          Curated screenshot capture using Playwright
tests/
  test_browser.py     Interaction, continuity, validation and layout checks
  browser-report.json Results from the packaged build
  static-report.json  Dependency-free source/build checks
screenshots/          Curated real-browser captures
```

There are no hidden build-time proprietary components. The standalone artifact embeds the modular files in deterministic order with source-boundary comments.

## Build and test

The runtime and builder require **no npm packages**:

```sh
python3 scripts/build.py
node scripts/check.mjs
python3 scripts/serve.py
```

The source ZIP already includes a built standalone HTML. Rebuilding with an unchanged source and asset set is deterministic. `dist/build-manifest.json` records the SHA-256 digest, source order and inline asset sizes.

Browser tests use the optional Python Playwright package and a Chromium executable:

```sh
python3 -m pip install -r requirements-dev.txt
python3 tests/test_browser.py --url http://localhost:8000/duo-studio.html --chromium /path/to/chromium
```

Without `--url`, the test harness injects the single-file source into a browser document. This supports environments where navigation is restricted, but **does not establish a secure origin or persistent storage**. See [Testing](docs/TESTING.md) for the actual execution environment and unverified boundaries.

Asset regeneration additionally uses NumPy, Pillow and an installed `ffmpeg` with H.264/AAC encoding:

```sh
python3 -m pip install -r requirements-assets.txt
python3 scripts/generate_assets.py
python3 scripts/build.py
```

## Data and privacy

State is held in memory and saved to `localStorage` when available. The top-bar export makes an explicit JSON backup; Settings imports a validated session after confirmation. Storage quotas differ by browser and origin; large imported images can exhaust them. Export important changes rather than treating browser storage as a durable account.

Imported videos use temporary object URLs and are **not included in session exports**. Imported images are resized and re-encoded. Email EML exports are plain-text message exports and do not reproduce attachment MIME parts. Media is muted initially where autoplay policy requires it; enable sound with a direct user gesture.

The visual lock is not authentication. The demo has no encrypted account store or synchronization. Session validation constrains schemas, size, nesting, identifiers, embedded images and prototype-related keys; this is not a third-party security audit.

## Documentation and licensing

- [Form-factor analysis](docs/FORM_FACTOR.md)
- [Architecture and extension contract](docs/ARCHITECTURE.md)
- [Implemented features and boundaries](docs/FEATURE_MATRIX.md)
- [Testing and manual verification](docs/TESTING.md)
- [Primary sources and asset provenance](docs/SOURCES.md)

Original code and generated media are provided under the MIT license. Third-party names, marks and the recognizable concepts remain the property of their respective owners. This project is independent and unaffiliated with Apple or the represented services.
