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

# Infer state from the session log (source of truth) + mtime freshness.
infer_state() {
  local slug="$1"
  local logf="${STATE_DIR}/${slug}.log"
  [[ -f "${logf}" ]] || { echo "no-log"; return; }

  local mtime now age
  mtime=$(stat -c %Y "${logf}" 2>/dev/null || echo 0)
  now=$(date +%s)
  age=$(( now - mtime ))

  # Peek last line to see if we have a terminal result/error
  local last
  last=$(tail -n 1 "${logf}" 2>/dev/null)
  if grep -q '"type":"result"' <<<"${last}"; then
    if grep -q '"is_error":true' <<<"${last}"; then echo "error"; else echo "done"; fi
    return
  fi

  # If the log is being written very recently it is alive
  if [[ ${age} -lt 15 ]]; then
    # Distinguish thinking vs tool_call by the last 5 lines
    local tail5; tail5=$(tail -n 5 "${logf}" 2>/dev/null)
    if grep -q '"thinking_delta"' <<<"${tail5}"; then echo "thinking"; return; fi
    if grep -q '"tool_use"' <<<"${tail5}"; then echo "tool_call"; return; fi
    if grep -q '"text_delta"' <<<"${tail5}"; then echo "streaming"; return; fi
    echo "running"
  elif [[ ${age} -lt 120 ]]; then
    echo "idle"
  else
    echo "stalled"
  fi
}

# Token usage from the most recent result or stream message.
infer_ctx() {
  local slug="$1"
  local logf="${STATE_DIR}/${slug}.log"
  [[ -f "${logf}" ]] || { echo "-"; return; }

  # Prefer latest completed result (has usage total)
  local result
  result=$(grep -m1 '"type":"result"' <(tac "${logf}" 2>/dev/null) 2>/dev/null || true)
  if [[ -n "${result}" ]]; then
    local tokens
    tokens=$(jq -r '(.usage.input_tokens + .usage.output_tokens + .usage.cache_read_input_tokens + .usage.cache_creation_input_tokens) // empty' <<<"${result}" 2>/dev/null)
    if [[ -n "${tokens}" ]]; then
      # Compact: 5k / 200k
      local kt=$(( tokens / 1000 ))
      echo "${kt}k"
      return
    fi
  fi

  # Otherwise look at last stream message with usage
  local ctx
  ctx=$(grep -o '"output_tokens":[0-9]*' "${logf}" | tail -1 | grep -oE '[0-9]+')
  if [[ -n "${ctx}" ]]; then echo "${ctx}t"; return; fi

  echo "-"
}

render_once() {
  # ANSI clear screen — works without TERM set
  printf '\033[H\033[2J'
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
  awk -F'\t' 'NR>1 {print}' "${REGISTRY}" | while IFS=$'\t' read -r slug uuid window workroom model created; do
    state=$(infer_state "${slug}")
    ctx=$(infer_ctx "${slug}")
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
