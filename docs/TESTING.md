# Verification report

The packaged build was tested on **20 September 2026**. Machine-readable results are in `tests/browser-report.json` and `tests/static-report.json`. The build manifest identifies the exact standalone bytes by SHA-256.

## Executed browser checks

**39 checks passed; 0 failed** in the final recorded run. No unexpected JavaScript exceptions, console errors or application-initiated HTTP/HTTPS requests were recorded.

Coverage includes ten app launches with two visible panes; actual edit, post, search, comment, photo-import, storyboard, mail and messaging operations; Dijkstra connected/disconnected/identity cases; multi-stop route calculation and animation; Maps-to-WhatsApp artifact transfer; Split View resizing, swapping and named pair creation; actual bundled video playback and chapter seeking; notes and captions; editor/video DOM continuity; Home media suspension; theme and reduced-motion controls; whole-session JSON round-trip and remount; malformed data rejection; mobile pane navigation; dialog cleanup; and SVG gradient-ID uniqueness.

One check sweeps **all ten apps through four postures, 40 layout states**. Another verifies that Direct touch keeps pane navigation reachable when entered from every studio posture. These are included in the 39 checks, not 40 additional independent test cases.

The final recorded environment:

| Property | Observed result |
| --- | --- |
| Browser | Headless Chromium 144 on Linux |
| Desktop viewport | 1600 × 1100 CSS pixels |
| Phone viewport | 393 × 852 CSS pixels |
| Source loading | Offline HTML injection into a browser document |
| Secure context | No |
| `navigator.gpu` | Not exposed in that context |
| Active backdrop renderer | Canvas 2D |
| Persistent localStorage | Not available in that context |
| External requests | None recorded |

The environment's browser navigation policy blocks ordinary URL navigation. The test harness injects the generated HTML directly, without changing that policy. That provides genuine DOM, CSS, JavaScript, media and interaction coverage, but does not create an origin that supports all permission- or storage-dependent features.

## Executed static checks

**25 checks passed; 0 failed.** These parse all 15 JavaScript source modules and the embedded script, verify ten app modules, confirm that no build placeholders or external scripts/styles remain, check the nine inline media assets and their types, verify the manifest's SHA-256/byte count, and confirm that the WGSL compute/presentation entry points are included.

**Checking that shader source exists is not shader compilation.** The static checks do not prove WebGPU compatibility.

## Not verified in this environment

WebGPU shader compilation, actual compute/render execution, GPU device-loss recovery and frame time on hardware remain unverified. The source contains compilation checking and error/fallback handling, but those paths were not executed here.

Persistent localStorage behavior across normal origin reloads was not tested; in-memory state, serialization, import, validation and application remount were tested. Native camera/microphone permission grants, actual captured streams and platform clipboard permission behavior require an unrestricted origin and hardware. The permission-free local paths and cleanup contract were exercised, not a remote call.

No physical iPhone Duo, Safari, iOS attachment previewer, actual fold sensor, VoiceOver session or production security audit was used. The simulator manually controls its geometry and cannot certify actual-device compatibility.

## Reproduce

The built app does not require the test dependencies. For optional tests:

```sh
python3 -m pip install -r requirements-dev.txt
python3 scripts/build.py
node scripts/check.mjs
python3 scripts/serve.py
```

In another terminal, use your Chromium executable:

```sh
python3 tests/test_browser.py \
  --url http://localhost:8000/duo-studio.html \
  --chromium /path/to/chromium
```

The default Chromium path is `/usr/bin/chromium`; `CHROMIUM` can override it. Without `--url`, source is injected into a browser document and secure-origin features may be unavailable.

## Manual acceptance on an unrestricted host

Serve through localhost or a proper HTTPS origin. Confirm that the renderer badge says **WebGPU** before treating a run as a GPU test. Inspect compilation/validation messages in developer tools. Cycle palettes and postures, enable reduced motion, hide/restore the tab, and verify that the app remains usable if GPU initialization is unavailable.

Type into a draft, reload, and verify persistence. Export the session, reset it, and re-import the file. Repeat with imported images while monitoring storage limits. Verify that imported video is intentionally session-only.

Explicitly enable the camera/microphone preview; close and reopen its dialog, then confirm that tracks stop on close. Test denial as well as permission grant. Do not interpret the local preview as a network call.

Play and unmute each bundled video with a direct user gesture. Verify seeking, caption changes and notes. Fold while editing and while media is running. Switch apps and return. Try both orders of a media-app pair in compact mode, since real browser background-media policies can differ.

On a real phone, use Direct touch and test the virtual keyboard, safe areas, selection, scrolling and rotation. Test every control with keyboard and assistive technology before claiming accessibility conformance. Device and operating-system behavior should be recorded separately from this simulator's geometry tests.

## Screenshots

`scripts/capture.py` produces the included real-browser images by driving the generated HTML. They show the Canvas fallback actually used by the test environment. They are not image-generated mockups and do not depict native iOS execution.
