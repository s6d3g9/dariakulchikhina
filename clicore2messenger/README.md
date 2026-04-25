# @daria/clicore2messenger

Adapts Claude CLI stream-json events into the Daria messenger ingest-handler schema.

## Usage

### Pipe mode (stream-json piped from external claude process)

```bash
claude --print --output-format stream-json --include-partial-messages --verbose | \
  clicore2messenger \
    --agent-id <id> \
    --run-id <uuid> \
    --ingest-token <token> \
    --messenger-core-url http://localhost:3033
```

### Spawn mode (bridge spawns claude itself)

```bash
clicore2messenger \
  --agent-id <id> \
  --conversation-id <conv-id> \
  --prompt "Your prompt here" \
  --model sonnet \
  --ingest-token <token> \
  --messenger-core-url http://localhost:3033
```

## CLI args

| Flag | Alias | Default | Description |
|------|-------|---------|-------------|
| `--agent-id` | | required | Messenger agent ID |
| `--conversation-id` | | (spawn: required) | Conversation ID |
| `--prompt` | | | Prompt text (triggers spawn mode) |
| `--prompt-file` | | | File containing prompt |
| `--model` | | `sonnet` | Claude model slug |
| `--messenger-core-url` | `--messenger-url` | `http://localhost:3033` | Messenger base URL |
| `--ingest-token` | `--token` | `$MESSENGER_INGEST_TOKEN` | Bearer token |
| `--resume` | | | Claude session UUID to resume |
| `--run-id` | | (random UUID) | Run identifier |
| `--cli-session-id` | | | CLI session slug for logging |
| `--adapter` | | `claude` | Adapter name |

## bridge-cleanup — disk hygiene for Claude project dirs

Cleans up stale `~/.claude/projects/*/` directories and completed session records.
No messenger credentials required — runs standalone.

### Commands

```bash
# List all project dirs with staleness info (default: 30-day threshold)
clicore2messenger bridge-cleanup scan-projects --days 7

# Preview which dirs would be archived (dry-run, no files moved)
clicore2messenger bridge-cleanup archive-projects --days 60 --dest /tmp/archive --dry-run

# Archive stale dirs whose cwd no longer exists
clicore2messenger bridge-cleanup archive-projects --days 60 --dest ~/.claude-archive

# Preview old completed sessions to purge
clicore2messenger bridge-cleanup purge-sessions --days 90 --dry-run

# Purge completed sessions older than 90 days from sessions.json
clicore2messenger bridge-cleanup purge-sessions --days 90
```

### Rules

- A project dir is archiveable only when **both** conditions hold:
  1. Newest `*.jsonl` mtime is older than `--days` days.
  2. The original `cwd` no longer exists on disk.
- A session that was active within the **last 30 minutes** is never archived, even with `--days 1`.
- `archive-projects` moves dirs to `<dest>/` — originals disappear but can be restored by moving back.
- `purge-sessions` only removes entries with `runStatus='completed'`. The agent_runs in the messenger DB are untouched.

### Recommended cron (weekly auto-archive)

Add to `crontab -e`:

```cron
# Archive stale Claude project dirs every Sunday at 03:00
0 3 * * 0 /home/claudecode/bin/clicore2messenger bridge-cleanup archive-projects --days 60 --dest ~/.claude-archive >> ~/.claude-archive/cleanup.log 2>&1

# Purge old completed session records every Sunday at 03:05
5 3 * * 0 /home/claudecode/bin/clicore2messenger bridge-cleanup purge-sessions --days 90 >> ~/.claude-archive/cleanup.log 2>&1
```

## Wiring sessions

Two session orchestrators live at `scripts/workrooms/`:

- `claude-session.sh` — spawns `claude` CLI, pipes stream-json through `claude-stream-bridge` (default `--adapter=claude`)
- `copilot-session.sh` — spawns `copilot` CLI, pipes markdown output through `claude-stream-bridge --adapter=copilot`

Run `scripts/workrooms/install-bridge.sh` once to symlink these into `~/bin`.
