# Phase 2: data integrity and recovery

Work is based on Phase 1 PR #43, atop main `356f05251438ef0b765be38a0919c4812a01ccdd`. The IndexedDB and backup schema remain at v6. Phase 2 requires the browser checks and release review recorded below; these changes do not certify the complete product.

## Recovery safeguards

PULSE's historical export code writes every store that exists in the exported format. Validation now requires the stores belonging to the backup's declared version before parsing; later stores continue to receive legacy defaults. This prevents an omitted store from being silently replaced with an empty one. Real v1 and v2 export fixtures remain supported. A structurally complete but edited or truncated array cannot be detected solely from the presence of its key; a backup is not a tamper-proof record.

Backups over 32 MiB cannot be restored through the file picker. PULSE now warns persistently if a requested export exceeds that limit, keeps the requested download, and does not record that download as a successful recoverable backup. Users must retain the file and reduce workspace size before requesting a new backup within the limit. This warning does not make oversized backups restorable.

The existing Personal workspace reminder is shown when there are active records and no backup download was requested in the prior 30 days. It links to Settings, explains browser-local storage, and asks users to retain the downloaded copy. It does not assert the file was saved or that cloud backup exists.

## Tests and boundaries

- The export-inventory test compares all v6 backup arrays against IndexedDB store names. Invalid-backup tests omit each version-appropriate store and verify the restore is rejected without changing existing records.
- Actual v1 and v2 historical backup fixtures restore and roundtrip in fake IndexedDB. New tests construct representative v1–v5 databases, upgrade them to v6 and compare records; they do not prove every historic user database variant is covered.
- Existing unit tests exercise restore transaction rollback, quota failure, stale record saves, workspace isolation, valid media and automation replay suppression. Review their results in the current CI run, not a historical checklist.
- The GitHub browser job exercises clean-profile backup and restore with reload, media, two-tab stale edits, denied storage, reminder behavior, invalid and oversized files, automations, and offline persistence and update safety. The CI run is the authority for actual results. The local container could not launch Chromium due to a denied socket.
- Physical iOS/Android devices, every browser engine and native assistive technology are outside this test environment and remain unverified. Settings and other unguarded editors are not a universal conflict-resolution system.

## Phase 1 follow-up

GitHub Actions run 42212066329 for PR #43 passed all release checks on Node 22. Branch-protection API returned 403 for the connected integration; a repository rulesets query returned an empty list, which does not establish the absence of branch protection. Verify protection and require the checks in GitHub settings before relying on them to gate merges. Cloudflare automatically deploys main independently.

The October 31 GitHub Pages run 41173490663 built successfully but deployment returned HTTP 404: GitHub advised checking whether Pages is enabled. The default Pages URL also returned 404. The connection cannot read Pages settings, and documentation still advertises optional static Pages distribution, so the workflow was not retired or Pages enabled. If Pages is needed, inspect Settings → Pages and enable the GitHub Actions source before an explicitly authorized deployment. No production deployment was made in this phase.
