# Claude Integration — Dev Roadmap & Task Tracker

**Companion to:** `config/claude-integrations.yaml`, `docs/claude-cli-messenger-protocol.md`
**Owner:** orchestrator (this window) → workers via `~/state/queue/pending/*.md`
**Updated:** 2026-04-22
**Status convention:** `planned` → `in_progress` (task file in `~/state/queue/running/`) → `done` (in `~/state/queue/done/`) → `failed` (in `~/state/queue/failed/`, manual triage)

---

## How this document is used

1. Operator (or orchestrator session) reads this file to know what's left.
2. Per task in Tier 1–4, there's a **Launch** block with the exact `claude-session create` invocation or the exact task-file payload to drop into `~/state/queue/pending/`.
3. Each task has **Acceptance** (what "done" means) and **Files to touch** (narrow scope).
4. On task completion, flip `Status:` from `planned` → `done` in the header and update `config/claude-integrations.yaml:todo` in the same commit.
5. **Never mark `done` without verification steps in the Acceptance block passing.**

---

## Status overview

| Tier | Task | Status | Model | Wave | Blocks |
|------|------|--------|-------|------|--------|
| 0 | doc-23 W2 backend-api (shelved-launched) | 🟢 running | sonnet | A | — |
| 0 | doc-23 W6 backend-api (shelved) | planned | sonnet | B | W2 done |
| 1 | T1.1 ui_effort_selector | 🟢 running | sonnet | A | — |
| 1 | T1.2 ui_compact_button | planned | sonnet | B | — |
| 1 | T1.3 ui_create_session | planned | sonnet | C | — |
| 1 | T1.4 ui_kill_session | planned | haiku | C | — |
| 1 | T1.5 pulse_on_streaming | 🟢 running | sonnet | A | — |
| 2 | T2.1 copilot_stream_bridge | planned | sonnet | B | — |
| 2 | T2.2 per_project_api_key | planned | sonnet | B | — |
| 2 | T2.3 per_project_rag (NEW) | ⏳ pending | sonnet | A | — |
| 2 | T2.4 messenger_as_mcp_server (NEW) | planned | sonnet | C | T2.3 done |
| 3 | T3.1 postgres_mcp | planned | haiku | C | — |
| 3 | T3.2 github_mcp | planned | haiku | C | — |
| 3 | T3.3 prettier_post_write_hook | 🟢 running | haiku | A | — |
| 3 | T3.4 session_telemetry_hook | planned | haiku | D | — |
| 3 | T3.5 dlq_replay_tool | planned | sonnet | D | — |
| 4 | T4.1 runtime_validate_manifest | planned | sonnet | D | — |
| 4 | T4.2 e2e_smoke_test | planned | haiku | D | all above done |

**Totals: 18 tasks · 4 running right now · ~4h wall-clock if waves run back-to-back.**

### Wave A (currently running, launched 2026-04-22 22:20)
- doc-23 W2 backend-api (projects CRUD routes)
- T1.1 UI effort selector
- T1.5 pulse on streaming
- T3.3 prettier PostToolUse hook
- T2.3 per-project RAG (queued — daemon picks up next poll)

### Wave B (on-deck after A green)
- doc-23 W6 backend-api (bootstrap + agent create — depends on W2)
- T1.2 UI compact button
- T2.1 copilot stream bridge
- T2.2 per-project API key

### Wave C (after B)
- T1.3 UI create session
- T1.4 UI kill session
- T2.4 messenger-as-MCP-server (depends on T2.3)
- T3.1 postgres_mcp + T3.2 github_mcp (both are .mcp.json tweaks, can be one task)

### Wave D (validation, last)
- T3.4 telemetry hook
- T3.5 DLQ replay
- T4.1 manifest runtime validate
- T4.2 e2e smoke

---

## Launch strategy — 4 parallel waves

The queue daemon caps at ~4 parallel workers (server capacity). Run in waves:

