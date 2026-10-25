# Iteration 01 verification

Date: 25 October 2026. This report distinguishes executed checks from supplied tests and planned verification.

## Executed automated checks

- `npm run typecheck`: passed, strict application TypeScript.
- `npm run lint`: passed, ESLint and hook rules.
- `npm test`: passed, 18 tests across 2 files (17 data/rules tests plus 1 React Testing Library form test).
- `npm run build`: passed, Vite production build and Workbox service-worker/precache generation.
- `VITE_BASE_PATH=/pulse/ npm run build`: passed; generated HTML/manifest/worker paths inspected for the subpath.

Coverage includes company/person creation and linking, editing and DB reopen persistence, dangling-reference rejection, meaningful interactions vs notes, task completion/idempotency, overdue dates, company detach deletion, contact dependency deletion, theme/settings persistence, transactional backup restore, invalid/duplicate backup rejection, demo reset isolation, timeouts, do-not-contact and withdrawn permission suppression, dismissals, priority thresholds and independent restriction preservation.

## Executed browser workflow

Used the actual Vite app in Chrome via the managed preview. Opened the welcome page and entered demo. Created Jordan Example, linked to Forma Studio, searched and opened the profile, saved a note and outcome, created a linked follow-up, changed lifecycle to Proposal, saved a temporary timeout, completed the task, selected dark mode and reloaded. Verified the contact, note, task and dark theme remained; the company profile showed the new representative and saved story. Verified generated Home activity reflected the saved note and task. Fictional records only.

The browser uncovered a non-HTTPS preview problem (`crypto.randomUUID` absent); stable random IDs now use Web Crypto bytes as fallback. Fixed a mobile CSS selector that also hid alerts. Increased mobile metadata/body text size after visual review. Fixed completed-task display to use completion timestamp. No browser data was copied into source seed data.

## Responsive checks

The development-only `tests/visual.html` fixture embeds the real app at specified CSS viewport widths. Browser actions selected each screen/width and measured `documentElement.scrollWidth <= documentElement.clientWidth` through its visible Audit control.

| Screen   | 320  | 375  | 390  | 430  | 768  | 1024 | 1280 | 1440 |
| -------- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- |
| Home     | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| Network  | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| Company  | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| Contact  | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| Settings | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| Activity | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| Pipeline | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

These are DOM overflow checks, not a claim that every pixel at every size was visually reviewed. Desktop screenshots (approximately 1365px) and 320/390px iframe screenshots were inspected for visual hierarchy, directory layout, forms and dark settings. Browser iframe scrollbars reserve up to 15px, giving conservative available content width. Native phone browser keyboards, safe-area behavior on hardware, every settings subpanel and stress tests with very large datasets remain unverified.

## Supplied but not executed

`tests/browser/journey.spec.ts` and `playwright.config.ts` provide a portable mobile/desktop regression suite. The `npm run test:browser` CLI suite was not run in this managed environment; browser interactions used the supported browser tool instead. No claim that this supplied CLI suite passed.

## PWA and hosting verification limits

Manifest/icons and service worker build successfully at relative and `/pulse/` bases. Workbox precaches the app shell and lazy route bundles without external API caching. A user-facing update prompt avoids unsolicited refreshes. The HTTP preview cannot establish normal PWA secure-context behavior. Physical iOS/Android installation, offline reload/navigation and update adoption are not verified. Local IndexedDB persistence is tested independently.

GitHub Pages workflow supplied; not run on GitHub because no GitHub repository was identified in this request. A separate hosted preview is deployed through the Sites workflow. It was created private and then set to public to satisfy the requested no-registration demo. Anonymous welcome/demo access was verified in Chrome after publication.

## Remaining quality work

Formal contrast/WCAG and screen-reader audit, native mobile keyboard/device testing, long-text and large-import browser stress, cross-tab conflict resolution, end-to-end restore through file chooser, physical PWA testing. These limits do not replace the executed data-integrity tests above.

# Iteration 02 verification

Date: 26 October 2026 (Asia/Manila). Earlier sections document iteration 01 and remain historical.

## Executed checks

