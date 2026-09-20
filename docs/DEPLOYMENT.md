# Repository and GitHub Pages deployment

Repository: https://github.com/wieslawsoltes/DuoStudio

Pages destination: https://wieslawsoltes.github.io/DuoStudio/

The site serves `dist/index.html` as its entry point. It is self-contained: scripts, styles, icons, original artwork and playable demo videos are embedded, with no CDN or application backend required. WebGPU is detected at runtime and Canvas 2D remains available when it is unsupported. These are independent local app prototypes; no messages or email are transmitted and no commercial AI or map service is contacted.

## Continuous integration

`.github/workflows/pages.yml` builds the standalone HTML, runs the source checks and Chromium interaction tests, captures all eight simulator screenshots, creates a complete source ZIP, and uploads the Pages artifact. Pull requests validate without deploying. Pushes to `main` and manual workflow dispatches deploy after validation.

The workflow requests only repository contents access for the initial import and Pages/OIDC permissions in its deployment job. It contains no user tokens or credentials. GitHub Pages must be enabled for the repository; the configure-pages action attempts initial enablement, which remains subject to GitHub's token permissions and account policies.

Published files include `/duo-studio.html`, `/downloads/duo-studio-source.zip`, `/downloads/duo-studio-source.zip.sha256`, and `/downloads/source-manifest.json` beneath the repository's Pages URL. The source ZIP includes the readable sources, media, screenshots, tests, documentation, CI workflow and standalone app, with a per-file SHA-256 inventory. ZIP contents are round-trip verified during packaging.

## Import provenance

The delivered readable source files were transferred in a lossless XZ archive with SHA-256 `1895503ad91960f177ecd321cc31c5cc47984c309c43837f5ae0867ed16d3998`. The one-time importer verifies this digest, extracts the readable files, uses the included original asset generator to regenerate the media, and reruns the build, tests and screenshot capture. It then commits the expanded files and removes the temporary transfer directory. The regenerated media, screenshot captures, build reports and source ZIP may differ byte-for-byte from the original conversation downloads because of encoder, browser, timing or dependency versions. They are not claimed to be the original binary archive.

## Local development

Run `python3 scripts/serve.py` from the repository root and open the URL printed by the server. To rebuild, run `python3 scripts/build.py` and `node scripts/check.mjs`. Browser tests require the dependencies in `requirements-dev.txt` and an installed Chromium binary. Asset regeneration is optional and requires `requirements-assets.txt` plus FFmpeg. The committed media and standalone HTML can be used without regenerating anything.
