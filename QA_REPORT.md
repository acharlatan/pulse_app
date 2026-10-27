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

# Iteration 06 — visual quality, accessibility and PWA reliability

Baseline: `9a64961`; development branch `development/iteration-06`; app version 0.6.0. Existing reports above describe earlier iterations and remain historical evidence.

## Audit and implemented changes

Baseline browser screenshots showed a mobile Home dominated by a promotional hero/statistics before useful work, small metadata, crowded profile tool placement and a floating create control near bottom content. Source inspection found a 521 KB eager main bundle, CRM code loaded before workspace choice, a 135 KB Home chunk for a simple Motion entrance, unguarded SW refresh, repeated dialog title IDs and reliance on native focus wrapping alone.

Shared styles were refined in place: 15px body, 13px labels, 12px metadata floor, 16px mobile controls, stronger muted/faint text and input borders, restrained ambient depth, wrapped tabs/toolbars, larger linked-person targets, safe-area top/bottom navigation, scrollable short sidebars, and create-control hiding during field/dialog editing. Home places relationship work before promotional content; profiles place identity/core actions first and optional tools in a disclosure. Other screens inherit the consistent typography, spacing, control and surface rules; no business screen was replaced with mock content. Directory filters/search/sorting now survive profile return through URL state. Keyboard tabs, skip focus, unique modal titles, explicit focus boundaries/restoration and short visual-viewport scrolling were added. No domain schema, reward rules, import semantics, permissions or provider controls changed.

## Executed automated checks

- `npm run typecheck`: passed strict app and Worker TypeScript, also run through the production build.
- `npm run lint`: passed.
- `npm test`: **117 passed across eight files**, retaining all 114 existing tests. New edit-safety tests cover multiple forms, failed-save/unload protection, marker cleanup and missing-chunk versus ordinary-error classification.
- `npm run test:browser -- --workers=1` with the Chromium environment below: **34 passed** across mobile 390×844 and desktop 1440×1000. This retains all 24 previous cases and adds ten cases for axe, keyboard/dialog/short-screen editing, directory return, bounded stale-chunk recovery and landscape/enlarged text. After final shared wrapping/sidebar refinements, the 12-case iteration06/layout subset passed again.
- `npm run build -- --outDir /tmp/pulse06-release-build`: passed in a fresh directory, with 30 app-shell precache entries and no >500 KB JS chunk warning.
- `VITE_BASE_PATH=/pulse_app/ npm run build -- --outDir /tmp/pulse06-subpath-final`: passed; manifest, scope, icons, JS/CSS and service worker use the repository base.
- `npm run check:worker -- --assets /tmp/pulse06-release-build`: passed, ~138 KB / 25 KB gzip Worker bundle, existing ASSETS/AI_QUOTA bindings and disabled AI vars preserved.
- `PULSE_DIST=/tmp/pulse06-release-build npm run test:pwa -- --workers=1`: **eight passed** (four offline/update cases and four 100/1,000-contact scale cases). A subsequent focused repository-subpath run passed two additional cases. PWA output is separate under ignored `.codex/pwa-results`.

Browser commands used `PULSE_CHROMIUM_PATH=/tmp/pulse06-chromium LD_LIBRARY_PATH=/tmp:/tmp/pulse06-libs/lib VK_ICD_FILENAMES=/tmp/vk_swiftshader_icd.json`. Chromium 153 came from a temporary registry package outside project dependencies; archive ownership operations required `--no-same-owner`. The first baseline script tried a nonexistent previous binary and a server in another command namespace; unpacking the registry runtime and starting the server as the browser script's child resolved this. No browser binary, private data or provider key was committed.

## Accessibility and visual findings

Axe-core checks WCAG A/AA, 2.1 AA and 2.2 AA tags on Home, Network, person/company profiles, Pipeline, tasks/progress, Review, Smart Lists, Import, Assistant and Settings in both themes and both viewport projects. **Zero violations remained in that exercised matrix.** Initial checks identified a short linked-person target, native dialog Tab wrapping inconsistency, a 320px tab-group overflow and low contrast during a button theme transition. Enlarged targets, an explicit Tab boundary, flexible tabs and removal of background-color button animation resolved them. A transform-only Home entrance avoids fading text through low contrast. A missing-file test aborts a genuine lazy route request, verifies no automatic reload, then manually recovers once and confirms saved contacts remain.

Keyboard testing includes Tab/Shift+Tab containment, Escape, restored opener focus, arrow-key directory selection and focus after navigation. A long fictional note is saved/reloaded from a 390×430 viewport with reachable Save; this simulates reduced available height, not a physical virtual keyboard. Native VoiceOver/NVDA was unavailable. Actual 200%/400% browser zoom was not exercised; 320px reflow and enlarged text tokens were checked instead. No WCAG certification is claimed.

