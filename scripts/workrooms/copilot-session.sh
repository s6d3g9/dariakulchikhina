#!/usr/bin/env bash
# copilot-session — orchestrate GitHub Copilot CLI sessions on the server.
# Mirrors the claude-session interface; uses ~/bin/copilot instead of claude.
#
# GitHub Copilot CLI 1.x supports:
#   -p/--prompt <text>   non-interactive mode (exits after completion)
#   --allow-all          allow all tools without confirmation
#   --effort <level>     reasoning effort: low | medium | high | xhigh
#   --model <model>      e.g. gpt-5.4, claude-opus-4.7, gpt-5.2-codex
#   --resume[=id]        resume from a previous session file
#   --save-session-path  path to save session state after completion
#
# Output is plain markdown (not stream-json), so no jq parsing needed.
#
# Commands:
#   create <slug> [--workroom <wr>] [--model <name>] [--effort <level>]
#                 --prompt "<initial>" [--agent-id <uuid>] [--run-id <uuid>]
#                 [--messenger-core-url <url>] [--ingest-token <token>]
#   send <slug> "<prompt>"   resume session with follow-up
#   list                     table of active sessions
#   attach <slug>            tmux attach to the window
#   logs <slug> [N]          last N lines of session log (default 200)
#   tail <slug>              follow the log
#   kill <slug>              kill window + cleanup
#   state <slug>             print registry row
#
# Registry: ~/state/copilot-sessions/.registry.tsv
# Per-session log: ~/state/copilot-sessions/<slug>.log

set -euo pipefail

TMUX_SESSION="cp"
STATE_DIR="${COPILOT_SESSION_STATE_DIR:-${HOME}/state/copilot-sessions}"
REGISTRY="${STATE_DIR}/.registry.tsv"
COPILOT_BIN="${HOME}/bin/copilot"
BRIDGE_BIN="${HOME}/bin/claude-stream-bridge"
WORKROOMS_ROOT="${COPILOT_SESSION_WORKROOMS_ROOT:-${HOME}/workrooms}"

MESSENGER_CORE_URL="${MESSENGER_CORE_URL:-}"
MESSENGER_INGEST_TOKEN="${MESSENGER_INGEST_TOKEN:-}"

mkdir -p "${STATE_DIR}"
[ -f "${REGISTRY}" ] || printf 'slug\tuuid\twindow\tworkroom\tmodel\tcreated\teffort\n' > "${REGISTRY}"

die() { echo "ERROR: $*" >&2; exit 1; }

[[ -x "${COPILOT_BIN}" ]] || die "copilot binary not found at ${COPILOT_BIN} — run: cd /tmp && curl -sL https://github.com/github/copilot-cli/releases/download/v1.0.34/copilot-linux-x64.tar.gz -o c.tar.gz && tar xzf c.tar.gz && mv copilot ~/bin/copilot && chmod +x ~/bin/copilot"

gen_uuid() {
  if command -v uuidgen >/dev/null 2>&1; then uuidgen; return; fi
  cat /proc/sys/kernel/random/uuid
}

ensure_tmux_session() {
  tmux has-session -t "${TMUX_SESSION}" 2>/dev/null && return
  tmux new-session -d -s "${TMUX_SESSION}" -n "_lobby"
  tmux send-keys -t "${TMUX_SESSION}:_lobby" "clear; echo 'copilot-sessions tmux lobby — copilot-session list'" C-m
}

registry_has() {
  awk -v s="$1" -F'\t' 'NR>1 && $1==s {found=1} END {exit !found}' "${REGISTRY}"
}

registry_col() {
  awk -v s="$1" -v c="$2" -F'\t' 'NR>1 && $1==s {print $c; exit}' "${REGISTRY}"
}

registry_remove() {
  awk -v s="$1" -F'\t' 'BEGIN{OFS="\t"} NR==1 || $1!=s' "${REGISTRY}" > "${REGISTRY}.tmp" \
    && mv "${REGISTRY}.tmp" "${REGISTRY}"
}

