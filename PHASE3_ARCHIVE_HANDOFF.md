# Phase 3 follow-up: reversible archive

Base: `hardening/v1-phase-3` at `3402a4e8c47f09df7c1d17292498a6fdffe9bcb4` (stacked on the unmerged Phase 1 and 2 review branches). This follow-up closes the missing archive and restore behavior for people and companies; it does not merge or deploy those branches.

- A profile can be archived or restored after confirmation. The default directory shows active records; its archive filter and global search can find archived records. Archived status is labeled on profile, directory cards, and search results.
- Archiving changes only the record's directory status and records an activity event in the same transaction. Linked conversations, follow-ups, opportunities, permissions, restrictions, images, and other data remain in place. **Follow-ups and previously enabled local automations remain active.** Archive is not a communication restriction. Reports, Focus, Orbit, and links can continue to include archived records.
- Archive and restore reject stale profile snapshots. Normal profile saves and CSV imports cannot silently change archive state. A failed event write rolls back the archive operation.
- Database and JSON backup version 7 retain archive state; existing workspace rows migrate to active. Backups v1–v6 remain accepted and old records without archive state become active. A v7 backup missing an archive field is rejected before replacement.
- Before adopting v7, export and retain a backup. An upgraded IndexedDB cannot be opened by older code; use a v7-compatible forward fix, rather than a database downgrade. The existing 32 MiB restore-file cap remains unchanged; oversized exports still cannot be restored without reducing workspace size.

## Verification

Local checks: `npm run lint` passed; `npm test` passed 268 tests; `npm run build` passed including typecheck; `npm run check:worker` passed using a dry run. The new tests cover historical database migrations, legacy and v7 backup restore, incomplete archive data rejection, linked data preservation, stale edits, failed-write rollback, import preservation, and workspace isolation.

`tests/browser/archive.spec.ts` exercises the real UI, saving linked records and an opportunity, archiving both profiles, searching, exporting, restoring into a clean browser context, and returning the records to the active directory. A local Chromium launch was blocked by the environment (`socket() failed: Operation not permitted`), so this local attempt did not run the journey. The stacked pull request runs this test and the existing release browser suites in GitHub Actions; consult its actual checks before treating browser validation as complete. Desktop and mobile viewport emulation do not replace physical-device testing.

The broader Phase 3 handoff remains applicable, including its unresolved physical-device, browser-engine and 32 MiB recovery limits. No production deployment has been made or verified by this follow-up.
