# The PULSE Experience — iteration 09

## Audit and direction

Base: b93b5d9, PULSE 1.1.0-rc.1, DB/backup v4. Preserve working local-first CRM, historical attribution, custom pipelines, fields, Focus, permissions, reward corrections, reviewed handoffs, lazy routing and protected/disabled AI.

The prior interface had reliable native editors, consistent semantic themes and useful social profiles. Its mobile Home placed relationship recommendations and history before tasks, followed by a large decorative illustration and another statistics section. Cards repeatedly used the same hierarchy. Focus began with a long selection form; secondary mobile destinations lacked one clear home. Existing avatar fields never rendered user photos. The decorative orbit implied no actual data.

Direction: an editorial-social workspace with warm paper surfaces, expressive but restrained headings, a compact factual band, purposeful periwinkle emphasis, optional coherent accent palettes and generous shared spacing. Home now leads with commitments; the directory supports cards/compact rows; profile covers and actual portraits establish identity while keeping all identity text off photographs. My Focus uses progressive disclosure for its picker. Mobile More and desktop Discover group secondary destinations. No working record actions were removed.

## Architecture decisions

- Orbit is a lazy route. A pure deterministic function derives person/company/opportunity nodes and only explicit membership/representative/company-opportunity edges. There are no inferred interpersonal links or scoring changes. List cap 60, hard cap 80; desktop map cap 24, mobile map cap 18 and mobile searchable list default. Maps fit on opening/resizing. Search, record filters and person/company scopes explore larger datasets. SVG edges and semantic record buttons share coordinates; keyboard/list alternatives and explicit pan/zoom/reset/center/fit controls remain available. Selected mobile details use a sheet.
- A separate Dexie v5 `media` store contains optimized Blobs and dimensions/type/byte metadata. Existing avatar fields hold stable `media-` references; optional cover references and workspace identity settings are additive. Object URLs are ephemeral and revoked. Replacements/removal and reference-aware cleanup share a transaction; record deletion preserves media still referenced elsewhere. No media enters AI context or an external image service.
- Inputs: JPEG/PNG/WebP, at most 8 MB, 24 megapixels and 12,000 pixels per side. MIME and magic/header dimensions are checked before browser decoding. Local canvas crops produce 320-square portraits/logos or 1280×480 covers; zoom and horizontal/vertical position are adjustable, with contain-fit available for logos. Output is WebP, at most 512 KB; total store cap is 12 MB / 128 assets. Cancellation never writes.
- Backup v5 extends the established JSON format with bounded encoded optimized images. This avoids an archive parser and decompression/path traversal surface; the bounded 12 MB binary store adds roughly one third base64 overhead. File intake cap is 32 MB. Metadata, magic/header dimensions, duplicates, limits and references validate synchronously; restore also browser-decodes every image before its single replacement transaction. Versions 1–4 remain accepted. Old photos get initials/ambient fallbacks. Keep v5-compatible forward fixes after schema evolution.
- New personalization is additive: workspace name/avatar plus signature periwinkle, forest, coral or blue presets in both themes. No cloud identity/sync is implied. Existing locale/timezone, motion, Focus, progress and CRM preferences remain intact.

## Visual passes and QA boundaries

Baseline screenshots: Welcome, Home, Network, person profile, Pipeline and My Focus at mobile width. The first rendered new pass covers Welcome, action-first Home, directory, profile and mobile Orbit. Refinements correct toolbar text fragmentation, map label crowding, native checkbox sizing, and keep complete primary actions reachable. Final screenshots and actual automated results are recorded in QA_REPORT.md.

The work is iteration 09, a PULSE 1.2 release candidate. Physical iOS/Android, HEIC decoding and native screen-reader certification are not claimed. Manual person-to-person links, advanced analytics, automation and external integrations remain outside this iteration.