Programmatic layout checks cover all existing primary screens/editors at 320, 375, 390, 430, 768, 1024, 1280 and 1440px in light/dark. Additional 844×390 landscape and enlarged text checks passed. Actual rendered baseline/final Welcome, Home, Network, profiles, Pipeline, Activity/Progress, Review, Lists, Import, Assistant and Settings screenshots were captured internally. Inspected 390px light Home, 390px dark contact, 320px dark Home, 768px/tablet and 1440px desktop theme views; contact sheets supported review of advanced routes. Fixed-content checks do not establish every physical safe-area/keyboard behavior. No owner screenshot was required.

## Real service-worker/offline evidence

The production-build harness serves generated assets and a genuine SW. Root and repository-scoped registrations cache routes successfully. Offline reload, contacts/company profiles, tasks, lists, recommendations, progress, local note creation/persistence and backup downloads passed. Cache inspection found no `/api/` entries. Chromium's installability diagnostics returned an empty error list on the tested root pages; manifest name/icons/standalone fields were validated. No native install button was pressed and no physical Android/iOS standalone app is claimed.

Controlled SW script revisions create a real waiting worker. Updating an edited settings form first requires confirmation; dismissing preserves the draft. Accepting updates that tab while a second tab retains its unfinished input and receives a notice. The updated tab has its saved records and no repeated update loop. Native registration replaces the helper's unconditional cross-tab reload handler. Edit markers remain in memory and never autosave sensitive fields. Old pre-06 clients cannot retroactively receive these guards; save before the initial upgrade. The controlled test changes SW content while keeping fixture assets available; the separate failed-import test simulates missing old route files. Full production/CDN/physical-device combinations remain release QA, not proven by this simulation.

## Performance measurements

Clean-build baseline versus iteration06 (rounded):

| Asset | Before minified / gzip | After minified / gzip |
| --- | --- | --- |
| Initial main JS | 521.46 / 157.89 KB | 234.53 / 73.44 KB |
| Deferred workspace | included in main | 289.55 / 86.52 KB |
| Home JS | 135.46 / 44.17 KB | 10.67 / 3.39 KB |
| CSS | 69.02 / 14.23 KB | 75.11 / 14.99 KB |
| Offline precache | 873.56 KiB | about 756.42 KiB |

Workspace deferral improves first-use loading; it does not pretend to eliminate all deferred CRM code. Removing the only Motion usage removes substantial Home code; its CSS replacement honors reduced motion. CSS grows modestly due to readable shared tokens/control refinements. Repeated local builds retained old generated files in this environment, so release cache measurements use a fresh output rather than accumulated dist assets.

Three fresh-context unthrottled localhost Welcome samples measured FCP/LCP before 312/152/140ms and after 112/132/92ms; medians 152→112ms, CLS 0 in all samples. Browser-reported initial JS encoded body bytes were 157,886→73,436. This is a shared-runtime lab observation, not a field Core Web Vitals/Lighthouse score, a phone benchmark or a controlled-network performance guarantee. No field INP is claimed.

Production-build browser scale tests import synthetic data through the real wizard and bound directory DOM to 60 cards. Measured Apply-click→confirmation / directory-action / search-action times (automation overhead included):

| Contacts | Mobile viewport | Desktop viewport |
| --- | --- | --- |
| 100 | 105 / 847 / 24ms | 115 / 365 / 26ms |
| 1,000 | 167 / 366 / 42ms | 240 / 377 / 68ms |

These timings exclude earlier mapping/validation steps and are not equivalent to INP. Empty Personal and fictional Demo journeys remain covered by the retained suite. This does not establish unlimited dataset scalability.

## Data safety, scope and release limits

DB and backup remain v3; old v1/v2 restoration, atomic replacement, workspace isolation, restrictions, historical company attribution and reward correction regressions remain passing. App metadata is 0.6.0 only. No secret, Access, quota, model, billing, integration connection or Worker migration change was introduced. Gemini remains off.

No confirmed P0/P1 defect remains in the executed journeys. Remaining **verification priorities**: physical iOS/Android installation/keyboards/safe areas, native screen readers, literal browser zoom, Firefox/WebKit, broader live CDN transition coverage and real-device performance. **P2 limits:** pre-06 tabs use old update code; ordinary in-app Back/workspace navigation is not universal draft recovery; edit markers can conservatively warn after assistant/import selections. See the prioritized Prompt 07 checklist in DEVELOPMENT_ROADMAP.md. Do not declare these untested platforms verified.

The delivery report records the actual integrated commit, Workers Builds result and focused production-browser evidence after deployment. Local or HTTP success alone is not treated as live workflow acceptance.