# Post a text message to messenger-core as an agent stream event
post_text_to_messenger() {
  local agent_id="$1" text="$2" url="$3" token="$4"
  local body
  body=$(printf '{"agentId":%s,"type":"text","content":%s}' \
    "$(printf '%s' "${agent_id}" | jq -Rs .)" \
    "$(printf '%s' "${text}" | jq -Rs .)")
  curl -sS -o /dev/null \
    -X POST "${url}/agents/${agent_id}/stream" \
    -H "Authorization: Bearer ${token}" \
    -H "Content-Type: application/json" \
    -d "${body}" || true
}

# Launch a copilot -p run inside a tmux window.
run_prompt_in_window() {
  local slug="$1" window="$2" uuid="$3" model="$4" effort="$5" cwd="$6" prompt="$7" resume="$8"
  local agent_id="${9:-}"
  local messenger_url="${10:-}" ingest_token="${11:-}"
  local run_id="${12:-}"
  local logfile="${STATE_DIR}/${slug}.log"
  local session_file="${STATE_DIR}/${slug}.session.md"

  local args=( --allow-all --model "${model}" )
  [[ -n "${effort}" ]] && args+=( --effort "${effort}" )
  if [[ "${resume}" == "yes" && -f "${session_file}" ]]; then
    args+=( --resume="${session_file}" )
  fi
  args+=( --save-session-path "${session_file}" )

  local pfile="${STATE_DIR}/${slug}.prompt.$$"
  printf '%s' "${prompt}" > "${pfile}"

  if ! tmux list-windows -t "${TMUX_SESSION}" -F '#W' 2>/dev/null | grep -qxF "${window}"; then
    tmux new-window -a -t "${TMUX_SESSION}:{end}" -n "${window}" -c "${cwd}"
  fi
  tmux select-window -t "${TMUX_SESSION}:${window}"
  tmux send-keys -t "${TMUX_SESSION}:${window}" "clear" C-m

  # Build command: run copilot, tee to log, stream through bridge if configured
  local cmdline
  if [[ -n "${agent_id}" && -n "${messenger_url}" && -n "${ingest_token}" ]]; then
    local bridge_args=( --adapter copilot --agent-id "${agent_id}" --messenger-core-url "${messenger_url}" --ingest-token "${ingest_token}" )
    [[ -n "${run_id}" ]] && bridge_args+=( --run-id "${run_id}" )
    cmdline="cd ${cwd@Q} && ${COPILOT_BIN} ${args[*]@Q} -p \"\$(cat ${pfile@Q})\" 2>&1 | tee -a ${logfile@Q} | ${BRIDGE_BIN} ${bridge_args[*]@Q} && rm -f ${pfile@Q}"
  else
    cmdline="cd ${cwd@Q} && ${COPILOT_BIN} ${args[*]@Q} -p \"\$(cat ${pfile@Q})\" 2>&1 | tee -a ${logfile@Q} && rm -f ${pfile@Q}"
  fi

  tmux send-keys -t "${TMUX_SESSION}:${window}" "${cmdline}" C-m
}

