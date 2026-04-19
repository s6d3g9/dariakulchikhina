#!/usr/bin/env bash
# claude-queue-daemon — worker-pool scheduler for Claude CLI sessions.
#
# Watches ~/state/queue/pending/*.md, spawns a workroom + claude-session
# for each, moves completed tasks to done/, frees pool slots, and optionally
# auto-pushes the resulting git branch when lint+tsc are clean.
#
# Idempotent: safe to restart. State lives entirely under ~/state/queue/.
#
# Task file format (YAML frontmatter + markdown body):
#
#   ---
#   id: 042-decompose-calls-e2ee
#   model: sonnet          # sonnet | haiku | opus
#   base_branch: main      # workroom base branch (default: main)
#   verify:                # optional verify steps; defaults to lint+tsc
#     - pnpm lint:errors
#     - pnpm exec vue-tsc --noEmit 2>&1 | grep -v "tmp_\|communications-service" | head -50
#   auto_push: true        # git push branch on clean done (default: true)
#   priority: 50           # lower = first (default: 100)
#   ---
#
#   # <task title>
#
#   <body becomes TASK.md in the workroom, fed to Claude>
#
# Pool size: $POOL_SIZE env var (default 8). Keep ≤ sessions your Max
# subscription + server comfortably handles.

set -euo pipefail

POOL_SIZE="${POOL_SIZE:-8}"
POLL_INTERVAL="${POLL_INTERVAL:-10}"           # seconds between iterations
QUEUE_DIR="${QUEUE_DIR:-$HOME/state/queue}"
BIN_WORKROOM="$HOME/bin/workroom"
BIN_CLAUDE_SESSION="$HOME/bin/claude-session"
LOG_FILE="$HOME/log/queue-daemon.log"

mkdir -p "$QUEUE_DIR"/{pending,running,done,failed} "$(dirname "$LOG_FILE")"

log() { echo "[$(date -Iseconds)] $*" | tee -a "$LOG_FILE" >&2; }

# ──────────────── parse frontmatter (YAML) ────────────────
# Returns: field=value on stdout (one per line)
parse_frontmatter() {
  local file="$1"
  awk '
    /^---$/ { n++; next }
    n == 1 { print }
    n >= 2 { exit }
  ' "$file"
}

# Read a single scalar from frontmatter (or default)
fm_get() {
  local file="$1" key="$2" default="${3:-}"
  local v
  v=$(parse_frontmatter "$file" | awk -v k="$key" -F':' '$1 == k { sub(/^ +/,"",$2); print $2; exit }')
  [ -n "$v" ] && echo "$v" || echo "$default"
}

# Extract the body (everything after the second ---)
fm_body() {
  local file="$1"
  awk '
    /^---$/ { n++; next }
    n >= 2 { print }
  ' "$file"
}

# ──────────────── session state inference ────────────────
session_state() {
  local slug="$1"
  local log="$HOME/state/claude-sessions/${slug}.log"
  [ -f "$log" ] || { echo "no-log"; return; }
  local last
  last=$(tail -n 1 "$log" 2>/dev/null)
  if grep -q '"type":"result"' <<<"$last"; then
    if grep -q '"is_error":true' <<<"$last"; then echo "error"; else echo "done"; fi
    return
  fi
  local mtime now age
  mtime=$(stat -c %Y "$log" 2>/dev/null || echo 0)
  now=$(date +%s)
  age=$(( now - mtime ))
  if [ "$age" -lt 15 ]; then echo "running"
  elif [ "$age" -lt 120 ]; then echo "idle"
  else echo "stalled"; fi
}

# ──────────────── spawn a task ────────────────
spawn_task() {
  local task_file="$1"
  local task_id task_slug model base workroom_slug

  task_id=$(fm_get "$task_file" id "$(basename "$task_file" .md)")
  model=$(fm_get "$task_file" model sonnet)
  base=$(fm_get "$task_file" base_branch main)
  local effort
  effort=$(fm_get "$task_file" effort "")
  # Derive workroom slug: sanitize task_id to match [a-z0-9-]{2,31}
  workroom_slug=$(echo "$task_id" | tr 'A-Z_' 'a-z-' | tr -cd 'a-z0-9-' | cut -c 1-31)
  [ -z "$workroom_slug" ] && { log "bad task id: $task_id"; return 1; }

  local session_slug="$workroom_slug"
  # Session slug must also fit the 31-char regex; workroom_slug already does.

  log "[spawn] task=$task_id model=$model workroom=$workroom_slug"

  # Create workroom (idempotent)
  if ! "$BIN_WORKROOM" list | grep -q "^$workroom_slug\b"; then
    "$BIN_WORKROOM" create "$workroom_slug" "$base" >> "$LOG_FILE" 2>&1 || {
      log "[spawn] workroom create failed for $workroom_slug"
      mv "$task_file" "$QUEUE_DIR/failed/"
      return 1
    }
  fi

  # Write TASK.md into the workroom
  local workroom_path="$HOME/workrooms/$workroom_slug"
  fm_body "$task_file" > "$workroom_path/TASK.md"

  # Spawn the session
  local initial_prompt="Task: $task_id. Instructions in TASK.md in your workroom root. Read it fully and execute. Commit per logical step. Delete TASK.md before your final commit. When done, write a final report with: commit hashes, verify results, blockers if any."

  local session_args=( create "$session_slug"
                       --workroom "$workroom_slug"
                       --model "$model"
                       --prompt "$initial_prompt" )
  [ -n "$effort" ] && session_args+=( --effort "$effort" )
  "$BIN_CLAUDE_SESSION" "${session_args[@]}" >> "$LOG_FILE" 2>&1 || {
    log "[spawn] claude-session failed for $session_slug"
    mv "$task_file" "$QUEUE_DIR/failed/"
    return 1
  }

  # Move to running/
  mv "$task_file" "$QUEUE_DIR/running/"
  log "[spawn] $task_id now running as $session_slug"
}

