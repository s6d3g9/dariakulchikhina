# Messenger CLI Dispatcher E2E Test Harness

End-to-end test for the full pipeline: **claude-session** → **stream-bridge** → **ingest** → **messenger/core** → **agent workspace UI**.

## Overview

This harness validates:
- ✓ Mock ingest server accepts POST requests with bearer token auth
- ✓ NDJSON fixture events are published with realistic timing delays
- ✓ Events are stored in memory and broadcast via WebSocket
- ✓ Event sequence transitions (run_start → ... → run_complete/run_error)
- ✓ Event count and status assertions

## Scope

- **Does NOT** depend on real Claude (that's a separate integration test)
- **Does NOT** touch messenger/core or messenger/web code
- **Does NOT** install npm packages (uses node builtins + ws)
- Uses local **mock ingest server** that can be swapped for the real endpoint when wm4 merges

## Usage

### Run the harness

```bash
pnpm e2e:dispatcher
```

### Run against a specific fixture

```bash
FIXTURE_FILE=./fixtures/error-run.ndjson pnpm e2e:dispatcher
```

## Files

| File | Purpose |
|------|---------|
| `run-e2e.sh` | Orchestrator: starts mock server, publishes events, asserts outcomes |
| `mock-ingest-server.ts` | Local HTTP server + WebSocket broadcaster for events |
| `publisher.ts` | Reads NDJSON fixture, POSTs events with delays |
| `assertions.ts` | node:assert helpers |
| `fixtures/simple-run.ndjson` | Happy path: 8 events ending in completed |
| `fixtures/error-run.ndjson` | Error flow: run_start → substate → run_error(fatal) |

## Event Flow

### simple-run.ndjson

1. `run_start` — agent begins execution
2. `substate: context` — gathering inputs
3. `substate: reasoning` — analyzing request
4. `delta: "Hello "` — first token
5. `delta: "from "` — second token
6. `delta: "agent!"` — third token
7. `tokens` — token usage summary
8. `run_complete` — execution finished, result persisted

### error-run.ndjson

1. `run_start` — agent begins
2. `substate: context` — gathering inputs
3. `run_error` with `fatal: true` — execution halted

## Next Steps

When wm4 (ingest endpoint) merges:
1. Update `ingestUrl` in `run-e2e.sh` to point to the real endpoint
2. Update fixture event schema if needed to match wm4's contract
3. Add DB assertions against real `messenger_agent_run_events` table
4. Run smoke tests on the combined pipeline
