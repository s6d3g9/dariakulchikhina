#!/usr/bin/env bash
# copilot-stream-bridge — reads copilot plain-text output from stdin and posts
# it as delta events to the messenger core ingest endpoint.
#
# Usage (pipe mode):
#   copilot ... | copilot-stream-bridge \
#     --agent-id <uuid> --run-id <uuid> --slug <slug>
#
# Required:
#   --agent-id <uuid>   messenger agent id
#   --run-id   <uuid>   pre-existing run id in messenger_agent_runs
#
# Optional:
#   --slug     <slug>              copilot session slug (used for DLQ file name)
#   --messenger-core-url <url>     defaults to $MESSENGER_CORE_URL or http://127.0.0.1:4300
#   --ingest-token <token>         defaults to $MESSENGER_CORE_SERVICE_TOKEN or $MESSENGER_INGEST_TOKEN
#
# DLQ: ~/state/claude-bridge-dlq/copilot-<slug>-<epoch>.ndjson

set -euo pipefail

AGENT_ID=""
RUN_ID=""
SLUG="unknown"
MESSENGER_URL="${MESSENGER_CORE_URL:-http://127.0.0.1:4300}"
TOKEN="${MESSENGER_CORE_SERVICE_TOKEN:-${MESSENGER_INGEST_TOKEN:-}}"

die() { echo "ERROR: $*" >&2; exit 1; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    --agent-id)           AGENT_ID="$2"; shift 2;;
    --run-id)             RUN_ID="$2"; shift 2;;
    --slug)               SLUG="$2"; shift 2;;
    --messenger-core-url) MESSENGER_URL="$2"; shift 2;;
    --ingest-token)       TOKEN="$2"; shift 2;;
    *) die "unknown flag: $1";;
  esac
done

[[ -n "${AGENT_ID}" ]] || die "--agent-id required"
[[ -n "${TOKEN}" ]]    || die "MESSENGER_CORE_SERVICE_TOKEN / MESSENGER_INGEST_TOKEN / --ingest-token required"

if [[ -z "${RUN_ID}" ]]; then
  RUN_ID=$(cat /proc/sys/kernel/random/uuid 2>/dev/null || uuidgen)
fi

DLQ_DIR="${HOME}/state/claude-bridge-dlq"
mkdir -p "${DLQ_DIR}"
DLQ_FILE="${DLQ_DIR}/copilot-${SLUG}-$(date +%s).ndjson"
ENDPOINT="${MESSENGER_URL}/agents/${AGENT_ID}/stream"

post_event() {
  local payload="$1"
  local http_code
  http_code=$(curl -sS -o /dev/null -w '%{http_code}' \
    -X POST "${ENDPOINT}" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -d "${payload}" 2>/dev/null) || http_code="000"
  if [[ ! "${http_code}" =~ ^2 ]]; then
    printf '%s\n' "${payload}" >> "${DLQ_FILE}"
    echo "[copilot-bridge] HTTP ${http_code} — wrote to DLQ ${DLQ_FILE}" >&2
  fi
}

post_event "{\"type\":\"run_start\",\"runId\":\"${RUN_ID}\"}"

while IFS= read -r line || [[ -n "${line}" ]]; do
  [[ -n "${line}" ]] || continue
  delta=$(printf '%s' "${line}" | jq -Rs .)
  post_event "{\"type\":\"delta\",\"runId\":\"${RUN_ID}\",\"delta\":${delta}}"
done

post_event "{\"type\":\"complete\",\"runId\":\"${RUN_ID}\"}"
