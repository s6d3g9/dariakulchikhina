# Host Session Bridge

Bridges Claude Code CLI sessions running on this host into the messenger as
live agent contacts. Each Claude Code session becomes a stream of events in a
`messenger_agent_run`; the UI shows it as a conversation with the agent.

---

## Architecture v2 — project-agent topology

```
~/.claude/projects/
  -home-claudecode-daria/
    <sessionId-A>.jsonl   ──→ child A (tail-mode bridge)
    <sessionId-B>.jsonl   ──→ child B  ──┐
  -home-claudecode/                      │  same agentId
    <sessionId-C>.jsonl   ──→ child C   ─┘  (same cwd)

host-supervisor (daria-host-session-v2, PM2)
  │  POST /agents/host-session/provision  →  { agentId, runId, ingestToken }
  │  PATCH /agents/host-session/runs/:runId/complete
  ↓
messenger ingest API  →  messenger_agent_run_events
```

**One project-agent per unique `cwd`.**  Two Claude Code sessions from the
same working directory share an `agentId` but get distinct `runId`s, so their
events are isolated in `messenger_agent_run_events`.  Sessions from different
directories produce distinct agents (e.g. `dev-vps:daria`, `dev-vps:home`).

### Scan strategy

The supervisor polls `TRANSCRIPT_ROOT/*/` every `POLL_SECS` seconds.  For each
subdirectory it lists `*.jsonl` files whose `mtime > now() - IDLE_WINDOW`.

Directory names are used **only for discovery** — they are lossy
(`agent-orch-1-migration` is ambiguous).  The authoritative `cwd` comes from
the JSONL envelope: the supervisor reads the first 16 KB of each file and
finds the first line with `type == "user"` or `type == "assistant"` that
carries a `cwd` field.

### Idle reaping

When a `.jsonl` file stops growing for `HOST_SESSION_IDLE_MIN` minutes the
supervisor:

1. `PATCH /agents/host-session/runs/:runId/complete` with `{reason:"idle"}`.
2. Sends `SIGTERM` to the child, waits 5 s, then `SIGKILL`.
3. Sets `runStatus = "completed"` and `completedAt` in `sessions.json`.

The `agentId → sessionId` mapping is retained so re-activation can reuse the
same project-agent.

### Re-activation

If a completed session's `.jsonl` is written again after `completedAt` (e.g.
`claude --resume <sessionId>` or background task writes), the supervisor:

1. Calls `POST /provision` with the same `sessionId` — the backend creates a
   **new run** under the existing project-agent.
2. Spawns a new child for the new `runId`.
3. The old run stays `completed`; there is no parent→child run link (Claude
   Code JSONL carries no parent-session marker).

### State file

`STATE_DIR/sessions.json` (default `~/state/claude-bridge/sessions.json`):

```jsonc
{
  "sessions": {
    "<sessionId>": {
      "sessionId": "abc123...",
      "filePath": "/home/claudecode/.claude/projects/.../abc123.jsonl",
      "cwd": "/home/claudecode/daria",
      "hostname": "dev-vps",
      "agentId": "xxxxxxxx-...",
      "conversationId": "yyyyyyyy-...",
      "runId": "zzzzzzzz-...",
      "ingestToken": "...",
      "runStatus": "running",   // or "completed"
      "completedAt": null,
      "pid": 12345
    }
  }
}
```

Writes use `write-to-tmp + rename` for atomicity.  Reads and writes inside the
scan tick are wrapped in a `.lock` file (O_EXCL) to prevent races with the
shutdown handler.

---

## Migration: running v2 alongside v1

v2 (`daria-host-session-v2`) and v1 (`daria-host-session`) can run
concurrently.  v1 monitors a single hardcoded project directory and writes to
the legacy agent `c7c38fd4-...`.  v2 monitors all project directories and
provisions project-agents dynamically.  There is no overlap as long as v1 and
v2 use different `agentId`s (they do by design).

### Bring up v2

```bash
# 1. Build the bridge binary
cd ~/daria/clicore2messenger && pnpm build

# 2. Create the env file
cat > ~/.host-supervisor-v2.env <<EOF
HOST_BRIDGE_URL=http://localhost:4300
HOST_BRIDGE_TOKEN=<token matching server HOST_BRIDGE_TOKEN>
HOST_NAME=dev-vps
EOF

# 3. Start v2
pm2 start ~/daria/clicore2messenger/host-supervisor.ecosystem.config.cjs
pm2 logs daria-host-session-v2
```

