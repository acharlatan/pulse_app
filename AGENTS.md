# PULSE agent instructions

Read README.md, PRODUCT_BLUEPRINT.md, DESIGN_SYSTEM.md, DEVELOPMENT_ROADMAP.md and QA_REPORT.md before changes.

- Preserve working user journeys and the mobile-first social product identity. Never replace working CRM behavior with static demo-only cards.
- Use strict TypeScript. Keep route modules under src/features, UI primitives under src/components, and persistent operations under src/data/repository.ts. Pure business rules live under src/services.
- All consequential writes must validate data and references, finish before success feedback, and create appropriate activity events within the same transaction. UI must reflect database state through shared live queries.
- Demo/personal databases are isolated. Never reset on refresh. Reset/delete/restore require clear confirmation. Deleting companies preserves/detaches records; deleting contacts follows the documented dependency policy. Add transaction regression tests when changing this.
- Advance Dexie schema versions with explicit migrations. Never silently drop tables/fields. Validate imported unknown input at runtime; reject duplicate IDs and dangling references before atomic replacement.
- Availability, lifecycle, category, priority and channel/purpose permissions are distinct. Timeouts and opt-outs must be applied before recommendations. Expiry permits review only. Never automatically send outreach.
- No frontend developer keys, no fake OAuth success, no personal records in logs, no external transmission by default. AI must never be authoritative for deterministic state.
- Use semantic theme tokens and reusable primitives. Theme every dialog/menu/input. Respect reduced motion and safe areas. Keep keyboard focus visible and active controls reachable. No inert buttons or misleading integrations.
- Check 320, 375, 390, 430, 768, 1024, 1280 and 1440px. Inspect long names, notes, email addresses and empty data. Do not conceal overflow with a global overflow-x:hidden fix.
- Run npm run typecheck, npm run lint, npm test and npm run build. Add business/regression tests for consequential changes. Run browser tests where supported and visually inspect actual output; report unavailable checks honestly.
- PWA uses relative base assets and HashRouter. Verify GitHub Pages subpath builds after routing/PWA changes. Do not cache private third-party responses or force a reload during user editing.
- Keep documentation accurate and concise. Distinguish implemented functionality, partial foundations and future work. Never claim production readiness or WCAG compliance solely from a build.

- Interaction organizationId is a historical snapshot. Never aggregate old conversations under a new employer solely by current contact membership. Changes to this policy require migration and regression tests.
- Stage is authoritative for opportunity outcome (Won→won, Lost→lost, other→open); reopening requires selecting an active stage. Deleting tasks/deals must clear interaction references while preserving conversations.
- Permission purposes remain distinct. Detailed availability edits preserve ended snapshots; an ended timeout must never supersede another active restriction or grant marketing permission.

- Health/review/availability calculations belong in the shared recommendations service. Never count record/import timestamps or notes as meaningful conversations. Sourced imported dates must retain provenance.
- Review-action keys identify structural evidence, never presentation strings. Snoozes/dismissals do not change contact restrictions, consent or task state.
- CSV must use the parser/mapping/validated plan path. Duplicate decisions are user controlled; blank fields preserve existing data and imports never write permissions or restrictions. Validate stale previews and commit atomically with regression tests for rollback.
- DB v2 and backup v2 include saved definitions, review actions and import history. Preserve v1 upgrade/restore support; never downgrade production databases or discard new tables on export. Smart Lists store definitions rather than copied contacts.

- DB/backup v3 adds authoritative reward entitlements, sequenced correction history, fixed progress calendar and daily task definitions. Preserve v1/v2 restore compatibility; never replay restored/imported CRM events into rewards or treat legacy gamification totals as authoritative.
- All qualifying CRM writes and reward corrections share a transaction. Stable source IDs, original earning dates, unique content/day signatures and deletion tombstones prevent retry/reopen/recreate inflation. Preserve these with regression tests. Source corrections must update derived goals/milestones/streaks.
- Progress is opt-in and separate from widget visibility. Its timezone is captured at first opt-in; do not silently rebase history when display timezone changes. Do not parse human-readable event text to grant rewards. No achievement/quest/goal bonus exists in iteration 04.
- The roadmap is seven total iterations. Comprehensive screenshot-guided review is iteration 06; commerce, teams and synchronization are post-release expansions.

- Optional AI shares only approved bounded context through the protected Worker. Never add browser keys, entire-workspace uploads, model-controlled tools or automatic CRM writes. Source references must validate against approved IDs; citations do not prove interpretation. Keep AI responses out of caches/logs and preserve the disabled fallback.
- AI task/note acceptance must use shared transactional repositories, carry provenance separately from substantive descriptions, remain idempotent and earn no creation XP. Restrictions and purpose/channel permissions are rechecked before draft handoffs. Imports/restores never replay AI requests.
- Keep Access JWT signature/audience/issuer/expiry validation and server SQLite admission caps. Never reset quota identity, enable paid features, expose a quota-reset route or enable generation to bypass missing credentials/access. Preserve Durable Object migrations on rollback. Run Worker typecheck, dry-run bundle and runtime tests alongside existing checks when server code changes.

- Keep service-worker updates explicit and edit-aware. Do not reintroduce registration helpers that unconditionally reload other controlled tabs, duplicate SW registration, automatic stale-chunk reload loops or background AI replay. Update approval must preserve other tabs' unfinished edits. Classify missing JS/CSS separately from ordinary application errors and retain route-level recovery.
- Typography tokens have a 12px metadata floor, 13px labels and 15px body; mobile controls use 16px. Retain unique dialog titles, focus boundaries/restoration, safe areas, URL-backed directory context and reduced-motion behavior. Run axe/keyboard checks as well as screenshots and overflow checks. Use a clean production output for offline/update tests and report physical-device/screen-reader limitations.

- Editors must load a fresh saved snapshot on opening and pass its updatedAt to transactional stale-save checks for people, companies, tasks, opportunities and conversations. Never bypass a mismatch to overwrite newer/deleted data. Keep save failures visible inside the active modal. Preserve legacy settings defaults when changing validation libraries, and run historical backup fixtures.
