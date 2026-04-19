# Claude CLI → Messenger Ingest Contract

**Version:** 1.0  
**Sprint:** Sprint 1.2 (bridge) / Sprint 2 (server implementation)  
**Status:** Draft — bridge implemented, server endpoint pending

---

## 1. Endpoint

```
POST {messenger_base_url}/agents/:agentId/stream
```

- `agentId` — UUID of the `messenger_agents` row; must exist before a run starts.
- The bridge derives the URL from `MESSENGER_INGEST_URL` + `/agents/:agentId/stream`.

## 2. Authentication

```
Authorization: Bearer <ingest_token>
```

The token lives in `messenger_agents.ingest_token` (a secret column, never exposed to the browser). The bridge receives it via `MESSENGER_INGEST_TOKEN` env var or `--token` CLI flag.

## 3. Request format

- **Content-Type:** `application/json`
- **Body:** one event object per request (not batched, not newline-delimited).
- Events are sent in strict temporal order; the server **must** persist them in the order received.

### Event types

All events share the field `runId` (UUID v4, generated fresh per bridge invocation or supplied via `--run-id`).

#### `run_start`
```json
{
  "type": "run_start",
  "runId": "<uuid>",
  "conversationId": "<uuid>",
  "prompt": "..."
}
```
Sent once, before the Claude process is spawned. Signals the server to create a `messenger_agent_runs` row with `status = "running"`.

#### `substate`
```json
{
  "type": "substate",
  "runId": "<uuid>",
  "value": "idle" | "thinking" | "tool_call" | "awaiting_input" | "streaming" | "error"
}
```
Reflects the current activity within a running session. Used by the UI to show a live status badge.

Mapping from Claude CLI stream events:
| CLI event | substate value |
|---|---|
| `system.subtype=init` | `idle` |
| `stream_event.message_start` | `thinking` |
| `stream_event.content_block_start` (tool_use block) | `tool_call` |
| `stream_event.content_block_delta` (text_delta) | `streaming` |
| parse error / subprocess crash | `error` |

#### `delta`
```json
{
  "type": "delta",
  "runId": "<uuid>",
  "text": "<partial assistant text>"
}
```
Emitted for every `content_block_delta` of type `text_delta` from the CLI stream. These arrive in order and concatenate to form the final assistant message.

#### `tool_use`
```json
{
  "type": "tool_use",
  "runId": "<uuid>",
  "name": "<tool_name>",
  "inputSummary": "<short description of input, ≤ 120 chars>"
}
```
Emitted when a `content_block_start` of type `tool_use` is seen. `inputSummary` is derived from the tool input JSON (first 120 chars of its compact representation).

#### `tokens`
```json
{
  "type": "tokens",
  "runId": "<uuid>",
  "in": 1234,
  "out": 567,
  "totalCostUsd": 0.023
}
```
Emitted once from the CLI `result` event. `in`/`out` are non-negative integers. `totalCostUsd` may be 0 if the CLI does not report it.

#### `complete`
```json
{
  "type": "complete",
  "runId": "<uuid>",
  "finalText": "...",
  "totalTokens": 1801,
  "durationMs": 4200
}
```
Emitted after `tokens`. Signals the server to set `messenger_agent_runs.status = "completed"`.

#### `error`
```json
{
  "type": "error",
  "runId": "<uuid>",
  "message": "...",
  "fatal": true | false
}
```
`fatal: true` means the bridge cannot continue; the server should set `status = "failed"`. `fatal: false` is a recoverable parse hiccup; the run may continue.

---

## 4. Response

| Status | Meaning |
|---|---|
| `200 OK` | Event accepted. Empty body or any JSON. |
| `202 Accepted` | Event accepted and queued. Body: `{"persistedEventId": "<uuid>"}` |
| `4xx` | Permanent failure. Bridge stops retrying this event and marks the run as failed. |
| `5xx` | Transient failure. Bridge retries with exponential backoff (see §5). |

## 5. Retry policy (bridge side)

- Max attempts: **5**
- Backoff: `min(200ms × 2^(attempt-1), 16s)` — i.e. 200 ms, 400 ms, 800 ms, 1.6 s, 3.2 s
- Only `5xx` responses trigger retries. `4xx` are permanent failures.
- If all 5 attempts fail, the event is written to the DLQ file at
  `~/state/claude-bridge/<runId>.dlq.ndjson` and processing continues.

## 6. Ordering guarantee

The bridge sends events sequentially (next fetch only starts after the prior one resolves or exhausts retries). The server must persist them in arrival order and broadcast over WebSocket in the same order.

---

## 7. Environment variables

| Variable | Default | Description |
|---|---|---|
| `MESSENGER_INGEST_URL` | `http://localhost:3033` | Base URL of the messenger server |
| `MESSENGER_INGEST_TOKEN` | — | Bearer token for auth (required) |
| `CLAUDE_CLI_BIN` | `~/.local/bin/claude` | Path to the claude CLI binary |

---

## 8. Server implementation checklist

Sprint 2 workroom implementing `POST /agents/:agentId/stream`:

1. **Persist every event** as a `messenger_agent_run_events` row with columns:
   `(id, run_id, agent_id, type, payload jsonb, created_at)`.

2. **Update `messenger_agent_runs.status`** based on event flow:
   - `run_start` → `status = "running"`, record `started_at`
   - `complete` → `status = "completed"`, record `completed_at`
   - `error` with `fatal: true` → `status = "failed"`, record `completed_at`
   - Other events → no status change

3. **Broadcast each event** over WebSocket channel `agent-stream:{agentId}` so the
   messenger UI receives live updates. Use Redis Pub/Sub or the messenger's existing
   broadcast mechanism.

4. **Return 404** for unknown `runId` on any event type other than `run_start`.
   Do **not** auto-create runs.

5. **Validate** that `tokens.in` and `tokens.out` are non-negative integers.
   Return `400` on violation.

6. **Rate limit:** 50 requests/second per `agentId`. Return `429` beyond that.
   The bridge treats `429` as a `5xx` (retries with backoff).

7. **Auth:** reject with `401` if `Authorization` header is missing or the token
   does not match `messenger_agents.ingest_token` for the given `agentId`.
