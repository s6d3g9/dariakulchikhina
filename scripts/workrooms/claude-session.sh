#!/usr/bin/env bash
# claude-session — orchestrate parallel Claude Code CLI sessions on the server.
# Deploy to ~/bin/claude-session on daria-dev.
#
# Claude Code 2.x requires an interactive TTY onboarding flow that cannot be
# completed inside a detached tmux window. So this script does NOT use the
# interactive TUI — it drives the CLI through `--print --session-id <uuid>`
# and resumes with `--resume <uuid>`. Each session persists its conversation
# state in ~/.claude/ via the session UUID, independent of our bookkeeping.
#
# Output for each prompt is streamed into a tmux window (one per session)
# using `--output-format stream-json`, piped through `jq` for human-readable
# lines and teed into a log file. You can attach to a window and watch it
# live, or fetch logs after the fact.
#
# Commands:
#   create <slug> [--workroom <wr>] [--model <name>] --prompt "<initial>"
#                            [--agent-id <uuid>] [--run-id <uuid>]
#                            [--parent-run <uuid>]
#                            [--messenger-core-url <url>]
#                            [--ingest-token <token>]
#                            create a new session (assigns UUID, runs first
#                            prompt in background tmux window; if --agent-id
#                            is given, registers a cli-session and pipes
#                            output through claude-stream-bridge)
#   list                      table of active sessions
#   send <slug> "<prompt>"    resume session with a follow-up prompt (streams
#                             in the same tmux window)
#   attach <slug>             tmux attach to the window (interactive viewing)
#   logs <slug> [N]           print last N lines of the session log (default 200)
#   tail <slug>               follow the log (like tail -f); Ctrl+C to exit
#   kill <slug>               kill tmux window + cleanup local state
#                             (Claude-side session history is kept in ~/.claude)
#   state <slug>              print registry row for a session
#   doctor                    check running cli-sessions vs tmux; PATCH dead ones
#
# Registry: ~/state/claude-sessions/.registry.tsv
#   columns: slug, uuid, window, workroom, model, created
# Per-session log: ~/state/claude-sessions/<slug>.log

set -euo pipefail

TMUX_SESSION="cc"
STATE_DIR="${HOME}/state/claude-sessions"
REGISTRY="${STATE_DIR}/.registry.tsv"
CLAUDE_BIN="${HOME}/.local/bin/claude"
BRIDGE_BIN="${HOME}/bin/claude-stream-bridge"

# Messenger ingest defaults — can be overridden per-call with flags
MESSENGER_CORE_URL="${MESSENGER_CORE_URL:-}"
MESSENGER_INGEST_TOKEN="${MESSENGER_INGEST_TOKEN:-}"

mkdir -p "${STATE_DIR}"
[ -f "${REGISTRY}" ] || printf 'slug\tuuid\twindow\tworkroom\tmodel\tcreated\tkind\n' > "${REGISTRY}"
# Backward-compat migration: existing registries lack the `kind` column.
if [ -f "${REGISTRY}" ] && ! head -1 "${REGISTRY}" | grep -q kind; then
  awk -F'\t' -v OFS='\t' 'NR==1 {print $0, "kind"; next} {print $0, ""}' "${REGISTRY}" > "${REGISTRY}.tmp" \
    && mv "${REGISTRY}.tmp" "${REGISTRY}"
fi

die() { echo "ERROR: $*" >&2; exit 1; }

# --- helpers ---

gen_uuid() {
  if command -v uuidgen >/dev/null 2>&1; then uuidgen; return; fi
  cat /proc/sys/kernel/random/uuid
}

ensure_tmux_session() {
  tmux has-session -t "${TMUX_SESSION}" 2>/dev/null && return
  tmux new-session -d -s "${TMUX_SESSION}" -n "_lobby"
  tmux send-keys -t "${TMUX_SESSION}:_lobby" "clear; echo 'claude-sessions tmux lobby — claude-session list'" C-m
}

