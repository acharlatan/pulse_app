# Phase 3: core workflow QA

Starting point: main `356f05251438ef0b765be38a0919c4812a01ccdd`, plus unmerged Phase 1 PR #43 and Phase 2 PR #44, whose head was `8f886213c82f60cc7c98ad972819d46cc4568f44` when this branch was created. Phase 3 is stacked on Phase 2; none of these changes are in production merely because they are tested here.

## Verified workflow and evidence

The end-to-end Playwright journey uses an empty Personal workspace and creates its fictional company, person, conversation, follow-up and opportunities through the interface. It chooses, completes and reopens the follow-up, checks Today, Work, People and Analytics, moves an opportunity through two stages, inspects saved relationships in Orbit, and exports and restores in an independent browser context. Backup inspection is read-only and checks associations, transitions and restored arrays. No database edits or fabricated activity are used.

GitHub Actions run 42237316846 passed 14 focused desktop/mobile-width browser cases on the Phase 3 candidate, including that full journey, mixed currency totals, an overdue follow-up, global search and workspace privacy, editing and detaching company-linked records, Orbit movement/reduced-motion/list behavior, Analytics source navigation and Focus navigation. Later additions expand checks to opportunity preservation after deletion, restricted automations, and cross-surface state after reopening. Consult the latest check for their exact result. Browser emulation is not a physical phone test.

Existing 259 unit tests cover restrictions and withdrawn permissions, local automation deduplication and replay boundaries, stage transitions, separate currencies, historical company attribution, task completion/reopening, company/contact deletion, and overlap projection. A flaky dialog test now waits for the actual follow-up dialog instead of a transitional notice. This corrects the test timing and does not claim a product defect was fixed.

## Open release issues

- P1: people and companies have no archive action; only deletion is implemented. Company deletion preserves and detaches related records, but contact deletion intentionally removes its interactions and follow-ups after confirmation. An archive capability or an explicit change to the release requirement needs a product decision; this phase does not add a new data model.
- P1: backups larger than 32 MiB cannot be restored by the current picker; Phase 2 adds a warning but not large-file recovery.
- P1: branch protection remains unverified because the connected integration received 403, and GitHub Pages configuration remains unresolved. Cloudflare deploys main independently.
- P1: a broader exploratory browser run found outdated selectors in Orbit, Analytics and onboarding tests. Some may be test drift; a clean full regression is still needed before stable release. The focused suite is not a full regression.
- Physical iOS/Android, Firefox/WebKit, native screen readers and all real-world network/device conditions remain unverified. Orbit overlap mathematics is covered by unit tests; browser motion is checked with viewport emulation, not a physical touch device.

No production code or database schema was changed for Phase 3. Browser tests run only on synthetic data. Review the current CI and open issues before advancing; these checks do not certify the entire product.
