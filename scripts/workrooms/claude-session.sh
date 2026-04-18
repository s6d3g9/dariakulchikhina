#!/usr/bin/env bash
# claude-session — manage parallel Claude Code CLI sessions in tmux.
# Runs on the server (daria-dev). Deploy to ~/bin/claude-session and chmod +x.
#
# Each session lives in a dedicated tmux window inside a single tmux session
# "cc" (short for claude-code). That keeps all windows reachable with one
# attach and keeps orchestration simple.
#
# Commands:
#   create <slug> [--workroom <wr>] [--model <name>] [--prompt "..."]
#                       create tmux window, launch claude CLI, optionally
#                       cd into a workroom and send an initial prompt
#   list                 table of active sessions
#   attach <slug>        tmux attach into a session (interactive)
#   logs <slug>          dump last ~2000 lines from the tmux pane
#   send <slug> "msg"    pipe a message into an existing session
#   kill <slug>          close the tmux window + cleanup state
#   resume <slug>        run `claude --resume` in the existing window
#   state <slug>         print registry row for a session
#
# State: ~/state/claude-sessions/<slug>.json
# Registry: ~/state/claude-sessions/.registry.tsv  (slug, window, workroom, model, created)
#
# Designed so it is safe to run from non-interactive ssh (no stdin attach).

set -euo pipefail

TMUX_SESSION="cc"
STATE_DIR="${HOME}/state/claude-sessions"
REGISTRY="${STATE_DIR}/.registry.tsv"
CLAUDE_BIN="${HOME}/.local/bin/claude"

mkdir -p "${STATE_DIR}"
[ -f "${REGISTRY}" ] || printf 'slug\twindow\tworkroom\tmodel\tcreated\n' > "${REGISTRY}"

die() { echo "ERROR: $*" >&2; exit 1; }

ensure_tmux_session() {
  if ! tmux has-session -t "${TMUX_SESSION}" 2>/dev/null; then
    tmux new-session -d -s "${TMUX_SESSION}" -n "_lobby"
    tmux send-keys -t "${TMUX_SESSION}:_lobby" "echo 'claude-sessions tmux lobby — windows open to your right'" C-m
  fi
}

window_exists() {
  tmux list-windows -t "${TMUX_SESSION}" -F '#W' 2>/dev/null | grep -qxF "$1"
}

registry_has() {
  awk -v s="$1" -F'\t' 'NR>1 && $1==s {found=1} END {exit !found}' "${REGISTRY}"
}

registry_get() {
  awk -v s="$1" -F'\t' 'NR>1 && $1==s {print; exit}' "${REGISTRY}"
}

registry_remove() {
  awk -v s="$1" -F'\t' 'BEGIN{OFS="\t"} NR==1 || $1!=s' "${REGISTRY}" > "${REGISTRY}.tmp" \
    && mv "${REGISTRY}.tmp" "${REGISTRY}"
}

# ---------- create ----------
cmd_create() {
  local slug="${1:-}"; shift || true
  [[ -n "${slug}" ]] || die "slug required"
  [[ "${slug}" =~ ^[a-z0-9][a-z0-9-]{1,30}$ ]] || die "slug must be [a-z0-9-]{2,31}"

  local workroom="" model="sonnet" prompt=""
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --workroom) workroom="$2"; shift 2;;
      --model)    model="$2"; shift 2;;
      --prompt)   prompt="$2"; shift 2;;
      *) die "unknown flag: $1";;
    esac
  done

  registry_has "${slug}" && die "session '${slug}' already exists (use 'kill' first or pick a new slug)"

  ensure_tmux_session
  local window="cc-${slug}"
  window_exists "${window}" && die "tmux window ${window} already exists"

  local cwd="${HOME}"
  if [[ -n "${workroom}" ]]; then
    cwd="${HOME}/workrooms/${workroom}"
    [[ -d "${cwd}" ]] || die "workroom '${workroom}' not found at ${cwd}"
  fi

  # Create the window, cd into the target, then launch claude.
  tmux new-window -t "${TMUX_SESSION}" -n "${window}" -c "${cwd}"

  # Register first (before we launch, so list reflects reality even if claude fails)
  printf '%s\t%s\t%s\t%s\t%s\n' "${slug}" "${window}" "${workroom:-}" "${model}" "$(date -Iseconds)" \
    >> "${REGISTRY}"

  # Launch claude. If a prompt was passed, feed it via --print then drop to interactive.
  # We pick `claude` (interactive) so the user can later attach and keep chatting.
  local launch="${CLAUDE_BIN} --model ${model}"
  tmux send-keys -t "${TMUX_SESSION}:${window}" "${launch}" C-m

  # Give claude ~2s to boot, then send the initial prompt.
  if [[ -n "${prompt}" ]]; then
    sleep 2
    # Buffer approach so newlines in the prompt don't break tmux parsing.
    local pbuf; pbuf=$(mktemp)
    printf '%s' "${prompt}" > "${pbuf}"
    tmux load-buffer -b cc_prompt_"${slug}" "${pbuf}"
    tmux paste-buffer -b cc_prompt_"${slug}" -t "${TMUX_SESSION}:${window}"
    tmux delete-buffer -b cc_prompt_"${slug}"
    rm -f "${pbuf}"
    # Submit
    tmux send-keys -t "${TMUX_SESSION}:${window}" C-m
  fi

  # Record meta
  cat > "${STATE_DIR}/${slug}.json" <<EOF
{
  "slug": "${slug}",
  "window": "${window}",
  "workroom": "${workroom}",
  "model": "${model}",
  "cwd": "${cwd}",
  "created": "$(date -Iseconds)"
}
EOF

  echo "[create] slug=${slug} window=${window} model=${model} workroom=${workroom:-<none>}"
  echo "[create] Attach: tmux attach -t ${TMUX_SESSION} \\; select-window -t :${window}"
  echo "[create] Or from ssh: ssh -t daria-dev 'tmux attach -t ${TMUX_SESSION}'"
}

