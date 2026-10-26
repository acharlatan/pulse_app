# Prompt 08 implementation checkpoint

Base: main 534511d, PULSE 1.0.0-rc.1. Stable 1.0 gates remain open.

## Architecture assessment

Opportunity.stageId is a fixed enum independent of contact.stage lifecycle. Settings contains one pipeline. Pipeline.tsx and opportunity editors present fixed stages. repository.ts normalizes outcome in save and backup validation and moveOpportunity delegates to save. Smart Lists persist legacy stage values. Progress sourceRule consumes authoritative status; syncReward is called within CRM transactions and must never run during configuration or migration. Backups v1–v3 validate before atomic replacement. Organization.customFields is an existing string map that must survive future definition-based fields. Editors have fresh-snapshot stale-save checks; keep these.

## Implemented, isolated foundation

src/services/pipelines.ts defines stable-ID pipeline/stage schemas, limits (12 active pipelines, 24 stages each), graph integrity checks, deterministic legacy mapping, explicit destination/reopening rules and stage-removal impact planning. Planning is pure: no database writes, events or reward replay. Tests exercise preservation, retry determinism, custom outcome labels, identity stability, orphan prevention and cancellation-by-discarding-preview.

This module is **not connected to production storage or UI**. Database and backup remain v3. This checkpoint is not a 1.1 release candidate and does not satisfy all Prompt 08 acceptance criteria.

## Next implementation sequence

1. Add versioned Dexie migration and v4 backup validation/export/restore together. Execute the pure mapping inside an upgrade transaction; map Smart List opportunity-stage conditions while preserving contact lifecycle conditions. Validate full graph before commit. Test actual v3 upgrades, retries, rollback, reward ledger preservation and all historical backup fixtures. New-workspace seeding and reset must initialize pipeline records too.
2. Connect graph validation to transactional repository saves/moves. Reuse reward corrections only for genuine CRM transitions; configuration mappings must not award XP. Add stale configuration checks and transactional impact confirmations.
3. Expose live pipeline/stage records through context, integrate all opportunity editors/cards/profile views, then implement pipeline management/templates, explicit destination mappings, archive/default operations, currency-separated totals and bounded mobile rendering.
4. Implement custom field definitions/typed values, My Focus, company segmentation, safe bulk actions and Home preferences, including complete backup coverage.
5. Run browser, accessibility, offline, Worker dry run, subpath build and actual migration/performance checks; update release documentation with observed evidence. Forward fixes only after schema activation; older v3 clients cannot safely open a v4 database. No production migration/deployment until integrated gates pass.

## Checkpoint validation

TypeScript and ESLint passed. All 132 tests passed across 10 test files, including 8 new pure pipeline tests. These are not database migration or browser acceptance results. Production build outcome is recorded in the delivery message. No Worker code or configuration changed. No production deployment requested by this checkpoint.
