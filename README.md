# PULSE

**Every relationship has a story.** A local-first, mobile-first B2B CRM for independent professionals and small businesses. Release candidate 1.5.0-rc.1; stable release gates remain open.

## Workspace navigation

PULSE uses four main areas: Today, People, Work, and Insights. Today brings Daily Pulse and My Focus together; People contains the directory, Orbit, and relationship review, with saved-list management in the directory; Work contains the pipeline, follow-ups, activity, and automations. Settings, backups, imports, personalization, help, and the optional assistant are in the workspace menu. Existing route URLs remain valid.

The Atelier visual refresh uses a compact two-part Daily Pulse opening, a combined People overview, stronger navigation, distinct Work and Insights colors, and higher-contrast dark surfaces. Portrait links in the Home opening use saved contacts and open their existing profiles; an empty workspace does not show invented people.

Orbit offers an interactive 3D view with local portraits, company icons, sharp HTML labels and a 2D map plus record list. Solid lines show saved associations; short dotted tethers connect displaced labels to their 3D positions. Depth does not measure closeness. Reduced motion, a non-WebGL fallback, keyboard controls, and the record list remain available. Home's 3D sculpture is decorative and retains a CSS fallback.

The workspace menu and Settings → Appearance offer 11 language choices. Navigation, many core page labels, common actions and editor fields use locally bundled translations; other interface text remains English and the app says so beside the selector. Translation coverage is incomplete and the wording has not received a comprehensive language-by-language review. Switching languages does not use a translation API. Date and number formatting follows the selected locale. A workspace's locale is stored locally and included in backups. Contact names, notes, saved data and other user content are never translated.

## Run

Requires Node.js 22+ and npm. No service credentials or account required.

```sh
npm ci
npm run dev
npm run typecheck
npm run lint
npm test
npm run build
```

The production site is the `dist/` directory. `npm run dev` is for development; the production build generates the service worker. `npm run test:browser` supplies a portable Playwright suite; install its Chromium browser in your own development environment first (`npx playwright install chromium`). For compiled-release browser checks, build first, then use `PULSE_DIST=dist npm run test:browser -- --config=playwright.production.config.ts`. The separate PWA suite tests offline caching and service-worker updates. See `QA_REPORT.md` for what was actually run in the build environment.

## Deploy to GitHub Pages

Included `.github/workflows/pages.yml` builds and uploads the static site. Enable **Settings → Pages → GitHub Actions** and push to `main`. The workflow sets `VITE_BASE_PATH` to `/<repository-name>/`; for a user/organization root Pages repository it uses `/`. HashRouter makes links and reloads work without server rewrites. Assets, PWA scope, and start URL use the Vite base. Locally, `VITE_BASE_PATH=/pulse/ npm run build` tests a repository subpath build.

## Working today

- First-use choice: fictional demo or empty personal workspace, isolated in separate IndexedDB databases.
- 10 fictional companies, 24 people, 6 opportunities, conversations and follow-up tasks. Demo edits survive reloads.
- People/company directory, text search, person filters, sorting, linked profiles, create/edit/delete with confirmation.
- Calls, emails, meetings, messages and notes; chronological conversation history and derived last meaningful interaction.
- Linked follow-up creation/completion, overdue handling, activity timeline, real daily task progress.
- Lifecycle, priority, relationship categories, temporary pauses, indefinite holds and do-not-contact.
- Centralized, explainable relationship health and reviews; saved snoozes/dismissals; opportunity risk flags; authoritative restriction and permission checks.
- Dynamic built-in and saved ALL/ANY Smart Lists; Network applies the same saved definitions.
- CSV preview, editable mapping, row validation, deterministic duplicate comparisons, selected-field merges, company matching, atomic import and accurate result/history reports. No consent or availability is imported.
- Version-six JSON backups with optimized local images, metadata and a validated replacement preview; versions one through five remain supported.
- Light/dark/device themes; motion preference; local name, locale/timezone and rhythm settings; category-specific in-app alerts.
- JSON backups with runtime validation and atomic restore; contact CSV export; separate demo reset/personal deletion; workspace switching.
- Complete opportunity creation, editing, deletion and stage/outcome transitions; company and representative associations, values, expected close and user-entered probabilities.
- Editable/deletable conversations and follow-ups; rescheduling, completion and reopening; filtered relationship stories with historical company attribution.
- Availability reason/source editors, restriction history, explicit ending of restrictions and channel/purpose permission records.
- Generated PWA manifest, icons, prompt-based updates and offline app-shell precache. Requires HTTPS or localhost. Actual device installation/offline navigation require further device QA.

