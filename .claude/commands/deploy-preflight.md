---
description: Run the production deploy preflight (no actual deploy)
---

This command runs the preflight-only variant of deploy-safe against production. It does NOT deploy.

1. Confirm current branch and working tree with `git status` and `git rev-parse --abbrev-ref HEAD`. If uncommitted changes exist, warn the user and ask whether to continue.
2. Run: `pnpm deploy:safe:prod:preflight`.
3. Report the outcome:
   - On success: summarize what preflight verified and state that a real deploy would now be safe.
   - On failure: print the relevant stderr and explain the likely cause (host reachability, SSH key, git ref, free disk, PM2 state). Do not attempt a retry without user approval.

Never escalate this command to `pnpm deploy:safe:prod` or `pnpm deploy:safe:prod:fast` on your own. The user triggers real deploys explicitly.
