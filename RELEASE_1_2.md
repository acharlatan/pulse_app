# PULSE 1.2.0-rc.1 — Prompt 09 delivery

Release date: 27 October 2026. This is a release candidate; native-device and assistive-technology support gates remain open. Final automated results and deployment evidence are recorded below before publication.

## A. Design transformation

The previous repeated-card dashboard becomes an editorial-social workspace. Commitments lead Home, followed by a factual relationship brief, familiar faces, opportunities/history and optional Focus/progress. Warm paper/deep charcoal surfaces, deliberate heading scale and quieter controls establish a shared visual hierarchy. Photographs are optional local identity rather than decorative remote content. See EXPERIENCE_09.md for the baseline audit and architecture decisions.

## B. Screens redesigned

Material structural changes: Welcome, Home, Network (Cards/Compact), person/company profile identity headers and additional-details placement, Focus selection disclosure, shell navigation and Settings workspace identity. Shared visual system updates: Pipeline, Activity/progress, Relationship Review, Smart Lists, Customize, CSV Import, Help, Assistant and existing native record/recovery dialogs. These routes retain their working data/actions; secondary routes do not each introduce a separate UI framework. Orbit and the media crop editor are new functional screens.

## C. Component system

Semantic surface/text/accent/spacing tokens extend existing primitives. Body/label/metadata floors remain 15/13/12px; mobile inputs use 16px. Avatar consumes explicit media references and deterministic initials. LocalMedia lazily reads the Blob, creates/revokes an object URL and falls back on missing/corrupt assets. MediaControls lazily loads the shared crop editor. Ordinary inactive buttons remain soft; pressed controls and keyboard focus are distinct. Light/dark themes, reduced motion, native dialogs, loading/error/empty feedback and safe-area navigation remain shared.

## D. Navigation

Desktop retains Daily Pulse, Network, Pipeline, Activity and Relationship Review, with Discover for Focus, Orbit and Smart Lists. Settings/Help remain available. Mobile uses Home/Network/Pipeline/Activity/More; More exposes Focus, Orbit, Review, Lists, Assistant, Customize, Settings and Help. Home, Network and profiles link to Orbit; profile links preserve person/company scope. Workspace identity remains local; existing search and URL-backed directory context are retained.

## E. Profile personalization

People support portraits/covers; companies support logos/covers; Settings supports workspace name/photo and periwinkle, forest, coral or blue accents. Use Photo & cover / Logo & cover adjacent to profile editing. This separate editor avoids nested record forms and preserves stale-record safety. Select JPEG/PNG/WebP, preview, adjust zoom/horizontal/vertical crop, save/replace/remove or cancel. Logos optionally fit fully on white. Saved identity renders through explicit references across profiles, directories, Home/relevant relationship cards and Orbit; cover text/actions remain off the photograph.

## F. Media architecture

A separate IndexedDB/Dexie v5 media store contains optimized Blobs plus type/size/dimensions. No remote storage/thumbnail service or upload is used. Inputs are capped at 8 MB, 24 MP, 12,000 pixels per side; signatures and dimensions are checked before decoding. Browser orientation decoding and canvas export strip original metadata. Portrait/logo output is 320×320; cover is 1280×480; WebP quality .84, at most 512 KB. Browsers without required decoding/canvas capability receive an error rather than false success.

Limits are 128 assets/12 MB per workspace; failed validation/write/quota operations preserve existing images. Slot references guard concurrent replacement. Record updates and reference-aware orphan cleanup/event writes share one transaction and grant no XP. Deleting a record retains a Blob referenced by another record. Object URLs are ephemeral, revoked on replacement/unmount, and never stored in backups. Media remains isolated between Demo/Personal and outside AI context.

## G. Backup compatibility

Backup/DB v5; accepted JSON versions 1–5. Existing avatar strings remain compatible; cover and identity fields are additive. v5 includes bounded metadata/base64 data (about one-third encoding overhead), with a 32 MB file intake cap. No ZIP/parser dependency is added. Restore validates duplicate IDs, MIME/header/dimensions/length, totals and references, then browser-decodes every image before atomic table replacement. Unsupported/corrupt/missing media rejects without partial replacement. Historical v1/v2 fixtures, actual v3/v4 upgrades and current v5 roundtrips remain covered. Use a v5-compatible forward fix after migration; do not downgrade users to older DB clients.

## H. Relationship Orbit

Derived nodes: saved people, companies and opportunities. Edges: contact.organizationId (Works at), opportunity.organizationId (Company opportunity), opportunity.contactIds (Opportunity representative). No interpersonal links are inferred. Stable IDs/order and concentric initial coordinates use fixed-budget rectangle separation, without an animation/simulation dependency. Company/person scopes, name search, type/priority filters, Map/List, selection details, profile/opportunity navigation, Focus pins, zoom/pan/fit/reset/center are implemented. Details preserve saved restrictions/availability, last meaningful conversation, next tasks and pipeline/stage/outcome.

Desktop map24; mobile map18 and List default; list60 and derivation hard80. Search/scopes explore the rest, with explicit limit feedback. Semantic buttons, named controls, keyboard pan, native links and the equivalent searchable list avoid drag-only access. Mobile selected details use a closable sheet. No automatic relationship inference or outreach occurs.

## I. Existing features preserved

