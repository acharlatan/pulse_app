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
