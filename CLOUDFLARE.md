# PULSE on Cloudflare Workers

Worker name: `pulse`. Repository: `acharlatan/pulse_app`, production branch `main`.

`wrangler.jsonc` deploys the Vite `dist` folder as Workers Static Assets. No backend or database migration is required. CRM records stay in the browser; export/import a backup to transfer data between hosting origins.

## Complete Workers Builds setup

Open Worker `pulse` → Settings → Builds. Connect/select GitHub repository `acharlatan/pulse_app` and authorize a deployment API token in the dashboard. The repository connection has been registered, but a production build trigger and successful app deployment have not yet been verified.

- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Root directory: `/`
- Production branch: `main`
- Set `VITE_BASE_PATH` to `/` if specifying it; do not use the GitHub Pages repository subpath here.

Run the initial build and check the deployment logs. The initial Worker only returns a 503 deployment-pending message until the real app assets are deployed. Do not treat its existence as a live app deployment.
