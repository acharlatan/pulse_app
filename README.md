# pulse_app

AI Powered CRM Messenger

**PULSE — Every relationship has a story.**

**Every relationship has a story.** A local-first, mobile-first B2B CRM for independent professionals and small teams. Development iteration 02.

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
- Transparent, dismissible reconnect recommendations that respect availability, saved restrictions and denied/withdrawn relationship permissions.
- Light/dark/device themes; motion preference; local name, locale/timezone and rhythm settings; category-specific in-app alerts.
- JSON backups with runtime validation and atomic restore; contact CSV export; separate demo reset/personal deletion; workspace switching.
- Complete opportunity creation, editing, deletion and stage/outcome transitions; company and representative associations, values, expected close and user-entered probabilities.
- Editable/deletable conversations and follow-ups; rescheduling, completion and reopening; filtered relationship stories with historical company attribution.
- Availability reason/source editors, restriction history, explicit ending of restrictions and channel/purpose permission records.
- Generated PWA manifest, icons, prompt-based updates and offline app-shell precache. Requires HTTPS or localhost. Actual device installation/offline navigation require further device QA.

## Storage and privacy

Dexie schema version 1 uses `pulse-demo` and `pulse-personal`. Settings are stored per workspace. The active workspace and startup theme hint alone use localStorage. All timestamps are ISO UTC; display uses selected locale/timezone. Date/time inputs explicitly use the browser device timezone. Last interaction and next open task are derived from records rather than fabricated profile dates.

No account, analytics, external fonts, external avatars, AI processing or API keys. Records do not leave the browser unless you export them. IndexedDB is **not application-level encryption**; browser-profile access permits data access. Browser clearing/eviction and device loss can erase data. Back up important records. Workspace data is scoped to an origin: preview, GitHub Pages and hosted deployments do not share records. Export/import to move between them. Databases are not yet namespaced for multiple PULSE deployments on the same origin.

## Backup and deletion

Settings → Privacy & data → Export creates a versioned JSON backup of this workspace. Restore accepts a JSON file up to 10 MB and requires explicit confirmation. Zod validates records; identifiers, foreign references and duplicates are checked before a single transaction replaces tables. Failed validation changes nothing. CSV export mitigates spreadsheet-formula injection. CSV import is planned.

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

Interaction `organizationId` captures the company at the time of the conversation. Moving a contact does not rewrite old conversations; editing an interaction offers an explicit historical-company selector. Each company story selects original interaction IDs once. Tasks use their current assigned contact's company when saved. Existing opportunity associations survive employer changes; new representatives must match the selected company. Stage is authoritative: Won/Lost set their respective outcomes; selecting an active stage explicitly reopens the deal. Existing version-one backups remain accepted; restore normalizes opportunity outcomes to stage. No IndexedDB structure changes or destructive migration is needed.

For a preinstalled test browser, set `PULSE_CHROMIUM_PATH` when running `npm run test:browser`. Ordinary development uses Playwright's installed Chromium. See QA_REPORT.md for exact executed checks and limits.