# --- create ---
cmd_create() {
  local slug="${1:-}"; shift || true
  [[ -n "${slug}" ]] || die "slug required"
  [[ "${slug}" =~ ^[a-z0-9][a-z0-9-]{1,39}$ ]] || die "slug must be [a-z0-9-]{2,40}"

  local workroom="" model="gpt-5.4" effort="medium" prompt=""
  local agent_id="" run_id=""
  local messenger_url="${MESSENGER_CORE_URL:-}" ingest_token="${MESSENGER_INGEST_TOKEN:-}"

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --workroom)           workroom="$2"; shift 2;;
      --model)              model="$2"; shift 2;;
      --effort)             effort="$2"; shift 2;;
      --prompt)             prompt="$2"; shift 2;;
      --agent-id)           agent_id="$2"; shift 2;;
      --run-id)             run_id="$2"; shift 2;;
      --messenger-core-url) messenger_url="$2"; shift 2;;
      --ingest-token)       ingest_token="$2"; shift 2;;
      *) die "unknown flag: $1";;
    esac
  done

  [[ -n "${prompt}" ]] || die "--prompt required"
  registry_has "${slug}" && die "session '${slug}' already exists"

  local cwd="${HOME}"
  if [[ -n "${workroom}" ]]; then
    cwd="${WORKROOMS_ROOT}/${workroom}"
    [[ -d "${cwd}" ]] || die "workroom '${workroom}' not found at ${cwd}"
  fi

  local uuid; uuid=$(gen_uuid)
  local window="cp-${slug}"
  local logfile="${STATE_DIR}/${slug}.log"

  ensure_tmux_session

  printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\n' \
    "${slug}" "${uuid}" "${window}" "${workroom:-}" "${model}" "$(date -Iseconds)" "${effort}" \
    >> "${REGISTRY}"
  : > "${logfile}"

  run_prompt_in_window "${slug}" "${window}" "${uuid}" "${model}" "${effort}" "${cwd}" "${prompt}" "no" \
    "${agent_id}" "${messenger_url}" "${ingest_token}" "${run_id}"

  echo "[create] slug=${slug} uuid=${uuid} window=${window} model=${model} effort=${effort} workroom=${workroom:-<none>}"
  echo "[create] Attach: tmux attach -t ${TMUX_SESSION} \\; select-window -t :${window}"
  echo "[create] Logs:   copilot-session logs ${slug}"
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
  local effort; effort=$(registry_col "${slug}" 7)

  local cwd="${HOME}"
  [[ -n "${workroom}" ]] && cwd="${WORKROOMS_ROOT}/${workroom}"

  ensure_tmux_session
  run_prompt_in_window "${slug}" "${window}" "${uuid}" "${model}" "${effort}" "${cwd}" "${prompt}" "yes"
  echo "[send] queued follow-up in ${window}"
}

# --- list ---
cmd_list() {
  if [[ $(wc -l < "${REGISTRY}") -le 1 ]]; then
    echo "(no copilot sessions)"; return 0
  fi
  printf '%-20s %-36s %-16s %-22s %-20s %-8s %-25s\n' SLUG UUID WINDOW WORKROOM MODEL EFFORT CREATED
  awk -F'\t' 'NR>1 {printf "%-20s %-36s %-16s %-22s %-20s %-8s %-25s\n", $1, $2, $3, $4, $5, ($7?$7:"-"), $6}' "${REGISTRY}"
}

cmd_attach() {
  local slug="${1:-}"; [[ -n "${slug}" ]] || die "slug required"
  registry_has "${slug}" || die "no such session: ${slug}"
  local window; window=$(registry_col "${slug}" 3)
  exec tmux attach -t "${TMUX_SESSION}" \; select-window -t ":${window}"
}

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

cmd_kill() {
  local slug="${1:-}"; [[ -n "${slug}" ]] || die "slug required"
  registry_has "${slug}" || die "no such session: ${slug}"
  local window; window=$(registry_col "${slug}" 3)
  tmux kill-window -t "${TMUX_SESSION}:${window}" 2>/dev/null || true
  registry_remove "${slug}"
  rm -f "${STATE_DIR}/${slug}.log" "${STATE_DIR}/${slug}.session.md" "${STATE_DIR}/${slug}.prompt."*
  echo "[kill] ${slug}"
}

cmd_state() {
  local slug="${1:-}"; [[ -n "${slug}" ]] || die "slug required"
  registry_has "${slug}" || die "no such session: ${slug}"
  printf 'slug     = %s\n' "${slug}"
  printf 'uuid     = %s\n' "$(registry_col "${slug}" 2)"
  printf 'window   = %s\n' "$(registry_col "${slug}" 3)"
  printf 'workroom = %s\n' "$(registry_col "${slug}" 4)"
  printf 'model    = %s\n' "$(registry_col "${slug}" 5)"
  printf 'created  = %s\n' "$(registry_col "${slug}" 6)"
  printf 'effort   = %s\n' "$(registry_col "${slug}" 7)"
  printf 'logfile  = %s\n' "${STATE_DIR}/${slug}.log"
  printf 'session  = %s\n' "${STATE_DIR}/${slug}.session.md"
}

cmd_help() { sed -n '2,35p' "$0"; }

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
  help|-h|--help) cmd_help;;
  *) die "unknown command: ${cmd}. See --help";;
esac
