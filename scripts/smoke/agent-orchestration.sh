#!/usr/bin/env bash
# scripts/smoke/agent-orchestration.sh
#
# End-to-end smoke test for the agent orchestration pipeline:
#   SQL seed → claude-stream-bridge → messenger ingest endpoint → DB assertions
#
# The high-level intended CLI is:
#   claude-session create <slug> --agent-id <id> --run-id <runId> --model haiku
# That convenience wrapper is not yet wired; this script drives the underlying
# claude-stream-bridge directly and documents the expected contract.
#
# Prerequisites (all must be running on daria-dev):
#   - PostgreSQL (daria_admin_refactor) reachable at $DATABASE_URL / default
#   - messenger/core ingest endpoint on $MESSENGER_INGEST_URL (default :3033)
#   - MESSENGER_INGEST_TOKEN set to a valid agent ingest_token (seeded below)
#   - Claude CLI authenticated (claude auth login)
#
# Usage (manual verification only — NOT for CI):
#   bash scripts/smoke/agent-orchestration.sh
#   bash scripts/smoke/agent-orchestration.sh --no-cleanup   # leave DB rows

set -euo pipefail

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BRIDGE="${REPO_ROOT}/scripts/workrooms/claude-stream-bridge.ts"
ENV_FILE="${REPO_ROOT}/.env"
TIMEOUT_SECS=120
POLL_INTERVAL=3
SMOKE_SLUG="smoke-orch-$$"
CLEANUP=true

for arg in "$@"; do
  [[ "$arg" == "--no-cleanup" ]] && CLEANUP=false
done

# Load .env if present
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  set -a; source <(grep -E '^[A-Z][A-Z0-9_]*=' "$ENV_FILE" | sed 's/\r//'); set +a
fi

DB_URL="${MESSENGER_DB_URL:-${DATABASE_URL:-postgresql://postgres:postgres@localhost:5433/daria_admin_refactor}}"
INGEST_URL="${MESSENGER_INGEST_URL:-http://localhost:3033}"
MODEL="haiku"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

die()  { echo "FAIL: $*" >&2; exit 1; }
info() { echo "  $*"; }

psql_q() {
  # Run a SQL query and return its output (single value expected).
  psql "$DB_URL" -t -A -c "$1" 2>/dev/null
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "required command not found: $1"
}

# ---------------------------------------------------------------------------
# Preconditions
# ---------------------------------------------------------------------------

require_cmd psql
require_cmd node
require_cmd curl

[[ -f "$BRIDGE" ]] || die "stream bridge not found: $BRIDGE"

# Verify ingest endpoint is reachable
curl -sf "${INGEST_URL}/health" >/dev/null 2>&1 \
  || die "messenger ingest endpoint not reachable at $INGEST_URL (is messenger/core running?)"

# ---------------------------------------------------------------------------
# Step a: SQL seed — user → conversation → agent → run
# (no dedicated admin API exists yet; document when one is added)
# ---------------------------------------------------------------------------

echo ""
echo "=== agent-orchestration smoke ==="
echo ""
info "Step a: seeding test records via SQL..."

USER_ID="$(psql_q "SELECT gen_random_uuid()")"
CONV_ID="$(psql_q "SELECT gen_random_uuid()")"
AGENT_ID="$(psql_q "SELECT gen_random_uuid()")"
RUN_ID="$(psql_q "SELECT gen_random_uuid()")"
INGEST_TOKEN="smoke-token-$$-$(date +%s)"

psql_q "INSERT INTO messenger_users (id, login, display_name)
        VALUES ('$USER_ID', 'smoke-$USER_ID', 'Smoke Agent $SMOKE_SLUG')" >/dev/null
psql_q "INSERT INTO messenger_conversations (id, kind, user_a_id)
        VALUES ('$CONV_ID', 'agent', '$USER_ID')" >/dev/null
psql_q "INSERT INTO messenger_agents (id, owner_user_id, name, ingest_token)
        VALUES ('$AGENT_ID', '$USER_ID', 'smoke-agent-$SMOKE_SLUG', '$INGEST_TOKEN')" >/dev/null
psql_q "INSERT INTO messenger_agent_runs (id, agent_id, conversation_id, status)
        VALUES ('$RUN_ID', '$AGENT_ID', '$CONV_ID', 'pending')" >/dev/null

info "seeded: agent_id=$AGENT_ID  run_id=$RUN_ID"

# ---------------------------------------------------------------------------
# Cleanup trap
# ---------------------------------------------------------------------------