## Storage and privacy

Dexie schema version 6 uses `pulse-demo` and `pulse-personal`. Settings are stored per workspace. The active workspace and startup theme hint alone use localStorage. All timestamps are ISO UTC; display uses selected locale/timezone. Date/time inputs explicitly use the browser device timezone. Last interaction and next open task are derived from records rather than fabricated profile dates.

No mandatory account, analytics, external fonts or external avatars. Records remain local unless you export them, open a reviewed external communication handoff, or explicitly approve selected context for optional Gemini processing. AI is off by default and production generation remains unconfigured. Provider keys are never entered in the frontend. IndexedDB is **not application-level encryption**; browser-profile access permits data access. Browser clearing/eviction and device loss can erase data. Back up important records. Workspace data is scoped to an origin: preview, GitHub Pages and hosted deployments do not share records. Export/import to move between them. Databases are not yet namespaced for multiple PULSE deployments on the same origin.

## Backup and deletion

Settings → Privacy & data → Export creates a versioned JSON backup of this workspace. Restore accepts a JSON file up to 32 MB and requires explicit confirmation. Zod validates records; identifiers, foreign references and duplicates are checked before a single transaction replaces tables. Failed validation changes nothing. CSV export mitigates spreadsheet-formula injection. CSV import is available through a guided local wizard (UTF-8 CSV, up to 2 MB / 2,000 rows).

Deleting a company **detaches and preserves** its people, conversations, tasks, opportunities and activity. Deleting a person removes that person's conversations, tasks, restrictions, permissions and events, and detaches the person from preserved opportunities. Both require confirmation. Neither operation silently removes unrelated records. Export before destructive operations when you need recovery.

## Architecture

`src/app` owns providers/router/shell. `src/data` owns models, migrations, seed and transactional repositories. `src/services` holds pure recommendation rules. `src/components` contains reusable primitives, forms and offline/update feedback. `src/features` contains route modules. Shared record editors and relationship views live under `src/components`. CSS semantic tokens form the design system; Tailwind v4 is available through Vite. Dexie live queries refresh all views after writes. Route modules are lazy loaded; small CSS transitions respect reduced motion.

## Limits and next work

No synchronization, hosted CRM accounts or team permissions. Google Contacts and Calendar require a configured OAuth client and explicit user authorization; production configuration may be unavailable. Optional protected AI and manual communication/calendar handoffs are described below. No background notification delivery. The app must be open/active for in-app reminder evaluation (every minute or data update). Advanced directory pagination and broader external integrations are deferred. Relationship stories render 20 entries at a time. See `DEVELOPMENT_ROADMAP.md`, `PRODUCT_BLUEPRINT.md`, `DESIGN_SYSTEM.md` and `QA_REPORT.md`.

## License

MIT. See `LICENSE`. Fictional sample data uses reserved `.example` / `example.com` domains. Brand and initial icons are original code-native artwork.

## Cloudflare Workers

Production: https://pulse.icareaboutyoufam.workers.dev. `main` automatically builds through Workers Builds using `npm run build` and `npx wrangler deploy`. `wrangler.jsonc` serves `dist` as Static Assets, running the Worker first only for `/api/*`. See `CLOUDFLARE.md` for the disabled-by-default AI backend, access controls and secret setup. No credentials are required for ordinary CRM use.

## Iteration 02 data policy

Interaction `organizationId` captures the company at the time of the conversation. Moving a contact does not rewrite old conversations; editing an interaction offers an explicit historical-company selector. Each company story selects original interaction IDs once. Tasks use their current assigned contact's company when saved. Existing opportunity associations survive employer changes; new representatives must match the selected company. Stage is authoritative: Won/Lost set their respective outcomes; selecting an active stage explicitly reopens the deal. Existing version-one backups remain accepted; restore normalizes opportunity outcomes to stage. Iteration 03 adds three tables with an explicit non-destructive version-two migration.

For a preinstalled test browser, set `PULSE_CHROMIUM_PATH` when running `npm run test:browser`. Ordinary development uses Playwright's installed Chromium. See QA_REPORT.md for exact executed checks and limits.

## Relationship intelligence and data import