registry_has() {
  awk -v s="$1" -F'\t' 'NR>1 && $1==s {found=1} END {exit !found}' "${REGISTRY}"
}

registry_col() {
  # $1 slug, $2 column index (1-based)
  awk -v s="$1" -v c="$2" -F'\t' 'NR>1 && $1==s {print $c; exit}' "${REGISTRY}"
}

registry_remove() {
  awk -v s="$1" -F'\t' 'BEGIN{OFS="\t"} NR==1 || $1!=s' "${REGISTRY}" > "${REGISTRY}.tmp" \
    && mv "${REGISTRY}.tmp" "${REGISTRY}"
}

# Format stream-json lines into readable text. Each JSON line becomes prefixed output.
# Falls back to raw if jq unavailable.
format_stream() {
  if command -v jq >/dev/null 2>&1; then
    jq -r --unbuffered '
      if .type == "system" and .subtype == "init" then
        "── session=\(.session_id // "?") model=\(.model // "?")"
      elif .type == "assistant" then
        (.message.content // [] | map(select(.type == "text").text // "") | add // "")
      elif .type == "user" then
        "· (user)"
      elif .type == "tool_use" then
        "[tool] \(.name // "?") \((.input // {}) | @json | .[:200])"
      elif .type == "result" then
        "── done total_tokens=\(.usage.total_tokens // "?") ms=\(.duration_ms // "?")"
      elif .type == "error" then
        "!! error: \(.message // .)"
      else
        "· " + (.type // "unknown")
      end
    '
  else
    cat
  fi
}

# Register a new cli-session in messenger core.
# Prints the created cli_session id on stdout, or dies on error.
register_cli_session() {
  local agent_id="$1" slug="$2" model="$3" window="$4" uuid="$5" logpath="$6"
  local run_id="${7:-}" url="${8}" token="${9}"

  local body
  body=$(printf '{"agentId":%s,"workroomSlug":%s,"model":%s,"tmuxWindow":%s,"claudeSessionUuid":%s,"runId":%s}' \
    "$(printf '%s' "${agent_id}" | jq -Rs .)" \
    "$(printf '%s' "${slug}"     | jq -Rs .)" \
    "$(printf '%s' "${model}"    | jq -Rs .)" \
    "$(printf '%s' "${window}"   | jq -Rs .)" \
    "$(printf '%s' "${uuid}"     | jq -Rs .)" \
    "$(if [[ -n "${run_id}" ]]; then printf '%s' "${run_id}" | jq -Rs .; else echo 'null'; fi)")

  local http_resp
  http_resp=$(curl -sS -w '\n%{http_code}' \
    -X POST "${url}/cli-sessions" \
    -H "Authorization: Bearer ${token}" \
    -H "Content-Type: application/json" \
    -d "${body}") || die "curl failed calling ${url}/cli-sessions"

  local http_body http_code
  http_body=$(echo "${http_resp}" | head -n -1)
  http_code=$(echo "${http_resp}" | tail -n 1)

  [[ "${http_code}" =~ ^2 ]] || die "POST /cli-sessions returned HTTP ${http_code}: ${http_body}"

  echo "${http_body}" | jq -r '.id' || die "could not parse .id from: ${http_body}"
}

# PATCH a cli-session status via messenger core.
patch_cli_session_status() {
  local cli_session_id="$1" status="$2" url="$3" token="$4"
  curl -sS -o /dev/null \
    -X PATCH "${url}/cli-sessions/${cli_session_id}" \
    -H "Authorization: Bearer ${token}" \
    -H "Content-Type: application/json" \
    -d "{\"status\":\"${status}\"}"
}

# Launch a non-interactive claude --print run inside a tmux window, streaming
# output to stdout (viewable in tmux pane) and teed into the session log.
# When agent_id is non-empty, pipe through claude-stream-bridge.
run_prompt_in_window() {
  local slug="$1" window="$2" uuid="$3" model="$4" cwd="$5" prompt="$6" resume="$7"
  local agent_id="${8:-}" run_id="${9:-}" cli_session_id="${10:-}"
  local messenger_url="${11:-}" ingest_token="${12:-}"
  local logfile="${STATE_DIR}/${slug}.log"

  local args=( --print --dangerously-skip-permissions
               --exclude-dynamic-system-prompt-sections
               --model "${model}"
               --output-format stream-json --include-partial-messages --verbose )
  if [[ "${model}" == "opus" ]]; then
    args+=( --fallback-model sonnet )
  fi
  if [[ -n "${CLAUDE_SESSION_EFFORT_OVERRIDE:-}" ]]; then
    args+=( --effort "${CLAUDE_SESSION_EFFORT_OVERRIDE}" )
  fi
  if [[ "${resume}" == "yes" ]]; then
    args+=( --resume "${uuid}" )
  else
    args+=( --session-id "${uuid}" )
  fi

  local pfile; pfile="${STATE_DIR}/${slug}.prompt.$$"
  printf '%s' "${prompt}" > "${pfile}"

  if ! tmux list-windows -t "${TMUX_SESSION}" -F '#W' 2>/dev/null | grep -qxF "${window}"; then
    tmux new-window -a -t "${TMUX_SESSION}:{end}" -n "${window}" -c "${cwd}"
  fi

  tmux select-window -t "${TMUX_SESSION}:${window}"
  tmux send-keys -t "${TMUX_SESSION}:${window}" "clear" C-m

  local cmdline
  if [[ -n "${agent_id}" ]]; then
    # Bridge mode: pipe stream-json through claude-stream-bridge before display
    local bridge_args=( --agent-id "${agent_id}" )
    [[ -n "${run_id}" ]]         && bridge_args+=( --run-id "${run_id}" )
    [[ -n "${cli_session_id}" ]] && bridge_args+=( --cli-session-id "${cli_session_id}" )
    bridge_args+=( --messenger-core-url "${messenger_url}" --ingest-token "${ingest_token}" )

    cmdline="cd ${cwd@Q} && cat ${pfile@Q} | ${CLAUDE_BIN} ${args[*]@Q} --input-format text 2>&1 | tee -a ${logfile@Q} | ${BRIDGE_BIN} ${bridge_args[*]@Q} && rm -f ${pfile@Q}"
  else
    # Legacy mode: no bridge
    cmdline="cd ${cwd@Q} && cat ${pfile@Q} | ${CLAUDE_BIN} ${args[*]@Q} --input-format text 2>&1 | tee -a ${logfile@Q} | jq -r --unbuffered '. as \$m | try (if .type == \"assistant\" then (.message.content // [] | map(select(.type==\"text\").text // \"\") | add // \"\") elif .type == \"system\" and .subtype == \"init\" then \"── session=\(.session_id) model=\(.model)\" elif .type == \"result\" then \"── done tokens=\(.usage.total_tokens // \"?\") ms=\(.duration_ms // \"?\")\" else empty end) catch empty' && rm -f ${pfile@Q}"
  fi
  tmux send-keys -t "${TMUX_SESSION}:${window}" "${cmdline}" C-m
}

# --- create ---
cmd_create() {
  local slug="${1:-}"; shift || true
  [[ -n "${slug}" ]] || die "slug required"
  [[ "${slug}" =~ ^[a-z0-9][a-z0-9-]{1,39}$ ]] || die "slug must be [a-z0-9-]{2,40}"

  local workroom="" model="sonnet" prompt="" effort="" kind=""
  local agent_id="" run_id="" parent_run=""
  local messenger_url="${MESSENGER_CORE_URL:-}" ingest_token="${MESSENGER_INGEST_TOKEN:-}"

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --workroom)           workroom="$2"; shift 2;;
      --model)              model="$2"; shift 2;;
      --prompt)             prompt="$2"; shift 2;;
      --effort)             effort="$2"; shift 2;;
      --kind)               kind="$2"; shift 2;;
      --agent-id)           agent_id="$2"; shift 2;;
      --run-id)             run_id="$2"; shift 2;;
      --parent-run)         parent_run="$2"; shift 2;;
      --messenger-core-url) messenger_url="$2"; shift 2;;
      --ingest-token)       ingest_token="$2"; shift 2;;
      *) die "unknown flag: $1";;
    esac
  done

  # --- resolve kind -> skill bundle --------------------------------------
  if [[ -z "${kind}" ]]; then
    case "${slug}" in
      composer|composer-*) kind="composer" ;;
      *orchestrator*|*coordinator*|*planner*|*manager*) kind="orchestrator" ;;
      *) kind="default" ;;
    esac
  fi
  local bundles_file="${HOME}/daria/scripts/workrooms/skill-bundles.json"
  local kind_purpose=""
  local kind_plugins=""
  if command -v jq >/dev/null 2>&1 && [ -f "${bundles_file}" ]; then
    kind_purpose=$(jq -r --arg k "${kind}" '.[$k].purpose // .default.purpose // ""' "${bundles_file}")
    kind_plugins=$(jq -r --arg k "${kind}" '(.[$k].plugins // .default.plugins // []) | join(", ")' "${bundles_file}")
  fi
  local bias=""
  if [[ -n "${kind_purpose}" && -n "${kind_plugins}" ]]; then
    bias=$(printf '\n\n---\nWorker subjectivity: kind=%s. Purpose: %s Recommended skills (installed plugins you should prefer when they apply): %s. Other plugins remain available; use them only when the task truly calls for it.\n---' "${kind}" "${kind_purpose}" "${kind_plugins}")
  fi

  [[ -n "${prompt}" ]] || die "--prompt required for first message"
  registry_has "${slug}" && die "session '${slug}' already exists"

  # Validate messenger flags when agent-id is provided
  if [[ -n "${agent_id}" ]]; then
    [[ -n "${messenger_url}" ]]  || die "--messenger-core-url (or \$MESSENGER_CORE_URL) required with --agent-id"
    [[ -n "${ingest_token}" ]]   || die "--ingest-token (or \$MESSENGER_INGEST_TOKEN) required with --agent-id"
    command -v "${BRIDGE_BIN}" >/dev/null 2>&1 || [[ -x "${BRIDGE_BIN}" ]] \
      || die "claude-stream-bridge not found at ${BRIDGE_BIN} — run scripts/workrooms/install-bridge.sh"
  fi

  local cwd="${HOME}"
  if [[ -n "${workroom}" ]]; then
    cwd="${HOME}/workrooms/${workroom}"
    [[ -d "${cwd}" ]] || die "workroom '${workroom}' not found at ${cwd}"
  fi

  local uuid; uuid=$(gen_uuid)
  local window="cc-${slug}"
  local logfile="${STATE_DIR}/${slug}.log"

  ensure_tmux_session

  # Prepend the subjectivity bias to the user's prompt so the very first
  # assistant turn sees its role.
  prompt="${prompt}${bias}"

  # Register first so listing is correct even if the run fails.
  printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\n' "${slug}" "${uuid}" "${window}" "${workroom:-}" "${model}" "$(date -Iseconds)" "${kind}" \
    >> "${REGISTRY}"
  : > "${logfile}"

  if [[ -n "${effort}" ]]; then
    export CLAUDE_SESSION_EFFORT_OVERRIDE="${effort}"
  fi

  local cli_session_id=""
  if [[ -n "${agent_id}" ]]; then
    cli_session_id=$(register_cli_session \
      "${agent_id}" "${slug}" "${model}" "${window}" "${uuid}" "${logfile}" \
      "${run_id}" "${messenger_url}" "${ingest_token}")
    echo "[create] registered cli-session id=${cli_session_id}"
  fi

  run_prompt_in_window "${slug}" "${window}" "${uuid}" "${model}" "${cwd}" "${prompt}" "no" \
    "${agent_id}" "${run_id}" "${cli_session_id}" "${messenger_url}" "${ingest_token}"

  echo "[create] slug=${slug} uuid=${uuid} window=${window} model=${model} workroom=${workroom:-<none>} kind=${kind}"
  echo "[create] Attach: ssh -t daria-dev 'tmux attach -t ${TMUX_SESSION} \\; select-window -t :${window}'"
  echo "[create] Logs:   claude-session logs ${slug}"
}

