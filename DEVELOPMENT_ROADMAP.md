# Development roadmap

## Iteration 01 — delivered

- React/TypeScript/Vite foundation; lazy hash routes; semantic visual tokens; responsive shell; theme persistence.
- IndexedDB v1, transactional repositories, stable IDs, live shared state and separate demo/personal databases.
- Company/person CRUD, directory search/filter/sort, linked profiles, explicit deletion policies.
- Saved conversations/notes, follow-up creation/completion, chronological story and event timeline.
- Stage/category/priority/availability, dated/indefinite pause, do-not-contact and conservative consent-aware recommendations.
- Home derived from records; dismissible recommendations; real daily completion summary.
- Grouped settings; locale/timezone; rhythm thresholds; in-app alert toggles; backups/validated atomic restore; CSV export; demo reset.
- PWA manifest/icons/offline precache/update prompts; GitHub Pages workflow; documentation and automated business/component tests.

## Partial foundations

- One configured pipeline; custom pipeline/stage editing remains future work.
- Basic channel/purpose permissions and availability history; advanced consent audit/export and multi-rule conflict resolution remain future work.
- In-app alerts evaluated when active; no background/browser/push/email delivery.
- Gamification data schema; actual daily task progress only.
- Integration metadata only. Every provider is planned and disconnected.
- PWA build verified; physical installation, cache-update lifecycle, and full offline navigation await device testing.

## Iteration 02 — implemented

- Opportunity CRUD from pipeline/person/company; representative validation, manual values/probability, expected close and explicit stage/outcomes.
- Interaction edit/delete, historical company attribution, filtered/paged relationship stories and preserved linked tasks.
- Follow-up editing, reassignment/rescheduling, completion/reopen and safe deletion.
- Availability date/reason/source editors, ended restriction snapshots and channel/purpose permission editing.
- Profile snapshots, section navigation, linked representatives and shared record cards/actions.
- Directory availability/category filters, trimmed search and reset/empty states.
- Expanded data and browser acceptance/layout regression coverage. Exact executed results in QA_REPORT.md.

## Prompt 03 — recommended priority

1. Expand import mapping, deduplication and recovery workflows; strengthen backups and origin-to-origin workspace transfer.
2. Add channel-specific recommendation explanations and a purposeful review queue; preserve deterministic rules and opt-outs.
3. Extend browser coverage for restriction/permission edge cases, backup file chooser and multi-tab conflict handling.
4. Physical iOS/Android keyboard, PWA installation/offline/update QA. Keep the screenshot-guided product review for Prompts 07–08.

## Later iterations

- Rich profiles, tags, saved filters, profile section preferences, pagination and import mapping/deduplication.
- Advanced relationship intelligence with transparent rules, dormant queue and proposal risk.
- Optional XP/quests/streaks with anti-farming and explicit opt-out.
- Optional Gemini contextual summaries and reviewed drafts via secure backend; no secret frontend tokens.
- Authorized Calendar/Gmail/Contacts, WhatsApp deep links, external LinkedIn URLs; never scrape private data.
- Custom pipelines, health/orbit views, forecasting, custom fields.
- Separate Commerce workspace: purchases, loyalty and purpose-specific opt-in marketing.
- Optional synchronization, conflicts, encrypted backups and team access.

## Known limitations

Browser-local storage can be cleared/evicted; no encrypted database or synchronization. Preview and production origins have independent data. Multiple app copies on one origin currently share the same database names. Complete dataset live queries suit small workspaces; large-scale pagination is future work. Settings locale/timezone validate, but date/time inputs use device timezone. Formal WCAG audit, physical keyboard behavior and closed-app delivery are not claimed. JSON imports limited to 10 MB; CSV import unavailable.