Open **Relationship Review** from Home or the People workspace’s Needs attention view. Reviews are rules based, with no AI inference. Health uses actual logged conversation dates or explicitly sourced imported last-contact dates. Notes and creation/import times never count as conversations. Unknown history stays unknown. Thresholds, inclusion preferences, default snooze and Home limits live in Settings → Relationship rhythm → Relationship intelligence settings. Snooze defers one evidence-specific recommendation; dismiss hides unchanged evidence; neither completes tasks nor changes communication eligibility.

Smart Lists save filter definitions, not copied people. ALL/ANY conditions combine stage, category, priority, effective availability, company, tags, known days since contact, health, follow-up state, and opportunity state. Unknown history never satisfies a days-since comparison. A deleted-company criterion matches no contacts. Company Smart Lists are available in iteration 08.

**Import contacts** is accessible from Network or Privacy & data. UTF-8 CSV supports quoted commas/newlines and BOM. Map full name or first name (last name optional), email(s separated by semicolons), phone, role, company, company details, category/stage/priority, tags (semicolon or |), notes and optional last-contact date. Full name takes precedence over first/last names. Date-only values represent the start of the date in device time; timestamps must include a timezone. Imported dates carry provenance; imported notes are labeled and never create false conversations.

Duplicates default to Skip. Exact normalized email is a strong match; exact phone digits and name/company are possible matches. Phone matching never infers country codes. Company names normalize case/spacing while preserving punctuation. A conflicting website or hostname-only match requires review and defaults to a separate company. Same-named companies with different website domains inside a file are reviewed separately; unknown-domain rows are kept separate in that ambiguous case. Users can deliberately create separately or update selected fields. Blank imported fields preserve existing values; tags are unioned. Existing restrictions, permissions, conversations, deals and tasks survive updates. Company detail filling is explicit and only fills empty fields, using the first selected row for each company. Two rows cannot update the same person in one plan.

Only valid selected rows are committed, in one IndexedDB transaction. Invalid rows are reported and excluded, not partially written. A full contact/company snapshot check rejects stale previews; storage errors roll back the entire plan. The wizard caps row rendering and the directory reveals 60 records at a time. Export a JSON backup before bulk edits; there is no import undo beyond restoring a backup. Reimporting unchanged data warns/skips duplicates by default; choosing Create as new intentionally permits duplicates.

Backups export format 5 with app version, time, workspace and record arrays (including Smart Lists, review actions, import history and progress). Format 1 restores supply empty new tables and default intelligence preferences. Restore replaces only the current workspace after validation and explicit confirmation; it is not a merge or synchronization service.

## Iteration 04 — optional momentum

Activity now contains Open, Today (not-yet-overdue), Overdue, Upcoming and Completed task views, due/priority/recently-updated sorting, contextual restriction notices and a separate **Your progress** view. Direct links preserve Activity/Settings section context. Existing task editors, rescheduling and profile links remain shared.

Opt in under **Settings → Your momentum → Earn XP from meaningful work**. Showing widgets is a separate preference: hiding them does not stop earning. Disabling XP pauses new earning and quest selection, preserves history and still applies source corrections. Achievements, quests, streak display/reminders, weekly target and restrained animation are individually configurable. Reduced-motion settings always take precedence. Reminders appear only while the app is open.

Rules are intentionally small: **5 XP** for completing a previously saved follow-up linked to an eligible person (title ≥12 characters OR description ≥20); **10 XP** for a newly logged Call/Meeting linked to an eligible person with summary ≥40 characters and an occurred time within the previous 24 hours; **5 XP** for moving an existing open opportunity to Won/Lost with eligible associated people and notes ≥20 characters. Minimum text length rejects empty entries, not proof of quality. Notes, imports/restores, profiles, ordinary edits and delivered-message claims earn nothing. Closed opportunities created directly do not earn. Existing open commitments may qualify when completed after opt-in; old conversations/completions are never backfilled.

Every 100 active XP adds a level, starting at level 1. At most 10 original entitlements can be earned per progress day. Same-day equivalent source signatures suppress duplicates, and deleted-source signatures suppress equivalent recreation on later days too; these are conservative heuristics, not fraud prevention. A unique source ID and unique day/content signature enforce one entitlement. Reopening/requalification deactivates/restores the original entitlement and earning date; deleting a source leaves a non-earning audit tombstone. Deleted task titles are removed from quest snapshots. Signatures avoid retaining deleted note/task text and are non-security hashes. Corrections can lower XP, relock achievements and update goals/streaks. Later restrictions do not retroactively rewrite already valid rewards; current restrictions are checked before any new grant. No outbound communication is performed.

