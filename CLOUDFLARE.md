# PULSE on Cloudflare Workers

Worker: `pulse`. App URL: https://pulse.icareaboutyoufam.workers.dev

Repository `acharlatan/pulse_app` is connected to Workers Builds. Pushes to `main` automatically build and deploy. The initial production build completed successfully on 25 October 2026 UTC.

## Build configuration

- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Root directory: `/`
- Production branch: `main`
- Worker configuration: `wrangler.jsonc`

The Vite `dist` folder is deployed as Workers Static Assets. If setting `VITE_BASE_PATH`, use `/`, rather than the GitHub Pages repository subpath. View builds in the Cloudflare dashboard under Worker `pulse` → Settings → Builds.

CRM records stay in browser IndexedDB. Export/import a backup to transfer data between hosting origins. This deployment adds hosting, not synchronization or an AI agent. Gemini remains a future optional integration. Never put provider keys in the frontend or repository; future AI requests must use a secure Worker endpoint with secrets, explicit record selection, validation, and rate limits.
