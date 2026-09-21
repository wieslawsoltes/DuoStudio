# GitHub Pages deployment

Repository: `wieslawsoltes/DuoStudio`; branch: `main`. Public root: `https://wieslawsoltes.github.io/DuoStudio/`.

The Actions workflow checks out source, builds the standalone HTML/PWA, validates source, runs original/creative/hosted tests, captures the gallery, and packages complete sources with CRC/SHA-256 verification. PRs upload validation reports and test screenshots without deploying. Main builds stage `dist`, documentation, screenshots and downloadable archives as a Pages artifact. The deploy job uses Pages write + OIDC permissions only.

`verify-pages.yml` runs after a successful deployment workflow and checks the public HTML, the embedded twenty-app inventory, build SHA-256 and every source archive entry. Deployment success is distinct from native-device certification.

`duo-studio.html` is a fully embedded standalone file. `manifest.webmanifest`, `sw.js` and two original icons are separate hosted installation files. Their URLs are relative so the project works under a GitHub Pages subdirectory. Service-worker registration is opt-in via Device lab. Rebuild changes the cache version using the HTML digest; a newly installed worker takes over after old clients close unless explicitly activated.

Cabinet content, document edits and generated exports remain in each browser, not in GitHub. No secret, API credential or server-side service is required.
