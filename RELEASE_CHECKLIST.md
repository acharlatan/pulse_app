# PULSE 1.0 release gates

Status: **public 1.0.0-rc.1 candidate; stable 1.0 not declared.** QA_REPORT.md distinguishes full runs, focused reruns and unexecuted checks. Deploying this explicitly limited candidate is authorized; it does not mark the stable-only manual gates complete.

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