# --- send ---
cmd_send() {
  local slug="${1:-}"; shift || die "slug required"
  local prompt="${*:-}"
  [[ -n "${prompt}" ]] || die "follow-up prompt required"
  registry_has "${slug}" || die "no such session: ${slug}"

  local uuid; uuid=$(registry_col "${slug}" 2)
  local window; window=$(registry_col "${slug}" 3)
  local workroom; workroom=$(registry_col "${slug}" 4)
  local model; model=$(registry_col "${slug}" 5)

  local cwd="${HOME}"
  [[ -n "${workroom}" ]] && cwd="${HOME}/workrooms/${workroom}"

  ensure_tmux_session
  # send does not re-register; bridge flags not threaded through send (follow-up is CLI-only)
  run_prompt_in_window "${slug}" "${window}" "${uuid}" "${model}" "${cwd}" "${prompt}" "yes"
  echo "[send] queued follow-up in ${window}"
}

# --- list ---
cmd_list() {
  if [[ $(wc -l < "${REGISTRY}") -le 1 ]]; then
    echo "(no sessions)"; return 0
  fi
  printf '%-20s %-36s %-16s %-22s %-10s %-25s %s\n' SLUG UUID WINDOW WORKROOM MODEL CREATED KIND
  awk -F'\t' 'NR>1 {printf "%-20s %-36s %-16s %-22s %-10s %-25s %s\n", $1, $2, $3, $4, $5, $6, ($7 ? $7 : "-")}' "${REGISTRY}"
}

