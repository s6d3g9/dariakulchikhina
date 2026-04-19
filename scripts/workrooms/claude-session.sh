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
#                            create a new session (assigns UUID, runs first
#                            prompt in background tmux window)
#   list                      table of active sessions
#   send <slug> "<prompt>"    resume session with a follow-up prompt (streams
#                             in the same tmux window)
#   attach <slug>             tmux attach to the window (interactive viewing)
#   logs <slug> [N]           print last N lines of the session log (default 200)
#   tail <slug>               follow the log (like tail -f); Ctrl+C to exit
#   kill <slug>               kill tmux window + cleanup local state
#                             (Claude-side session history is kept in ~/.claude)
#   state <slug>              print registry row for a session
#
# Registry: ~/state/claude-sessions/.registry.tsv
#   columns: slug, uuid, window, workroom, model, created
# Per-session log: ~/state/claude-sessions/<slug>.log

set -euo pipefail

TMUX_SESSION="cc"
STATE_DIR="${HOME}/state/claude-sessions"
REGISTRY="${STATE_DIR}/.registry.tsv"
CLAUDE_BIN="${HOME}/.local/bin/claude"

mkdir -p "${STATE_DIR}"
[ -f "${REGISTRY}" ] || printf 'slug\tuuid\twindow\tworkroom\tmodel\tcreated\n' > "${REGISTRY}"

die() { echo "ERROR: $*" >&2; exit 1; }

# --- helpers ---

gen_uuid() {
  if command -v uuidgen >/dev/null 2>&1; then uuidgen; return; fi
  # Fallback: /proc/sys/kernel/random/uuid
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

# Launch a non-interactive claude --print run inside a tmux window, streaming
# output to stdout (viewable in tmux pane) and teed into the session log.
run_prompt_in_window() {
  local slug="$1" window="$2" uuid="$3" model="$4" cwd="$5" prompt="$6" resume="$7"
  local logfile="${STATE_DIR}/${slug}.log"

  # Prepare the command
  # Cost / cache optimizations:
  # --dangerously-skip-permissions  — autonomous pool, no human approver
  # --exclude-dynamic-system-prompt-sections — strips per-machine sections
  #     (cwd, git status, env) from the system prompt. Major effect: the
  #     system prompt becomes identical across parallel sessions on the
  #     same repo, so Anthropic's prompt cache hits across sessions and we
  #     stop paying cache_creation for shared boilerplate.
  local args=( --print --dangerously-skip-permissions
               --exclude-dynamic-system-prompt-sections
               --model "${model}"
               --output-format stream-json --include-partial-messages --verbose )
  # Opus is scarce on Max → auto-fallback to Sonnet on overload so long-running
  # orchestrator sessions don't hang when quota peaks.
  if [[ "${model}" == "opus" ]]; then
    args+=( --fallback-model sonnet )
  fi
  # Optional effort override (low/medium/high/xhigh/max). Use 'low' for
  # cheap mechanical tasks (pure extractions, docs) to cut thinking tokens.
  if [[ -n "${CLAUDE_SESSION_EFFORT_OVERRIDE:-}" ]]; then
    args+=( --effort "${CLAUDE_SESSION_EFFORT_OVERRIDE}" )
  fi
  if [[ "${resume}" == "yes" ]]; then
    args+=( --resume "${uuid}" )
  else
    args+=( --session-id "${uuid}" )
  fi

  # Write the prompt to a temp file to avoid shell quoting.
  local pfile; pfile="${STATE_DIR}/${slug}.prompt.$$"
  printf '%s' "${prompt}" > "${pfile}"

  # Ensure window exists; create if needed.
  if ! tmux list-windows -t "${TMUX_SESSION}" -F '#W' 2>/dev/null | grep -qxF "${window}"; then
    tmux new-window -a -t "${TMUX_SESSION}:{end}" -n "${window}" -c "${cwd}"
  fi

  # Select and run
  tmux select-window -t "${TMUX_SESSION}:${window}"
  # Clear previous output for readability on follow-ups
  tmux send-keys -t "${TMUX_SESSION}:${window}" "clear" C-m

  # Build one-liner command. Use a helper bash -c so we can tee + format.
  local cmdline
  cmdline="cd ${cwd@Q} && cat ${pfile@Q} | ${CLAUDE_BIN} ${args[*]@Q} --input-format text 2>&1 | tee -a ${logfile@Q} | jq -r --unbuffered '. as \$m | try (if .type == \"assistant\" then (.message.content // [] | map(select(.type==\"text\").text // \"\") | add // \"\") elif .type == \"system\" and .subtype == \"init\" then \"── session=\(.session_id) model=\(.model)\" elif .type == \"result\" then \"── done tokens=\(.usage.total_tokens // \"?\") ms=\(.duration_ms // \"?\")\" else empty end) catch empty' && rm -f ${pfile@Q}"
  tmux send-keys -t "${TMUX_SESSION}:${window}" "${cmdline}" C-m
}

# --- create ---
cmd_create() {
  local slug="${1:-}"; shift || true
  [[ -n "${slug}" ]] || die "slug required"
  [[ "${slug}" =~ ^[a-z0-9][a-z0-9-]{1,39}$ ]] || die "slug must be [a-z0-9-]{2,40}"

  local workroom="" model="sonnet" prompt="" effort=""
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --workroom) workroom="$2"; shift 2;;
      --model)    model="$2"; shift 2;;
      --prompt)   prompt="$2"; shift 2;;
      --effort)   effort="$2"; shift 2;;
      *) die "unknown flag: $1";;
    esac
  done

  [[ -n "${prompt}" ]] || die "--prompt required for first message"
  registry_has "${slug}" && die "session '${slug}' already exists"

  local cwd="${HOME}"
  if [[ -n "${workroom}" ]]; then
    cwd="${HOME}/workrooms/${workroom}"
    [[ -d "${cwd}" ]] || die "workroom '${workroom}' not found at ${cwd}"
  fi

  local uuid; uuid=$(gen_uuid)
  local window="cc-${slug}"

  ensure_tmux_session

  # Register first so listing is correct even if the run fails.
  printf '%s\t%s\t%s\t%s\t%s\t%s\n' "${slug}" "${uuid}" "${window}" "${workroom:-}" "${model}" "$(date -Iseconds)" \
    >> "${REGISTRY}"
  : > "${STATE_DIR}/${slug}.log"

  # Stash effort in the meta json so run_prompt_in_window can pick it up on resume too.
  if [[ -n "${effort}" ]]; then
    export CLAUDE_SESSION_EFFORT_OVERRIDE="${effort}"
  fi

  run_prompt_in_window "${slug}" "${window}" "${uuid}" "${model}" "${cwd}" "${prompt}" "no"

  echo "[create] slug=${slug} uuid=${uuid} window=${window} model=${model} workroom=${workroom:-<none>}"
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
  run_prompt_in_window "${slug}" "${window}" "${uuid}" "${model}" "${cwd}" "${prompt}" "yes"
  echo "[send] queued follow-up in ${window}"
}

# --- list ---
cmd_list() {
  if [[ $(wc -l < "${REGISTRY}") -le 1 ]]; then
    echo "(no sessions)"; return 0
  fi
  printf '%-20s %-36s %-16s %-22s %-10s %s\n' SLUG UUID WINDOW WORKROOM MODEL CREATED
  awk -F'\t' 'NR>1 {printf "%-20s %-36s %-16s %-22s %-10s %s\n", $1, $2, $3, $4, $5, $6}' "${REGISTRY}"
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

# --- help ---
cmd_help() { sed -n '2,32p' "$0"; }

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
