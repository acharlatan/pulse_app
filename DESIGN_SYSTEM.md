# PULSE design system

## Identity

Airy editorial spacing, warm neutrals, periwinkle emphasis and relationship-centered cards. Code-native orbital artwork expresses people in connection; initials provide private, deterministic avatars with no remote requests. Avoid corporate tables, gradient wallpaper, unnecessary button outlines and fake analytics.

## Tokens

Current semantic variables in `src/experience.css`, extending `src/styles.css`:

| Token        | Light     | Dark      |
| ------------ | --------- | --------- |
| Background   | `#f6f5f2` | `#17181d` |
| Surface      | `#fffefa` | `#202127` |
| Text         | `#262739` | `#f1f0eb` |
| Muted        | `#626373` | `#b7b6c2` |
| Primary      | `#6650ce` | `#b3a3ff` |
| Soft primary | `#efebfb` | `#332b4b` |
| Success      | `#247965` | `#8dd6ba` |
| Danger       | `#b53d55` | `#ffa5b5` |

Muted/faint values were strengthened and automated contrast checks passed on the tested major routes. Manual contrast and screen-reader review remain necessary before any conformance claim. Semantic tokens apply to every surface, input, dialog and feedback state. Illustration hues and avatar pastels are decorative component-specific exceptions.

## Type and space

Native system sans-serif avoids remote font requests. Page titles 26–38px; section titles 15–21px; body 15px; labels 13px; metadata 12px minimum. Mobile form controls use 16px to preserve reading comfort. Secondary information stays lower emphasis through hierarchy, not tiny text; continue physical-device readability QA.

Use a 4px base and 8px major rhythm; card padding 20–32px, page gutters 14–40px, grid gaps 16–24px. Compact metadata spacing and icon alignment may use optical adjustments. Standard button/input height at least 44–46px; task check visuals extend their hit area. Cards 15–22px radii; inputs/buttons 10–12px. Avoid treating secondary buttons as selected controls.

## Layout

Desktop: fixed sidebar, centered 1280px maximum content, intentional Home primary/secondary columns. Tablet collapses Home to a main column with supporting panels. Below 768px: bottom navigation, safe-area spacing, top settings/alerts, contextual floating add. Directory goes 3 → 2 → 1 columns. Profiles stack essential details and relationship story. Settings category navigation wraps rather than clips. Dialogs use native `showModal`, internal scrolling and small-screen margins.

## Components and states

Filled primary, soft secondary, ghost and destructive actions. Selection uses explicit theme/tab state; keyboard focus always visible. Badges combine status text with color. Profiles use named avatars, role, company and restriction labels. Error/empty/loading states are deliberate. Toasts report completed writes or recoverable errors; update notices require user action before reloading.

## Accessibility and motion

Semantic headings, labels, native dialogs with Escape/focus handling, skip link and keyboard focus. Reduced-motion media query plus user setting. Home uses a short transform-only entrance disabled by either preference; text never fades through low contrast. Never introduce auto-playing celebrations or dragging as the only way to change pipeline stage. Screen-reader and contrast audits remain part of ongoing QA; no certification claimed.

## Iteration 02 profile and record patterns

Profiles retain the original cover and avatar identity. Section jump navigation, a three-part factual relationship snapshot and progressive permission/history details organize longer pages. Shared relationship stories use type-specific icons, attribution, occurred timestamps, full-text expansion, a type filter and 20-entry pagination. Task actions wrap into comfortable rows on phones. Opportunity details use the same scrollable native dialog and form rhythm as profiles; checkbox representatives avoid a cramped native multi-select. All surfaces and controls use existing semantic theme variables. No remote images or custom cover storage was introduced.

## Iteration 03 patterns

Relationship Review uses responsive avatar cards with a factual explanation, evidence-specific actions and a restrained category badge. Category controls wrap on phones; the four-item mobile navigation remains intact, with Review reachable from Home and Network. Saved-list management uses a compact selector and live people rows. Filter builders use shared scrollable native dialogs with labeled conditions.

The import wizard uses seven visible stages (file, preview, mapping, validation, duplicates, confirmation, results). Sample rows and existing/imported comparisons expand within the page; no unbounded spreadsheet is rendered. Duplicate rows paginate in tens. Summary tiles show actual plan/result counts. The explicit confirmation names the active workspace. Semantic tokens theme every new surface; no remote media, charts, fonts or AI decoration is required.

## Iteration 04 progress patterns

