# PULSE 1.0 release gates

Status: **1.0.0-rc.1 candidate; stable 1.0 not declared.** See QA_REPORT.md for executed evidence. An unchecked item is not a passing gate.

- [x] Actual starting main verified at 92c122379125d5f09e5b4497e959a69dc75f5818.
- [x] Preserve DB/backup v3 and compatible v1/v2 restore paths; no destructive migration.
- [x] Preserve disabled AI, Access validation, allowlists, quota coordinator and Worker migration.
- [x] First-run guide, skip/revisit and user recovery documentation implemented.
- [ ] Final current unit, browser, accessibility, PWA, migration and Worker checks recorded.
- [ ] Realistic historical backup fixtures and mid-transaction failure coverage independently reviewed against every requested case.
- [ ] Isolated-browser full-record transfer demonstrated end to end.
- [ ] Ordinary browser Back/close/modal edits and stale multi-tab save conflicts fully reviewed.
- [ ] Physical iOS/Android keyboard, install, standalone/offline, download and handoff checks.
- [ ] Native screen reader and genuine 200%/400% browser zoom review.
- [ ] Firefox/WebKit support claims backed by executed tests.
- [ ] Dependency audit reviewed and applicable vulnerabilities resolved/documented.
- [ ] Distribution ZIP inventory/checksum and credential scan verified.
- [ ] GitHub prerelease/tag publication verified (source branch alone is not a published Release).
- [ ] Cloudflare deployment and focused production mutations/export/version verified.

No stable tag while release-blocking defects or unsupported essential platform claims remain. Physical-device and assistive-technology gaps restrict support evidence; they are not claimed passed. Publish the candidate only with explicit limitations. Prefer forward fixes; never roll back to a database-version downgrade or remove the SQLite quota migration. Emergency AI disable uses AI_ENABLED=false; do not weaken authentication to recover service.
