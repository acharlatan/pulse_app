# Backups and recovery

PULSE stores records in this browser profile and origin, with separate Demo and Personal databases. There is no cloud recovery account or automatic device transfer. IndexedDB is not application-level encryption.

## Export

Settings → Privacy & data → Export downloads a JSON workspace copy containing CRM records, settings, Smart Lists, review actions, import history and authoritative progress. Metadata records format, version and export time. Check Downloads; a requested download does not prove that a file was safely retained. Keep copies in a trusted location.

The Getting Started check records when a download was requested, after constructing the file. It is not an automatic-backup guarantee. That preference is workspace-local and included on subsequent exports.

## Restore or move to another browser/device

1. Export the source workspace and retain the file.
2. Open PULSE at the destination and choose Personal.
3. Select the JSON under Privacy & data → Restore.
4. Review format, date, record counts and replacement warning.
5. Export any destination records you need, then explicitly confirm replacement.
6. Inspect linked profiles, tasks, deals, permissions, lists and progress; reload and verify.

Restore replaces only the selected workspace, not the other one. Compatible v1/v2/v3 files are validated before one atomic transaction replaces tables. Invalid JSON, duplicate IDs, dangling references or malformed progress must reject without replacement. Restoring/importing never replays XP or AI operations. Older files receive defaults for missing newer fields, including the guide preference.

## Troubleshooting

Missing records: check the exact site address, browser profile and selected workspace. Browser clearing/eviction can remove records; use a retained backup. Do not clear site data as an ordinary first remedy. Storage unavailable: allow site storage, leave private browsing where appropriate, and retry in your usual browser. Never assume a failed save succeeded.

A rejected restore should be replaced with a valid original backup; do not bypass validation. If an update loses an asset, save active work, reconnect and use explicit recovery reload. Save before upgrading pre-06 tabs. Dirty-edit warnings are not persistent draft recovery. Person, company, task, opportunity and conversation editors reject a stale save after another tab changes or deletes the record. Copy your unsaved text, close the editor and reopen the latest record. Settings and other editors have no universal conflict resolution, so keep one editing tab per record. Browser Back is not universally guarded.


## Iteration 08 — current expansion

Current DB/backup format is v4. Backups include pipelines, stages, custom definitions, typed values and Focus records plus every v3 table. Restore accepts versions 1–4, supplies legacy pipelines deterministically for older files, validates graph references/duplicates/value types and reward integrity before a single replacement transaction. Field filters may intentionally refer to archived/deleted definitions; they fail closed rather than deleting saved lists. Stage labels are not identities. Do not return migrated users to v3-only code: use a v4-compatible forward fix. Keep pre-upgrade exports, and save editing work before adopting an update. Existing origin isolation and device-loss limitations still apply.


## Iteration 09 — media and v5 transfer

Current export/DB version is **5**; accepted backups are **1–5**. Optimized portraits, logos, covers and workspace avatars are encoded with bounded metadata inside JSON. The binary store permits 128 images/12 MB; intake is limited to 32 MB including encoding and other records. A copy includes the selected workspace's media only. Older backups use initials/default covers and safe identity defaults.

Restore validates metadata, content signatures/dimensions, decoded bytes, duplicate IDs, total limits and image references, then browser-decodes every image before one atomic replacement. Invalid images reject without changing current data. Export/restore JPEG/PNG/WebP-derived images was exercised in isolated browser contexts with reload; decoder failure and injected write/storage failures preserve current records/photos. Photos are local browser data and may be lost to device clearing/eviction; retain an export outside the browser. No encryption/cloud recovery is implied.

Use Photo & cover or Logo & cover on a profile to replace/remove images, or Workspace photo in Appearance. Unsupported HEIC/SVG or >8 MB/24 MP inputs need conversion/resizing first. Storage-full feedback keeps the original image intact; export a backup, remove unneeded images and retry. After v5 upgrade, recovery must use a v5-compatible forward fix; older clients cannot open the upgraded database.


## Iteration 10: version 6

DB/backup v6 adds prospective opportunity transitions, automation rules, execution ledger and scheduling control. Existing v1–v5 backups remain supported. Version 6 exports preserve local media and the new records; import validates references and replaces the workspace atomically. A restore advances the automation replay boundary so old time-based conditions are not newly executed. Deleted sources/results retain ledger tombstones. Exported backups contain private relationship history and should be protected like the workspace itself.


## Iteration 11 — connections

The schema remains DB/backup v6. OAuth access tokens and Google session state are memory-only and excluded from backups. Restores and workspace resets clear the active session; reconnect explicitly when needed. No external action is replayed on restore.
