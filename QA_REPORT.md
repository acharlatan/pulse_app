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

# Iteration 04 verification

Date: 26 October 2026 (Asia/Manila). Earlier iteration reports remain historical.

## Executed checks

- `npm run typecheck`: passed (strict application TypeScript).
- `npm run lint`: passed.
- `npm test`: **93 tests passed across 4 files**: all 57 prior tests retained, plus 36 progress/reward/migration tests. Existing assertions that export/database versions equal 2 now expect version 3; compatible v1/v2 restore tests remain explicit. No assertions for functioning CRM journeys were removed.
- `npm run build -- --outDir /tmp/pulse04-release-build`: passed. Generated manifest and 27 app-shell precache entries (~838 KiB). Nonfatal Vite warning: main chunk ~518 KB minified / 157 KB gzip. No deployment, PWA, routing, dependency or hosting changes were required. Package version is 0.4.0.
- `PULSE_CHROMIUM_PATH=/tmp/pulse04-chromium LD_LIBRARY_PATH=/tmp:/tmp/pulse04-browser-libs/lib VK_ICD_FILENAMES=/tmp/vk_swiftshader_icd.json npm run test:browser -- --workers=1`: **18 browser cases passed**, across mobile 390×844 and desktop 1440×1000 projects. A prior focused four-case progress run also passed before the final safety refinements.

## Environment and resolved intermediate failures

The standard Playwright Chromium download again returned truncated archives. Used Chromium 153 from a temporary npm @sparticuz/chromium installation outside the repository, with manually unpacked registry-supplied runtime libraries and software rendering. The package helper failed on environment ownership operations; direct unpacking avoided those operations. An initial missing software-renderer path prevented browser launch; the documented runtime environment above resolved it. No binary or test-only browser package was added to project dependencies.

Early browser iterations corrected ambiguous empty-directory Add person selectors, toast text assertions and the backup input/export selectors. The first full run still had two old v2 backup-preview expectations and one development hot-reload interruption while an editor was open. The final full run used frozen source and all 18 passed. No product behavior assertion was weakened. Section-query navigation was made authoritative after browser inspection found stale tab state.

## Functional evidence

Reward tests verify concurrent/repeated completion, one entitlement per source, source reopen/recomplete reversal/restoration without a new date, source edit/delete correction, same-day duplicate signatures, later-day deletion/recreation suppression, ten-grant cap, substantive/recent conversation rules, historical/no-note/import exclusions, won/lost/reopen loops, contact restrictions/relationship withdrawal, disabled earning/widget separation, and rollback of CRM+ledger when audit storage fails. They verify contact deletion reverses dependent rewards while preserving ledger tombstones.

Quest/goal tests cover stable persisted references, no more than three definitions, honest empty/restricted states, duplicate-content suppression, completion/reopen recalculation, no fresh quests for earlier-day entitlements, settings persistence, target changes without bonus rewards, achievements relocking, day/week and DST boundaries, fixed calendar on display-timezone changes and later-day recompletion not manufacturing streak evidence. A 10,000-entry synthetic selector history verifies level/streak/goal calculation; this is not a physical-phone benchmark or a persisted 10,000-action acceptance run.

Migration testing opens an actual v2 database containing settings, contact and historical completed task data with the v3 implementation, retaining records and adding safe opt-in defaults without awarding XP. The existing real v1 upgrade test remains. Current backups round-trip all progress tables without replay; v1/v2 shapes restore empty progress defaults; malformed source/calendar/audit data is rejected before replacement. A forced mid-restore storage error rolls back both CRM and reward data. Demo reset and CSV import do not alter Personal progress or issue rewards.

Browser acceptance creates a fictional personal contact and planned follow-up, earns 5 XP, reopens to reverse it, recompletes without duplication, records a substantive meeting for 10 XP, verifies quests/milestones/weekly goal, refreshes with 15 XP and four audit entries intact, disables animations/widgets, verifies preferences after reload, checks task filtering and validates/cancels an exported v3 restore preview. Prior suites still verify companies/representatives, interactions/tasks/opportunities, permission restrictions, review snoozes, dynamic lists, 80-contact import/duplicate decisions and invalid-restore protection.

## Responsive and visual checks

