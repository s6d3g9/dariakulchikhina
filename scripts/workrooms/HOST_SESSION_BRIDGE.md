# Host Session Bridge

The host-session bridge streams Claude Code transcript events from the server
host into the messenger system, making the current Claude session visible as a
live agent contact in the messenger UI.

## Architecture

```
~/.claude/projects/-home-claudecode/*.jsonl   (Claude Code session transcripts)
        │  host-session-bridge.sh  (supervisor)
        ▼
clicore2messenger bridge  (--tail-file, claudeTranscriptAdapter)
        │  POST /ingest/events  (MESSENGER_INGEST_TOKEN)
        ▼
messenger/core  →  Postgres + WebSocket
        ▼
messenger/web  (agent appears as live contact)
```

## Quick start

```bash
# 1. Create a messenger agent for the host session (one-time setup)
#    Record the returned agentId, ingestToken, runId, convId.

# 2. Set required env vars
export HOST_AGENT_ID=<agentId>
export HOST_INGEST_TOKEN=<ingestToken>
export HOST_RUN_ID=<runId>
export HOST_CONV_ID=<convId>

# 3. Start the bridge (runs until you kill it)
./scripts/workrooms/host-session-bridge.sh
```

See `host-session-bridge.sh` for optional env vars (`TRANSCRIPT_DIR`,
`MESSENGER_URL`, `POLL_SECS`).

## Owner + project (W4 contract)

After W4 every supervisor instance is bound to **one** `(ownerUserId, projectId)`
pair, supplied via two CLI flags on the supervisor process:

```
--owner-user-id <uuid>   messenger user that owns the resulting agent
--project-id <uuid>      messenger project to attach the agent to
```

Both UUIDs are **required**, validated by zod on the server side, and
checked against `messenger_projects` (must exist, be owned by the caller,
and not be soft-deleted). If either is missing the provision endpoint
returns `400 OWNER_USER_ID_REQUIRED` / `400 PROJECT_ID_REQUIRED`. If the
project lookup fails it returns `404 PROJECT_NOT_FOUND`.

The deprecated `~/.host-bridge-projects.json` mapping file and the
`HOST_BRIDGE_OWNER_USER_ID` server-side env fallback were removed —
they let the system silently provision agents with `project_id = NULL`,
which violates the W1 / W2 invariants.

### PM2 setup

`clicore2messenger/host-supervisor.ecosystem.config.cjs` reads the bound
pair from the env file (`~/.host-supervisor-v2.env` by default) and passes
them as CLI args:

```
HOST_BRIDGE_URL=http://localhost:4300
HOST_BRIDGE_TOKEN=<32+ char shared secret>
HOST_BRIDGE_OWNER_UUID=<uuid of the messenger user>
HOST_BRIDGE_PROJECT_UUID=<uuid of the messenger project>
```

For multiple projects, run multiple PM2 instances — copy the manifest,
rename `daria-host-session-v2` to e.g. `daria-host-session-v2-projA`,
and point each at its own env file via `HOST_SUPERVISOR_ENV_FILE`.

### Manual smoke

Direct invocation for testing without PM2:

```bash
node --experimental-strip-types \
  clicore2messenger/src/host-supervisor.ts \
  --owner-user-id 11111111-1111-1111-1111-111111111111 \
  --project-id   22222222-2222-2222-2222-222222222222
```

The supervisor logs both UUIDs at startup so you can confirm the binding
in `pm2 logs daria-host-session-v2`.

## Validation

### Running the E2E smoke harness

The smoke harness validates all v2 bridge scenarios against a live database.
It starts an embedded Fastify server (no external processes required), inserts
a temporary test user, runs 7 scenarios, then cleans up.

**Prerequisites:**

- PostgreSQL reachable at `MESSENGER_DB_URL` or `DATABASE_URL` (reads `.env` automatically)
- `HOST_BRIDGE_TOKEN` ≥ 32 chars (defaults to a test value if not set)

The harness creates its own messenger user and project for every run and
deletes them in teardown. After W4 there is no way to inject a pre-existing
owner via env — the bridge contract requires both UUIDs to come in via the
provision body, and the harness exercises that path end-to-end.

**Run:**

```bash
# From repo root
pnpm test:host-bridge-smoke

# With explicit token (recommended for CI)
HOST_BRIDGE_TOKEN=your-32-char-token pnpm test:host-bridge-smoke
```

### Repeated regression check

Run after every change to host-session bridge code:

```bash
pnpm test:host-bridge-smoke && echo "Bridge smoke: OK"
```

### Scenarios covered

| # | Scenario | What it validates |
|---|----------|-------------------|
| 1 | Single session basic | Provision creates one agent with correct `hostname:basename` name; events delivered; run completes |
| 2 | Two parallel sessions, different cwd | Two cwds → two distinct agentIds; events never cross |
| 3 | Two parallel sessions, same cwd | Same cwd → same agentId, two distinct runIds; events stay in correct run |
| 4 | Idle reaping | `PATCH /runs/:id/complete?reason=idle` → run transitions to `completed` |
| 5 | Re-activation | After idle reaping, new session on same cwd → new runId, same agentId |
| 6 | Crash recovery (offset dedup) | Bridge restart reads from persisted byte-offset; no duplicate events in DB |
| 7 | Cross-talk regression | Interleaved events with identical timestamps → each event lands on the correct runId |

## Restarts

`pm2 restart daria-host-session-v2` is safe. The supervisor handles SIGTERM
gracefully:

1. Sets an internal `isShuttingDown` flag — no new tail children are spawned.
2. Sends SIGTERM to all active tail children in parallel.
3. PATCHes every active run to `completed` with `reason=shutdown` via the
   provisioning API (parallel, non-blocking).
4. Waits for all children to exit.
5. Writes the final `sessions.json` (every still-running entry → `completed`).
6. Exits 0.

A **hard 5-second cap** is set at shutdown start. If the supervisor hasn't
finished by then it exits 1 so PM2 records an unclean restart. In practice
the sequence above completes in well under a second.

After restart you should see lines like:

```
[shutdown] received signal — stopping new spawns, N child(ren) active
[shutdown] SIGTERM sent to N child(ren)
[shutdown] patched N run(s) to completed
[shutdown] all children exited
[shutdown] flushed N run(s) to sessions.json
```

To verify no stuck runs after restart:

```sql
SELECT count(*) FROM agent_runs
WHERE status = 'running' AND updated_at < now() - interval '1 minute';
-- expect: 0
```

### v1 Sunset checklist (A5 criteria)

Before retiring the v1 bridge (`host-session-bridge.sh` + pre-provisioned IDs):

- [ ] All 7 smoke scenarios pass on production DB (`MESSENGER_DB_URL=...`)
- [ ] PM2 `daria-host-session` process replaced by v2 supervisor using `HOST_BRIDGE_TOKEN` provision flow
- [ ] `HOST_BRIDGE_OWNER_UUID` and `HOST_BRIDGE_PROJECT_UUID` set in `~/.host-supervisor-v2.env` (or each per-project env file)
- [ ] `HOST_AGENT_ID`, `HOST_INGEST_TOKEN`, `HOST_RUN_ID`, `HOST_CONV_ID` vars removed from `.host-session-bridge.env`
- [ ] Smoke test runs clean in nightly CI job (not PR gate — too heavy) for ≥ 5 consecutive days
