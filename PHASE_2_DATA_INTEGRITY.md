# Phase 2 data-integrity work in progress

Baseline: Phase 1 PR #43 on top of main `356f05251438ef0b765be38a0919c4812a01ccdd`; DB and backup schema v6 unchanged. Phase 2 is not certified.

## Fix: incomplete v6 backup

Current v6 exports include all persisted store arrays. Several were previously defaulted to empty by the parser when omitted. A truncated or edited v6 JSON file could therefore validate and replace the corresponding live store with an empty one. Validation now requires each store array to be present in v6 before parsing or replacement. The existing defaults remain for older backup versions. This cannot detect data removed from an otherwise syntactically complete array; checksums and provenance are not claimed.

A regression test restores a v2 fixture, exports v6, removes each store in turn, expects rejection, and compares all existing store arrays after every rejected restore. Real historical v1 and v2 fixtures still restore and roundtrip in the test environment.

## Evidence and remaining work

- Local `npm run typecheck`, `npm run lint`, `npm test` (249 tests), `npm run build` and `npm run check:worker` passed on Node 24. The unit tests use fake IndexedDB; a passing unit test is not a physical-browser or real-device certification.
- Existing automated tests exercise upgrades originating at v2, v3 and v4, selected quota failures, stale saves, and automation replay suppression. Tests do not establish that all historical variants, all cross-tab workflows, denied storage or interrupted restores are safe. Complete the version-by-version coverage and real-browser validation before declaring Phase 2 finished.
- Production-build Playwright backup transfer, mobile and desktop, was attempted with system Chromium. Both failed before application launch: sandbox denied a Chromium local socket (`Operation not permitted`). No browser workflow result is claimed.
- Verify complete exports, restore and reload in separate real browser profiles, malformed/oversized inputs, cross-tab conflict and quota failures, offline writes, and automation after restore. Add the requested nonintrusive Personal workspace backup reminder and validate it. Review whether incomplete legacy v1-v5 files need version-specific completeness checks without breaking actual historical files.

## Phase 1 follow-up

GitHub Actions run 42212066329 for PR #43 passed all release checks on Node 22. Branch-protection API returned 403 for the connected integration; repository rulesets query returned an empty list, which does not establish the absence of branch protection. Verify protection and require `verify` in GitHub settings before relying on it to gate merges. Cloudflare automatically deploys main independently.

The October 31 GitHub Pages run 41173490663 built successfully but deployment returned HTTP 404: GitHub advised checking whether Pages is enabled. The default Pages URL also returned 404. The connection cannot read Pages settings, and documentation still advertises optional static Pages distribution, so the workflow was not retired or Pages enabled. To retain Pages, inspect Settings → Pages and enable the GitHub Actions source, then perform an explicitly authorized deployment; otherwise make a deliberate decision to retire or change the optional distribution workflow. No production deployment was made in this phase.
