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
- Optional progress now implemented in iteration 04; advanced challenges and richer planning remain future work.
- Google OAuth providers remain planned/disconnected. Iteration 05 adds disabled optional protected Gemini and local calendar/communication handoffs.
- PWA build verified; physical installation, cache-update lifecycle, and full offline navigation await device testing.

## Iteration 02 — implemented

- Opportunity CRUD from pipeline/person/company; representative validation, manual values/probability, expected close and explicit stage/outcomes.
- Interaction edit/delete, historical company attribution, filtered/paged relationship stories and preserved linked tasks.
- Follow-up editing, reassignment/rescheduling, completion/reopen and safe deletion.
- Availability date/reason/source editors, ended restriction snapshots and channel/purpose permission editing.
- Profile snapshots, section navigation, linked representatives and shared record cards/actions.
- Directory availability/category filters, trimmed search and reset/empty states.
- Expanded data and browser acceptance/layout regression coverage. Exact executed results in QA_REPORT.md.

## Iteration 03 — implemented

- Shared deterministic health/review engine, unknown/imported history provenance, overdue/timeout/deal indicators and evidence-based explanations.
- Relationship Review with category/sort controls, contextual task/log/deal editors, persisted snoozes/dismissals and restricted administrative views.
- Built-in and custom ALL/ANY Smart Lists with live membership, persistence, rename/edit/delete and Network integration.
- Guided CSV parsing/mapping/validation/duplicate review, selected-field updates, company matching, sourced notes and atomic import/history reports.
- DB v2 non-destructive migration; backup v2 metadata and prevalidated replacement preview; old v1 backup compatibility.
- Home and opportunity/profile intelligence; configurable thresholds/preferences; directory incremental rendering.
- Expanded data, migration, import and browser regression coverage. Exact executed results and limits are in QA_REPORT.md.

## Iteration 04 — implemented

- Unified Activity task views and sorting; context/restriction labels; direct section links.
- Structured CRM action references, additive DB v3, unique-source reward entitlements and sequenced corrections within CRM transactions.
- Opt-in 5/10/5 XP rules, 100-XP levels, conservative duplicate/cap safeguards, reversal/restoration and deleted-source tombstones.
- Persisted daily task quests, configurable weekly follow-up goal, derived achievements and fixed-calendar streaks; no bonus awards or retroactive/import/restore XP.
- Independent widget, XP, achievement, quest, streak/reminder and animation controls; quiet Home integration.
- Backup v3, old v1/v2 compatibility, migration/reward/rollback and browser regression coverage. See QA_REPORT.md for exact executed results.

## Remaining consolidated iterations — 7 total

**05 — Implemented with activation boundary.** Protected, disabled-by-default Gemini Worker; bounded selected-context approvals; Catch Me Up/Ask/drafts/reviewed note-to-task; local .ics/email/WhatsApp handoffs. Synthetic provider tests and local SQLite runtime verification cover application behavior. Live generation remains off pending a fresh server secret, explicit Access configuration and provider quota/privacy review. See CLOUDFLARE.md and QA_REPORT.md. No frontend secrets, automatic sends or OAuth connection claims.

**06 — Comprehensive visual/mobile/accessibility/PWA refinement.** Screenshot-guided review moves here; refine all screens without replacing the identity. Physical installation/offline/update adoption, device keyboard behavior, contrast/screen-reader/keyboard QA and measured performance.

**07 — Release hardening and distribution.** Complete end-to-end journeys, onboarding, migration/recovery checks, defect fixing, documentation, public demo and personal-use distribution. Resolve or explicitly document remaining release limitations.

## Post-release expansions

Commerce/loyalty, multi-user/team access and synchronization are separate product expansions. Other candidates: custom pipelines, richer profile covers/custom fields, company-only segments/imports, large-data pagination, encrypted backups and advanced consent auditing. Optional integrations require secure authorization and verified provider behavior.

## Known limitations

Browser-local storage can be cleared/evicted; no encrypted database or synchronization. Preview and production origins have independent data. Multiple app copies on one origin currently share the same database names. Complete dataset live queries suit small workspaces; large-scale pagination is future work. Settings locale/timezone validate, but date/time inputs use device timezone. Formal WCAG audit, physical keyboard behavior and closed-app delivery are not claimed. JSON restores limited to 10 MB; CSV contact imports limited to UTF-8, 2 MB, 2,000 rows and 40 columns. No XLSX, arbitrary encoding conversion or import undo.

## Iteration 05 boundaries and Prompt 06 priorities

No live-provider generation, Google OAuth, automatic synchronization or persisted AI chat. Scope is one contact/company/opportunity at a time; summaries may omit older records within documented caps. Citations are source-membership checks, not guarantees of correct interpretation. Access browser-session setup is operator-managed. Prompt 06 should prioritize accessible assistant/form navigation, actual-device mailto/WhatsApp/calendar behavior, physical PWA offline/update lifecycle, contrast/focus/screen-reader review, mobile keyboards, bundle measurement and optional model activation QA only after fresh credentials/access are configured. Public demo must remain useful with AI disabled.

Production review observed a stale lazy-loaded asset in a tab spanning deployment; the existing Reload action recovered without data loss. Prompt 06 must improve update adoption and stale-chunk recovery without automatically discarding active edits.
