# PULSE 1.3.0-rc.1 — iteration 10 report

## A. Release summary

Adds Analytics Studio and user-controlled local Automation Studio to the existing local-first CRM. Existing profiles, Orbit, media, permissions, rewards and Worker configuration remain in place. No external integrations were added.

## B. Analytics architecture

Reports are derived from live local records and memoized for the selected filters. Calendar ranges use the workspace timezone and a previous period of equal calendar-day length. Meaningful conversations are dated interactions excluding notes and future records; imported metadata is not invented as a conversation. Person, company, priority and category filters apply where meaningful; pipeline and outcome apply to opportunities and interaction type to conversations. Company conversation attribution uses the company recorded with that interaction. CSV is generated locally, escapes cells and protects against spreadsheet formula injection.

## C. Historical tracking

DB v6 starts recording opportunity moves prospectively, inside the same transaction as the opportunity change. Records retain old/new stage and pipeline names, outcome and time; configuration remaps are recorded separately. Earlier entry dates are unknown. Stage age needs a recorded entry, and a completed stage stay needs both a recorded entry and exit. Creation time is not treated as a stage entry. Configuration remaps do not trigger stage rules.

## D. Opportunity reporting

Current open/won/lost counts, stage distribution, current pipeline, won/(won+lost) where applicable, open values grouped by currency, observed movements and observed stage durations are shown with record links. Current values are not historical period totals, currencies are not converted, and insufficient history is identified rather than filled in.

## E. Relationship and productivity reporting

Actual conversations and their trends, current relationship status derived from the existing recommendation service, follow-ups completed within the period, due cohorts, current open/overdue follow-ups and data-quality review links are available. Historical company attribution is preserved. The reports do not award progress or alter records.

## F. Automation engine

Typed rules cover a saved stage entry, opportunity closing soon, follow-up due soon, follow-up overdue and elapsed inactivity after a meaningful conversation. Conditions can limit person priority/category; actions create a local administrative follow-up or record an in-app reminder. Checks run on foreground startup, return/focus, relevant changes and a five-minute interval while the app is open. There is a 30-rule cap, up to 50 new outcomes per pass and a 30-day catch-up limit. Thresholds use elapsed 24-hour days. Activation, restore and resume boundaries prevent earlier conditions from replaying. A deterministic occurrence ledger and database transactions serialize competing tabs.

## G. Automation Studio

Templates, editable disabled drafts, previews, explicit enable/disable, duplication, deletion, pause/resume and a manual check are available. The latest 80 outcomes show completed, blocked or skipped explanations and links to surviving source/result records. Deleting a rule archives it to retain the deduplication ledger. Reminders are also surfaced on Home while the app is open.

## H. Safety

Current restrictions, availability and denied/withdrawn permissions are rechecked within the action transaction for linked people. The engine sends no email or messages and performs no network actions. Task creation uses the existing repository without granting creation XP; normal task completion retains the existing reward rules. Stage change, generated task and ledger write commit or roll back together. Failed writes surface an error; because the transaction rolls back, a separate failed-history row is not guaranteed.

## I. Database and backups

The additive v6 schema retains v5 media and all earlier tables. Backup versions 1–6 are accepted; v6 includes transitions, rules, ledger and pause/replay control. Restore validates records and references before atomic replacement, keeps media handling, and advances the replay boundary. Deleted sources/results retain ledger tombstones. No legacy history is fabricated.

## J. Testing

The implementation includes tests for real transitions, configuration label snapshots, invalid references, rollback, cross-tab contention, restrictions and withdrawn permissions, no artificial XP, deletion and tombstones, no replay after restore, old backups, actual interaction/timezone/DST counting, historical company attribution, multi-currency reporting, CSV safety and inactivity reminders. Verification: `npm run typecheck`, `npm run lint`, `npm test` (174 tests), production build, scoped-subpath build, Worker dry run and production dependency audit (zero reported vulnerabilities) passed. The production browser run passed 61/62; the mobile restore comparison failed because it expected the pre-restore automation watermark. The assertion was corrected to verify the new replay boundary and passed on both mobile and desktop in a focused rerun. All 14 PWA/offline cases passed (12 root and 2 subpath). The six new browser scenarios also passed in both viewport projects before the full regression. Deployment outcome is recorded in the release pull request after the live checks.

## K. Accessibility and responsive QA

Analytics and Automation screens use labeled controls, keyboard-operable chart buttons, semantic groups and existing modal patterns. Automated checks cover 320, 375, 390, 430, 768, 1024, 1280 and 1440 pixel layouts in light and dark, plus axe checks; screenshots were inspected. These checks do not substitute for physical-device or native screen-reader testing and do not establish WCAG certification.

## L. Performance

The new views are lazy-loaded. A synthetic local Vitest run with 1,000 contacts, 5,000 dated conversations, 400 opportunities and 2,000 transition records measured approximately 58 ms for reporting on this host. Five inactivity rules over 1,024 contacts and 5,000+ conversations took approximately 37 ms in that run. These are local synthetic timings, not field performance promises. Calendar formatters are reused with a bounded cache; rules are evaluated in bounded passes.

## M. Deployment

Target is the existing Git-triggered Cloudflare Worker at https://pulse.icareaboutyoufam.workers.dev. Exact merge SHA, Cloudflare build status, release metadata and live functional smoke results belong in the pull request after deployment; this file alone does not assert that a build is live.

## N. Limitations

Pre-v6 stage durations cannot be reconstructed. Reminders are in-app and checks run only while PULSE is open; there is no background push or automatic communication. Historical status changes other than recorded stage transitions are not reconstructed, and values in different currencies are never combined. Failure rolls back action and ledger together rather than guaranteeing a persistent failed outcome. Physical-device and native screen-reader verification remains outstanding.

## O. Prompt 11 readiness

Local reports, typed rules, saved provenance and restriction checks provide a foundation for separately designed, optional Google Calendar, Google Contacts and Gmail draft handoffs. Those integrations, authentication, sync, remote conflict handling and permission scopes are not part of iteration 10 and require explicit future design and authorization.