Final visual review caught a clipped tablet sidebar label; allowing navigation text to wrap fixed it. The final clean deployment build and a two-case full layout rerun (including sidebar internal-width assertions) passed after that and safe-area top-padding refinements.

# Iteration 07 — release candidate assessment (2026-10-26)

Starting main verified through GitHub at 92c122379125d5f09e5b4497e959a69dc75f5818. Work uses release/1.0.0-rc.1. This is candidate work, not stable release approval. Existing CRM/reward/permission repositories, DB and backup v3 and disabled Worker configuration are preserved.

Implemented Personal saved-record onboarding with persistent hide/revisit preference, Help route reachable from mobile Settings, calm empty Personal Home, recovery/install/import documentation, truthful backup download-request feedback, guarded internal links/workspace switches and optional localStorage hint failure handling. Guide preferences are additive validated settings; older backups receive defaults, no schema downgrade/migration or reward replay.

## Executed checks

- `npm run typecheck`, `npm run lint`, `npm test`: passed; 118 tests / 8 files, including workerd security/quota and existing CRM/import/reward/backup regressions.
- `npm run build -- --outDir /tmp/pulse07-release`: passed; 32 precache entries / 765.66 KiB; initial JS 235.22 KB / 73.65 KB gzip. This preserves the earlier first-load gain; no new field-performance claim.
- `npm run check:worker -- --assets /tmp/pulse07-rc-build`: passed earlier in this candidate, unchanged Worker 138.12 KiB / 25.08 gzip, AI false and existing SQLite quota binding/migration.
- `VITE_BASE_PATH=/pulse_app/ npm run build -- --outDir /tmp/pulse07-subpath`: passed before final help-link/import-marker correction. Both corrections preserve build/routing configuration; no newer subpath claim.
- Full browser run: 36 passed / 2 failed. Transfer assertions awaited exact toast text and were corrected to verify restore-dialog closure and persisted linked records. No stable release approval is based on the failing run. Earlier successful-import guard regression was fixed and focused import checks passed.
- Full production PWA run: 9 passed / 1 failed (desktop offline note test reloaded immediately after clicking Save). Added an await for successful dialog closure; focused production offline rerun passed both mobile and desktop (2/2), including saved offline note reload, export and no API caches.
- Chromium 153 from temporary npm @sparticuz/chromium; standard Playwright Chromium download failed with truncated ZIP. Automated mobile viewport 390×844, desktop 1440×1000. Existing layout suite exercises 320–1440 and both themes; Help was added to it. Axe runs included major routes and the new Help page. No physical phone, native installation/screen reader, Firefox/WebKit or literal zoom result is claimed.
- `npm audit --json`: 7 affected package nodes, including runtime Zod; see DEPENDENCY_REVIEW.md. Findings remain unresolved, so stable release is held.
- `PULSE_DIST=/tmp/pulse07-release node scripts/package-static.mjs`: verified 35 ZIP entries (web assets/public guides only), ZIP integrity and SHA-256 generated. No keys/databases/test logs are included. GitHub Release/tag publication is not available through the connected write tools and has not been claimed.

## Remaining release gates

Stable 1.0 and production integration are held pending dependency remediation and full release-gate review. Browser Back/modal cancellation remain outside universal draft recovery, cross-tab stale-save conflict detection is not implemented, and physical hardware/assistive technology/real zoom need manual execution. Historical backup fixture review, storage-denied matrix and complete all-domain transfer validation need further evidence. No claim of conflict-free collaboration, encrypted local storage or cloud recovery.

Manual device procedure: start empty Personal; add company/person; write long note with keyboard open; save/reload; create/reschedule/complete task; inspect restricted contact; export JSON and transfer to another browser; install when offered; reopen cached app offline; edit/save/reload; reconnect and approve update with another editing tab open. With VoiceOver/NVDA check labels, modal focus, errors and save/import results. At genuine 200%/400% browser zoom verify every essential action reflows/reaches viewport. Record device/browser versions and actual outcomes before changing support claims.

Final focused acceptance: `npm run test:browser -- tests/browser/release07.spec.ts --workers=1 --output=.codex/transfer-confirm` passed 4/4 (22.8s): Personal skip/revisit/persistence + Help axe checks and real downloaded backup restore into isolated Personal context with linked conversation/profile reload. The restore test verifies actual records after transaction completion; this does not claim every optional progress/permission scenario independently exercised.

# Iteration 07 completion — public release candidate (2026-10-26)

This section supersedes the earlier dependency/integration hold. Stable 1.0 remains **undeclared**. The supported evidence is automated Chromium desktop and mobile viewport emulation; untested physical platforms and assistive technologies are explicitly identified in Help, installation and release notes.

## Changes and guarantees