# ──────────────── complete a task ────────────────
complete_task() {
  local task_file="$1" outcome="$2"   # outcome = done | failed
  local task_id workroom_slug
  task_id=$(fm_get "$task_file" id "$(basename "$task_file" .md)")
  workroom_slug=$(echo "$task_id" | tr 'A-Z_' 'a-z-' | tr -cd 'a-z0-9-' | cut -c 1-31)
  local workroom_path="$HOME/workrooms/$workroom_slug"

  log "[complete] $task_id outcome=$outcome"

  if [ "$outcome" = "done" ]; then
    local auto_push
    auto_push=$(fm_get "$task_file" auto_push true)
    if [ "$auto_push" = "true" ] && [ -d "$workroom_path" ]; then
      local branch="claude/workroom-$workroom_slug"
      if git -C "$workroom_path" push origin "$branch" >> "$LOG_FILE" 2>&1; then
        log "[complete] pushed $branch"
      else
        log "[complete] push failed for $branch (may need rebase or auth)"
      fi
    fi
    mv "$task_file" "$QUEUE_DIR/done/"
    # Auto-archive the session so the main dashboard shows only live work.
    # The workroom git worktree stays (needed for merge); only the tmux
    # window + session log are moved into archive/.
    local session_slug="$workroom_slug"
    if grep -q "^${session_slug}	" "$HOME/state/claude-sessions/.registry.tsv" 2>/dev/null; then
      local arch_dir="$HOME/state/claude-sessions/archive"
      mkdir -p "$arch_dir"
      [ -f "$arch_dir/.registry.tsv" ] || \
        printf 'slug\tuuid\twindow\tworkroom\tmodel\tcreated\tarchived_at\n' > "$arch_dir/.registry.tsv"
      # Read session row, append to archive, drop from active registry.
      local row
      row=$(awk -v s="$session_slug" -F'\t' '$1==s {print; exit}' "$HOME/state/claude-sessions/.registry.tsv")
      if [ -n "$row" ]; then
        printf '%s\t%s\n' "$row" "$(date -Iseconds)" >> "$arch_dir/.registry.tsv"
        awk -v s="$session_slug" -F'\t' '$1!=s' "$HOME/state/claude-sessions/.registry.tsv" \
          > "$HOME/state/claude-sessions/.registry.tsv.tmp" \
          && mv "$HOME/state/claude-sessions/.registry.tsv.tmp" "$HOME/state/claude-sessions/.registry.tsv"
        # Move log + kill tmux window (session process has already exited)
        [ -f "$HOME/state/claude-sessions/${session_slug}.log" ] && \
          mv "$HOME/state/claude-sessions/${session_slug}.log" "$arch_dir/${session_slug}.log"
        [ -f "$HOME/state/claude-sessions/${session_slug}.json" ] && \
          mv "$HOME/state/claude-sessions/${session_slug}.json" "$arch_dir/${session_slug}.json"
        tmux kill-window -t "cc:cc-${session_slug}" 2>/dev/null || true
        log "[complete] auto-archived session $session_slug"
      fi
    fi
  else
    mv "$task_file" "$QUEUE_DIR/failed/"
  fi
}

# ──────────────── main loop ────────────────
log "[daemon] starting, pool=$POOL_SIZE, poll=${POLL_INTERVAL}s, queue=$QUEUE_DIR"

shopt -s nullglob  # empty globs become empty lists instead of literal "*.md"

while :; do
  # 1. Reap finished sessions from running/ (robust listing under set -e)
  while IFS= read -r task_file; do
    [ -n "$task_file" ] || continue
    task_id=$(fm_get "$task_file" id "$(basename "$task_file" .md)")
    workroom_slug=$(echo "$task_id" | tr 'A-Z_' 'a-z-' | tr -cd 'a-z0-9-' | cut -c 1-31)
    state=$(session_state "$workroom_slug")
    case "$state" in
      done)    complete_task "$task_file" done ;;
      error)   complete_task "$task_file" failed ;;
      stalled) complete_task "$task_file" failed ;;
      *)       : ;;
    esac
  done < <(find "$QUEUE_DIR/running" -maxdepth 1 -name '*.md' 2>/dev/null | sort)

  # 2. Spawn while there are free slots
  running_count=$(find "$QUEUE_DIR/running" -maxdepth 1 -name '*.md' 2>/dev/null | wc -l)
  free=$(( POOL_SIZE - running_count ))
  if [ "$free" -gt 0 ]; then
    # Sort pending by filename (priority-prefix in name acts as ordering)
    while IFS= read -r task_file; do
      [ -n "$task_file" ] || continue
      spawn_task "$task_file" || true
    done < <(find "$QUEUE_DIR/pending" -maxdepth 1 -name '*.md' 2>/dev/null | sort | head -n "$free")
  fi

  sleep "$POLL_INTERVAL"
done
