# Phase 4 accessibility and platform QA

## Scope and starting point

The branch was created from default-branch commit `e8bd0080dd7677db767f38c41b64d8275eb3116b`, which contains the Phase 1–3 and archive changes. The earlier default-branch check saw `356f052`; main advanced to the merge above while the work was starting. No production deployment or merge was performed as part of this phase.

Essential workflows: enter Demo or Personal; navigate Today, People, Work and Insights; create/find/edit a person and company; record a conversation and follow-up; review pipeline and Analytics; use Orbit's list or map; export/restore; and work offline after successful caching. The repository describes a responsive PWA served over HTTPS or localhost, but does not assert a specific versioned Firefox, WebKit, iOS, Android or assistive-technology support matrix. Tests below are observations, not new support or WCAG-conformance claims.

## Findings and changes

- Search: pressing Enter on a result reached with Tab could activate the previously highlighted suggestion instead. Combobox shortcuts now apply to the input; focused result buttons retain native keyboard activation and update the active selection. Browser tests cover Tab, Shift+Tab, Enter, Escape, modal boundaries and restoration.
- Reduced motion: profile, Focus and Orbit scrolling checked the saved preference but could ignore the device's preference. Both settings are now considered at the time of each scroll. An automated browser test checks actual scroll options with the device preference enabled.
- At 320 CSS pixels the People overview's third count could split the word “connections” across lines. It now uses two columns at narrow widths; a regression check tests the full word, and before/after screenshots were inspected. An Analytics Commitments grid also overflowed at 320 px; its chart container can now shrink and scroll without expanding the page.
- Accessibility checks found an invalid generic group on empty Home and chart labels that omitted their visible text; the Home group is now meaningful only when populated and chart buttons derive their name from visible content, with the full date range provided as additional screen-reader text. An initial explicit-label correction still failed the fuller axe scan in run `42466848664`; the revised implementation needs a fresh check. Pipeline cards use the appropriate heading level for overview versus board.
- In a 2× CSS-zoom simulation, the person editor's save button fell outside the viewport. The modal now converts the visual viewport height to its own layout scale. This is awaiting browser verification and does not substitute for actual browser UI zoom testing.
- A failed background service-worker update check was silently ignored. The app now displays a status message, retains the current session, and retries on a later focus/visibility check. A production-build test simulates a 503 response and verifies saved data survives an offline reload. The Help text now explains initial caching and the update failure; the installation guide identifies the current v7 database.

## Automated matrix

GitHub Actions run `42465296778`, commit `2e07e232fbccd267f77e0498f85e8f4ee0760848`, used Playwright 1.64.1 and Node 22.23.4 on Ubuntu 26.04. Browser versions: Chromium 156.0.8078.4, Firefox 157.0 and Playwright WebKit 27.2. These are desktop engine builds; WebKit's user-agent string is not proof of Safari or iOS testing.

| Area | Widths and appearance | Evidence |
| --- | --- | --- |
| Today, People directory and person profile, pipeline, follow-ups, Focus, Analytics, Orbit and data settings | 320, 390, 768, 1024 and 1440 CSS px; light/dark; periwinkle, forest, coral and blue | Chromium: 360 route/theme/width/accent combinations had no document-level horizontal overflow; the first tagged axe scans across all accents at 390 and the default accent at 320/1440 reported no violations, but omitted the wcag21a tag. Full-rule scans subsequently found label-in-name and heading-order issues; fixes and a broader tagged rerun are in progress. Automated checks do not establish complete accessibility. |
| Core saved-record journey; keyboard forms, search and Orbit list | 1024×768 on each engine | Chromium, Firefox and WebKit: five focused scenarios per engine passed, including the existing synthetic end-to-end journey and the new keyboard/reduced-motion/fallback tests. |
| Screenshots | Five widths in both themes for Today, People, Pipeline, Analytics and Orbit | Screenshots were captured in Chromium; representative images for all five widths and both themes were visually inspected. The 320 px People fix was checked against its earlier screenshot. This is not a complete visual audit of every page position and combination. |
| Enlarged content | 2× CSS zoom in a 768 px viewport | Failed on commit `7f1d78f` because the save button was outside the viewport; a correction is awaiting recheck. CSS zoom is an approximation and is not native browser UI zoom. |

The local Linux environment could not launch Chromium (`socket() failed: Operation not permitted`) and its shared browser could not reach the isolated local server. Browser results above are from GitHub-hosted runners. Orca and a working native screen-reader setup were not available. No manual screen-reader testing is claimed.

## Offline, updates and errors

The focused GitHub recovery job on run `42466848664` passed 16 browser cases plus 8 PWA cases, and the full PWA suite passed 26 cases. These cover denied IndexedDB, invalid or incomplete backup, workspace isolation, cached app navigation, offline note creation and reload, offline backup download, reconnection and reload, a deferred update with unfinished edits in two tabs, a failed update check, and repository-subpath service-worker scope. Missing lazy chunks are included in the broader browser regression. Offline requires an earlier successful online load and permitted browser storage; optional AI, Google connections and external apps still require connectivity. Browser storage can be cleared or evicted and is not a backup.

## Scale observations

Synthetic contacts were imported through the real CSV interface into separate clean workspaces; directory rendering was bounded to 60 cards. One GitHub-hosted Ubuntu 26.04 Chromium run (times include browser automation and are not a guarantee):

| Contacts | Viewport | Import to confirmation | Open directory | Filter directory | Global search |
| ---: | --- | ---: | ---: | ---: | ---: |
| 100 | mobile 390 px | 88 ms | 858 ms | 34 ms | 19 ms |
| 1,000 | mobile 390 px | 150 ms | 845 ms | 45 ms | 26 ms |
| 100 | desktop 1440 px | 86 ms | 840 ms | 38 ms | 22 ms |
| 1,000 | desktop 1440 px | 138 ms | 857 ms | 52 ms | 15 ms |

These timings do not establish performance on ordinary phones, under low memory, or with every type of record.

## Manual testing still needed

1. On a physical iPhone/iPad, test Safari and an installed PWA: create/edit records, rotate, reopen offline, export, reconnect, defer an update with unsaved text, and check safe areas and keyboard visibility.
2. On a physical Android phone, repeat in Chrome and an installed PWA, including hardware Back, small width, rotation and storage pressure.
3. With VoiceOver on iOS and macOS, and TalkBack on Android, navigate by headings and landmarks; open/close dialogs; check focus returns to the opener; hear form errors; search and activate results; and use the Orbit list to reach a record.
4. With NVDA on Windows using Firefox and Chrome, repeat those keyboard/screen-reader tasks and check reading order, status announcements and error descriptions.
5. Test actual browser zoom at 200% and 400%, text enlargement, high contrast/forced colors, keyboard-only focus visibility and real touch targets; test with device reduced motion enabled and the app setting off.

## Remaining release issues

- P1: backups larger than 32 MiB cannot be restored in the picker; the warning does not make them recoverable.
- P1: branch protection and optional GitHub Pages settings were not verified in prior phases; Cloudflare deploys main independently.
- P1: the full existing browser regression in run `42465296778` had 124 passing, 50 failing and 6 skipped cases across two Chromium viewport projects. Failures include genuine accessibility/layout defects and selectors that no longer match the current product; see the latest pull-request checks for the follow-up run. The initial chart-label and enlarged-editor fixes failed on `7f1d78f` and have been revised for another check. Focused successes are not a complete regression.
- Physical devices, native screen readers, real browser UI zoom and field performance remain unverified.
