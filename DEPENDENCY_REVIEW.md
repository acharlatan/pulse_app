# Candidate dependency review

`npm audit --json` reports seven affected package nodes: @vitest/mocker, tinypool, vitest, miniflare, undici, wrangler and zod (two critical, two high, three moderate). This is not a clean audit and stable release approval remains open.

- Zod (<4.6.6): constrained oversized collection validation may exhaust memory. This is a runtime dependency. PULSE bounds JSON restore files to 10 MB, CSV to 2 MB/2,000 rows/40 columns and Worker payload sizes, reducing exposure but not proving immunity. Do not load untrusted backups casually. Migrating the existing v3 schema API to patched v4 needs compatibility and adversarial validation tests before stable release.
- Vitest/mocker/tinypool: development tooling path traversal, mock registration and worker-option prototype-pollution findings. They are not bundled into the static app or Worker; do not expose test/development servers publicly. Upgrade the toolchain with regression testing rather than force arbitrary major changes.
- Undici via Miniflare/Wrangler: EventSource memory, integrity token and content-encoding failure advisories concern Node development/deployment tooling. The deployed Worker uses workerd fetch rather than this Node package. Update supported tooling versions and rerun Worker tests; do not downgrade Wrangler/Durable Object migrations based on npm's suggested historical downgrade.

Exact advisory references are in the npm audit output. This review does not establish total security or resolve the runtime Zod finding. Keep the prerelease label until the applicable findings are addressed and release gates are reviewed.