Resolved all seven dependency audit nodes: Zod 4.6.7, Vitest 4.1.12 and compatible patched Undici 7.30.1 override. Zod record keys and nested `prefault` defaults preserve legacy settings behavior. DB/backup stay v3, with no destructive migration. AI_ENABLED=false, Worker identity, Access validation, quotas and SQLite migration stay unchanged. No provider request or paid infrastructure activation was used.

Dialog close/Escape/Cancel/backdrop dismissal warns before discarding tracked edits. Editors load a fresh saved record on opening. Person/company/task/opportunity/conversation saves compare the opened timestamp inside their write transaction; a changed or deleted record fails without overwriting it. Save failures are announced inside the modal, preserving editable text. No universal conflict resolution, persistent drafts or universal browser Back guard is claimed. Other settings/editors remain single-editor workflows.

Historical fixture exports were produced by the actual iteration02/03 seed/export functions (777cf9f / 3bbaff0), using Zod's legacy v3 entry point only for scratch generation. They restore complete linked graphs with newer defaults, then roundtrip every exported table. Current ledger/quest roundtrip, malformed history/reference rejection and injected mid-transaction restore failure remain covered. Added quota-exhaustion rollback, stale/deleted editor and accessible failed-save tests. Browser storage denial reaches recovery rather than reporting saved data. Isolated-browser transfer compares every exported array except the workspace-specific settings after restore and reload; active reward-ledger roundtrip is independently exercised by unit tests.

## Executed validation

Environment: Node 24.22.1 / Linux, Chromium 153 from temporary @sparticuz/chromium outside project dependencies; no physical device. Browser commands use `PULSE_CHROMIUM_PATH=/tmp/pulse-chromium LD_LIBRARY_PATH=/tmp:/tmp/pulse-libs/lib VK_ICD_FILENAMES=/tmp/vk_swiftshader_icd.json`. Registry browser archives required extraction without ownership restoration. No browser binary is distributed.

- `npm run typecheck`, `npm run lint`: passed after remediation and editor changes.
- `npm test`: **124 passed / nine files**, including real local workerd/SQLite security/quota tests. No original assertion was removed. An initial historical-fixture read used a jsdom URL incorrectly; it was corrected to a repository-relative filesystem path.
- `npm audit --json`: **zero known findings**, runtime and development. Advisory snapshots do not certify total security.
- Full browser command: `npx playwright test --config=.codex/release.config.ts --workers=1 --output=.codex/verified-browser`: **40 passed / two failed**. The temporary config only selects isolated dev port 5175 and the same 15-second assertion budget now in playwright.config.ts. Failed mobile layout hit the broad case's former 120-second total budget; the case now allows 240 seconds for 176 route/size/theme combinations and waits for actual editor controls before measuring. Desktop mocked-AI/calendar case timed out waiting for its calendar form; the complete six-case iteration05 rerun passed without weakening it.
- `npx playwright test --config=.codex/release.config.ts tests/browser/iteration05.spec.ts --workers=1 --output=.codex/verified-ai`: **six passed**.
- `PULSE_DIST=/tmp/pulse07-verified npx playwright test --config=.codex/layout-production.config.ts tests/browser/layout.spec.ts --workers=1 --output=.codex/production-layout`: **two passed**. That temporary config serves tests/pwa/server.mjs on 4174 instead of Vite. This independently exercises the built production layout across all specified widths and both themes. A prior dev-server layout attempt lost its execution context; no layout assertion was deleted to bypass it.
- Together the full run and reruns demonstrate all **42 distinct browser cases**; this is not described as a single uninterrupted 42/42 run. Exploratory runs while changing code had 34/38 and 5/8 results; stale-opening and modal error visibility defects found there were fixed, and the relevant new tests passed subsequently.
- A final feedback-only correction retains earned-XP save feedback while keeping persistence errors inside the modal. Current source was rebuilt into `/tmp/pulse07-deploy` and `/tmp/pulse07-deploy-subpath`; corresponding final focused/PWA counts are appended below after completion.
- `npm run build -- --outDir /tmp/pulse07-deploy`: passed, 32 precache entries / 806.56 KiB, initial JS approximately 235.45 KB / 73.73 KB gzip; deferred workspace about 331 KB / 102 KB gzip. Patched Zod grows deferred validation code compared with the prior candidate; lazy first-load architecture remains intact. No field performance or phone benchmark is claimed.
- `npm run check:worker -- --assets /tmp/pulse07-deploy`: passed. Patched validator increases the Worker dry-run bundle to approximately 783 KiB / 124.5 KiB gzip. Bindings/migration and disabled flags were verified in the dry-run output.
- `VITE_BASE_PATH=/pulse_app/ npm run build -- --outDir /tmp/pulse07-deploy-subpath`: passed. Static-only ordinary CRM remains independent of Worker services.
- Production-build PWA verification before the feedback correction: **10/10 passed**. One earlier offline reload check found the route still loading at the old five-second assertion deadline, not an unsaved note; the shared 15-second assertion budget retains the persistence assertion. Root/scoped offline edits/backups, no API caching, real waiting workers, multi-tab edit protection and 100/1,000-contact import/search remain exercised.

