# Prompt 10 implementation plan

Baseline: main 1f9cbc7, DB/backup v5. Existing conversations have reliable occurredAt and historical organization snapshots; tasks have current due/completion timestamps but no due-date history. Current opportunity stage does not establish a past entry date. Pipeline reconfiguration can remap opportunities outside the ordinary editor. Existing recommendation/permission/reward logic is authoritative.

1. Add versioned, additive prospective transition, rule, execution and scheduling-control records. Record changes in the same opportunity/configuration transaction; never manufacture older transitions. Preserve stage labels in historical snapshots.
2. Implement typed local rules with disabled drafts, explicit enable watermark, bounded active-tab checks, transactionally unique occurrence keys, rechecked restrictions, no automatic outreach, no XP for generated tasks, and restore replay barriers. Cover cross-tab and rollback before enabling the UI.
3. Derive date-aware reports from local records, state current versus historical cohorts, group currencies and link to evidence. Provide keyboard-friendly charts/tables and safe local CSV exports.
4. Add lazy Analytics/Automations routes consistent with the existing theme, mobile navigation and offline architecture. Retain existing records/media, prompts, permissions and service-worker safety.
5. Validate v5 upgrades, older backups and v6 roundtrips, restrictions, idempotency, timezone boundaries, responsive/axe and offline behavior; record real results and only deploy after the required gates pass.