# --- attach ---
cmd_attach() {
  local slug="${1:-}"; [[ -n "${slug}" ]] || die "slug required"
  registry_has "${slug}" || die "no such session: ${slug}"
  local window; window=$(registry_col "${slug}" 3)
  exec tmux attach -t "${TMUX_SESSION}" \; select-window -t ":${window}"
}

# --- logs ---
cmd_logs() {
  local slug="${1:-}"; [[ -n "${slug}" ]] || die "slug required"
  local n="${2:-200}"
  [[ -f "${STATE_DIR}/${slug}.log" ]] || die "no log for ${slug}"
  tail -n "${n}" "${STATE_DIR}/${slug}.log"
}

cmd_tail() {
  local slug="${1:-}"; [[ -n "${slug}" ]] || die "slug required"
  [[ -f "${STATE_DIR}/${slug}.log" ]] || die "no log for ${slug}"
  exec tail -F "${STATE_DIR}/${slug}.log"
}

# --- kill ---
cmd_kill() {
  local slug="${1:-}"; [[ -n "${slug}" ]] || die "slug required"
  registry_has "${slug}" || die "no such session: ${slug}"
  local window; window=$(registry_col "${slug}" 3)
  tmux kill-window -t "${TMUX_SESSION}:${window}" 2>/dev/null || true
  registry_remove "${slug}"
  rm -f "${STATE_DIR}/${slug}.log" "${STATE_DIR}/${slug}.prompt."*
  echo "[kill] ${slug}"
}