All previous screen/editor bounds checks remain. New progress, task, Home and progress-settings checks cover **320, 375, 390, 430, 768, 1024, 1280 and 1440px** in light/dark. No horizontal page overflow was detected, and progress-settings Save scrolls clear of fixed navigation. Actual rendered 390px dark and 1440px light progress screenshots were inspected internally; viewport screenshots are preferred for production proof because full-page captures place fixed navigation/skip links/toasts relative to the capture scroll position. No owner screenshots or design approval were requested.

## Compatibility, limits and deployment boundary

DB/backup v3 is additive and preserves old record tables and legacy gamification placeholders. Progress is off by default until opt-in; historical completed work is not replayed. Reward corrections and their source mutation are atomic. Original source/day entitlements, sequenced audit changes and conservative non-security content signatures provide deterministic idempotency, not fraud-proof activity verification. The minimum text rules cannot judge substantive business quality.

Progress calendar timezone is fixed at initial opt-in; display-timezone changes do not rebase progress. Quests are specific due follow-ups rather than arbitrary activity templates, and milestones/goals/quests grant no bonus XP. Weekly milestone uses the current week/target and may relock. Older backups explicitly replace new progress tables with empty defaults. Keep the v3-compatible data layer when rolling back source; prefer a forward fix over database downgrade.

Optional manual Today focus, bulk task actions and weekly calendar previews were deferred. Histories display the latest 40 reward corrections; complete history remains in backups. Local-only storage/privacy and browser-eviction limitations remain. Formal contrast/screen-reader testing, physical keyboard/phone tests, installation and offline/update lifecycle QA remain iteration 06 work. This iteration introduces no AI, secrets, delivery infrastructure, paid service or synchronization.

Development branch: development/iteration-04. The delivery report records the actual integrated commit, Cloudflare build outcome and focused live-browser results after deployment. Local success or HTTP status alone is not presented as full production acceptance.

# Iteration 05 — optional intelligence and practical handoffs

Date: 26 October 2026. Baseline: `5ece121`; development branch: `development/iteration-05`. App version 0.5.0. Earlier reports above remain historical evidence.

## Executed local checks

- `npm run typecheck`: passed strict application and Worker TypeScript. Also executed by the production build.
- `npm run lint`: passed.
- `npm test`: **114 passed across 7 files**, including the original 93 tests. New suites contain 15 AI/security/context/handoff tests, five reviewed-record/persistence tests and one real workerd/SQLite runtime test.
- `npm run build`: passed. PWA generated 30 precache entries. Main chunk is approximately 521 KB minified / 158 KB gzip, producing the existing non-fatal >500 KB warning. Assistant is lazy loaded (~19 KB minified / 6 KB gzip). No Gemini SDK is in the browser bundle.
- `VITE_BASE_PATH=/pulse_app/ npm run build -- --outDir /tmp/pulse05-subpath-build`: passed, including the subpath manifest, assets and service worker.
- `npm run check:worker`: passed Wrangler 4.152.0 deploy dry run with current static assets, ASSETS/SQLite bindings and AI disabled. Worker upload approximately 138 KB / 25 KB gzip.
- `PULSE_CHROMIUM_PATH=/tmp/pulse05-chromium LD_LIBRARY_PATH=/tmp:/tmp/pulse05-browser-libs/lib VK_ICD_FILENAMES=/tmp/vk_swiftshader_icd.json npm run test:browser -- --workers=1`: **24 cases passed**, mobile 390×844 and desktop 1440×1000 projects. All 18 existing cases were retained. A preceding focused four-case run also passed before final refinements.

## Functional and security evidence

Tests validate context category exclusions, original source IDs, historical company attribution, record/text bounds, marketing versus relationship consent, withdrawals, malformed/extra request fields, unknown model/operation refusal and invented-reference rejection. Provider HTTP is mocked with synthetic keys and structured responses; tests inspect fixed endpoint/header/system instructions, token cap, no tools, failure propagation and no credential reflection. Signed synthetic RSA Access JWTs verify issuer/audience/signature/expiry; missing/spoofed assertions fail. Disabled/unconfigured requests fail before provider calls. Quota-storage failure refuses admission rather than bypassing controls. Mocked malicious note text remains data and cannot invoke any application command. This is an architectural safeguard test, **not evidence of real model immunity to prompt injection**.