## Visual and manual limits

Reviewed actual rendered dark CSV confirmation, light mobile progress and dark mobile profile screenshots from the final browser/production-layout output. Major routes retain automated light/dark axe, focus, short-screen, landscape, enlarged-text and responsive coverage. No WCAG certification or native screen-reader result is claimed.

Unexecuted: physical iOS/Android keyboard/safe-area/install/standalone/download/handoff behavior, native VoiceOver/NVDA, literal 200%/400% browser zoom, Firefox/WebKit, field performance and full historical pre-06 CDN upgrades. Existing pre-06 scripts cannot gain new safeguards retroactively; save before upgrading. The targeted manual procedure in the earlier candidate section remains applicable. These limits restrict support claims; they are not marked passed.

The distribution script checks inventory, ZIP integrity and SHA-256. Static files were scanned for common provider/GitHub credential/private-key patterns with no matches. This is a targeted scan, not proof of absence of every possible secret. The ZIP excludes databases, dependencies, logs and Worker secrets and includes public installation/recovery/release notes. GitHub Release/tag publication is not exposed by connected write tools; no published tag/Release is claimed. Source publication, merge, automatic Cloudflare deployment and live verification are separately recorded.

Final feedback-preservation verification: `npx playwright test --config=.codex/release.config.ts tests/browser/release07.spec.ts tests/browser/iteration04.spec.ts --workers=1 --output=.codex/deploy-focused` passed **12/12** on current source. `npm test` passed **124/124** again. Final static ZIP contains 36 entries, 272,233 bytes, SHA-256 `7b68631678d208d4b4c2c24aec2967080220ef3d0ea0d090534b8494a06e1648`; credential-pattern scan passed. The package is generated locally; no GitHub asset upload is claimed.

Final deployment-build PWA commands: `PULSE_DIST=/tmp/pulse07-deploy npm run test:pwa -- --workers=1` passed **10/10** (57.7s). `PULSE_DIST=/tmp/pulse07-deploy-subpath npm run test:pwa -- --grep 'repository subpath' --workers=1` passed **2/2** (10.6s), exercising the actual absolute-subpath output. No final automated gate is left failing; the full-run/rerun distinction and manual limits above remain explicit.

## Iteration 08 — PULSE 1.1.0-rc.1

Implementation includes pipelines/stages with stable identities and explicit outcome categories, field definitions/typed values, Focus selections, company segments, bulk administrative updates and saved Home preferences. Existing Worker security/configuration is preserved; AI remains disabled. Database and backup evolve to v4 together.

### Automated data and build evidence

- `npm run typecheck`, `npm run lint`: passed.
- `npm test`: **145 passed, 11 files**. Includes 13 expansion cases plus 8 pure pipeline cases. Actual v3 upgrade, failed-upgrade rollback, preserved reward/correction history and saved lists, stable stage rename, invalid destination, category semantics, used-stage mapping/confirmation, configuration without XP grants, custom value validation/rename/roundtrip, Focus cleanup, company rules, selected-only writes, stale-selection rejection and transaction rollback exercised. Historical v1/v2 fixtures and previous reward/CRM/Worker tests retained.
- Test fixture maintenance changes expected current schema/backup version from 3 to 4. An import test now uses the actual persisted source snapshot rather than relying on saving within the same millisecond. The form unit test waits for the accessible dialog button before submission.
- `npm run build`, `npm run check:worker`, `VITE_BASE_PATH=/pulse_app/ npm run build`: passed. Clean root production output rebuilt after the subpath check. Worker dry run retains ASSETS, AI_QUOTA, disabled AI and existing SQLite migration.
- `PULSE_CHROMIUM_PATH=/tmp/pulse-chromium npm run test:pwa -- --workers=1 --reporter=line`: **10 passed**, including cached offline routes/edits/backups, update warnings with another editing tab, scoped subpath registration and bounded scale tests. Chromium diagnostics reported no installability errors; this is not physical-device installation evidence.

### Measured conditions

Chromium 153 software rendering in this hosted environment. Production directory: 100 contacts mobile import 104 ms/directory 863 ms/search action 26 ms; desktop 129/461/35 ms. 1,000 contacts mobile 196/862/39 ms; desktop 321/451/58 ms. These are observed run measurements, not guarantees. Pure-data fake-indexeddb/jsdom benchmark with 1,024 contacts and 306 opportunities: saving 44.0 ms, export 7.8 ms, validation 14.1 ms in a focused run.

