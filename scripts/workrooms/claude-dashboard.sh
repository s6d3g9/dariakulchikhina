#!/usr/bin/env bash
# claude-dashboard — live view of all parallel Claude CLI sessions on the
# server. Run in a dedicated tmux pane. Refreshes every 5 seconds.
#
# Shows:
#   - Session table (slug, workroom, model, window, last activity, state)
#   - Host vitals (CPU load, RAM, active workrooms count)
#   - Quick keys reminder
#
# Requires: bash, tmux, awk. No node/python.

set -euo pipefail

TMUX_SESSION="cc"
STATE_DIR="${HOME}/state/claude-sessions"
REGISTRY="${STATE_DIR}/.registry.tsv"
REFRESH_SEC="${1:-5}"

fmt_bytes() { awk -v n="$1" 'BEGIN {s="B KB MB GB TB"; split(s,u," "); i=1; while(n>=1024 && i<5){n/=1024; i++}; printf "%.1f %s", n, u[i]}'; }

# Heuristic: look at last 40 lines of the tmux pane to infer state.
infer_state() {
  local window="$1"
  local tail
  tail=$(tmux capture-pane -pS -40 -t "${TMUX_SESSION}:${window}" 2>/dev/null || true)
  if [[ -z "${tail}" ]]; then echo "dead"; return; fi
  if grep -qiE "esc to interrupt|generating|thinking" <<<"${tail}"; then
    echo "thinking"; return
  fi
  if grep -qE "^> ?$" <<<"${tail}" || grep -qE "How can I help|Tell me what" <<<"${tail}"; then
    echo "idle"; return
  fi
  if grep -qiE "running|executing|tool use|running bash" <<<"${tail}"; then
    echo "tool_call"; return
  fi
  if grep -qiE "waiting for.*input|please confirm|y/n" <<<"${tail}"; then
    echo "awaiting"; return
  fi
  echo "active"
}

# Pick up the most recent "model/ctx" mention if claude prints one.
infer_ctx() {
  local window="$1"
  local tail
  tail=$(tmux capture-pane -pS -200 -t "${TMUX_SESSION}:${window}" 2>/dev/null || true)
  # claude sometimes prints "N k tokens used" or a percent
  local pct
  pct=$(grep -oE "[0-9]+%\s*used" <<<"${tail}" | tail -1)
  if [[ -n "${pct}" ]]; then echo "${pct}"; return; fi
  local tok
  tok=$(grep -oE "[0-9]+[kK] tokens" <<<"${tail}" | tail -1)
  if [[ -n "${tok}" ]]; then echo "${tok}"; return; fi
  echo "-"
}

render_once() {
  clear
  echo "═══ CLAUDE CLI DASHBOARD ═══  (refresh ${REFRESH_SEC}s, Ctrl+C to exit)"
  echo
  echo "HOST:  $(uptime | sed 's/^[ \t]*//')"
  echo "MEM:   $(free -h | awk '/Mem:/ {printf "used=%s / %s   free=%s", $3, $2, $7}')"
  echo "DISK:  $(df -h /home | awk 'NR==2 {printf "used=%s / %s (%s)", $3, $2, $5}')"
  echo

  local active_workrooms
  active_workrooms=$(ls -1d "${HOME}/workrooms"/*/ 2>/dev/null | wc -l)
  echo "WORKROOMS ACTIVE: ${active_workrooms}"
  echo

  if [[ ! -f "${REGISTRY}" ]] || [[ $(wc -l < "${REGISTRY}") -le 1 ]]; then
    echo "(no claude CLI sessions — create one: claude-session create <slug> --workroom <wr> --prompt \"...\")"
    return
  fi

  printf '%-20s %-25s %-10s %-9s %-6s %s\n' SLUG WORKROOM MODEL STATE CTX CREATED
  printf -- '─%.0s' {1..100}; echo
  awk -F'\t' 'NR>1 {print}' "${REGISTRY}" | while IFS=$'\t' read -r slug window workroom model created; do
    state=$(infer_state "${window}")
    ctx=$(infer_ctx "${window}")
    age_short="${created:0:19}"
    printf '%-20s %-25s %-10s %-9s %-6s %s\n' "${slug}" "${workroom:--}" "${model}" "${state}" "${ctx}" "${age_short}"
  done
  echo
  echo "Keys:  attach=claude-session attach <slug>   logs=claude-session logs <slug>   kill=claude-session kill <slug>"
}

# Keep existing tmux pane happy — no buffering, just loop
while true; do
  render_once
  sleep "${REFRESH_SEC}"
done
