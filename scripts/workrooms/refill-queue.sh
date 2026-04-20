#!/usr/bin/env bash
# refill-queue.sh — 15-minute tick that checks queue depth and pokes the
# composer for a new batch if pending is thin. Never generates TASK.md
# itself; only asks composer to drive orchestrator.
set -u -o pipefail
export HOME="${HOME:-/home/claudecode}"
LOG="$HOME/log/refill-queue.log"
mkdir -p "$(dirname "$LOG")"
ts() { date -Iseconds; }
log() { echo "[$(ts)] $*" | tee -a "$LOG"; }

if [ -f "$HOME/state/.refill.paused" ]; then
  log "paused"; exit 0
fi

shopt -s nullglob
pending=( "$HOME/state/queue/pending/"*.md )
running=( "$HOME/state/queue/running/"*.md )
pend_n=${#pending[@]}
run_n=${#running[@]}
log "tick — pending=$pend_n running=$run_n"

# Budget guard: read Anthropic 5h utilization. If > 70%, skip.
util=$(curl -fsS -H "Authorization: Bearer $(cat $HOME/.claude/.credentials.json | python3 -c 'import json,sys; print(json.load(sys.stdin)["claudeAiOauth"]["accessToken"])')" \
  -H 'anthropic-beta: oauth-2025-04-20' \
  https://api.anthropic.com/api/oauth/usage 2>/dev/null | python3 -c 'import json,sys;d=json.load(sys.stdin);print(int(d.get("five_hour",{}).get("utilization",0)))' 2>/dev/null || echo 0)
log "5h utilization: ${util}%"
if [ "${util:-0}" -ge 70 ]; then
  log "budget above 70% — skipping refill, will retry next tick"
  exit 0
fi

# If total backlog is >= 8, no need to refill.
total=$((pend_n + run_n))
if [ "$total" -ge 8 ]; then
  log "backlog full ($total) — no refill"
  exit 0
fi

# Poke composer with a concise status + refill request. Composer will
# (per its long-running instructions) ask orchestrator to generate the
# next batch of 5-10 TASK.md files, writing them into
# ~/state/queue/pending/.
MSG="Status check (auto tick): pending=$pend_n running=$run_n 5h-util=${util}%. If the wave's red lines still hold and you have a next domain to tackle, ask orchestrator for another batch of 5-8 TASK.md. Acknowledge."

# Use the v5 composer slug.
if "$HOME/bin/claude-session" list | grep -q 'composer-platforma-v5'; then
  "$HOME/bin/claude-session" send composer-platforma-v5 "$MSG" >>"$LOG" 2>&1
  log "poked composer-platforma-v5"
else
  "$HOME/bin/claude-session" send orchestrator "$MSG" >>"$LOG" 2>&1
  log "poked orchestrator (no composer)"
fi