Up to three daily quests reference specific eligible due tasks, retain their identity and append new eligible commitments only while slots remain. Completion requires that task's active original entitlement earned on that day. Reopened tasks from earlier days are not offered as fresh quests. A daily cap or same-day duplicate can make an otherwise completed task ineligible; quests add no bonus XP. Five small milestones derive from active evidence. The weekly goal counts active qualifying follow-up entitlements; zero disables it. Its achievement reflects the current target and can relock if the target changes. No quest/goal/achievement bonus can be farmed.

The progress calendar captures the selected timezone at first opt-in and stays fixed for the workspace. Display-timezone changes do not move historical days, duplicate rewards or change progress week boundaries. Weeks begin Monday. Streaks count distinct qualifying calendar days, continuing through yesterday when today has no completion; corrected/reopened records recalculate them. Historical logs cannot manufacture past streaks.

DB v3 adds rewards, sequenced rewardChanges, progressState and dailyQuests without clearing old tables. Legacy gamification placeholders remain preserved but are not authoritative XP. Backup v3 includes all new tables; compatible v1/v2 files supply safe empty progress defaults. Restore validates source/calendar/audit consistency before atomic replacement and never replays rewards. Retain the v3-compatible data layer for any rollback after migration; prefer a forward fix.

## Iteration 05 — optional PULSE Intelligence and local handoffs

Open PULSE Intelligence from Home, a profile, an opportunity or a saved conversation. Opt in under Settings → AI & integrations. **Production AI is disabled/unconfigured; the workflows are implemented and tested with synthetic provider responses, not a live Gemini key.** Local CRM features work independently. Do not reuse keys previously shared in chat; revoke/rotate them through the provider console.

Catch Me Up, scoped Ask PULSE, editable message drafting, and Notes to Actions share one local context builder. Select one contact, company or opportunity; choose record categories, conversation date and keyword filters. Notes, contact channels and values are excluded by default. A maximum of 15 records with 1,500 characters each is shown in an exact payload preview before every request. Some category-specific limits apply (3 representatives, 5 open tasks, 3 deals). There is no entire-workspace upload or background processing. Changing records after approval requires a fresh preview.

Facts cite only approved source IDs; original records can be opened for comparison. Citations validate reference membership, not factual accuracy. Suggestions and missing evidence remain distinct. Drafts are editable and are never sent automatically. Notes-to-Actions proposals show source excerpts, require individual review and a user-selected due date, and use the existing task repository. Saving a reviewed AI note creates a labeled Note; it does not replace history or count as a conversation. No AI operation or proposal creation earns XP. Later genuine task completion follows ordinary reward rules. Task provenance is stored separately from its description.

Answers, typed questions and drafts remain temporary in component memory and clear on explicit Clear, scope/operation change, workspace change or refresh. Only explicitly accepted notes/tasks become persistent and enter backups. The Worker does not log or store CRM payloads; the external provider still receives approved content and has its own retention/use terms. Free-tier provider data may be used for product improvement. Avoid sharing sensitive records until you accept the applicable terms.

**Local handoffs require no AI:** profiles have a reviewed relationship-message composer with Copy, mailto and WhatsApp links; follow-ups and saved meetings offer reviewed `.ics` calendar downloads. Native composers require a compatible configured device application. WhatsApp requires a full international number; PULSE does not infer country codes or verify account existence. Long link drafts fall back to Copy with an explanation. Contact restrictions and channel/purpose denials are rechecked. Marketing drafts require explicit applicable permission; availability expiry never grants consent. The manual relationship composer does not support marketing. Nothing is marked sent, synchronized, invited or completed merely by opening another app or downloading a calendar file.

### Development and portability

`npm run dev:worker` runs the local Worker on port 8787; `npm run dev` proxies `/api` there. Missing secrets keep generation disabled. `npm run check:worker` performs a deploy dry run. Run `npm run build` before it so static assets are current. Ordinary static/GitHub Pages distribution retains all local CRM and handoff features; without a protected API host it honestly reports AI unavailable. Service workers exclude `/api/` navigation and never cache AI responses.

IndexedDB and backup formats stay at **v3**: optional AI preferences default off on older settings, and optional task provenance is additive. Compatible v1/v2/v3 backups remain accepted. No new CRM database table, migration, secret field or persisted AI chat is introduced. Restoring data never replays AI operations or creates XP.

## Iteration 06 — product quality and update reliability