CRM CRUD, companies/representatives, historical conversation attribution, pipelines and custom outcomes, typed custom fields, company segments/bulk administration, My Focus, Review/Smart Lists, CSV import, restrictions/purpose permissions, optional reward/correction history, backup isolation and explicit service-worker updates remain. A browser regression exposed the opportunity editor opening before the remembered pipeline preference finished saving; the current selected pipeline now passes directly to the editor, and the view updates synchronously. AI stays disabled with unchanged Access/quota/SQLite boundaries; no paid infrastructure or model calls were enabled.

## J. Testing

Final command results are appended in the release evidence section. Earlier exploratory runs and interrupted runs are not counted as release passes. Existing assertions remain; version labels move to v5, the Focus test opens the new Add a priority disclosure, and Orbit selectors accept the accessible names of both Map and List.

## K. Visual QA

Baseline capture procedure covers Welcome, Home, Network, profile, Pipeline and Focus. New screenshot suites cover Home/profile/Orbit at 390 and 1440 in both themes; responsive checks cover 320/375/390/430/768/1024/1280/1440, core editors, Customize, AI approval and CSV mapping/confirmation. Extra rendered captures cover Welcome, directory, company, Focus, crop preview and saved media. Visual fixes include Orbit toolbar wrapping, fitted bounded maps, label clipping/separation, readable search width, mobile selected-detail sheet, checkbox sizing and profile controls. Actual reviewed capture names and final evidence are recorded in QA_REPORT.md.

## L. Performance

Initial route remains lazy; Orbit and crop editor load separately. Media is queried on demand, not injected into global context. Fixed graph caps bound DOM/SVG size. Measurements below are from hosted Linux/Chromium software rendering and synthetic datasets, not field/physical-phone guarantees. Avoid claiming Core Web Vitals improvements from bundle sizes alone.

## M. Deployment

Publication uses [PR #3](https://github.com/acharlatan/pulse_app/pull/3), an expected-head merge and the existing automatic Cloudflare main build. The PR deployment record is the live source for the exact merge SHA, Cloudflare build/deployment/version IDs and fictional workflow results; it is updated after deployment without triggering another documentation-only deployment. No GitHub tag or native app-store publication is implied.

## N. Known limitations

Physical iOS/Android installation, keyboard/download/orientation behavior, native VoiceOver/NVDA, literal 200%/400% zoom and Firefox/WebKit remain unverified. Chromium viewport/axe checks are not WCAG certification. HEIC/SVG are rejected; convert to JPEG/PNG/WebP first. Media limits are deliberate and backups include bounded base64 overhead. No application-level encryption, cloud sync/recovery or universal persistent drafts/conflict resolution. Graph labels may truncate; full accessible names/selected details/List remain available. Manual person-person links were optional and are omitted. Stable release remains undeclared.

## O. Prompt 10 readiness

Explicit associations, historical interaction attribution, authoritative stage outcomes, typed fields and validated isolated backups are ready inputs for advanced analytics, historical relationship reporting, deterministic rule automation and opportunity insights. Those systems and external integrations are not implemented here. Media/Orbit never changes permissions, scores or sends outreach.

## Executed release evidence

| Check | Result |
| --- | --- |
| `npm run typecheck`, `npm run lint` | Passed |
| `npm test -- --reporter=verbose` | 156/156, 12 files |
| Full compiled `npm run test:browser -- --config=playwright.production.config.ts --workers=2` | 51 passed / 5 failed; corrected reruns below |
| Compiled affected-journey rerun, `--grep 'Northstar relationship\|CSV mapping\|selected context\|major routes\|demo acceptance' --workers=1` | 10/10; all 56 distinct cases demonstrated across runs |
| `npm run build -- --outDir /tmp/pulse09-release-final` | 38 precache entries / 907.64 KiB |
| `npm run check:worker -- --assets /tmp/pulse09-release-final` | Passed; disabled flags and bindings retained |
| `VITE_BASE_PATH=/pulse_app/ npm run build -- --outDir /tmp/pulse09-subpath-publish` | Passed |
| `PULSE_DIST=/tmp/pulse09-release-final npm run test:pwa -- --workers=1` | 12/12 |
| Absolute-subpath PWA `--grep 'repository subpath'` | 2/2 |
| `npm audit --json` | Zero known findings |

Browser commands use temporary Chromium153 via PULSE_CHROMIUM_PATH; no binary enters the repository. The full-run/rerun distinction is deliberate: readiness assertions were strengthened, a button theme-transition contrast defect was corrected, and a concurrent lazy-load deadline was rerun with assertions retained. No failing final affected-journey gate remains. See QA_REPORT.md for exact options, timings, measurements and platform limitations.

Final raw/gzip bytes: initial JS235,362/73,682; CSS102,960/20,618; Workspace349,740/107,062; lazy Home8,814/2,848, Orbit12,676/4,297, image editor6,077/2,534. Pure Orbit10/100/1000-contact derivation observed18.9/6.7/9.1ms. These are hosted-run measurements, not field guarantees.

Saved-media acceptance: four active crop-editor axe analyses passed. Person/company crop and saved-profile screenshots were captured and reviewed; deleting a fictional local image Blob then reloading verified initials fallback without a broken profile. JPEG/PNG/WebP, isolated v5 media restore/reload, offline image persistence and quota/corruption rollback are covered by the suites above. Final production verification and exact deployment IDs are in [PR #3](https://github.com/acharlatan/pulse_app/pull/3).
