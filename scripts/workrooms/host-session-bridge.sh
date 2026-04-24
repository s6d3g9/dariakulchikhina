#!/usr/bin/env bash
# Supervisor that tails the newest host Claude Code session transcript and
# streams events into the messenger via the clicore2messenger bridge.
#
# Host sessions rotate (new sessionId → new JSONL file). This loop detects
# rotation by watching the newest .jsonl mtime in the projects dir and
# restarts the bridge pointed at the new file. Between restarts the bridge's
# persisted byte-offset keeps tail position stable, and the
# claudeTranscriptAdapter dedupes by uuid as a second line of defense.
#
# Required env:
#   HOST_AGENT_ID     messenger_agents.id
#   HOST_INGEST_TOKEN messenger_agents.ingest_token
#   HOST_RUN_ID       messenger_agent_runs.id (pre-created, pending)
#   HOST_CONV_ID      messenger_conversations.id
# Optional:
#   TRANSCRIPT_DIR    default: ~/.claude/projects/-home-claudecode
#   MESSENGER_URL     default: http://localhost:4300
#   BRIDGE_BIN        default: node --experimental-strip-types .../cli.ts
#   POLL_SECS         default: 60 (directory poll cadence)

set -euo pipefail

: "${HOST_AGENT_ID:?HOST_AGENT_ID is required}"
: "${HOST_INGEST_TOKEN:?HOST_INGEST_TOKEN is required}"
: "${HOST_RUN_ID:?HOST_RUN_ID is required}"
: "${HOST_CONV_ID:?HOST_CONV_ID is required}"

TRANSCRIPT_DIR="${TRANSCRIPT_DIR:-$HOME/.claude/projects/-home-claudecode}"
MESSENGER_URL="${MESSENGER_URL:-http://localhost:4300}"
POLL_SECS="${POLL_SECS:-60}"

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
BRIDGE_BIN="${BRIDGE_BIN:-$REPO_ROOT/clicore2messenger/dist/cli.js}"

if [[ ! -f "$BRIDGE_BIN" ]]; then
  echo "[host-session-bridge] bridge binary not found: $BRIDGE_BIN" >&2
  echo "[host-session-bridge] run: cd $REPO_ROOT/clicore2messenger && pnpm build" >&2
  exit 1
fi

latest_transcript() {
  find "$TRANSCRIPT_DIR" -maxdepth 1 -name '*.jsonl' -type f -printf '%T@ %p\n' 2>/dev/null \
    | sort -n -r | head -1 | cut -d' ' -f2-
}

current=""
child_pid=""

cleanup() {
  if [[ -n "$child_pid" ]] && kill -0 "$child_pid" 2>/dev/null; then
    echo "[host-session-bridge] stopping child pid=$child_pid"
    kill -TERM "$child_pid" 2>/dev/null || true
    wait "$child_pid" 2>/dev/null || true
  fi
  exit 0
}
trap cleanup SIGINT SIGTERM

launch() {
  local target="$1"
  echo "[host-session-bridge] launching tail against $target"
  MESSENGER_INGEST_TOKEN="$HOST_INGEST_TOKEN" \
  node "$BRIDGE_BIN" \
    --adapter claude-transcript \
    --tail-file "$target" \
    --agent-id "$HOST_AGENT_ID" \
    --conversation-id "$HOST_CONV_ID" \
    --run-id "$HOST_RUN_ID" \
    --messenger-core-url "$MESSENGER_URL" \
    &
  child_pid=$!
  echo "[host-session-bridge] child pid=$child_pid"
}

while true; do
  newest="$(latest_transcript)"
  if [[ -z "$newest" ]]; then
    echo "[host-session-bridge] no transcripts in $TRANSCRIPT_DIR yet — sleeping"
    sleep "$POLL_SECS"
    continue
  fi

  if [[ "$newest" != "$current" ]]; then
    echo "[host-session-bridge] rotating: $current -> $newest"
    if [[ -n "$child_pid" ]] && kill -0 "$child_pid" 2>/dev/null; then
      kill -TERM "$child_pid" 2>/dev/null || true
      wait "$child_pid" 2>/dev/null || true
    fi
    current="$newest"
    launch "$newest"
  elif [[ -n "$child_pid" ]] && ! kill -0 "$child_pid" 2>/dev/null; then
    echo "[host-session-bridge] child exited unexpectedly; relaunching"
    launch "$current"
  fi

  sleep "$POLL_SECS"
done