Home now leads with actionable relationship work and commitments; decorative artwork and secondary statistics follow it. Profiles lead with identity and essential actions; **More relationship tools** holds optional assistance/handoffs. Shared typography uses a 15px body, 13px labels and 12px metadata floor instead of 6–12px mobile overrides. Contrast, touch targets, wrapped controls, short-screen dialogs, safe-area navigation and dark surfaces were refined without changing CRM rules. Directory search/filter/sort state is encoded in its URL and retained when returning from profiles.

Native dialogs have unique titles, an explicit Tab boundary, Escape dismissal and focus restoration. Their height responds to the visual viewport; the floating create button hides during dialogs and field focus. Native keyboard/device validation remains a release check, not a claim based on emulation. The skip link focuses content without changing the HashRouter route; directory tabs support arrows/Home/End. Automated axe checks cover major routes against WCAG A/AA and 2.1/2.2 tags; no WCAG certification or physical screen-reader testing is claimed.

**Updates are deliberate.** Native service-worker registration replaces the helper that automatically reloaded controlled tabs. A waiting release displays Update & reload / Later. Edited forms, assistant inputs and import work are tracked only in memory; an update or full-page unload warns before discarding them. Successful settings saves clear only that form's marker. Changes made while activation is pending require another review. Adopting an update in one tab does not automatically reload another editing tab. There is no automatic draft save, external transmission or background AI retry. These safeguards apply to iteration-06 clients; save active edits before the first upgrade from an older client.

Missing lazy JS/CSS files render a route-level recovery screen while keeping the shell available. Reload is explicit, requires internet and warns about unfinished work; ordinary application/database errors are distinguished. Nothing resets IndexedDB and there is no auto-reload loop. This is graceful recovery, not a guarantee that every obsolete asset URL can load indefinitely. Browser Back/in-app navigation are not a universal draft-recovery service, and markers may conservatively warn after an import or assistant selection even when little remains to save.

The app shell precaches all current route files after a successful online workspace load. Cached contacts, companies, tasks, lists, recommendations, progress and local edits work offline; backup download remains available where supported. `/api/` stays out of caches. AI always needs a network connection and remains disabled unless separately secured/configured. Manifest icons/scope/standalone fields and Chromium installability diagnostics were checked; no Android/iOS/native installation was exercised. Use your browser's available install/Add to Home Screen control; browser and OS availability vary.

`npm run test:pwa` runs production-build tests after `npm run build`. Tests use a local-only server, real service workers and synthetic records; no test control endpoint is deployed. For an isolated build set `PULSE_DIST` to its directory. `npm run test:browser` retains all CRM and AI mock regression journeys and adds accessibility/recovery/keyboard checks. See QA_REPORT.md for measured results and limits.

Welcome now defers the CRM workspace code until selection. The only large Home animation dependency was removed after confirming no other usage; a small transform-only CSS entrance honors reduced motion. Initial JS is approximately 235 KB minified / 73 KB gzip, with a separate workspace chunk. No IndexedDB schema or backup-format migration is needed; metadata now identifies app 0.6.0, while backups remain v3 and accept compatible v1/v2 files.

## Release candidate guides

See [Getting started](GETTING_STARTED.md), [Installation](INSTALLATION.md), [Backup and recovery](BACKUP_AND_RECOVERY.md), [Changelog](CHANGELOG.md) and [Release gates](RELEASE_CHECKLIST.md). Personal Home has an optional saved-record guide; Help can reopen it. No stable 1.0 or physical-device certification is claimed.

## Release candidate hardening

The candidate includes first-run guidance, Help, installation/recovery guides, guarded dialog dismissal and editor snapshot checks for people, companies, tasks, opportunities and conversations. Stale edits fail with instructions rather than overwriting a newer or deleted record. Settings and other edits are not a conflict-free multi-user system. Save before browser Back; no persistent draft recovery is provided. Chromium desktop automation and mobile viewport checks are the verified environments; physical iOS/Android, Firefox/WebKit, native screen readers and literal browser zoom remain unverified. See RELEASE_CHECKLIST.md for the exact release boundary.


## Iteration 08 — your workflows, your focus

PULSE 1.1.0-rc.1 adds **Pipeline → Manage Pipelines**, **Settings → Personalize PULSE**, and **My Focus**. Choose Sales, Partnerships, Recruitment, Client Projects or Blank templates; edit stage names, order, colors and open/won/lost categories. Stable IDs preserve associations on rename. Used-stage removal requires replacement mapping and an impact confirmation. Archive pipelines to retain historical records, and choose another active default before archiving the default. Opportunity editors support explicit pipeline and destination-stage selection. Values remain separated by currency and outcome.

