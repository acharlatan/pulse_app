# Phase 3: core workflow QA

Starting point: main `356f05251438ef0b765be38a0919c4812a01ccdd`, plus unmerged Phase 1 PR #43 and Phase 2 PR #44, whose head was `8f886213c82f60cc7c98ad972819d46cc4568f44` when this branch was created. Phase 3 is stacked on Phase 2; none of these changes are in production merely because they are tested here.

Before testing, release limitations included the 32 MiB restore limit, unverified branch protection and GitHub Pages configuration, and outstanding physical-device and browser-engine validation. A prior exploratory browser run found failures in older Orbit, Analytics and onboarding tests; selector drift is not proof that the product workflow passes. P0/P1 defects discovered here and the precise evidence must be recorded before recommending progression.

## Test boundary

The new end-to-end journey starts in an empty Personal workspace in an isolated browser context and creates its fictional records through the interface. Backup inspection is read-only and verifies persisted associations. A separate browser context restores the exported file. No manual database writes or fabricated history are used. The current browser job is authoritative for observed steps and results; failed, skipped and unrun steps must not be described as passes.