cleanup() {
  if [[ "$CLEANUP" == "true" ]]; then
    info "cleaning up seeded rows..."
    psql_q "DELETE FROM messenger_agent_runs  WHERE id = '$RUN_ID'" >/dev/null 2>&1 || true
    psql_q "DELETE FROM messenger_agents      WHERE id = '$AGENT_ID'" >/dev/null 2>&1 || true
    psql_q "DELETE FROM messenger_conversations WHERE id = '$CONV_ID'" >/dev/null 2>&1 || true
    psql_q "DELETE FROM messenger_users       WHERE id = '$USER_ID'" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

# ---------------------------------------------------------------------------
# Step b+c: POST /agents/:id/runs via bridge (trivial prompt → model haiku)
# The bridge handles run_start, delta, tokens, complete events internally.
# ---------------------------------------------------------------------------

info "Step b+c: invoking claude-stream-bridge with prompt 'echo hello'..."

node --experimental-strip-types "$BRIDGE" \
  --agent-id     "$AGENT_ID" \
  --conversation-id "$CONV_ID" \
  --run-id       "$RUN_ID" \
  --prompt       "Reply with exactly: hello" \
  --model        "$MODEL" \
  --messenger-url "$INGEST_URL" \
  --token        "$INGEST_TOKEN" \
  &>/tmp/smoke-bridge-$$.log &
BRIDGE_PID=$!

# ---------------------------------------------------------------------------
# Step d: poll GET events until 'complete' appears (timeout $TIMEOUT_SECS s)
# ---------------------------------------------------------------------------

info "Step d: polling for 'complete' event (timeout ${TIMEOUT_SECS}s)..."

ELAPSED=0
COMPLETE_FOUND=false

while [[ $ELAPSED -lt $TIMEOUT_SECS ]]; do
  sleep "$POLL_INTERVAL"
  ELAPSED=$(( ELAPSED + POLL_INTERVAL ))

  STATUS="$(psql_q "SELECT status FROM messenger_agent_runs WHERE id = '$RUN_ID' LIMIT 1")"

  if [[ "$STATUS" == "completed" || "$STATUS" == "failed" ]]; then
    [[ "$STATUS" == "completed" ]] && COMPLETE_FOUND=true
    break
  fi
done

# Wait for bridge process (it should have exited once it got complete/error)
wait "$BRIDGE_PID" 2>/dev/null || true

if [[ "$COMPLETE_FOUND" != "true" ]]; then
  echo ""
  echo "--- bridge log ---"
  cat /tmp/smoke-bridge-$$.log || true
  die "run did not reach 'completed' within ${TIMEOUT_SECS}s (status=$STATUS)"
fi

# ---------------------------------------------------------------------------
# Step e: assertions
# ---------------------------------------------------------------------------

info "Step e: asserting results..."

# At least one delta event
DELTA_COUNT="$(psql_q "
  SELECT count(*) FROM messenger_agent_run_events
  WHERE run_id = '$RUN_ID'
    AND payload->>'type' = 'delta'
")"
[[ "$DELTA_COUNT" -ge 1 ]] \
  || die "expected at least 1 delta event, got $DELTA_COUNT"

# Token counts > 0 (cost_usd is derived: in*0.00000025 + out*0.00000125 for Haiku)
TOKEN_IN="$(psql_q "
  SELECT coalesce(sum(token_in), 0) FROM messenger_agent_run_events
  WHERE run_id = '$RUN_ID' AND token_in IS NOT NULL
")"
TOKEN_OUT="$(psql_q "
  SELECT coalesce(sum(token_out), 0) FROM messenger_agent_run_events
  WHERE run_id = '$RUN_ID' AND token_out IS NOT NULL
")"
TOTAL_TOKENS=$(( TOKEN_IN + TOKEN_OUT ))
[[ "$TOTAL_TOKENS" -gt 0 ]] \
  || die "expected token_in+token_out > 0, got in=$TOKEN_IN out=$TOKEN_OUT"

# cost_usd derived from Haiku pricing ($0.25/MTok in, $1.25/MTok out)
COST_USD="$(awk "BEGIN { printf \"%.8f\", $TOKEN_IN * 0.00000025 + $TOKEN_OUT * 0.00000125 }")"

# status = completed (already checked via poll, verify via DB once more)
FINAL_STATUS="$(psql_q "SELECT status FROM messenger_agent_runs WHERE id = '$RUN_ID' LIMIT 1")"
[[ "$FINAL_STATUS" == "completed" ]] \
  || die "expected status=completed, got $FINAL_STATUS"

# ---------------------------------------------------------------------------
# Report
# ---------------------------------------------------------------------------

EVENT_COUNT="$(psql_q "SELECT count(*) FROM messenger_agent_run_events WHERE run_id = '$RUN_ID'")"

echo ""
echo "PASS: agent-orchestration E2E smoke"
echo ""
echo "  agent_id       : $AGENT_ID"
echo "  run_id         : $RUN_ID"
echo "  status         : $FINAL_STATUS"
echo "  events total   : $EVENT_COUNT"
echo "  delta events   : $DELTA_COUNT"
echo "  token_in       : $TOKEN_IN"
echo "  token_out      : $TOKEN_OUT"
echo "  cost_usd       : $COST_USD  (Haiku pricing)"
echo ""