Define six custom-field types (short text, long text, number, date, checkbox and single select) for people, companies and opportunities. Edit values under Additional details. Rename/reorder/hide/archive definitions without losing values; deleting shows the saved-value count and requires confirmation. Types cannot be changed in place. Existing organization string fields remain readable as Legacy company details. Custom fields are excluded from AI context.

Pin relationships/deals/tasks and choose up to 20 priorities for a date in My Focus. Completing a selected task uses the existing task/reward transaction. Pinning and configuration earn no XP. Pins persist until removed, while daily selections stay on the selected date. Focused Home shows pinned relationships; Balanced retains the existing dashboard; Compact reduces spacing. Landing screen, shortcuts, in-app reminders and progress visibility are workspace preferences.

Smart Lists now distinguish people and companies. Company rules include industry, tags, historical conversation age (unknown excluded), representative priority, active-representative absence, follow-ups, upcoming deal deadlines, pipeline/stage/outcome, custom values and pins. Custom numeric comparisons use numbers. Archived/deleted custom fields match nothing and show an invalid-condition notice. Network company views can apply saved company segments.

Network → Bulk add tag opens explicit selection and review for adding/removing tags, contact priority and Focus pin/unpin (up to 200 filtered visible records). All selected records must still match their saved timestamps. Failure rolls back the batch. Restrictions, permissions, interaction history and rewards are not modified by administrative bulk actions.

Database/JSON backup **v4** adds pipelines, stages, definitions, typed values and focus selections. Previous v1/v2/v3 backups are normalized before atomic replacement. There is no database downgrade: retain v4-compatible code for forward fixes. Export a backup before adopting a schema update. See BACKUP_AND_RECOVERY.md and QA_REPORT.md for evidence and limits.


## Iteration 09 — the PULSE experience

PULSE 1.2.0-rc.1 adds an editorial Home led by commitments, Cards/Compact directory views, redesigned profile identity headers, a desktop Discover group and mobile More destinations. Person portraits, company logos/covers and workspace photo/name are stored locally, cropped and compressed in the browser; four accent presets support both themes. Use **Photo & cover** / **Logo & cover** beside profile editing, or Settings → Appearance → Workspace photo.

Relationship Orbit maps actual company memberships and opportunity associations, with search, filters, person/company scopes, selection details and record navigation. The map is bounded to 24 records on desktop; mobile uses up to 12 records in 3D or 18 in 2D. The accompanying list supports up to 60 records. Search or focus a record to explore larger networks. No interpersonal relationships are inferred.

DB/backup **v5** adds a media Blob store and additive identity/cover fields. Restore accepts v1–v5. Inputs: JPEG/PNG/WebP ≤8 MB/24 MP; optimized portraits/logos 320×320, covers 1280×480, ≤512 KB each. Local media is capped at 128 images/12 MB; backups use bounded base64 JSON (32 MB intake). No image hosting, cloud sync or AI media transfer. See EXPERIENCE_09.md, RELEASE_1_2.md and QA_REPORT.md for architecture and verified limits. After upgrading, use a v5-compatible forward fix rather than older database clients.


## Iteration 10: local analytics and automations

Analytics derives reports from records stored in this workspace. Conversation counts exclude notes and future entries; company history uses the company captured on each conversation. Opportunity totals are current snapshots, currencies remain separate, and stage duration is shown only after actual recorded moves. Use the date, person, company, priority and category filters and export the displayed report as local CSV.

Automation rules are local, initially disabled and require explicit enabling. Triggers cover entering a stage, a closing date, an upcoming or overdue follow-up, and inactivity after a recorded conversation. Actions create an administrative follow-up or an in-app reminder; they never send messages. Checks run only while PULSE is open, on a bounded schedule and after relevant changes. Restrictions and permissions are checked before action. The execution ledger prevents repeated actions across tabs and restores set a replay boundary. See RELEASE_1_3.md for definitions and limitations.


## Iteration 11: reviewed Google actions

Google Calendar event creation and Google Contacts selection/import require a configured public OAuth web client ID and explicit user authorization. See GOOGLE_INTEGRATIONS.md. Tokens remain in memory only. Gmail API drafts are not enabled; the reviewed email-composer handoff remains available. No automatic sending or background synchronization is performed.