Progress uses existing surfaces, badges, native progress bars and form controls. Home contains one optional compact summary; the detailed ledger, milestones and task-linked quests live behind Activity → Your progress. Restricted quest tasks retain a clear administrative explanation and profile access rather than an outreach prompt. No leaderboards, confetti, predictive scores or game-based access gates were added. Success motion is a short opt-in toast entrance, suppressed by OS or app reduced motion. Progress preferences save as one labeled, guarded form. Task and milestone content wraps at 320px; histories are bounded to the latest 40 corrections, with full history retained in backup. The comprehensive visual review is now reserved for iteration 06.

## Iteration 05 assistance and handoffs

Assistant uses existing surfaces, semantic tokens and maximum content width with a single-column mobile form. Identity/category controls precede exact-context approval; long JSON previews scroll within a bounded panel rather than widening the page. Response sections distinguish cited facts, suggestions and missing evidence. AI labels remain visible; drafts and proposals retain ordinary editable fields and explicit Save/Reject actions. Restrictions appear in plain text, not color alone. New calendar and message reviews reuse the accessible Modal and shared button patterns. No second navigation system, remote imagery or new animation framework is introduced. Large visual/accessibility/PWA review remains iteration 06.

## Iteration 06 refinements

The existing declarations and responsive variants use shared `--font-meta`, `--font-label`, `--font-body`, `--input-border`, `--ambient` and `--hero-ink` tokens. Light muted/faint are #626477/#6d6f82; dark #b7b3c8/#aaa5bc. A restrained top-edge ambient wash and low elevation provide depth. Ordinary controls keep filled/soft/ghost states; color-changing button transitions were removed to avoid illegible light/dark crossover.

Home puts useful work ahead of the hero; profile tools use an accessible disclosure. Tab groups wrap at small widths, task/person links have useful target heights and short desktop sidebars scroll while hiding nonessential promotional copy. Mobile top and bottom navigation respect safe areas. Page padding reserves the final action/navigation region; create controls hide while editing a field or dialog. Toasts sit near the mobile top rather than over bottom actions. Dialogs use viewport-aware internal scrolling, unique accessible titles and an explicit focus boundary/restoration. Larger typography is applied in existing style rules rather than replacing the design language.

Welcome, Home, Network, profiles, Pipeline, Activity/Progress, Review, Smart Lists, Import, Assistant and Settings were captured internally. Tests combine overflow, dialog bounds, landscape, enlarged text, keyboard and axe findings. No screenshot was accepted solely because overflow was absent. See QA_REPORT.md for exact coverage and unavailable physical/native assistive technology tests.

## Release candidate guidance

Getting Started reuses surface, text-link and primary/secondary button patterns. Steps have text descriptions and current-record completion indicators; no fabricated progress or XP. Help uses native details/summary with 44px summary targets, shared semantic surfaces and lazy route loading. Empty Personal Home avoids zero-value statistics.


## Iteration 08 — current expansion

Iteration 08 retains semantic light/dark tokens, native form controls, clear stage category labels and reusable modal forms. Stage color is only a border accent; meaning remains textual. Pipeline boards use readable stage groups and bounded card batches. Customization lives behind Manage Pipelines/Personalize PULSE. Focus cards distinguish personal choices and underlying task completion. Mobile customization actions wrap as complete buttons, and checkboxes retain compact native dimensions.


## Iteration 09 — editorial-social system

`src/experience.css` extends the semantic system: warm paper/deep charcoal, periwinkle/forest/coral/blue accent presets, expressive headings, 12px metadata/13px labels/15px body floors and 16px mobile inputs. Inactive buttons use quiet filled surfaces; selection/focus states remain distinct. Ambient color stays behind readable surfaces; profile names/actions sit off cover photography. Reusable Avatar/LocalMedia and lazy MediaControls retain deterministic initials/ambient fallbacks. Photo and logo editing is adjacent to profile actions rather than nested in the record form, keeping record/media transactions and stale snapshots explicit.

Home separates commitments, relationship brief, familiar faces, opportunities/history and optional progress. Directories offer Cards/Compact; Focus selection is progressive disclosure. Desktop Discover and mobile More expose secondary routes. Orbit uses semantic buttons/SVG edges and an equivalent searchable list, fitted bounded maps, a mobile details sheet and reduced-motion-safe interactions. No graph animation or inferred connections. Native inputs, existing editors and theme tokens remain shared across pipeline, Activity, Review, Lists, Customize, Settings, Import, Help and Assistant.


## Analytics and automation patterns

Report sections use shared surfaces, labeled filters and keyboard-operable chart buttons that select the underlying records. Automation forms preview the trigger and action and save disabled drafts. History explains completed, blocked and skipped actions. Use theme tokens, readable wrapping and the existing modal focus behavior at narrow widths.