### Browser iteration evidence and limits

The initial Playwright browser download was truncated. A Chromium runtime with bundled software-rendering libraries was installed for actual browser checks. Initial launch failures are environment failures, not acceptance passes. Full/focused browser results and final deployment evidence are appended below after completion. Visual review identified and fixed narrow-screen pipeline button fragmentation and oversized checkboxes. Automated accessibility identified a touch-target spacing issue around newly added opportunity details; its fix is included in the final reruns. No physical iOS/Android, Firefox/WebKit or native screen-reader certification is claimed. Release remains a candidate.


### Final frozen-source browser verification

`PULSE_CHROMIUM_PATH=/tmp/pulse-chromium npm run test:browser -- --workers=2 --reporter=line --output=.codex/browser-verified`: **48/48 passed in one clean run (3.8 minutes)**. This supersedes the earlier development-server runs where source edits caused HMR reloads, version-label assertions needed updating, and concurrent runners shared an artifact directory. The final run uses separate browser output and unchanged source. No assertions were removed. New acceptance tests cover custom pipeline creation, opportunity moves/custom Won outcome, stable stage renaming, company custom values, Focus task completion/reload, company segments and selected bulk tagging. Customization screenshots cover 320/375/390/430/768/1024/1280/1440px in light/dark. Existing axe/keyboard/dialog/recovery/backup journeys remain in the full suite. The previous candidate's mobile design and controls remain in the exercised coverage.

Screenshots were visually inspected at narrow light/dark widths. The pipeline action now stays a readable whole button; checkbox sizing and opportunity target spacing were corrected. Earlier failed/aborted runs are not counted as passes. The candidate is ready for authorized integration, subject to the final production PWA rerun and live deployment verification. Physical-device and native assistive-technology gates remain open.


### Final build and deployment disposition

Final production rerun: `npm run lint`, `npm run build` and `npm run check:worker` passed. `PULSE_CHROMIUM_PATH=/tmp/pulse-chromium npm run test:pwa -- --workers=1 --reporter=line` passed **10/10 in 42.1s** against the final production output. The full browser run passed **48/48**; unit/Worker suite passed **145/145**. The source is published in PR #2 on feature/prompt-08-pipelines.

Production integration was attempted through an expected-head squash merge. Automatic approval review rejected that action because it requires explicit user authorization for integration into the default branch. The rejection was honored; no workaround, main update or production deployment was attempted. Production remains the previous candidate. Next authorized action: merge PR #2 into main, observe the existing Cloudflare automatic build, verify the deployed commit/release.json, run fictional production workflow/export smoke checks and record evidence. No production success is claimed.


### Authorized production deployment — iteration 08

The owner subsequently granted standing authorization to merge/update the project and deploy it. PR #2 merged as **6b30c2cc37000b25cfd2596ebedc51d25121548c**. Cloudflare automatic build **fa623358-1f9a-4e25-afe5-fd4ffdf636b5** completed successfully. Deployment **7f7d2ee8-ed35-4f32-a6c8-2a38b505c57b** serves Worker version **cdea617a-117b-4b1a-afae-e3b089f1d0b5** at 100% traffic.

The production `/release.json` reports 1.1.0-rc.1, database 4 and backup 4. A fresh isolated Chromium context on the production origin exercised fictional demo data: existing opportunities were readable; a custom Partnerships pipeline and opportunity were created; the custom Active Partnership stage produced Won; pipeline/opportunity state survived reload; a company select field/value and Focus pin saved; and a downloaded v4 backup contained 2 pipelines, 16 stages, 1 custom definition/value, 1 pin and all 24 demo contacts. No real user's workspace was accessed or modified. `/api/ai/status` returned available:false and mode:disabled. This is actual live workflow/export evidence, not HTTP-200-only verification. Physical-device/native-assistive-technology limits remain open. Release decision: published PULSE 1.1.0-rc.1 candidate.

## Iteration 09 — PULSE 1.2.0-rc.1

Base main verified at b93b5d9511ac4607fde973e520f1f9a821267b30. DB/backup v5 adds media; existing v1–v4 restore compatibility and historical CRM/reward/permission/pipeline behavior are retained. See RELEASE_1_2.md (sections A–O) for design, implementation and support boundaries.

### Data/build checks

