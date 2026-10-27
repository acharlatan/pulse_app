# PULSE release gates

Current candidate: **1.2.0-rc.1 (iteration 09); stable release remains undeclared.** The 1.0/1.1 sections below retain historical evidence; current gates are in the iteration09 section. QA_REPORT.md distinguishes full runs, focused reruns and unexecuted checks. Deploying this explicitly limited candidate is authorized; it does not mark the stable-only manual gates complete.

## Candidate integration

- [x] Actual main verified at 92c122379125d5f09e5b4497e959a69dc75f5818; candidate tree matched the published release branch.
- [x] DB/backup v3 preserved, historical v1/v2 exports restored, current ledger/quest roundtrips and mid-transaction rollback tested.
- [x] AI remains disabled; Access validation, allowlists, quota coordinator and SQLite migration preserved.
- [x] First-run guide, skip/revisit, empty Personal workspace, Help and recovery/install/release guides implemented.
- [x] Strict typecheck, lint, unit/Worker tests, production build, Worker dry run and Pages subpath build pass.
- [x] All 42 browser cases demonstrated across the full run and focused reruns; no claim of a single clean full run.
- [x] Isolated-browser export/restore/reload compares all exported record arrays, with independent active-progress roundtrip coverage.
- [x] Storage-denied recovery, quota rollback, modal warnings, internal-link/workspace guards and stale record saves reviewed/tested.
- [x] Dependency audit has zero known findings at verification; targeted distributed-asset credential scan passed.
- [x] Static ZIP inventory, integrity and SHA-256 verified; source release notes/build instructions prepared.
- [ ] Final Cloudflare automatic deployment/version and focused live mutation/export/update checks recorded.

## Stable-only verification / distribution limits

- [ ] Physical iOS/Android keyboard, install, standalone/offline, downloads and handoffs.
- [ ] Native screen reader and genuine 200%/400% browser zoom review.
- [ ] Firefox/WebKit checks before claiming those platforms verified.
- [ ] Broader historical-client/live-CDN update transition evidence.
- [ ] GitHub prerelease/tag publication (not available through connected write tools; source branch and packaged build are separate).

Save before browser Back. There is no persistent draft recovery or universal conflict resolution. Stale-save checks apply to person, company, task, opportunity and conversation editors; settings and other editors remain single-editor workflows. Unknown physical-device behavior is not marked passed. No confirmed P0 defect remains in the exercised candidate journeys; any new P0 blocks deployment, and confirmed P1 defects must be fixed or affected support claims restricted.

Keep the release-candidate label while stable verification remains open. Rollback/forward fixes must retain IndexedDB v3 compatibility and the existing SQLite quota migration. Emergency AI disable uses AI_ENABLED=false; never weaken authentication to recover service. See CLOUDFLARE.md.

## Iteration 08 — 1.1.0-rc.1 candidate

Historical 1.0 checklist above remains release evidence for that candidate. This iteration does not declare stable 1.0 or 1.1.

- [x] Stable pipeline identities, separate lifecycle/outcome meanings and transactional impact mappings.
- [x] Actual v3 upgrades, failed-upgrade rollback, reward/correction/list preservation and historical backup fixtures.
- [x] Typed custom fields, legacy organization data, Focus state and full v4 backup validation/restore.
- [x] Selected-only bulk writes, stale-selection rejection and storage-failure rollback.
- [x] Strict TypeScript, ESLint, 145 unit/Worker tests, production build, Worker dry run and repository-subpath build.
- [x] Production PWA/offline/update and 100/1000-contact tests (10 Chromium cases).
- [x] Clean full browser run: 48/48 passed after accessibility/selector fixes; recorded in QA_REPORT.md.
- [x] Final production PWA rerun: 10/10 passed.
- [x] Owner explicitly granted standing merge/update/deployment authorization; PR #2 merged.
- [x] Cloudflare automatic build succeeded for 6b30c2c; actual live persistence/custom fields/Focus/export checks recorded in QA_REPORT.md.

Stable-only platform gates above remain open. Retain v4-compatible data code for forward fixes after upgrade. Do not deploy an old database client to migrated devices.

## Iteration 09 — 1.2.0-rc.1 candidate

- [x] Shared editorial system, action-first Home, directory modes, profile identity and secondary-route refinements.
- [x] Desktop Discover/mobile More, scoped real Relationship Orbit and accessible List/navigation alternatives.
- [x] Local portrait/logo/cover/workspace identity; validated bounded crop/compression and atomic cleanup.
- [x] DB/backup v5, supported v1–v4 restores, real upgrade/roundtrip/corrupt/quota rollback and isolation tests.
- [x] Typecheck, lint, 156 unit/Worker tests, clean build, Worker dry run and repository-subpath build.
- [x] Existing AI/Access/quota/migration boundary remains unchanged and disabled.

Final browser/PWA/publication evidence is recorded in QA_REPORT.md and RELEASE_1_2.md. Existing native-device, browser-engine and assistive-technology stable-only gates remain open. Retain v5-compatible forward fixes after database migration; do not downgrade the client schema.

- [x] All 56 distinct browser cases demonstrated across the compiled full run and corrected 10/10 rerun; no single-clean-run claim.
- [x] Final PWA12/12 and absolute-subpath2/2, including saved offline photos, update safety and scale.
- [x] Color-transition contrast defect fixed, test startup readiness strengthened, assertions retained.
- [x] Comprehensive A–O report in RELEASE_1_2.md; exact release/live deployment record in PR #3.
- [x] Active image-editor axe checks, actual saved-media screenshot review and missing-Blob fallback verified.


## Iteration 10 release gates

Verify stage transitions and configuration remaps, disabled drafts, eligibility/restrictions, duplicate suppression across tabs, failed-write rollback, no replay after restore, legacy backups and v6 media round trips. Check analytics date/timezone boundaries, historical company attribution, separate currencies and safe CSV; test foreground and offline behavior, responsive views, axe, production build and Worker smoke. Do not present a Worker HTTP response alone as deployment verification.


## Iteration 11 release checks

Validate scope isolation, token expiry and clearing, reviewed event creation and stable duplicate recovery, selected Contacts import and duplicate decisions, no automatic sending, v6 backups and offline operation. Distinguish mocked-provider tests from real authorized Google tests and report all deployment evidence.
