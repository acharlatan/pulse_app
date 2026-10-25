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

- Pipeline read/stage updates; no opportunity creation/edit/delete yet.
- Restriction/permission repositories and schemas; no full channel consent editor.
- In-app alerts evaluated when active; no background/browser/push/email delivery.
- Gamification data schema; actual daily task progress only.
- Integration metadata only. Every provider is planned and disconnected.
- PWA build verified; physical installation, cache-update lifecycle, and full offline navigation await device testing.

## Prompt 02 — recommended priority

1. Add complete opportunity CRUD, organization/contact association validation, won/lost outcomes, and clean mobile stage workflow.
2. Add interaction edit/delete with recalculated relationship history and task edit/reschedule with explicit linked next actions.
3. Expand permission editor and timeout reason/history; explain which restriction suppresses a suggestion.
4. Improve readable metadata/contrast and complete keyboard/screen-reader QA; strengthen mobile dialogs with real keyboard testing.
5. Extend browser regression suite and physical iOS/Android install/offline/update tests.

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