- `npm run typecheck` and `npm run lint`: passed on the completed experience, media/Orbit and selected-pipeline handoff changes.
- `npm test -- --reporter=verbose`: **156 passed / 12 files**. Eleven new media/Orbit cases cover save/replace/remove, stale slot, injected quota/write rollback, v5 export/corrupt rejection/valid roundtrip, decoder failure before replacement, missing cover references, shared-reference deletion cleanup, workspace isolation, actual v4 upgrade, signature/dimension validation, explicit graph links/scopes/deletion and bounded scale. Prior 145 CRM/pipeline/custom-field/Focus/reward/import/historical backup/Worker security tests remain.
- `npm run build -- --outDir /tmp/pulse09-release-final`: passed, **38 precache entries / 907.64 KiB**. `npm run check:worker -- --assets /tmp/pulse09-release-final`: passed, **783.09 KiB / 124.50 KiB gzip**; ASSETS/AI_QUOTA, existing SQLite migration and AI_ENABLED=false preserved. No provider call or paid service was enabled.
- `VITE_BASE_PATH=/pulse_app/ npm run build -- --outDir /tmp/pulse09-subpath-publish`: passed, 38 entries / 907.47 KiB.
- `npm audit --json`: **zero known findings**. This is an advisory snapshot, not total security certification.
- Repeated builds in the inherited dist directory retained stale generated assets in this hosted filesystem despite emptyOutDir. Release measurements and final PWA checks use a fresh named output directory; stale precache counts are not presented as release sizes. Cloudflare builds start from a clean checkout.

### Observed performance

Hosted Node 24.22.1/Linux; Chromium 153 software rendering, automated viewport emulation. Initial JS **235,362 bytes / 73,682 gzip** (baseline 235,446 bytes); CSS **102,960 / 20,618 gzip** (baseline 77,061 bytes). Lazy Workspace **349,740 / 107,062 gzip**, Home **8,814 / 2,848**, Orbit **12,676 / 4,297**, crop editor **6,077 / 2,534**. New media is not loaded into the global CRM context. No Core Web Vitals or field performance guarantee is inferred.

Pure derivation with fixed layout budget, limit60 and 10/100/1,000 synthetic contacts measured **18.9 / 6.7 / 9.1 ms** in the final unit run (warm-up affects comparison). DOM/SVG is separately capped: desktop map24, mobile map18, list60/hard80. An earlier production PWA scale run observed import/directory/search-action ms: mobile1000 **553/539/182**, desktop100 **290/897/259**, desktop1000 **783/620/231** under concurrent verification. These are observations, not phone benchmarks.

### Browser/visual procedure

Portable Playwright Chromium archives could not be used directly in this environment. Chromium153 from temporary @sparticuz/chromium was extracted with no ownership restoration, outside project dependencies, with software-rendering libraries. Browser binaries are not distributed. Commands set `PULSE_CHROMIUM_PATH=/tmp/pulse-chromium`.

Focused new feature suite passed **8/8** before final label separation/pipeline refinement. Full exploratory verification found a genuine race: immediately opening New opportunity after pipeline selection could initialize from the prior saved preference. The view now selects synchronously and passes its selected ID to the editor. Another focused run under overlapping browser workloads reached all workflow writes but missed the lazy Focus route after reload; it is not counted as a release pass. Final release browser/PWA counts are appended below.

Actual screenshots reviewed: 390px light action-first Home; 390px light directory; 390px dark company; 1440px dark Orbit before/after fixed-budget label separation; prior light/dark profile/Home captures. Current screenshot suites record Home/profile/Orbit at390/1440 both themes, Customize and primary editors at320–1440, CSV mapping/duplicate/confirm and Assistant approvals. Corrections: map auto-fit and node caps, nonshrinking two-line labels and deterministic separation, search width, wrapped toolbar, mobile details sheet, native checkbox sizing and profile button spacing. All eight accent/theme combinations have axe assertions. Final saved-media/crop captures and fallback evidence are appended after execution.

Physical iOS/Android install/standalone/keyboard/download/orientation, native VoiceOver/NVDA, genuine 200%/400% zoom and Firefox/WebKit remain **unverified**, not silently passed. Automated axe/viewport checks do not certify WCAG conformance. Release remains a candidate. No analytics, automation engine, sync or external integrations are claimed for Prompt09.


### Final compiled browser evidence

`PULSE_CHROMIUM_PATH=/tmp/pulse-chromium PULSE_DIST=/tmp/pulse09-final npm run test:browser -- --config=playwright.production.config.ts --workers=2 --reporter=line --output=.codex/browser09-production`: **51 passed / 5 failed** in 10.2 minutes. The compiled runner uses the local static harness; service workers are blocked only here so network chunk-failure interception remains meaningful. Missing-chunk assertions now cover both development and compiled module paths; no recovery assertion was removed. Real offline/update behavior is independently checked by the PWA suite.

