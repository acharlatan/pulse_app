# PULSE visual release review — 14 November 2026

Based on `acharlatan/pulse_app` main at `e8bd008`. This is a visual release candidate, not a declaration that every stable-release gate is closed.

## Changed

- Shared warm-paper/plum presentation, quieter panel borders, consistent card/control radii, legible dark surfaces, compact task-focused headers and visible selection/focus states.
- Daily Pulse preserves its local artwork and saved portrait links; commitments and evidence suggestions precede secondary activity. Pipeline, Orbit and Analytics retain live source-linked actions and existing editors.
- Tablet navigation fits at 768px; mobile navigation has readable inactive labels in both themes. Main-area icons, an appearance shortcut, settings/data links and five actionable Help guide cards improve orientation. New guide/appearance strings include Spanish and French; wider existing translation gaps remain.
- No repository/service rule, schema, demo seed, backup format, stage transition or CRM write behavior changed. Theme controls use the existing guarded settings-save path. Personal and Demo remain isolated.
- Follow-up cards display the saved completion timestamp when completed and the original due date when open; this corrects a misleading presentation label without modifying either stored date.

## Verified locally

- Typecheck, lint, 268 unit tests and production build passed before the final documentation/CI changes; rerun recorded before packaging.
- Managed-browser responsive fixture: all 160 route/theme/width combinations passed document-overflow checks. Screens: Daily Pulse, My Focus, People, Orbit, Pipeline, Follow-ups, Analytics, Help, a person and a company. Widths: 320, 375, 390, 430, 768, 1024, 1280 and 1440 CSS pixels; light and dark.
- Axe checks: 24 scans, zero findings against WCAG 2 A/AA and 2.1 AA rules across six core screens, 390/1440px, light/dark. These scans do not establish full accessibility compliance.
- The first checks exposed tablet header overflow and light-mode mobile navigation contrast; both were corrected and the relevant complete matrices rerun.
- Desktop visual inspection includes Daily Pulse, Pipeline and Analytics in dark mode; mobile inspection uses the actual app in the responsive iframe. Long opportunity titles, existing editor opening/saving and explicit stage movement were exercised with fictional demo records.

## Additional verification

`tests/browser/release-visual.spec.ts` covers the responsive matrix, axe checks, theme persistence, guide navigation and the empty Personal workspace. The CI visual-release job runs those cases and existing campaign/relationship, archive/backup, Analytics, search, Home and Orbit motion journeys against the compiled output. Report its actual status separately; providing a workflow is not proof it passed.

The local Playwright process could not launch Chromium because this managed environment denies its process-singleton socket. No browser assertions ran in that attempted CLI suite. Managed browser checks above are separate executed evidence. Hardware WebGL is unavailable in the managed browser, so the preserved 2D/CSS fallbacks were inspected. Physical iOS/Android, hardware 3D, native screen readers and full browser/PWA certification remain unverified.

The automatic approval review rejected a push to the public GitHub remote because the user requested private work. No alternative public write was attempted. The source is retained in the owner-only Site repository; the supplied GitHub CI job and browser specs have not been run remotely in this turn.

## Deployment scope and data

The visual candidate was first verified in an owner-only private review Site. The user subsequently authorized transferring the completed changes to acharlatan/pulse_app for the existing Cloudflare website. The GitHub transfer excludes the private preview hosting manifest and preserves wrangler.jsonc and the existing Workers Builds connection. Main continues to be the production build trigger.

Local records belong to their original origin. A private review URL has separate IndexedDB storage. Existing records remain at the original URL; use the existing JSON backup/export and reviewed restore flow to transfer them. This visual update does not reset, migrate or synchronize between origins.
