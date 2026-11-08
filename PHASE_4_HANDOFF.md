# Phase 4: responsive, keyboard and offline QA

## Scope and starting point

The starting commit was `e8bd0080dd7677db767f38c41b64d8275eb3116b` on `main`, after the separately authorized publication of the archive update. This review branch changes no database schema or backup version. Phase 1–3's release checks, incomplete-backup rejection, 32 MiB export warning, v7 archive/restore, stale-save safeguards, core-journey tests, and explicit service-worker update flow are present in the starting tree. The archive update retains linked records; archived follow-ups and existing enabled automations remain active.

The essential workflows under review are workspace entry, finding or adding a person/company, editing a profile, recording a conversation, creating and completing a follow-up, tracking an opportunity, using search and Orbit's List, and exporting/restoring local data. The PWA checks cover cached loading, navigating saved data, offline edits, backup download, reconnecting and update decisions. All automated data is fictional and isolated by browser context.

The prior documented release evidence covers Chromium desktop and mobile viewport emulation. Documentation describes install options for iPhone Safari and Android/desktop Chromium, while explicitly leaving physical installation and native assistive-technology QA unverified. This report does not imply a broader support commitment or native app compatibility.

## Fixes

- Search results no longer intercept Enter from a different focused result. Arrow and Enter handling now belongs to the search field, while a focused result retains native button activation; focusing a result also updates its selected state.
- Profile, Focus and Orbit now consult both the workspace setting and the operating system's reduced-motion preference for programmatic scrolling. Existing animation preferences and the Orbit List alternative remain in place.
- At widths up to 360 CSS pixels, Network overview facts wrap into two columns, avoiding the broken word seen at 320 pixels. The layout test checks the complete word and the person editor's Save control.

## Final CI and review branch

