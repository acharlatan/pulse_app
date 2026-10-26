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

## Iteration 06 static/PWA lifecycle

Worker/API bindings, access checks, quota class/migration and disabled AI vars are unchanged. Browser DB and backup remain v3; rollback must retain their compatible data layer and the existing SQLite migration.

The static application now registers sw.js natively with a scope derived from Vite's base path. VitePWA remains generateSW/prompt with injection disabled, skipWaiting false and clientsClaim true. Explicit approval posts SKIP_WAITING; other controlled tabs receive a notice without automatic reload. Static code is checked on focus/visibility and every 15 foreground minutes. No CRM is uploaded by these checks. Missing old route chunks produce a bounded manual recovery screen; saving unfinished work before adoption remains important, especially for pre-06 tabs that cannot retroactively gain new guards.

Production should build from a clean checkout as Workers Builds already does. Local repeated builds in this environment retained old generated assets; release QA used a fresh output directory to verify the current 30-entry precache, then passed that directory to Wrangler's dry run. Do not deploy accumulated stale asset folders or infer performance from their inflated cache size. Repository-subpath builds and real scoped offline navigation remain tested. API paths stay excluded from fallback/caching; provider credentials and responses never enter the offline app shell.

Tests in tests/pwa use a local-only static server with controlled SW comment revisions. Its /test/update endpoint is a test fixture, never a Worker route or production asset. Root and repository-scoped offline operation, multi-tab dirty editing and explicit update adoption were verified in Chromium. Native Android/iOS installation and live production cross-version sessions are separately reported; do not infer them from a build.

## Candidate release gates

Iteration 07 retains AI_ENABLED=false, Access checks, quota binding and SQLite migration. No live inference is required for verification. Keep release-candidate positioning while RELEASE_CHECKLIST.md has open gates. Source branch publication, static ZIP generation, GitHub Release publication and production deployment are distinct outcomes; verify each separately. Use forward fixes after IndexedDB v3 and retain the Durable Object migration during rollback.

## Iteration 07 public candidate

Dependency remediation, onboarding/help and stale-editor safeguards preserve the production Worker name, source-triggered deployment, API Access boundary, disabled AI and SQLite migration. The validator's patched major version increases dry-run bundle size; actual local Worker security/quota tests and bundle checks pass. Browser DB remains v3. Public support evidence is Chromium automation/mobile emulation; physical installation and assistive-technology limits remain explicit. RELEASE_CHECKLIST.md separates candidate integration from stable-only manual gates. Save edits before adopting the update, especially from pre-06 clients. Production commit/build and live smoke evidence are recorded in the final QA section.
