# Installation and self-hosting

The hosted web app is the primary distribution. Installation is optional.

- iPhone Safari: use Share → Add to Home Screen when available.
- Android or desktop Chromium: use the browser's Install app/Add to Home Screen control when offered.
- Other browsers: use the website normally. Installation UI varies by browser/OS.

Open the workspace online first and wait for offline availability. The cached app can use local records offline; external services require their own connectivity. Automated Chromium manifest/service-worker checks are not proof of physical iOS/Android installation. Physical device and native screen-reader QA remain pending for this candidate.

## Own deployment

Use Node 22+ and npm: `npm ci`, `npm run build`. Serve the generated `dist` directory over HTTPS (or localhost for development). Do not open index.html directly as a file. Hash routes do not require server route rewriting.

For a repository path, use `VITE_BASE_PATH=/pulse_app/ npm run build`. The included Pages workflow builds a matching path. Cloudflare uses the existing wrangler configuration; see CLOUDFLARE.md.

A packaged static frontend contains no Cloudflare AI service. CRM operations remain local; the API availability check fails safely when no protected backend exists. A ZIP is a web distribution, not a native app. Moving the hosting origin requires backup transfer; browser storage does not follow the URL.

Use clean build output for release packaging. Exclude credentials, databases, logs, dependency caches and local development files. Preserve MIT attribution. Do not downgrade the IndexedDB v3 data layer or Cloudflare Durable Object migration on rollback.

## Reproducible static package

After a clean build, run `PULSE_DIST=/absolute/path/to/build node scripts/package-static.mjs`. This writes a ZIP and SHA-256 file under `.codex/distribution/`. Its inventory admits only web assets and public guides. Serve it over HTTPS; it excludes the protected AI backend. Publication to GitHub Releases is separate and must be verified.
