---
description: Typecheck the main Nuxt app and the communications-service
---

Run typechecks across the runtimes that have them and report a single consolidated summary.

1. `pnpm exec vue-tsc --noEmit` — main app (app/ + server/ + shared/).
2. `pnpm comm:typecheck` — communications-service.
3. If `messenger/web/package.json` or `messenger/core/package.json` has a `typecheck` script, run it too. Otherwise skip and note it.

Report:
- One line per runtime: PASS or FAIL with error count.
- For failures: list the first 10 errors with file:line references. Do not fix anything unless the user asks.