- **Wave A (Tier 1 UI):** T1.1 + T1.2 + T1.3 + T1.4 in parallel. All touch `MessengerChatSection.vue` + `orchestration-handler.ts`, so merge carefully.
- **Wave B (Tier 2 + Tier 3 quick wins):** T2.1 + T2.2 + T3.3 + T3.4 parallel.
- **Wave C (MCP + DLQ):** T3.1 + T3.2 + T3.5 + T1.5 parallel.
- **Wave D (validation):** T4.1 + T4.2 parallel (must come last).

Each wave: drop 4 task files into `~/state/queue/pending/`, daemon picks up, outputs land in `done/` or `failed/`. Verify + update manifest between waves.

---

## TIER 1 — UI parity with CLI

### T1.1 — UI effort selector

**Status:** planned
**Kind:** `frontend-ui` (w/ backend-api companion)
**Depends on:** extending `~/bin/claude-session` with `set-effort` subcommand (not yet implemented).

**Scope:**
- Add `set-effort <slug> <low|medium|high>` command to `~/bin/claude-session` (mirror of existing `set-model`). Writes to registry; kills+respawns tmux window; preserves `--resume <uuid>`.
- Add `effort` column to registry TSV (col 9) with migration block in `cmd_parse_registry_header`.
- Extend PATCH `/cli-sessions/:slug` to actually route `{effort}` instead of returning 501: call `claude-session set-effort`.
- Frontend: add effort dropdown next to model dropdown in `agent-model-bar` (`MessengerChatSection.vue`).

**Acceptance:**
- `claude-session set-effort <slug> high` updates registry col 9 and kills tmux window.
- `PATCH /cli-sessions/:slug {"effort":"high"}` returns 200 and updates registry.
- UI dropdown with low/medium/high triggers PATCH and survives page reload.
- No regression on `set-model` path.

**Files:**
- `~/bin/claude-session` (add `cmd_set_effort`, registry migration)
- `daria/messenger/core/src/agents/orchestration-handler.ts` (remove 501 branch)
- `daria/messenger/web/app/widgets/chat/MessengerChatSection.vue` (EFFORT_OPTIONS + dropdown)
- `daria/messenger/web/app/entities/sessions/model/useMessengerCliSessions.ts` (`setEffort()`)
- `daria/messenger/web/app/core/api/agents.ts` (`patchCliSession` already accepts effort)

**Launch:**
```bash
claude-session create ui-effort-selector \
  --model sonnet --kind frontend-ui --effort medium \
  --project-id 5412fd28-011c-4f34-a8a6-f4ed9c1183e2 \
  --prompt-file ~/state/queue/pending/T1.1-ui-effort-selector.md
```

---

### T1.2 — UI compact button

**Status:** planned
**Kind:** `frontend-ui`

**Scope:**
- Button in `MessengerChatSection.vue` header (next to model/effort dropdowns) labelled "Compact".
- On click: POST to new endpoint `/cli-sessions/:slug/compact` which sends `/compact\n` via `tmux send-keys -t cc:<window>` to the target window.
- Show toast "Compacting context…" then refresh.

**Acceptance:**
- Clicking button sends `/compact` to the tmux window; visible in `claude-session tail <slug>`.
- Works on active session; disabled when no active session selected.

**Files:**
- `daria/messenger/core/src/agents/orchestration-handler.ts` (new route)
- `daria/messenger/web/app/widgets/chat/MessengerChatSection.vue`
- `daria/messenger/web/app/core/api/agents.ts`
- `daria/messenger/web/app/entities/sessions/model/useMessengerCliSessions.ts`

---

### T1.3 — UI create session

**Status:** planned
**Kind:** `frontend-ui`

**Scope:**
- Modal/form in messenger sess-nav: fields (slug, kind, model, workroom, prompt). Opens on "+" button.
- On submit: POST to new endpoint `/cli-sessions/spawn` with body. Endpoint runs `claude-session create ...` via `execFile` with inherited `CLAUDE_SESSION_PROJECT_ID`.
- Appears live in sess-nav via existing WS subscription.

**Acceptance:**
- Form validates slug regex (`^[a-z0-9-]{2,40}$`), required fields.
- New session visible in sess-nav within 2s of submit.
- Session inherits `project_id` from activeProject.
- Bad input → 400 with field errors highlighted.