Three failures were early navigation before the first/reloaded screen was ready: a startup theme hint and an absent temporary-answer element were mistaken for React/router readiness, and the CSV test navigated immediately after choosing Demo. Added positive screen-ready assertions before the next navigation. A fourth failure sampled dark text against the previous light background during the newly introduced button-background transition. Removed color transition, retaining transform-only motion. A fifth persistence check expired while the profile still showed the lazy loading state under concurrent workload; the assertion was retained.

`PULSE_CHROMIUM_PATH=/tmp/pulse-chromium PULSE_DIST=/tmp/pulse09-release-final npm run test:browser -- --config=playwright.production.config.ts --grep 'Northstar relationship|CSV mapping|selected context|major routes|demo acceptance' --workers=1 --reporter=line --output=.codex/browser09-final-reruns`: **10/10 passed in 3.8 minutes**, both projects for every affected journey, including all light/dark route axe checks. All **56 distinct browser cases** are demonstrated across the full run and corrected reruns; this is explicitly **not** a single uninterrupted 56/56 result. No assertion was removed or weakened. Final breadcrumb copy also names Orbit, Focus and Customize correctly.

The full run passed the new JPEG/PNG/WebP upload/crop/replace/remove/reload journey, >8MB/unsupported/corrupt rejection, company logo/cover and workspace identity, v5 exported images restored into an isolated Personal context and reloaded, real Orbit associations/scopes/navigation/zoom/list, mobile More, new widths/themes and all preset contrast checks in both projects. Existing pipeline/custom fields/Focus/bulk/permission/reward/import/stale-save/denied-storage journeys remain covered.

### Final production PWA and scoped builds

`PULSE_CHROMIUM_PATH=/tmp/pulse-chromium PULSE_DIST=/tmp/pulse09-release-final npm run test:pwa -- --workers=1 --reporter=line`: **12/12 passed in 1.2 minutes**, including both saved-photo offline reload cases, offline CRM edits/backups, API noncaching, waiting-worker/multi-tab edit protection, scoped navigation and 100/1,000-contact scale tests. Chromium installability diagnostics reported no errors; this does not claim physical installation. Final scale import/directory/search-action ms: mobile100 **116/428/40**, mobile1000 **460/415/68**, desktop100 **156/486/95**, desktop1000 **276/313/120**.

`VITE_BASE_PATH=/pulse_app/ npm run build -- --outDir /tmp/pulse09-subpath-publish` and the final Worker dry run passed. `PULSE_CHROMIUM_PATH=/tmp/pulse-chromium PULSE_DIST=/tmp/pulse09-subpath-publish npm run test:pwa -- --grep 'repository subpath' --workers=1 --reporter=line`: **2/2 passed in 11.5s**, exercising the actual final absolute-subpath output. App source stayed unchanged during these PWA runs. Final support remains candidate-scoped to the documented automated evidence.

Deployment source and live evidence: [PR #3](https://github.com/acharlatan/pulse_app/pull/3). Its deployment record is updated after merge/build/smoke verification, avoiding an otherwise redundant documentation-only main deployment. No publication success is inferred from local checks.

### Saved-media visual acceptance

Final compiled helper captured person/company avatar and cover crop previews, saved person/company profiles and Welcome. Four active crop-editor axe analyses passed. A fictional company avatar Blob was then removed directly from the isolated test database; after reload the saved profile remained readable and rendered FS initials, with no broken image. Reviewed `crop-company-avatar.png` and `saved-person.png`, plus the earlier directory/company/Home/fitted-Orbit light/dark captures. Output remains in ignored `.codex/visual09`; no test database or browser binary is distributed. Functional upload/restore/offline assertions remain in the committed browser/PWA suites.

Release disposition: automated candidate integration gates complete; ready for the owner's authorized expected-head merge, automatic Cloudflare build and live verification. Physical-platform/assistive-technology gates remain open. Actual production disposition is recorded in PR #3 after deployment.


## Iteration 10 test coverage

New unit coverage includes prospective stage history, rollback, cross-tab idempotency, permission/restriction blocks, restore replay boundaries, deletion tombstones, local calendar boundaries, currency separation, inactivity reminders and historical company attribution. Browser scenarios cover analytics, CSV, rule creation, restricted sources, backup restore, responsive layouts and axe. Offline tests exercise the installed service-worker build. Record exact release results and any unresolved checks in RELEASE_1_3.md.


## Iteration 11 release candidate

Google Calendar and Contacts have scoped mock-provider tests and reviewed UI flows. A full 182-test unit run passed. Existing browser regression passed 61/62 under contention, and the remaining desktop Settings reload passed in isolation on the final build. Six mock-provider browser cases passed; root offline/PWA tests passed 12 cases and scoped-subpath checks passed two cases. See RELEASE_1_4.md and the release PR for deployment and actual-provider verification status. No real Google account was connected.
