#!/usr/bin/env bash
# auto-merge.sh — 10-minute tick that pulls recently pushed worker branches
# and cherry-picks them into main when the merge is clean. Noisy failures
# get logged but never block the tick.
#
# Runs on the dev server under claudecode. Safe to run while the daemon
# is actively spawning new workers.
set -u -o pipefail
export HOME="${HOME:-/home/claudecode}"
cd "$HOME/daria" || exit 1

LOG="$HOME/log/auto-merge.log"
mkdir -p "$(dirname "$LOG")"
ts() { date -Iseconds; }
log() { echo "[$(ts)] $*" | tee -a "$LOG"; }

# Respect a simple pause flag so user can halt merging without killing timers.
if [ -f "$HOME/state/.auto-merge.paused" ]; then
  log "paused (remove $HOME/state/.auto-merge.paused to resume)"; exit 0
fi

log "tick begin"
git fetch origin --quiet main 2>>"$LOG" || { log "fetch origin failed"; exit 0; }
git fetch origin --quiet --prune 2>>"$LOG" || true

# Try to be caught up with origin/main before cherry-picking so we don't
# produce diverging history.
current=$(git rev-parse HEAD)
remote=$(git rev-parse origin/main)
if [ "$current" != "$remote" ]; then
  if git merge-base --is-ancestor "$current" "$remote"; then
    git merge --ff-only origin/main >>"$LOG" 2>&1 || log "ff-merge failed — skipping tick"
  else
    log "HEAD diverged from origin/main; skipping tick"
    exit 0
  fi
fi

picked=0; skipped=0; failed=0
for branch in $(git for-each-ref --format='%(refname:short)' refs/remotes/origin/claude/workroom-); do
  [ "${branch#origin/}" = "$branch" ] && continue
  # Already merged?
  if git merge-base --is-ancestor "$branch" HEAD 2>/dev/null; then
    continue
  fi
  # Identify the commit sha (last commit on branch).
  sha=$(git rev-parse "$branch")
  # Commits on the branch not in main.
  count=$(git rev-list --count HEAD.."$branch")
  if [ "$count" = "0" ] || [ -z "$count" ]; then
    continue
  fi
  if [ "$count" -gt 5 ]; then
    log "skip $branch — $count commits (too big, needs manual review)"
    skipped=$((skipped+1))
    continue
  fi

  # Walk oldest → newest.
  shas=$(git rev-list --reverse HEAD.."$branch")
  conflict=0
  for s in $shas; do
    if git cherry-pick --allow-empty --keep-redundant-commits "$s" >>"$LOG" 2>&1; then
      :
    else
      log "conflict on $s (from $branch) — abort & skip"
      git cherry-pick --abort >>"$LOG" 2>&1 || true
      conflict=1
      break
    fi
  done
  if [ "$conflict" -eq 1 ]; then
    failed=$((failed+1))
  else
    picked=$((picked+1))
    log "merged $branch ($count commits)"
  fi
done

if [ "$picked" -gt 0 ]; then
  if git push origin main >>"$LOG" 2>&1; then
    log "pushed $picked branches"
  else
    log "push failed — trying rebase"
    git pull --rebase origin main >>"$LOG" 2>&1 && git push origin main >>"$LOG" 2>&1 || log "rebase-push still failed"
  fi
fi

log "tick end — picked=$picked skipped=$skipped failed=$failed"