A real Miniflare/workerd instance runs the actual Worker bundle and SQLite Durable Object. It verifies static assets, disabled status/generation, concurrent admission, request replay and daily refusal. Separate pure-policy assertions cover the 200-request lifetime ceiling, per-operator rate and expired concurrency leases. The test-only reserve/release routes exist only in the test wrapper and are not deployed.

Repository tests verify reviewed task idempotence, invalid-reference rejection, no proposal/note-creation XP, note provenance, missing-preference defaults, disabled-write refusal and workspace isolation. Existing migration, v1/v2/v3 backup, malformed-restore rollback, CSV import, permissions, reward integrity and CRM CRUD tests remain passing. Optional AI preferences and task provenance do not require indexed schema changes; DB/backup remain v3, compatible with old formats. No restored record initiates a network request or new reward.

Browser journeys use explicit test-only mocked status/provider responses. They verify cancel means zero generation requests, exact context preview excludes default channels, cited source navigation opens saved editors, missing evidence is visible, drafts can be edited, individual proposals require a manually selected date, one accepted task persists while a rejected proposal does not, refresh clears temporary answers, and reviewed all-day `.ics` files download. A separate unconfigured flow verifies disabled generation and the independent local message-review composer. No real email/WhatsApp message, provider request, calendar synchronization or XP is claimed.

## Responsive and visual review

Existing full-screen/editor overflow checks remain. New assistant controls and approval-dialog bounds are checked at **320, 375, 390, 430, 768, 1024, 1280 and 1440px**, in light and dark themes. No unintended page/dialog horizontal overflow was detected. Internally inspected actual 390px dark and desktop dark screenshots; theme tokens, wrapped labels and ordinary form controls remain cohesive. These checks do not prove formal contrast/WCAG compliance, physical phone keyboard behavior, native composer availability or PWA installation/update behavior.

## Resolved intermediate failures and environment

Used temporary registry-supplied Chromium 153 outside the repository with manually unpacked libraries, as in prior iterations; no browser binary/package was added to application dependencies. Initial exact-label selectors included populated textarea/select child text and timed out despite correctly rendered controls; semantic role/name selectors resolved this. One JWT-expiry test initially advanced Date.now before constructing its request, causing the fixture to consume the one-shot mock; constructing the fixture first and holding/restoring the clock fixed the test. The final full browser run used frozen application source. After that full run, app/backup metadata moved to 0.5.0 and reviewed-task identifiers were strengthened to SHA-256 with transaction-safe hashing. Unit checks, production build and the focused six-case AI/handoff browser suite were repeated successfully. A synthetic audit-storage failure additionally verifies full reviewed-task rollback.

## Activation boundary and deferred verification

Production is intentionally configured `AI_ENABLED=false`, with no fresh provider secret or Access audience/team configured by this change. The previously exposed chat credential is not reused. No paid inference, billing change or new hosted CRM storage is enabled. Local mock success does not establish live Gemini quality, credentials, account quotas or Access browser-session behavior. CLOUDFLARE.md documents protected activation, limits and rollback requirements. Live generation requires separate fresh secret/access setup and focused verification. OAuth/calendar sync, automatic sending, full-workspace chat, stored chat history and background AI remain deferred. Physical PWA/native-app/accessibility/performance review belongs to Prompt 06.

Deployment commit/build and focused production-browser results are recorded in the delivery report after integration; local builds and HTTP responses alone are not presented as production workflow acceptance.


## Iteration 05 production verification

Feature commit `fc9daf0` deployed successfully through Workers Builds (build `3f0ea7f5-c045-43f9-ad68-af68e8686868`). A managed production browser verified the real unconfigured status, temporary Demo opt-in, selected-context approval preview with Send disabled, local message-review dialog, do-not-contact message-handoff suppression, and a real `.ics` download. The downloaded event retained the task UID and correct UTC start/end; downloading left the task incomplete. Demo AI opt-in was restored to off afterward. No provider invocation or external message was sent. These are focused live checks, not the entire mock-backed acceptance suite against production.

A landing tab opened before deployment attempted an old lazy Home chunk after the deployment replaced static assets and reached the existing error boundary. Its Reload action recovered the current application with demo records intact. This is a reproducible cross-deployment asset/update-lifecycle limitation, recorded for Prompt 06; do not claim uninterrupted update adoption. A small follow-up corrects the Assistant breadcrumb label and records this evidence; it changes no data schema, permissions or API behavior.