# ---------- list ----------
cmd_list() {
  if [[ $(wc -l < "${REGISTRY}") -le 1 ]]; then
    echo "(no sessions)"
    return 0
  fi
  printf '%-22s %-18s %-22s %-10s %s\n' SLUG WINDOW WORKROOM MODEL CREATED
  awk -F'\t' 'NR>1 {printf "%-22s %-18s %-22s %-10s %s\n", $1, $2, $3, $4, $5}' "${REGISTRY}"
}

# ---------- attach ----------
cmd_attach() {
  local slug="${1:-}"; [[ -n "${slug}" ]] || die "slug required"
  registry_has "${slug}" || die "no such session: ${slug}"
  local window="cc-${slug}"
  exec tmux attach -t "${TMUX_SESSION}" \; select-window -t ":${window}"
}

# ---------- logs ----------
cmd_logs() {
  local slug="${1:-}"; [[ -n "${slug}" ]] || die "slug required"
  registry_has "${slug}" || die "no such session: ${slug}"
  local window="cc-${slug}"
  tmux capture-pane -pS -2000 -t "${TMUX_SESSION}:${window}"
}

# ---------- send ----------
cmd_send() {
  local slug="${1:-}"; shift || die "slug required"
  local msg="${*:-}"
  [[ -n "${msg}" ]] || die "message required"
  registry_has "${slug}" || die "no such session: ${slug}"
  local window="cc-${slug}"
  local pbuf; pbuf=$(mktemp)
  printf '%s' "${msg}" > "${pbuf}"
  tmux load-buffer -b cc_send_"${slug}" "${pbuf}"
  tmux paste-buffer -b cc_send_"${slug}" -t "${TMUX_SESSION}:${window}"
  tmux delete-buffer -b cc_send_"${slug}"
  rm -f "${pbuf}"
  tmux send-keys -t "${TMUX_SESSION}:${window}" C-m
  echo "[send] delivered to ${window}"
}

# ---------- kill ----------
cmd_kill() {
  local slug="${1:-}"; [[ -n "${slug}" ]] || die "slug required"
  registry_has "${slug}" || die "no such session: ${slug}"
  local window="cc-${slug}"
  # Try graceful /exit first (gives claude a chance to save), then force
  tmux send-keys -t "${TMUX_SESSION}:${window}" "/exit" C-m 2>/dev/null || true
  sleep 1
  tmux kill-window -t "${TMUX_SESSION}:${window}" 2>/dev/null || true
  registry_remove "${slug}"
  rm -f "${STATE_DIR}/${slug}.json"
  echo "[kill] ${slug}"
}

# ---------- resume ----------
cmd_resume() {
  local slug="${1:-}"; [[ -n "${slug}" ]] || die "slug required"
  registry_has "${slug}" || die "no such session: ${slug}"
  local window="cc-${slug}"
  # Send claude --resume in-pane (if claude already exited)
  tmux send-keys -t "${TMUX_SESSION}:${window}" "${CLAUDE_BIN} --resume" C-m
  echo "[resume] signalled ${window}"
}

# ---------- state ----------
cmd_state() {
  local slug="${1:-}"; [[ -n "${slug}" ]] || die "slug required"
  [[ -f "${STATE_DIR}/${slug}.json" ]] || die "no state for ${slug}"
  cat "${STATE_DIR}/${slug}.json"
}

# ---------- help ----------
cmd_help() { sed -n '2,22p' "$0"; }

# ---------- dispatch ----------
cmd="${1:-help}"; shift || true
case "${cmd}" in
  create) cmd_create "$@";;
  list)   cmd_list "$@";;
  attach) cmd_attach "$@";;
  logs)   cmd_logs "$@";;
  send)   cmd_send "$@";;
  kill)   cmd_kill "$@";;
  resume) cmd_resume "$@";;
  state)  cmd_state "$@";;
  help|-h|--help) cmd_help;;
  *) die "unknown command: ${cmd}. See --help";;
esac
