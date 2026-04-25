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

## Project mapping

### What is it?

Each Claude Code session has a working directory (`cwd`). The bridge can
optionally associate that cwd with a **messenger project** (`messengerProjectId`),
so that sessions from that directory appear under the correct project filter in
the messenger UI.

Without a mapping the agent is created with `projectId = null`. It still works
correctly — events are streamed, the agent is visible — but it won't appear
when filtering conversations by project. For a single-project setup this is
fine; for multi-project DevOps workflows it creates noise.

### The mapping file

Mappings live in `~/.host-bridge-projects.json` (override with
`HOST_BRIDGE_PROJECTS_FILE` env var). The file is created automatically by the
CLI on first write and is set to mode `600`.

```json
{
  "version": 1,
  "mappings": {
    "/home/claudecode/daria": "uuid-of-daria-project",
    "/home/claudecode": "uuid-of-scratch-project"
  }
}
```

### Managing mappings with `bridge-projects`

```bash
# List current mappings
clicore2messenger bridge-projects list

# Discover active cwds and see which are unmapped (marked with *)
clicore2messenger bridge-projects scan
clicore2messenger bridge-projects scan --days 60   # extend look-back window

# Add or update a mapping
clicore2messenger bridge-projects set /home/claudecode/daria <messengerProjectId>

# Remove a mapping
clicore2messenger bridge-projects unset /home/claudecode/daria

# Verify all mapped project IDs still exist in the database
DATABASE_URL="postgres://..." clicore2messenger bridge-projects validate
```

### `scan` output explained

```
  cwd                                                 sessions  last_active        mapped_to
------------------------------------------------------------------------------------------------------
* /home/claudecode/daria                              12        2026-04-24 18:32   (unmapped)
  /home/claudecode/messenger                          3         2026-04-23 11:05   550e8400-...
```

- `*` prefix — cwd has no mapping; sessions from this directory won't be
  associated with any messenger project.
- `sessions` — number of `.jsonl` session files across all project dirs that
  resolve to this cwd.
- `last_active` — newest `.jsonl` mtime within the look-back window.
- `mapped_to` — the `messengerProjectId`, or `(unmapped)`.

Only cwds with activity within the last 30 days (configurable with `--days`)
are shown. Results are sorted by `last_active` descending.

### `validate` requirements

`validate` connects to Postgres directly via `psql` and the `DATABASE_URL` env
var. It checks that every mapped `messengerProjectId` exists in the
`messenger_projects` table. Exit code 1 means broken references were found.

```bash
DATABASE_URL="$(cat .env | grep DATABASE_URL | cut -d= -f2-)" \
  clicore2messenger bridge-projects validate
```

If `DATABASE_URL` is not set, the command exits with an error message and
does not attempt any database connection.

### What happens without a mapping

- Bridge starts normally; `projectId` is `null` in the provision call.
- Agent is created and sessions stream correctly.
- In the messenger UI the agent appears under "All" but not under any specific
  project filter.
- Calling `bridge-projects set` at any time takes effect for the _next_ bridge
  restart; in-flight sessions are not retroactively re-associated.

## Validation

### Running the E2E smoke harness

The smoke harness validates all v2 bridge scenarios against a live database.
It starts an embedded Fastify server (no external processes required), inserts
a temporary test user, runs 7 scenarios, then cleans up.

**Prerequisites:**

- PostgreSQL reachable at `MESSENGER_DB_URL` or `DATABASE_URL` (reads `.env` automatically)
- `HOST_BRIDGE_TOKEN` ≥ 32 chars (defaults to a test value if not set)
- `HOST_BRIDGE_OWNER_USER_ID` (optional — test inserts its own user by default)

**Run:**

```bash
# From repo root
pnpm test:host-bridge-smoke

# With explicit token (recommended for CI)
HOST_BRIDGE_TOKEN=your-32-char-token pnpm test:host-bridge-smoke

# Against a pre-existing owner user (skips user insert/delete)
HOST_BRIDGE_TOKEN=your-32-char-token \
HOST_BRIDGE_OWNER_USER_ID=<uuid> \
pnpm test:host-bridge-smoke
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

### v1 Sunset checklist (A5 criteria)

Before retiring the v1 bridge (`host-session-bridge.sh` + pre-provisioned IDs):

- [ ] All 7 smoke scenarios pass on production DB (`MESSENGER_DB_URL=...`)
- [ ] `clicore2messenger bridge-projects scan` shows no unmapped active cwds
- [ ] PM2 `daria-host-session` process replaced by v2 supervisor using `HOST_BRIDGE_TOKEN` provision flow
- [ ] `HOST_AGENT_ID`, `HOST_INGEST_TOKEN`, `HOST_RUN_ID`, `HOST_CONV_ID` vars removed from `.host-session-bridge.env`
- [ ] Smoke test runs clean in nightly CI job (not PR gate — too heavy) for ≥ 5 consecutive days