**Files:**
- `daria/messenger/core/src/agents/orchestration-handler.ts` (POST /cli-sessions/spawn)
- `daria/messenger/web/app/widgets/sess-nav/` (new component `CreateSessionDialog.vue`)
- `daria/messenger/web/app/core/api/agents.ts`

**Out of scope:** attachments, multi-prompt workflow, plugin/skill overrides.

---

### T1.4 — UI kill session

**Status:** planned
**Kind:** `frontend-ui`

**Scope:**
- "Kill" action in sess-nav item context menu (right-click or ⋯).
- On confirm: DELETE `/cli-sessions/:slug` → runs `claude-session kill <slug>`.
- Session removed from live registry, archived.

**Acceptance:**
- DELETE returns 200; tmux window gone; registry row moved to archive.
- UI updates sess-nav optimistically; reverts on 4xx/5xx.
- Confirmation prompt shown (browser `confirm()` is fine for v1).

**Files:**
- `daria/messenger/core/src/agents/orchestration-handler.ts` (DELETE /cli-sessions/:slug)
- `daria/messenger/web/app/widgets/sess-nav/*` (context menu)
- `daria/messenger/web/app/entities/sessions/model/useMessengerCliSessions.ts` (`killSession()`)

---

### T1.5 — Pulse on streaming

**Status:** planned
**Kind:** `frontend-ui`

**Scope:**
- Fix pulse logic: currently `.--running` is static, `.--active` pulses only when `awaitingAgentReply === true`. Change to: **any session receiving stream events within last 3s pulses** (regardless of active chat).
- Hook into existing WS `agent-stream:*` subscription; set `lastStreamAt` per slug; computed `isLivePulsing` checks `Date.now() - lastStreamAt < 3000`.

**Acceptance:**
- Session actively producing tokens → pulses green in sess-nav.
- Idle running session → static green (not pulse).
- Done session → grey.

**Files:**
- `daria/messenger/web/app/entities/sessions/model/useMessengerCliSessions.ts` (lastStreamAt map)
- `daria/messenger/web/app/widgets/sess-nav/SessNavItem.vue` (or similar)
- SCSS adjustments to `.sess-nav-item--pulsing`

---

## TIER 2 — Parallel CLIs & billing isolation

### T2.1 — copilot_stream_bridge

**Status:** planned
**Kind:** `backend-module`

**Scope:**
- New binary `~/bin/copilot-stream-bridge` (mirror of `claude-stream-bridge`): reads copilot's markdown output line-by-line, wraps into synthetic stream-json events (`{type:"text_delta", content:"..."}`), POSTs to `messenger_core:/agents/:id/stream`.
- Register a new agent type `copilot-worker` in DB or reuse agent kinds with `engine: copilot` flag in `messenger_agents.config`.
- Wire `copilot-session create --agent-id <uuid>` to spawn the bridge.

**Acceptance:**
- `copilot-session create test-copilot --agent-id <uuid> --prompt "hi"` streams output into messenger UI like a claude session does.
- Stream events show up in DB `messenger_agent_run_events`.
- Copilot sessions visible in sess-nav alongside claude ones.

**Files:**
- `~/bin/copilot-stream-bridge` (new, bash or node)
- `~/bin/copilot-session` (add `--agent-id` handling + spawn bridge)
- `daria/messenger/core/src/agents/ingest-handler.ts` (accept copilot `engine` field if needed)
- Schema: optional `messenger_agents.config.engine` (`claude` | `copilot`)

**Out of scope:** tool-use events (copilot doesn't emit them), full stream-json fidelity.

---

### T2.2 — per_project_api_key

**Status:** planned
**Kind:** `backend-module`

**Scope:**
- Add encrypted `anthropicApiKey` field to `messenger_projects.config` JSONB.
- Encryption via AES-256-GCM with key from `MESSENGER_CORE_DB_ENCRYPTION_KEY` env var.
- `claude-session create` reads project_id → looks up key in DB → if present, exports `ANTHROPIC_API_KEY` before spawning claude (falls back to OAuth if absent).
- UI form to paste/rotate key per project (admin only).

**Acceptance:**
- Paste key in project settings → persists encrypted in DB.
- New sessions on that project use the API key (verified by `anthropic-ratelimit-requests-limit` header differing from OAuth path).
- Key rotation invalidates old sessions' access (they'd need respawn).
- Missing key → OAuth fallback (no breakage).

