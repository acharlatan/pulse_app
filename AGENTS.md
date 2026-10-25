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
