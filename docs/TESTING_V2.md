# Validation · Creative OS 2.0

The checked-in JSON reports record exact results for their run; CI artifacts preserve reports for each PR/deployment. Do not interpret old screenshots or old V1 reports as evidence for a newer source revision.

`node scripts/check.mjs` validates every JS file, the twenty-module inventory, embedded-script parsing, no unresolved placeholders, nine embedded assets, HTML bytes/hash and shader entry-point presence. Shader string presence alone does not prove GPU compilation.

`python3 tests/test_browser.py` runs the original 39 interaction checks with the expanded twenty-app registry. It covers the original media, editing, sharing, responsive layouts, forty original-app posture states, unsafe session rejection and errors.

`python3 tests/test_creative.py` runs 77 checks covering the ten creative mounts, bounded formula semantics, no host-code execution through formulas, CSV quoting, CAD commands and interchange, concave profile construction, mesh import/export, real handoffs, live/offline audio and MIDI, video splits and actual playable recorded output, cell editing/fill/virtualization, independent Office ZIP/XML validity, import round trips, slide editing/undo, painted pixels/layers, games/lifecycle, Files/backup, Spotlight/categories, vertical resizing, forty creative posture states, all phone-sized creative panes, sanitization and recorded-scenario replay.

`python3 tests/test_hosted.py` is a separate normal HTTP-origin lane. It checks secure-context initialization, persisted localStorage/IndexedDB across reload, installed service-worker offline boot, adapter metadata, actual wallpaper/modeling WebGPU execution when an adapter is available, and explicit GPU device-loss fallback. CI's SwiftShader/software adapter is not a physical GPU benchmark. A missing adapter is recorded as skipped rather than presented as executed GPU coverage.

The restricted local browser only supports content injection and cannot navigate to a localhost server. Its checks therefore exercise the Canvas fallback and session serialization/memory cabinet. The GitHub-hosted lane supplies independent origin/storage/GPU evidence. Native user-granted capture, real camera/microphone hardware, iPhone/Safari, VoiceOver, touch pen hardware and physical hinge sensing require device testing; simulated input/fixtures do not establish those results.

Tests create small OOXML fixtures to independently inspect their ZIP entries/XML and may generate failure screenshots. Failures are excluded from release source archives. Captures in `screenshots/v2-*.png` come from browser rendering, not image synthesis.