**Files:**
- `daria/messenger/core/src/db/schema.ts` (messengerProjects config type)
- `daria/messenger/core/src/projects/projects-handler.ts` (PATCH endpoint)
- `daria/messenger/core/src/crypto/project-secrets.ts` (new, encrypt/decrypt)
- `~/bin/claude-session` (query DB → export env pre-spawn)
- `daria/messenger/web/app/widgets/projects/ProjectSettings.vue` (key input)

---

## TIER 3 — Ecosystem extensions

### T3.1 — postgres_mcp server

**Status:** planned
**Kind:** `backend-module`

**Scope:**
- Create `daria/.mcp.json` with `postgres` server: `npx @modelcontextprotocol/server-postgres`.
- Read-only connection string via env `MCP_POSTGRES_DSN` (ideally a read-only role).
- Whitelist in `.claude/settings.json` → `enabledMcpjsonServers: ["postgres"]`.

**Acceptance:**
- Claude Code invoking `mcp__postgres__query` can SELECT but not INSERT/UPDATE/DELETE.
- `.mcp.json` committed; secrets only in env.

**Files:**
- `daria/.mcp.json` (new)
- `daria/.claude/settings.json` (enablement)
- `docs/mcp-servers.md` (usage notes, optional)

---

### T3.2 — github_mcp server

**Status:** planned
**Kind:** `docs` (config-only)

**Scope:**
- Add `github` server block to `daria/.mcp.json`: `github-mcp-server` with `GITHUB_TOKEN` env (existing gh OAuth token).
- Exposes: `mcp__github__create_issue`, `mcp__github__list_prs`, etc.

**Acceptance:**
- Claude can list PRs via `mcp__github__*` without shelling out to `gh`.

**Files:** same as T3.1.

---

### T3.3 — prettier PostToolUse hook

**Status:** planned
**Kind:** `docs` (settings-only)

**Scope:**
- Add hook to `daria/.claude/settings.json`:
  ```json
  {
    "hooks": {
      "PostToolUse": [{
        "matcher": "Write|Edit",
        "hooks": [{
          "type": "command",
          "command": "jq -r '.tool_response.filePath // .tool_input.file_path' | { read -r f; case \"$f\" in *.ts|*.tsx|*.vue|*.js|*.mjs) pnpm exec prettier --write \"$f\";; esac; } 2>/dev/null || true"
        }]
      }]
    }
  }
  ```
- Follow `update-config` skill workflow: pipe-test, validate with `jq -e`, prove hook fires by introducing a detectable violation.

**Acceptance:**
- After Edit on a .ts file with bad formatting, file is auto-formatted.
- `jq -e '.hooks.PostToolUse[] | select(.matcher=="Write|Edit")' daria/.claude/settings.json` exits 0.

**Files:**
- `daria/.claude/settings.json`

---

### T3.4 — session telemetry SessionStart hook

**Status:** planned
**Kind:** `docs`

**Scope:**
- SessionStart hook logs `{session_id, cwd, model, timestamp}` as NDJSON to `~/log/claude-sessions.ndjson`.

**Acceptance:**
- Opening any Claude Code session appends one line to the log file.
- Log rotates nightly via logrotate (optional — document only).

**Files:**
- `~/.claude/settings.json` (user-global, not project)

---

### T3.5 — DLQ replay tool

**Status:** planned
**Kind:** `backend-module`

**Scope:**
- New CLI `~/bin/claude-bridge-dlq`:
  - `list` — show DLQ files with event counts.
  - `replay <file>` — POST each line back to `messenger_core:/agents/:id/stream`, delete file on success.
  - `--dry-run` — show what would be sent.

**Acceptance:**
- After a bridge failure creates a DLQ file, `claude-bridge-dlq replay <file>` restores events to DB (visible in messenger UI as late-arriving).
- Idempotent: re-running on already-replayed file is a no-op (events have run_id + eventSeq).

