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
