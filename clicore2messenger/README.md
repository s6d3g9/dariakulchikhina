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