**Files:**
- `~/bin/claude-bridge-dlq` (new)
- Optionally: `messenger_core` endpoint support for replay-only (suppress re-broadcasts)

---

## TIER 4 — Validation & smoke tests

### T4.1 — runtime_validate_manifest

**Status:** planned
**Kind:** `backend-module`

**Scope:**
- On `messenger_core` boot, read `daria/config/claude-integrations.yaml`. Validate:
  - Declared ports match actual listening ports for this process.
  - Declared env vars are set (MESSENGER_CORE_AUTH_SECRET, MESSENGER_CORE_DATABASE_URL).
  - Declared state files exist (`registry_tsv`).
- On mismatch: log warning with deltas; do NOT refuse to start (manifest is advisory).
- Add `messenger_core:/integrations/manifest` endpoint that returns parsed + validated manifest (for UI "integrations" page later).

**Acceptance:**
- Booting with missing MESSENGER_CORE_AUTH_SECRET logs a warning citing the manifest declaration.
- `GET /integrations/manifest` returns 200 with parsed YAML + validation results.
- Doesn't break existing startup path.

**Files:**
- `daria/messenger/core/src/integrations/manifest-loader.ts` (new)
- `daria/messenger/core/src/index.ts` (call at boot)
- `daria/messenger/core/package.json` (add `yaml` dep)

---

### T4.2 — e2e_smoke_test

**Status:** planned
**Kind:** `tests`

**Scope:**
- Bash script `scripts/e2e/claude-integration-smoke.sh`:
  1. Generate user token via MESSENGER_CORE_AUTH_SECRET.
  2. `claude-session create smoke-test-$(date +%s) --model haiku --kind docs --prompt "echo smoke"` and capture slug.
  3. Wait for session complete (poll registry + tmux).
  4. `GET /cli-sessions` → assert slug present with correct project_id.
  5. `PATCH /cli-sessions/:slug {"model":"claude-sonnet-4-6"}` → assert registry updated.
  6. DELETE/kill → assert archived.
  7. Check DLQ empty.
- Exit code 0 on all-green; non-zero with failure report.

**Acceptance:**
- `pnpm run smoke:claude` runs the script end-to-end in < 60s.
- Can be added to CI later (not scope).

**Files:**
- `daria/scripts/e2e/claude-integration-smoke.sh` (new)
- `daria/package.json` (add `smoke:claude` script)

---

## Worker task file template

Drop one of these into `~/state/queue/pending/` per task. The daemon picks them up, creates a workroom, and runs `claude-session create` with the body as the prompt.

```yaml
---
id: <task-id-from-table>           # e.g. t1-1-ui-effort-selector
model: sonnet                       # or opus for T1.3 scope, haiku for T3.3/T3.4
kind: frontend-ui                   # one of: frontend-ui, backend-api, backend-module,
                                    #   db-migration, messenger-realtime, tests, docs
base_branch: main
priority: 20                        # 10 highest
auto_push: true
project_id: 5412fd28-011c-4f34-a8a6-f4ed9c1183e2   # messenger project
---
## Scope
<paste the Scope bullets from this doc>

## Acceptance
<paste the Acceptance bullets>

## Out-of-scope
<explicit negatives to prevent scope creep>
```

Commit style for workers: `<type>(<scope>): <subject>` where type ∈ `feat | fix | refactor | docs | test | chore`.

---

## After each task lands

1. Open `config/claude-integrations.yaml` — find the matching `todo:` entry. Flip `status: planned` → `status: done`, add `# shipped <date>; <PR link>`.
2. If the task added/changed a subsystem/connection, update the relevant section of the manifest in the same commit.
3. Update this doc's **Status overview** table row.
4. If the task was in `~/state/queue/running/`, the daemon moves it to `done/` automatically. If done manually, move the file.

---

## Non-goals (explicitly out of scope for this roadmap)

- Migration to Anthropic Messages API directly (OAuth subscription stays).
- Multi-server federation (single daria-dev host only).
- Multi-tenant isolation beyond `project_id` (single-org usage).
- IDE integration beyond VS Code Remote-SSH + port forwarding.
- Mobile app for messenger (web-only).
- Non-English CLI subcommand aliases.