- Branch: `hardening/v1-phase-4-isolated`, draft [PR #48](https://github.com/acharlatan/pulse_app/pull/48). The tested code commit is `b04280341ff699e086455c731c8e0c3c9675540c`; the following documentation-only commit records this handoff. The branch was not merged or deployed.
- [Phase 4 CI run 42465810412](https://github.com/acharlatan/pulse_app/actions/runs/42465810412): Chromium, Firefox and WebKit each passed 5/5 cross-engine cases; Chromium passed 3/3 recovery error cases; the responsive/theme suite passed 8/8 combinations; and the mobile/desktop PWA and scale suite passed 14/14.
- [Release checks run 42465810396](https://github.com/acharlatan/pulse_app/actions/runs/42465810396): verify, data-recovery-browser and core-journeys jobs all passed on the same code commit.

## Browser and viewport evidence

Viewport dimensions are CSS pixels, not physical devices. Firefox and WebKit are engine tests on Linux, not tests of the branded browser or operating system on a physical phone.

| Coverage | Result and limit |
| --- | --- |
| 320, 375, 390, 430, 768, 1024, 1280, 1440 | Chromium checked document overflow on Today, Network, a person profile, Pipeline, Activity, Orbit, Analytics and Settings; it also opened the person editor at every width. All combinations of light/dark and periwinkle, forest, coral and blue were exercised. |
| 390 and 1440; both themes; all four accents | Automated axe checks on Network; profile/editor checks were also run in the engine suite using the default appearance. Automated findings do not establish complete accessibility. |
| Desktop engine workflows | Chromium 156.0.8078.4, Firefox 157.0 and WebKit 27.2 each ran the synthetic CRM/backup journey plus keyboard search, invalid form, reduced-motion Orbit List and axe profile/editor checks. These are Linux Playwright engines; WebKit is not iOS Safari. |
| Mobile and desktop PWA | Chromium viewport emulation at 390 × 844 and 1440 × 1000 ran the production service-worker and scale checks. These are not physical-device results. |

CI used Ubuntu 26.04, Node 22.23.4 and Playwright 1.64.1. Initial WebKit failures were traced to tests navigating before asynchronous workspace initialization; the tests now wait for the actual Today heading. The rerun of all five cross-engine cases passed. Automated screenshots were visually inspected for Network at 320 and 390 mobile widths and 1440 desktop, including light and dark. The production browser-test configuration deliberately blocks service workers and therefore displays the offline-unavailable banner in those screenshots; the separate PWA suite uses a real worker.

Keyboard verification included Tab and Shift+Tab inside dialogs, Enter/Space activation, Escape dismissal and focus return, a visible outline on a focused search result, native invalid-email validation, and the non-3D Orbit List. This was automated keyboard input, not a native screen reader. Literal browser zoom remains untested; narrow-width reflow is not equivalent.

## Offline, safety and scale

The clean production build uses a real service worker; the test server changes only the test worker's response and is never deployed. Tests use isolated browser storage. A failed/deferred update is checked against saved records and a current unfinished edit. No test proves that an unsaved draft survives an intentional reload: PULSE does not promise persistent draft recovery.

Local work is stored in the current browser profile, not synchronized. Users must load and cache the app online first, retain backup files, and reconnect for external services. Browser storage clearing, eviction or device loss can remove local data. The pre-existing 32 MiB restore-file limit remains; oversized exports are warned about and cannot be restored by the current picker.

## Scale observations

The production-build synthetic CSV tests measured one run on shared CI hardware, including browser automation overhead; they are observations rather than performance guarantees. At each size, directory rendering stayed at or below 60 cards, the last contact was searchable, and global search remained usable while offline.

| Contacts | Viewport | Import confirmation | Open directory | Directory search | Global search |
| --- | --- | --- | --- | --- | --- |
| 100 | Mobile 390 × 844 | 76 ms | 847 ms | 27 ms | 13 ms |
| 1,000 | Mobile 390 × 844 | 152 ms | 851 ms | 45 ms | 16 ms |
| 100 | Desktop 1440 × 1000 | 75 ms | 845 ms | 30 ms | 16 ms |
| 1,000 | Desktop 1440 × 1000 | 137 ms | 381 ms | 48 ms | 17 ms |

These values are from [CI run 42465810412](https://github.com/acharlatan/pulse_app/actions/runs/42465810412), source commit `b04280341ff699e086455c731c8e0c3c9675540c`. They do not represent physical-device latency or a field benchmark.

## Commands and observed results

- Local Linux / Node 24.22.1: `npm run lint`, `npm test` (270 tests), `npm run build` including typecheck, and `npm run check:worker` (dry run) passed. The build emitted existing chunk-size and dependency annotation warnings.
- Local Playwright's Chromium launch failed because the execution environment denied a required socket. The browser results here come from GitHub Actions, not that local attempt. A direct `git push` lacked terminal credentials; the branch and commits were uploaded through the connected GitHub integration.
- CI ran `npm ci`, `npx playwright install --with-deps <engine>`, `npm run build`, and `npx playwright test --config=playwright.phase4.config.ts tests/browser/phase4-accessibility.spec.ts tests/browser/phase3-journey.spec.ts --project=<engine> --workers=1 --reporter=line` on all three engines.
- Chromium also ran the focused `iteration06.spec.ts`, `release07.spec.ts` and `backup-integrity.spec.ts` cases for missing route assets, denied IndexedDB and invalid/incomplete/oversized backups. These three checks passed in run 42465810412.
- CI ran `phase4-layout.spec.ts` in Chromium and `npm run test:pwa -- tests/pwa/reliability.spec.ts tests/pwa/phase4-update.spec.ts tests/pwa/scale.spec.ts --workers=1 --reporter=line`. The latter passed 14/14 in run 42465810412. An earlier run had two test failures because an extra reload raced the update's own reload; the test now awaits the update-triggered load.

## Remaining release gates

No confirmed P0 data-loss issue was observed in the completed synthetic runs. P1: the existing 32 MiB restore limit remains; actual browser zoom, physical devices and native screen readers remain unverified; the broad historical browser suite, branch-protection settings and optional GitHub Pages deployment still require release review. The focused suites do not replace a full regression or prove every update/CDN transition. Repeat the outstanding gates before declaring Stable V1.0.

## Manual tests still required

- On actual iPhone/iPad Safari and Android Chrome, record device, OS and browser versions. Test installation when offered; safe areas, portrait/landscape, system text size and the virtual keyboard; create/edit a person, follow-up and opportunity; export and restore a backup; go offline after caching, edit, reload and reconnect; defer an update with an edit open.
- With VoiceOver on iOS and macOS, TalkBack on Android, and NVDA with supported desktop browsers, navigate Today, People, a profile, search, a form, validation errors, update notices and Orbit List. Confirm name/role/state announcements, focus order and return, dialog boundaries, status/error announcements and keyboard/gesture activation. Record actual versions and observations.
- At genuine browser zoom of 200% and 400%, inspect navigation, profile editing, search, export/restore and dialogs; verify text reflows, controls remain reachable and focus is visible. Narrow viewport checks do not establish real browser zoom behavior.
- Test actual screen reader and touch interaction with Orbit's List and 2D fallback, including selection and opening the associated profile. Test hardware WebGL and reduced motion on real devices.
- Exercise interrupted updates under real network/CDN conditions, including an older open tab with unsaved edits. Save edits before an initial upgrade from older clients and never roll back a v7 database to code that cannot read it.
