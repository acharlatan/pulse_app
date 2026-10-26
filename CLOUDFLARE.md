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

CRM records stay in browser IndexedDB. Export/import a backup to transfer data between hosting origins. This deployment adds hosting and a disabled optional AI endpoint, not CRM synchronization. Browser-local workspaces remain authoritative. No existing secret is reused or exposed.

## Iteration 05 Worker architecture

`worker/index.ts` exports the fetch handler and SQLite Durable Object `AIQuota`. Static Assets use the `ASSETS` binding and unchanged SPA fallback; `run_worker_first` targets only `/api/*`. Public `GET /api/ai/status` exposes availability, never credentials. `POST /api/ai/generate` is disabled unless all configuration is present. Missing configuration returns 503; enabled requests require a signed Cloudflare Access application JWT validated for issuer, configured audience, expiry and RS256 signature against the fixed team JWKS endpoint. No frontend bearer secret or client-supplied identity is trusted.

The `pulse-ai-v1` migration adds the SQLite quota class; it does not touch browser IndexedDB. A single global quota coordinator is intentional for exact global spend-admission ceilings, not general CRM request serialization. It stores only request UUID, hashed Access subject, timestamp and active lease. The finite ledger is bounded to 200 lifetime admissions. No CRM text, provider response or private key is stored there. Worker observability is disabled and application code never logs request bodies.

### Safe activation procedure (not performed in this iteration)

1. Revoke any previously exposed provider credential. Obtain a fresh key in Google AI Studio and restrict it to the intended API/project. Never paste it into chat or source.
2. Configure a Cloudflare Access self-hosted application protecting this Worker's `/api/ai/generate` path with an explicit operator allow policy. Do not use an everyone-allow policy. Ensure the workers.dev route and any alternate hostname have the same protection; server JWT verification remains mandatory even if a route is bypassed. The operator must establish an Access browser session before generation. This release has no automatic login/OAuth flow; a missing session fails closed with an explanatory error.
3. Set the non-secret Access application audience (`ACCESS_AUD`) and team hostname (`ACCESS_TEAM_DOMAIN`, e.g. `your-team.cloudflareaccess.com`) in reviewed Worker configuration. Store a fresh `GEMINI_API_KEY` only as a Worker **secret** through the Cloudflare dashboard or `npx wrangler secret put GEMINI_API_KEY`. No key value belongs in `.dev.vars`, browser settings, a build variable or Git. Local development may use a private ignored `.dev.vars`, but never a production key in tests.
4. Confirm the provider project's actual free quota, billing state and data-use terms, and the Cloudflare account's applicable quotas. This implementation introduces no subscription or billing change. The pinned allowlisted model is `gemini-3.5-flash-lite`; changing a model requires reviewing server code, prices, limits and tests together.
5. Only after access and limits have been tested, change `AI_ENABLED` to `"true"` in reviewed source configuration and deploy. `wrangler.jsonc` currently explicitly deploys `"false"`; dashboard variable changes alone are overwritten by a subsequent source deployment. Verify authenticated success, anonymous refusal and account/provider usage before broader use.

To disable quickly, deploy `AI_ENABLED="false"` (and disable/revoke the provider key if needed). Disabling the workspace preference stops that browser's requests; it is not a server-wide kill switch. Never authorize a frontend to change these controls.

### Enforced admission limits

- Strict supported-operation schema; JSON POST only; 48,000-byte request body and bounded strings/records.
- Five admissions per verified operator in a rolling ten minutes; 20 globally per UTC day; **200 lifetime** across deployments sharing this quota object; at most two active leases (90-second expiry).
- Stable request UUID replay rejection, transactional SQLite admission and no automatic retry. Errors consume their admission because a provider attempt may have incurred cost. Releasing a lease does not refund counts. Provider timeout 20 seconds; JWKS timeout 5 seconds; browser timeout 30 seconds.
- Fixed model/endpoint, no tools, no arbitrary URL fetching, 1,000 output-token maximum, 60,000-byte provider-response limit, structured response validation and approved-reference checks. Incomplete/malformed responses fail without writing CRM data. API responses are `no-store` and excluded from service-worker caching.

These are conservative request/token ceilings, **not a guaranteed dollar budget** or proof of unlimited free access. As checked 26 October 2026, Google's standard published Flash-Lite 3.5 rates are $0.30 per million input tokens and $2.50 per million output tokens; free availability and provider quotas vary by account. Check current official pricing/limits before activation. No paid inference was exercised here. There is no public quota-reset endpoint; reaching the lifetime cap requires deliberate operator review/code maintenance, not silently changing the object name.

### Official references and known boundaries

- [Cloudflare Static Assets routing](https://developers.cloudflare.com/workers/static-assets/routing/advanced/serving-a-single-page-application/)
- [Access JWT verification](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/)
- [Durable Objects SQLite storage](https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/)
- [Gemini models](https://ai.google.dev/gemini-api/docs/models), [pricing and data-use distinction](https://ai.google.dev/gemini-api/docs/pricing), [rate limits](https://ai.google.dev/gemini-api/docs/rate-limits), [structured outputs](https://ai.google.dev/gemini-api/docs/structured-output)

No live Gemini key, Access application or paid billing was configured during implementation. Quotas and provider/auth failure paths are tested with synthetic credentials, plus a real local workerd/SQLite test. Live provider quality, account authorization and actual cost must be verified during activation. Google Calendar/Gmail/Contacts OAuth, cloud storage of CRM records, scheduled background AI and automatic message sending remain unimplemented.

Keep the Durable Object class and migration when rolling back frontend code. Do not remove the deployed SQLite binding or change its identifier to evade usage history. Browser DB remains v3; prefer forward fixes over database downgrades.