- Strict TypeScript and ESLint: passed.
- Vitest: 27 tests passed across 2 files. Existing tests retained; coverage expanded for historical company attribution, representative moves, corrected/deleted conversations, task reschedule/reopen/delete and link cleanup, deal CRUD/outcomes, invalid representatives, timeout start/expiry/history, independent do-not-contact, marketing withdrawal, permission duplicates, timezone/DST date classification, version-one backup compatibility, and detailed restriction evidence preservation.
- Production Vite build: passed. A separate clean output build (`npm run build -- --outDir /tmp/pulse02-final-build`) also passed, producing 23 app-shell precache entries. Cloudflare uses the unchanged standard build command and dist asset directory.
- Playwright: all 8 browser cases passed across mobile (390×844) and desktop (1440×1000) projects. The original journey now waits for saved UI state before reload and disambiguates the existing search link versus textbox. No assertions were removed.
- Browser coverage: personal Northstar company with 3 representatives, conversation + note, opportunity with 2 people/value/close date, task rescheduling, timeout reason, interaction correction, Negotiation→Won, theme/reload persistence, company aggregation without duplicate conversations, task complete/reopen, explicit interaction/task/opportunity deletion, and separate marketing-withdrawal permission persistence.
- Programmatic layout audit: Home, Network, company profile, person profile, Pipeline, Activity and Settings at 320, 375, 390, 430, 768, 1024, 1280 and 1440px in light and dark. No page overflow. Contact, opportunity and availability dialogs fit the viewport and have no internal horizontal overflow. Northstar checks also exercise task-editor bounds at every width.
- Visual inspection: actual rendered 390px light contact profile and 1440px dark contact profile screenshots reviewed. Refined mobile action labels and primary action ordering. Full-page screenshots include fixed navigation at the capture viewport's bottom; this is expected capture behavior, not a claim that all page content is simultaneously visible.

## Test environment

Standard Playwright browser download failed with a truncated archive. Used a temporary Chromium 153 binary from the npm-distributed @sparticuz/chromium package, outside the repository, with local software rendering. `PULSE_CHROMIUM_PATH=/tmp/pulse-chromium npm run test:browser -- --workers=1` executed successfully. No browser package was added to application dependencies. Playwright defaults remain normal installed Chromium when the optional executable override is absent. Local test server binds loopback explicitly to avoid the environment's network-interface enumeration error.

## Compatibility and remaining limits

No DB structure or index changes; IndexedDB and JSON backup versions stay at 1. Restore deterministically aligns deal outcome with stage. Data remains isolated by demo/personal workspace. Interaction company attribution is historical; task assignment follows the current chosen person on save. Custom covers, custom pipelines, drag-and-drop, rich author tracking, advanced consent audit/export, cross-tab conflict resolution and large-directory pagination remain deferred. Timeline entries are paged in groups of 20.

Physical mobile keyboard, screen-reader/contrast audit, iOS/Android installation and real offline/update lifecycle still require device testing. Automated layout bounds do not certify every touch interaction, long-text extreme or WCAG conformance. No AI, messaging, synchronization, account service or new secrets were introduced.

## Deployment

Changes prepared on development/iteration-02. Production deployment is verified after integration through the existing Cloudflare Workers Builds connection; the delivery report records the resulting commit and build outcome. Do not interpret local build success alone as a production deployment result.

# Iteration 03 verification

Date: 26 October 2026 (Asia/Manila). Iterations 01–02 above remain historical reports.

## Executed automated verification

- `npm run typecheck`: passed, strict TypeScript.
- `npm run lint`: passed.
- `npm test`: 57 passed across 3 files (26 retained CRM tests, 1 retained form test and 30 intelligence/import/migration tests). Two legacy inactivity tests now supply real recorded conversations instead of using contact creation dates as evidence. The completed-task test isolates task behavior with no-history suggestions disabled. No tests were removed.
- Production build passed via the standard build script with a clean output directory: `npm run build -- --outDir /tmp/pulse03-release-build`. Vite generated the manifest and 27 offline app-shell precache entries. Existing Cloudflare command/config remain unchanged. Vite reports a non-fatal main-chunk warning at approximately 505 KB minified / 153 KB gzip. CSV/Papa Parse and the new feature routes are lazy loaded.
- Playwright: 14 cases passed across the mobile (390×844) and desktop (1440×1000) projects using `PULSE_CHROMIUM_PATH=/tmp/pulse-chromium npm run test:browser -- --workers=1`. Chromium 153 and the optional executable override are the same temporary test environment described in iteration 02. No browser binary or test-only browser dependency is committed. A final targeted four-case import/wizard run also passed after the conflicting-domain safeguards; the repeat-import helper uses the real restart action rather than relying on rapid same-hash route changes.

