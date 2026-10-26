# Historical backup fixtures

These fictional demo files were produced by the actual historical `initialize` and `exportBackup` functions, rather than relabeling a current backup:

- backup-v1.json: commit 777cf9f (iteration 02), backup format 1.
- backup-v2.json: commit 3bbaff0 (iteration 03), backup format 2.

Generation used fake-indexeddb and Vite SSR in isolated scratch checkouts. Legacy imports used the maintained `zod/v3` compatibility entry point; no model or repository logic was changed. Seed-relative timestamps reflect generation time, not a claimed historical conversation. All contacts, domains and companies are fictional. The fixture test restores the graph through the current transactional implementation and roundtrips every exported table.
