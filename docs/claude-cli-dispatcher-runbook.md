# Claude CLI Dispatcher — Operator Runbook

Step-by-step guide for running and managing Claude Code sessions via the dispatcher.

## 1. First-time setup (one-time per server)

1. SSH into `daria-dev`: `ssh daria-dev`
2. Authenticate: `claude auth login --claudeai` (opens browser)
3. Enable systemd linger: `loginctl enable-linger claudecode` (allows services to run after logout)
4. Start the dashboard: `systemctl --user start claude-web-dashboard.service`
5. Verify it's running: `systemctl --user status claude-web-dashboard.service`
6. Open http://152.53.176.165:9090 (basic auth credentials will be in `~/.claude-dashboard-auth`)

## 2. Create a workroom and launch a session

1. On Windows, create a workroom: `./scripts/workrooms/workroom-local.sh create w5-my-task`
2. On the server, launch a Claude session inside it:
   ```bash
   ~/bin/claude-session create w5-my-task \
     --workroom w5-my-task \
     --model opus \
     --prompt "your task here..."
   ```
3. Confirm the session appeared in the dashboard (http://152.53.176.165:9090)

## 3. Stream follow-ups mid-run

**Via CLI:**
```bash
~/bin/claude-session send w5-my-task "continue with the next step..."
```

**Via messenger UI:**
- Find the agent contact for `w5-my-task` in the agent workspace
- Type your follow-up in the chat input

Both feed the same session; output updates live on the dashboard and in the UI.

## 4. Kill a stuck session

1. List all sessions: `~/bin/claude-session list`
2. Kill by name: `~/bin/claude-session kill w5-my-task`
3. Or SSH in and kill the tmux window: `tmux kill-window -t claude:w5-my-task`

## 5. Rotate dashboard password

1. Generate a new auth file: `~/bin/claude-web-dashboard gen-auth > ~/.claude-dashboard-auth`
2. Restart the service: `systemctl --user restart claude-web-dashboard.service`
3. New logins will require the fresh credentials from `~/.claude-dashboard-auth`

## 6. Recover from server reboot

1. Systemd auto-starts `claude-web-dashboard.service` (via linger)
2. Verify: `systemctl --user status claude-web-dashboard.service`
3. Verify the dashboard endpoint: `curl -s http://152.53.176.165:9090 -w "\nStatus: %{http_code}\n"` (should be 200)
4. Any tmux sessions from before the reboot are lost — recreate them with `claude-session create`

## 7. Data locations

| What | Where | Notes |
|------|-------|-------|
| Claude CLI config | `~/.claude/` | Credentials, session history, prompt cache |
| Session logs (real-time) | `~/state/claude-sessions/<slug>.log` | Watched by dashboard, max 100 MB per session |
| Agent run events (persisted) | PG `messenger_agent_run_events` | One row per event + edge; indexed by `agent_id` |
| Agent run stream (live) | PG `messenger_agent_run_streams` | Output chunks, cursor-based pagination (see UI) |
| Dashboard auth | `~/.claude-dashboard-auth` | Basic auth credentials; regenerate to rotate |
| DLQ (failed events) | `~/state/claude-bridge-dlq/*.ndjson` | Events that failed to POST; replayed with `claude-bridge-dlq` |

## 8. DLQ replay

When the stream bridge cannot deliver events to messenger core (network error, restart, etc.) it writes
them to `~/state/claude-bridge-dlq/<filename>.ndjson` (one JSON event per line).

**Inspect the queue:**
```bash
claude-bridge-dlq list            # all files with event count, timestamps, size
claude-bridge-dlq show <file>     # pretty-print events via jq
```

**Replay a file:**
```bash
# Dry-run first — prints what would be POSTed without sending
claude-bridge-dlq replay <file> --dry-run --agent-id <agentId>

# Live replay — POSTs events; deletes the file on full success
MESSENGER_INGEST_TOKEN=<token> claude-bridge-dlq replay <file> --agent-id <agentId>
```

The agent ID is auto-detected from the filename when it starts with a UUID (`<agentId>-*.ndjson`);
otherwise pass `--agent-id` explicitly.

**On failure:** the file is left intact, failed payloads are printed to stderr, and the command exits 1.
Re-running is safe — the server deduplicates by `runId` + event sequence.

**Remove a file without replaying:**
```bash
claude-bridge-dlq purge <file>
```
