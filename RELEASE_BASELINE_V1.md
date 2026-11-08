# Stable V1 release baseline

Baseline inspected 2026-11-06: main `356f05251438ef0b765be38a0919c4812a01ccdd`, package `1.5.0-rc.1`. Stable is not declared. The separate release checklist contains historical candidate sections; do not interpret their checked boxes as certification of this baseline.

## Feature freeze and boundaries

The existing Today, People, Work and Insights areas include local contacts, companies, relationship history, follow-ups, opportunities and pipelines, Focus, Orbit, reports, search, CSV import, JSON backup/restore, PWA support, local rules and optional reviewed Google actions. DB/backup v6 and the Durable Object migration remain intact. AI generation is disabled in the deployed configuration; Spanish and French are incomplete. Local automation runs only while the app is open. Cloud sync, accounts, subscriptions, autonomous outreach, major integrations, additional workspaces and major redesigns are outside this release. Existing capabilities are inventory, not assertions that all release gates have passed.

## Hosting and verification

Cloudflare API inspection linked active deployment `64116750-5c81-4595-b7aa-bcb14201c0ca`, version `8112ee4b-7293-439d-8f40-1ab41d93c98b`, to successful Workers Builds build `1658b078-a811-470a-8691-c21efd44faed`, triggered by main commit `356f05251438ef0b765be38a0919c4812a01ccdd`. The configured trigger builds and deploys pushes to `main`. These are deployment metadata, not a live functional acceptance test. For later releases, query the active deployment's version ID, look it up in Workers Builds, and record its build outcome and trigger commit; validate the live application separately. Never merge to main during an unapproved release: that triggers production.

The Pages workflow and README also describe an optional static distribution. The default Pages URL returned 404 during inspection; that alone does not prove there are no other users or Pages settings. The push-triggered Pages workflow is retained until its intended support and failing deployment are resolved. Release checks now run independently on PRs and main, but branch protection and remote execution must be verified separately.

## Release issue priorities

- P0: any confirmed data loss, unsafe restore/migration, workspace isolation failure, or unmitigated release-blocking security issue blocks release. Data-integrity gates are not yet certified.
- P1: clarify and repair the Pages deployment failure without withdrawing a supported distribution inadvertently; verify independent CI remotely, branch protection, full browser/PWA regression, offline updates, accessibility, physical devices and supported browsers. Validate core workflows and deployment on a clean profile.
- P2: build chunk and dependency-tool warnings, documentation consolidation and targeted usability polish if they do not impair essential workflows.

Run `npm ci`, `npm audit`, `npm audit --omit=dev`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run check:worker`, and the configured production browser and PWA suites before release. Record exact versions, commands, failures and unavailable checks. A passing local build does not certify release readiness.

## Security audit at baseline

On 2026-11-06, `npm audit` reported 11 affected dependency entries: two low and nine moderate; `npm audit --omit=dev` reported zero. These entries represent three underlying advisories; the other eight are dependants. All occur in development/build tools, not the audited production dependency graph. Audit classification does not by itself prove exploitability or exclude vulnerabilities in bundled code.

| Advisory | Affected path | Risk and disposition |
| --- | --- | --- |
| GHSA-gcqx-w48m-w2h4 | `workbox-build` → `@rollup/plugin-node-resolve` → `deepmerge@4.3.1` | Low, prototype poisoning in returned merged objects if attacker-controlled keys reach a vulnerable merge. Build-time use; reachability not proven. Registry reported 4.3.1 as latest; no compatible patched version identified. Track upstream and avoid untrusted build inputs. |
| GHSA-3g3m-2fjr-6pw4 | `workbox-build` → `glob@11.1.0` | Moderate, cancellation can fail to stop filesystem traversal. Build-time exposure, not established as reachable from application users. Patched `glob` 14.0.4 is outside the transitive major range; do not force it without a compatibility review of Workbox. |
| GHSA-g3hv-75wg-m249 | `glob` and `@typescript-eslint/typescript-estree` → `minimatch@10.2.6` | Moderate, denial of service from crafted glob patterns. Affects build/lint tooling; attacker-controlled patterns not demonstrated. Patched 11.0.5 is outside current major ranges and requires compatibility review. |

The 11 affected entries were `deepmerge`, `@rollup/plugin-node-resolve`, `glob`, `minimatch`, `workbox-build`, `typescript-eslint`, `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser`, `@typescript-eslint/type-utils`, `@typescript-eslint/typescript-estree` and `@typescript-eslint/utils`. npm's `fixAvailable` response is not proof of a compatible complete fix: a non-forced lockfile refresh left all 11 findings and was discarded. No advisory is currently assessed as release-blocking on the observed build-time exposure, subject to re-audit and changes in build-input trust. Major transitive overrides were not forced.

The Cloudflare trigger builds and deploys independently on a main push; the separate GitHub check does not itself prevent deployment. Branch protection / rules must require the check before merging if it is to serve as a release gate. Confirm GitHub settings and the first remote run; local execution does not establish that enforcement.
