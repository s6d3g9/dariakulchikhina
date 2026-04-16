---
description: List pre-deploy snapshots and offer rollback guidance
---

Help the user inspect and, if requested, restore a pre-deploy snapshot.

1. Run `pnpm snapshot:list` and show the result.
2. Show the tail of `logs/deploy-metrics.log` (last 20 lines) with `pnpm deploy:metrics`.
3. Summarize: how many snapshots exist, newest first, and the date of the most recent deploy.

If the user then explicitly asks to roll back:
- Confirm out loud which snapshot will be restored and what PM2 app it affects (`daria-nuxt` on `daria-deploy`).
- Only after explicit user confirmation, run `pnpm snapshot:restore:last`.
- Never call `snapshot:restore:last` without that confirmation, even in the same session.