### Switch over

Once v2 is stable, stop v1:

```bash
pm2 stop daria-host-session
pm2 delete daria-host-session
```

v1 ecosystem config and shell script are kept on disk (with deprecation header)
for rollback.  Delete them only after the observation period.

### Rollback to v1

```bash
pm2 stop daria-host-session-v2
pm2 start ~/daria/scripts/workrooms/host-session-bridge.ecosystem.config.cjs
```

v1 resumes writing to the legacy agent; v2 state in `sessions.json` is
harmless.

---

## Troubleshooting

### Check active sessions

```bash
cat ~/state/claude-bridge/sessions.json | jq '.sessions | to_entries[] | {id: .key[:8], cwd: .value.cwd, status: .value.runStatus, pid: .value.pid}'
```

### Force reprovision for a session

Remove the entry from `sessions.json` while the supervisor is running; on the
next tick it will call `/provision` again and spawn a fresh child.

```bash
# Stop supervisor first to avoid races
pm2 stop daria-host-session-v2

SESSION_ID="<sessionId>"
cat ~/state/claude-bridge/sessions.json \
  | jq "del(.sessions[\"$SESSION_ID\"])" \
  > /tmp/sessions-fixed.json \
  && mv /tmp/sessions-fixed.json ~/state/claude-bridge/sessions.json

pm2 start daria-host-session-v2
```

### Clean stale completed entries

Entries with `runStatus == "completed"` accumulate over time.  The
`bridge-cleanup` subcommand handles long-term housekeeping:

```bash
node --experimental-strip-types ~/daria/clicore2messenger/src/cli.ts \
  bridge-cleanup purge-sessions --days 30
```

### Verify DB state

```sql
-- Two sessions from different cwd → two different agents
SELECT id, name, config->>'cwd' AS cwd
FROM messenger_agents
WHERE config->>'type' = 'host-session'
ORDER BY created_at DESC LIMIT 5;

-- Two sessions from same cwd → same agentId, different runIds
SELECT agent_id, id AS run_id, created_at
FROM messenger_agent_runs
WHERE created_at > now() - interval '5 min'
ORDER BY created_at DESC;

-- Events isolated per run
SELECT run_id, count(*) AS events
FROM messenger_agent_run_events
WHERE created_at > now() - interval '5 min'
GROUP BY run_id;
```

### Logs

```bash
pm2 logs daria-host-session-v2 --lines 100
# Children prefix their output: [child:<8-char sessionId>]
```

---

## Subagent visibility

The supervisor scans not only top-level session JSONLs but also subagent
transcripts produced when Claude Code calls the Agent tool:

```
~/.claude/projects/
  -home-claudecode-daria/
    <parentSessionId>.jsonl           ─→ parent run  (normal)
    <parentSessionId>/
      subagents/
        agent-<subagentUUID>.jsonl    ─→ subagent run (isSubagent:true)
```

### What is covered

- Each active `agent-*.jsonl` file found under `<projectDir>/<parentUUID>/subagents/`
  produces a **separate `messenger_agent_run`** under the same project-agent as
  the parent session.
- The run's `session_metadata` carries `isSubagent: true` and, when the parent
  session's run is still active, `parentRunId: <uuid>`.
- Parallel subagent calls (multiple Agent tool invocations) each get their own
  run — the existing W3 grouping renders them as parallel runs.
- If the parent session has already completed (idle-reaped) before the subagent
  file is discovered, the subagent run is provisioned as a standalone run
  (`parentRunId` absent) — the bridge does not fail.

### What is NOT covered (out of scope)

- **UI tree view** — subagent runs currently appear as parallel runs alongside
  the parent in the timeline, not as nested children. A dedicated frontend task
  (W11) would add collapsible subagent branches.
- **Recursive sub-subagents** — if a subagent itself calls the Agent tool the
  resulting sub-subagent JSONL is one more level deeper. The current scan
  (`<parentUUID>/subagents/`) captures only one level of nesting.
- **Backfill** — only subagent files written after the supervisor is deployed
  are picked up. Existing historical files are ignored.
- **DLQ** — subagent runs flow through the same ingest path as normal runs; W5
  DLQ coverage applies equally.
