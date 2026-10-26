# PULSE design system

## Identity

Airy editorial spacing, warm neutrals, periwinkle emphasis and relationship-centered cards. Code-native orbital artwork expresses people in connection; initials provide private, deterministic avatars with no remote requests. Avoid corporate tables, gradient wallpaper, unnecessary button outlines and fake analytics.

## Tokens

Semantic CSS variables in `src/styles.css`:

| Token        | Light     | Dark      |
| ------------ | --------- | --------- |
| Background   | `#f7f7fa` | `#171820` |
| Surface      | `#ffffff` | `#21222d` |
| Text         | `#292a3b` | `#efedf7` |
| Muted        | `#757587` | `#aba8bc` |
| Primary      | `#7161e8` | `#a598ff` |
| Soft primary | `#efedfc` | `#312c4e` |
| Success      | `#247965` | `#8dd6ba` |
| Danger       | `#b53d55` | `#ffa5b5` |

Muted/faint metadata must be checked for contrast before claiming WCAG conformance; a formal contrast audit is still pending. Semantic tokens apply to every surface, input, dialog and feedback state. Illustration hues and avatar pastels are decorative component-specific exceptions.

## Type and space

Native system sans-serif avoids remote font requests. Page titles 26–38px; section titles 15–21px; body 12–14px; compact desktop metadata 9–12px. Mobile body copy and key profile details increase for readability. Metadata is intentionally lower emphasis; continue readability QA on physical devices.

Use a 4px base and 8px major rhythm; card padding 20–32px, page gutters 14–40px, grid gaps 16–24px. Compact metadata spacing and icon alignment may use optical adjustments. Standard button/input height at least 44–46px; task check visuals extend their hit area. Cards 15–22px radii; inputs/buttons 10–12px. Avoid treating secondary buttons as selected controls.

## Layout

Desktop: fixed sidebar, centered 1280px maximum content, intentional Home primary/secondary columns. Tablet collapses Home to a main column with supporting panels. Below 768px: bottom navigation, safe-area spacing, top settings/alerts, contextual floating add. Directory goes 3 → 2 → 1 columns. Profiles stack essential details and relationship story. Settings category navigation wraps rather than clips. Dialogs use native `showModal`, internal scrolling and small-screen margins.

## Components and states

Filled primary, soft secondary, ghost and destructive actions. Selection uses explicit theme/tab state; keyboard focus always visible. Badges combine status text with color. Profiles use named avatars, role, company and restriction labels. Error/empty/loading states are deliberate. Toasts report completed writes or recoverable errors; update notices require user action before reloading.

## Accessibility and motion

Semantic headings, labels, native dialogs with Escape/focus handling, skip link and keyboard focus. Reduced-motion media query plus user setting. Home uses a short opacity/position transition disabled by either preference. Never introduce auto-playing celebrations or dragging as the only way to change pipeline stage. Screen-reader and contrast audits remain part of ongoing QA; no certification claimed.

## Iteration 02 profile and record patterns

Profiles retain the original cover and avatar identity. Section jump navigation, a three-part factual relationship snapshot and progressive permission/history details organize longer pages. Shared relationship stories use type-specific icons, attribution, occurred timestamps, full-text expansion, a type filter and 20-entry pagination. Task actions wrap into comfortable rows on phones. Opportunity details use the same scrollable native dialog and form rhythm as profiles; checkbox representatives avoid a cramped native multi-select. All surfaces and controls use existing semantic theme variables. No remote images or custom cover storage was introduced.

## Iteration 03 patterns

Relationship Review uses responsive avatar cards with a factual explanation, evidence-specific actions and a restrained category badge. Category controls wrap on phones; the four-item mobile navigation remains intact, with Review reachable from Home and Network. Saved-list management uses a compact selector and live people rows. Filter builders use shared scrollable native dialogs with labeled conditions.

The import wizard uses seven visible stages (file, preview, mapping, validation, duplicates, confirmation, results). Sample rows and existing/imported comparisons expand within the page; no unbounded spreadsheet is rendered. Duplicate rows paginate in tens. Summary tiles show actual plan/result counts. The explicit confirmation names the active workspace. Semantic tokens theme every new surface; no remote media, charts, fonts or AI decoration is required.

## Iteration 04 progress patterns

Progress uses existing surfaces, badges, native progress bars and form controls. Home contains one optional compact summary; the detailed ledger, milestones and task-linked quests live behind Activity → Your progress. Restricted quest tasks retain a clear administrative explanation and profile access rather than an outreach prompt. No leaderboards, confetti, predictive scores or game-based access gates were added. Success motion is a short opt-in toast entrance, suppressed by OS or app reduced motion. Progress preferences save as one labeled, guarded form. Task and milestone content wraps at 320px; histories are bounded to the latest 40 corrections, with full history retained in backup. The comprehensive visual review is now reserved for iteration 06.

## Iteration 05 assistance and handoffs

Assistant uses existing surfaces, semantic tokens and maximum content width with a single-column mobile form. Identity/category controls precede exact-context approval; long JSON previews scroll within a bounded panel rather than widening the page. Response sections distinguish cited facts, suggestions and missing evidence. AI labels remain visible; drafts and proposals retain ordinary editable fields and explicit Save/Reject actions. Restrictions appear in plain text, not color alone. New calendar and message reviews reuse the accessible Modal and shared button patterns. No second navigation system, remote imagery or new animation framework is introduced. Large visual/accessibility/PWA review remains iteration 06.
