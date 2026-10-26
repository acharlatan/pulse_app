# Release candidate dependency review

The final remediation audit (`npm audit --json`, 26 October 2026) reports **zero known vulnerabilities**, including development dependencies. This is an advisory snapshot, not a guarantee of total security.

- Migrated Zod 3 to patched Zod 4.6.7. Record schemas now declare key and value types explicitly. Nested legacy settings use `prefault` so missing objects still pass through their field defaults. Existing CRM, backup, import, AI-contract and Worker tests exercise the migration.
- Updated Vitest to 4.1.12, replacing the affected mocker and tinypool dependency graph. Existing assertions were retained.
- Overrode Undici to compatible patched 7.30.1+ for the Miniflare/Wrangler development tools; package-lock pins the tested resolution. Worker runtime and dry-run tests remain required after any override update. No Wrangler downgrade or Durable Object migration change was made.

Production AI stays disabled. No real provider request was made for testing. Do not expose development/test servers publicly. Re-run the audit when updating the lockfile.
