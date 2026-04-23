---
kind: orchestrator
workroom: sessions-ux-cleanup
branch: claude/workroom-sessions-ux-cleanup
base: main
---

# Sessions plate — UX cleanup

**Scope.** The Sessions plate in `messenger/web` now receives rich data per session
(spawn tree, finish outcome, task completions, tokens, cost, last tool). Problem:
done sessions accumulate without bound. A user running many short `--print`
sessions sees the "Завершённые" group flood with stale entries until manually
archived. Need three cleanup levers.

## Worker split (3 parallel agents)

Spawn each worker via `claude-session create <slug> --workroom sessions-ux-cleanup
--run-id <uuid> --parent-run <orch-run-uuid> --kind <kind> --prompt "..."`.
All three share this workroom, commit to `claude/workroom-sessions-ux-cleanup`.

### Worker 1 — `sessions-ux-cleanup-fe` (kind: `frontend-ui`)

Split the "Завершённые" group in `messenger/web/app/widgets/chats/MessengerChatsSection.vue`:

- Show only the 10 most recent done sessions inline.
- Add "Показать все N" expander that reveals the rest behind a click.
- Add per-card "Архивировать" icon button (archive button) on done cards — triggers
  `useMessengerCliSessions().archive(slug)` (new method) which PATCHes
  `/cli-sessions/:slug` with `{ archived: true }`.
- Group done sessions by day (Сегодня / Вчера / DD.MM) — keep Material-3 look,
  reuse existing `cli-session-card` styles.

### Worker 2 — `sessions-ux-cleanup-be` (kind: `backend-api`)

Extend `messenger/core/src/agents/orchestration-handler.ts`:

- Accept `{ archived: boolean }` in the existing
  `PATCH /cli-sessions/:slug` body (it already accepts `model`/`effort`).
- When `archived=true`, set `messenger_cli_sessions.archived_at = now()` (add
  column if missing via `server/db/schema/messenger-cli-sessions.ts`, generate
  Drizzle migration).
- Respect `archivedAt` in the listing query — `GET /cli-sessions` already filters
  archived out of running/done; just make sure the PATCH writes it.

### Worker 3 — `sessions-ux-cleanup-cron` (kind: `backend-module`)

Auto-archive cron in `messenger/core/src/agents/`:

- New file `auto-archive-sessions.ts` exporting `startAutoArchive(db, logger)`.
- Runs every 10 min; archives any `messenger_cli_sessions` row where
  `status='stopped' AND archived_at IS NULL AND stopped_at < now() - interval '24 hours'`.
- Wire into `messenger/core/src/server.ts` startup so it begins on boot.
- Emit one `info` log line per archive sweep with the count.

## Acceptance

- `pnpm exec vue-tsc --noEmit` — no new errors in touched files.
- `pnpm lint:errors` — no new violations.
- PATCH `/cli-sessions/:slug` with `{archived:true}` moves the row out of
  `runningSessions` and `doneSessions` and into `archivedSessions`.
- Frontend: "Завершённые" section caps at 10 inline items + expander.
- After 24h any stopped session auto-archives (verify by SQL-backdating
  `stopped_at` on a test row and waiting for the cron sweep).

## Out of scope

- Changing the session card visual design beyond the archive button.
- Changing done-session criteria (activity window, tmux-dead detection) —
  that logic lives in `/cli-sessions` and is stable as of 8aa549fc.
- Touching the composer/orchestrator hierarchy rules.