## Functional coverage

The new data suite covers normal/priority thresholds, cooling/dormant/unknown history, sourced imported dates, overdue ordering and recalculation, timeout ending versus do-not-contact/withdrawal, persistent snoozes/expiry/new evidence, stable deal keys, opportunity deadlines/stalls/closed outcomes, ALL/ANY list matching and dynamic membership, list CRUD/persistence/invalid definitions, CSV BOM/quotes/commas/newlines/empty fields, mapping conflicts, invalid names/emails/enums/websites/dates, company matching, conflicting websites within a file and against existing companies, reserved-looking company names, duplicate contacts and in-file duplicates, selected-field updates, blank preservation, restriction/consent preservation, reimport defaults, stale previews, missing references and transaction rollback after a simulated storage failure.

Migration testing creates a real version-one Dexie database with old settings and contact records, closes it, then opens version two and verifies retained records/default intelligence settings. Backup tests round-trip new tables and accept v1-shaped data with defaults; invalid references leave the current workspace intact. Separate demo/personal import databases verify isolation.

Browser acceptance imports two seed contacts then an 80-contact fictional CSV across 15 companies. It verifies a selected duplicate role update, a skipped duplicate, 78 newly created contacts, 13 new companies alongside the two existing companies, correct directory membership, profile provenance, no fabricated interactions and reload persistence. It exports a real backup file, validates the replacement preview and cancels without mutation; a malformed backup is rejected while all 80 contacts remain. Additional browser workflows cover overdue rescheduling, snooze/refresh/unsnooze, custom list creation/persistence and automatic removal after a follow-up completes. Previous opportunity/profile/task/interaction/permission/theme journeys still pass.

## Responsive and visual verification

Programmatic page-width checks cover Home, Network, company/person profiles, Pipeline, Activity, Settings, Relationship Review, Smart Lists and the import entry screen at 320, 375, 390, 430, 768, 1024, 1280 and 1440px in light/dark themes. No page overflow was detected. Existing profile/opportunity/availability dialog bounds remain tested.

A separate wizard audit checks mapping, expanded duplicate comparison, and confirmation at every requested width in both themes. It checks that the final Apply control can scroll clear of the fixed mobile navigation. Actual 390px light/dark import confirmation screenshots were inspected internally. No owner-supplied screenshots or visual approvals were requested. These checks do not constitute a formal contrast/screen-reader or physical keyboard/device audit.

## Scale and limits

Data tests build imports and derive intelligence at 10, 100 and 1,000 contacts, and commit the 1,000-contact plan successfully. These are synthetic desktop test-runtime checks, not proof of 1,000-record UI performance on ordinary phones. CSV is bounded to UTF-8, 2 MB, 2,000 rows and 40 columns; parsing/validation are local bounded main-thread operations with busy feedback. Duplicate rows/company decisions are paged, timelines/reviews/lists are incremental, and Network initially renders 60 matches. Larger-file workers, standalone company-only CSV/list workflows, XLSX, fuzzy matching/enrichment, advanced consent audit, encrypted backups, cloud recovery and cross-tab conflict resolution remain future work.

## Compatibility and deployment boundary

DB v2 adds only Smart Lists, review actions and import history, and supplies default settings without deleting old records. Optional provenance/source fields leave old records readable. Backup format 2 includes these tables and metadata; format 1 restores remain accepted. An old backup replaces the current workspace, including empty defaults for new tables, as explicitly disclosed by restore confirmation.

After a database has upgraded, any source rollback must retain the v2-compatible data layer; do not deploy a database-version downgrade or discard new-table backups. Prefer a forward fix. The additive schema and feature branch preserve source history and existing record data.

Changes are prepared on development/iteration-03 and are integrated only after checks pass. Production build and live behavior verification are recorded in the delivery report after integration; an HTTP 200 alone is not treated as workflow proof. Physical PWA installation, full offline/update adoption and device keyboard behavior remain unverified. No AI, credentials, outreach delivery, synchronization or paid backend was introduced.
