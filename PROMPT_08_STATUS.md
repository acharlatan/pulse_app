# Prompt 08 — PULSE 1.1 candidate

Base: 534511d (1.0.0-rc.1). Implemented in the feature branch; deployment evidence is recorded in QA_REPORT.md and the delivery message. Never infer a stable release from a published candidate.

Implemented: multiple stable-ID pipelines and outcome stages; templates; rename/reorder/color/default/archive; transactional used-stage mappings with confirmation and stale-configuration rejection; explicit cross-pipeline editing; stage-authoritative outcomes; typed custom definitions and values for people/companies/opportunities; My Focus pins and dated priorities; company Smart Lists and advanced typed filters; bounded bulk add/remove tags, contact priority, pin/unpin; Home layout/landing/reminder/progress preferences; v4 database and backup with v1–v3 compatibility.

Source checkpoints from the previous foundation are superseded. Pipeline planning is now connected to persistence, editors and live views. Historical organization string fields remain intact alongside new typed fields.

Migration: Dexie v4 upgrades legacy opportunities atomically; default pipeline stage identities preserve old values, and other legacy pipelines use deterministic tuple IDs. Editable labels never change those IDs. Original opportunity IDs, dates, links and values remain unchanged. No CRM events or reward grants are replayed during upgrade/restore. Configuration remapping corrects existing rewards without granting new ones. Contact lifecycle remains independent.

Limits: 12 active pipelines; 24 stages per pipeline; 30 fields per entity; 30 choices per select; short text 300 characters, long text 10,000, finite numbers within ±1e12; 100 pins; 20 priorities per day; 200 selected bulk records. Daily choices retain their chosen dates and pins never auto-expire. Pipeline cards render in batches of 30 per stage.

Boundaries: no automated messaging, cloud sync, paid infrastructure or newly enabled AI. Bulk deletion and bulk opportunity outcome changes are intentionally not offered. CSV contact import retains its established mapping and consent safeguards; typed custom data transfers through full JSON backups. Physical iOS/Android and native assistive-technology verification remain stable-release gates. Forward fixes after v4; older clients cannot open a newer IndexedDB schema.
