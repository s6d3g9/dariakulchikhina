---
description: Run the v5 architecture doc consistency check and summarize results
---

Run the architecture doc verifier and report the outcome.

1. Execute: `pnpm docs:v5:verify`
2. If it passes: state that in one line and note which docs it covers (per `scripts/verify-architecture-docs.mjs`).
3. If it fails: print the failure output verbatim, then explain in plain English which doc(s) are out of sync and propose the minimum edits to fix them. Do not edit anything yet — wait for user approval.