# --- state ---
cmd_state() {
  local slug="${1:-}"; [[ -n "${slug}" ]] || die "slug required"
  registry_has "${slug}" || die "no such session: ${slug}"
  printf 'slug     = %s\n' "${slug}"
  printf 'uuid     = %s\n' "$(registry_col "${slug}" 2)"
  printf 'window   = %s\n' "$(registry_col "${slug}" 3)"
  printf 'workroom = %s\n' "$(registry_col "${slug}" 4)"
  printf 'model    = %s\n' "$(registry_col "${slug}" 5)"
  printf 'created  = %s\n' "$(registry_col "${slug}" 6)"
  printf 'logfile  = %s\n' "${STATE_DIR}/${slug}.log"
}

# --- doctor ---
# Queries messenger core for running cli-sessions, checks whether their tmux
# windows still exist, and PATCHes status=error for any that are dead.
# Requires MESSENGER_CORE_URL and MESSENGER_INGEST_TOKEN to be set.
cmd_doctor() {
  local messenger_url="${MESSENGER_CORE_URL:-}"
  local ingest_token="${MESSENGER_INGEST_TOKEN:-}"

  # Allow overrides via flags
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --messenger-core-url) messenger_url="$2"; shift 2;;
      --ingest-token)       ingest_token="$2"; shift 2;;
      *) die "unknown flag: $1";;
    esac
  done

  [[ -n "${messenger_url}" ]] || die "MESSENGER_CORE_URL not set (or pass --messenger-core-url)"
  [[ -n "${ingest_token}" ]]  || die "MESSENGER_INGEST_TOKEN not set (or pass --ingest-token)"

  local http_resp http_body http_code
  http_resp=$(curl -sS -w '\n%{http_code}' \
    -H "Authorization: Bearer ${ingest_token}" \
    "${messenger_url}/cli-sessions?status=running") \
    || die "curl failed fetching running cli-sessions"

  http_body=$(echo "${http_resp}" | head -n -1)
  http_code=$(echo "${http_resp}" | tail -n 1)
  [[ "${http_code}" =~ ^2 ]] || die "GET /cli-sessions returned HTTP ${http_code}: ${http_body}"

  local rows; rows=$(echo "${http_body}" | jq -c '.[] // empty') || die "could not parse cli-sessions JSON"

  if [[ -z "${rows}" ]]; then
    echo "[doctor] no running cli-sessions found"
    return 0
  fi

  echo "[doctor] checking running cli-sessions..."
  printf '%-36s %-24s %-16s %s\n' ID SLUG WINDOW STATUS

  while IFS= read -r row; do
    local id slug window
    id=$(echo "${row}"     | jq -r '.id')
    slug=$(echo "${row}"   | jq -r '.workroomSlug // ""')
    window=$(echo "${row}" | jq -r '.tmuxWindow // ""')

    local tmux_ok=false
    if [[ -n "${window}" ]] && tmux has-session -t "${TMUX_SESSION}" 2>/dev/null; then
      if tmux list-windows -t "${TMUX_SESSION}" -F '#W' 2>/dev/null | grep -qxF "${window}"; then
        tmux_ok=true
      fi
    fi

    if "${tmux_ok}"; then
      printf '%-36s %-24s %-16s alive\n' "${id}" "${slug}" "${window}"
    else
      printf '%-36s %-24s %-16s DEAD — patching status=error\n' "${id}" "${slug}" "${window}"
      patch_cli_session_status "${id}" "error" "${messenger_url}" "${ingest_token}"
    fi
  done <<< "${rows}"

  echo "[doctor] done"
}

# --- help ---
cmd_help() { sed -n '2,42p' "$0"; }

# --- dispatch ---
cmd="${1:-help}"; shift || true
case "${cmd}" in
  create) cmd_create "$@";;
  send)   cmd_send "$@";;
  list)   cmd_list "$@";;
  attach) cmd_attach "$@";;
  logs)   cmd_logs "$@";;
  tail)   cmd_tail "$@";;
  kill)   cmd_kill "$@";;
  state)  cmd_state "$@";;
  doctor) cmd_doctor "$@";;
  help|-h|--help) cmd_help;;
  *) die "unknown command: ${cmd}. See --help";;
esac
