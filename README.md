# pulse_app

AI Powered CRM Messenger

**PULSE — Every relationship has a story.**

**Every relationship has a story.** A local-first, mobile-first B2B CRM for independent professionals and small teams. Development iteration 03.

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

The production site is the `dist/` directory. `npm run dev` is for development; the production build generates the service worker. `npm run test:browser` supplies a portable Playwright suite; install its Chromium browser in your own development environment first (`npx playwright install chromium`). See `QA_REPORT.md` for what was actually run in the build environment.

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
- Version-two JSON backups with metadata and a validated replacement preview; version-one restores remain supported.
- Light/dark/device themes; motion preference; local name, locale/timezone and rhythm settings; category-specific in-app alerts.
- JSON backups with runtime validation and atomic restore; contact CSV export; separate demo reset/personal deletion; workspace switching.
- Complete opportunity creation, editing, deletion and stage/outcome transitions; company and representative associations, values, expected close and user-entered probabilities.
- Editable/deletable conversations and follow-ups; rescheduling, completion and reopening; filtered relationship stories with historical company attribution.
- Availability reason/source editors, restriction history, explicit ending of restrictions and channel/purpose permission records.
- Generated PWA manifest, icons, prompt-based updates and offline app-shell precache. Requires HTTPS or localhost. Actual device installation/offline navigation require further device QA.

## Storage and privacy

Dexie schema version 2 uses `pulse-demo` and `pulse-personal`. Settings are stored per workspace. The active workspace and startup theme hint alone use localStorage. All timestamps are ISO UTC; display uses selected locale/timezone. Date/time inputs explicitly use the browser device timezone. Last interaction and next open task are derived from records rather than fabricated profile dates.

No account, analytics, external fonts, external avatars, AI processing or API keys. Records do not leave the browser unless you export them. IndexedDB is **not application-level encryption**; browser-profile access permits data access. Browser clearing/eviction and device loss can erase data. Back up important records. Workspace data is scoped to an origin: preview, GitHub Pages and hosted deployments do not share records. Export/import to move between them. Databases are not yet namespaced for multiple PULSE deployments on the same origin.

## Backup and deletion

Settings → Privacy & data → Export creates a versioned JSON backup of this workspace. Restore accepts a JSON file up to 10 MB and requires explicit confirmation. Zod validates records; identifiers, foreign references and duplicates are checked before a single transaction replaces tables. Failed validation changes nothing. CSV export mitigates spreadsheet-formula injection. CSV import is available through a guided local wizard (UTF-8 CSV, up to 2 MB / 2,000 rows).

Deleting a company **detaches and preserves** its people, conversations, tasks, opportunities and activity. Deleting a person removes that person's conversations, tasks, restrictions, permissions and events, and detaches the person from preserved opportunities. Both require confirmation. Neither operation silently removes unrelated records. Export before destructive operations when you need recovery.

## Architecture

`src/app` owns providers/router/shell. `src/data` owns models, migrations, seed and transactional repositories. `src/services` holds pure recommendation rules. `src/components` contains reusable primitives, forms and offline/update feedback. `src/features` contains route modules. Shared record editors and relationship views live under `src/components`. CSS semantic tokens form the design system; Tailwind v4 is available through Vite. Dexie live queries refresh all views after writes. Route modules are lazy loaded; Motion is used for restrained entry transitions.

## Limits and next work

No sync, authentication, team permissions or external integrations. Integrations are honestly labeled planned/disconnected. No background notification delivery. The app must be open/active for in-app reminder evaluation (every minute or data update). Custom pipelines, advanced directory pagination and detailed gamification are deferred. Relationship stories render 20 entries at a time. See `DEVELOPMENT_ROADMAP.md`, `PRODUCT_BLUEPRINT.md`, `DESIGN_SYSTEM.md` and `QA_REPORT.md`.

## License

MIT. See `LICENSE`. Fictional sample data uses reserved `.example` / `example.com` domains. Brand and initial icons are original code-native artwork.

## Cloudflare Workers

Production: https://pulse.icareaboutyoufam.workers.dev. `main` automatically builds through Workers Builds using `npm run build` and `npx wrangler deploy`. `wrangler.jsonc` serves `dist` as Static Assets. See `CLOUDFLARE.md`. No Gemini credentials are required or stored.

## Iteration 02 data policy

Interaction `organizationId` captures the company at the time of the conversation. Moving a contact does not rewrite old conversations; editing an interaction offers an explicit historical-company selector. Each company story selects original interaction IDs once. Tasks use their current assigned contact's company when saved. Existing opportunity associations survive employer changes; new representatives must match the selected company. Stage is authoritative: Won/Lost set their respective outcomes; selecting an active stage explicitly reopens the deal. Existing version-one backups remain accepted; restore normalizes opportunity outcomes to stage. Iteration 03 adds three tables with an explicit non-destructive version-two migration.

For a preinstalled test browser, set `PULSE_CHROMIUM_PATH` when running `npm run test:browser`. Ordinary development uses Playwright's installed Chromium. See QA_REPORT.md for exact executed checks and limits.

## Relationship intelligence and data import

Open **Relationship Review** from Home, Network, or the desktop navigation. Reviews are rules based, with no AI inference. Health uses actual logged conversation dates or explicitly sourced imported last-contact dates. Notes and creation/import times never count as conversations. Unknown history stays unknown. Thresholds, inclusion preferences, default snooze and Home limits live in Settings → Relationship rhythm → Relationship intelligence settings. Snooze defers one evidence-specific recommendation; dismiss hides unchanged evidence; neither completes tasks nor changes communication eligibility.

Smart Lists save filter definitions, not copied people. ALL/ANY conditions combine stage, category, priority, effective availability, company, tags, known days since contact, health, follow-up state, and opportunity state. Unknown history never satisfies a days-since comparison. A deleted-company criterion matches no contacts. Company-only custom segments are not yet available.

**Import contacts** is accessible from Network or Privacy & data. UTF-8 CSV supports quoted commas/newlines and BOM. Map full name or first name (last name optional), email(s separated by semicolons), phone, role, company, company details, category/stage/priority, tags (semicolon or |), notes and optional last-contact date. Full name takes precedence over first/last names. Date-only values represent the start of the date in device time; timestamps must include a timezone. Imported dates carry provenance; imported notes are labeled and never create false conversations.

Duplicates default to Skip. Exact normalized email is a strong match; exact phone digits and name/company are possible matches. Phone matching never infers country codes. Company names normalize case/spacing while preserving punctuation. A conflicting website or hostname-only match requires review and defaults to a separate company. Same-named companies with different website domains inside a file are reviewed separately; unknown-domain rows are kept separate in that ambiguous case. Users can deliberately create separately or update selected fields. Blank imported fields preserve existing values; tags are unioned. Existing restrictions, permissions, conversations, deals and tasks survive updates. Company detail filling is explicit and only fills empty fields, using the first selected row for each company. Two rows cannot update the same person in one plan.

Only valid selected rows are committed, in one IndexedDB transaction. Invalid rows are reported and excluded, not partially written. A full contact/company snapshot check rejects stale previews; storage errors roll back the entire plan. The wizard caps row rendering and the directory reveals 60 records at a time. Export a JSON backup before bulk edits; there is no import undo beyond restoring a backup. Reimporting unchanged data warns/skips duplicates by default; choosing Create as new intentionally permits duplicates.

Backups now export format 2 with app version, time, workspace and record arrays (including Smart Lists, review actions and import history). Format 1 restores supply empty new tables and default intelligence preferences. Restore replaces only the current workspace after validation and explicit confirmation; it is not a merge or synchronization service.
