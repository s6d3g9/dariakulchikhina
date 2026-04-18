#!/usr/bin/env bash
# workroom.sh — parallel dev worktrees manager for the Daria monorepo.
# Runs on the server (daria-dev). Invoked either directly via ssh or from
# the Windows wrapper scripts/workrooms/workroom-local.sh.
#
# Commands:
#   create <slug> [base_branch]  create a new worktree and prepare its .env
#   list                         list all workrooms with ports and branch
#   remove <slug>                remove a workroom (prunes worktree + branch)
#   ports <slug>                 print port allocation for a workroom
#   status [slug]                show CPU/RAM and what processes are up
#   env <slug>                   print a shell-sourceable env block
#
# Port scheme (index N, N in 1..9):
#   NUXT_PORT       = 30N1     (e.g. w1 → 3011)
#   MESSENGER_WEB   = 30N2
#   MESSENGER_CORE  = 30N3
#   COMM_SERVICE    = 30N4
#   DEV_MISC        = 30N5..30N9
# Redis DB index  = N (0 reserved for shared/main; hiddify is a separate instance)
# All workrooms share the main Postgres (daria_postgres :5433).

set -euo pipefail

ROOT="${HOME}/daria"                   # canonical clone; NEVER edited directly
WORKROOMS_DIR="${HOME}/workrooms"      # all worktrees live here
REGISTRY="${WORKROOMS_DIR}/.registry.tsv"
LOG_DIR="${HOME}/log/workrooms"

mkdir -p "${WORKROOMS_DIR}" "${LOG_DIR}"
[ -f "${REGISTRY}" ] || printf 'slug\tindex\tbranch\tcreated\tredis_db\n' > "${REGISTRY}"

usage() {
  sed -n '2,20p' "$0"
  exit 1
}

# ---------- helpers ----------
next_index() {
  # Return the smallest free index in 1..9 not present in registry.
  local used n
  used=$(awk 'NR>1 {print $2}' "${REGISTRY}")
  for n in 1 2 3 4 5 6 7 8 9; do
    if ! grep -qxF "$n" <<<"$used"; then
      echo "$n"
      return 0
    fi
  done
  echo "ERROR: all 9 workroom slots taken" >&2
  exit 2
}

index_of() {
  awk -v s="$1" -F'\t' '$1==s {print $2}' "${REGISTRY}"
}

branch_of() {
  awk -v s="$1" -F'\t' '$1==s {print $3}' "${REGISTRY}"
}

require_slug() {
  [[ -n "${1:-}" ]] || { echo "ERROR: slug required" >&2; exit 1; }
  [[ "$1" =~ ^[a-z0-9][a-z0-9-]{1,24}$ ]] || {
    echo "ERROR: slug must be lowercase [a-z0-9-]{2,25}" >&2
    exit 1
  }
}

workroom_path() {
  echo "${WORKROOMS_DIR}/${1}"
}

# ---------- create ----------
cmd_create() {
  local slug="${1:-}" base="${2:-main}"
  require_slug "$slug"

  if awk -F'\t' 'NR>1 && $1==s {found=1} END {exit !found}' s="$slug" "${REGISTRY}"; then
    echo "ERROR: workroom '${slug}' already exists" >&2
    exit 1
  fi

  local idx; idx=$(next_index)
  local wpath; wpath=$(workroom_path "$slug")
  local branch="claude/workroom-${slug}"

  echo "[create] slug=${slug} index=${idx} branch=${branch} base=${base}"

  # Fresh fetch so we branch from an up-to-date base.
  git -C "${ROOT}" fetch origin --quiet || true

  # Create worktree + branch.
  if git -C "${ROOT}" rev-parse --verify "${branch}" >/dev/null 2>&1; then
    git -C "${ROOT}" worktree add "${wpath}" "${branch}"
  else
    git -C "${ROOT}" worktree add -b "${branch}" "${wpath}" "origin/${base}" 2>/dev/null \
      || git -C "${ROOT}" worktree add -b "${branch}" "${wpath}" "${base}"
  fi

  # Copy .env with per-workroom overrides.
  local nuxt_port=$((3000 + idx*10 + 1))
  local mweb_port=$((3000 + idx*10 + 2))
  local mcore_port=$((3000 + idx*10 + 3))
  local comm_port=$((3000 + idx*10 + 4))

  cat > "${wpath}/.env" <<EOF
# workroom=${slug} index=${idx} branch=${branch}
DATABASE_URL=postgresql://daria:daria_secret_2026@localhost:5433/daria_admin_refactor
REDIS_URL=redis://localhost:6380/${idx}
NUXT_PORT=${nuxt_port}
MESSENGER_WEB_PORT=${mweb_port}
MESSENGER_CORE_PORT=${mcore_port}
COMMUNICATIONS_SERVICE_PORT=${comm_port}
NUXT_SESSION_SECRET=wr_${slug}_secret_32chars_development_only
DESIGNER_INITIAL_EMAIL=admin@example.com
DESIGNER_INITIAL_PASSWORD=changeme
UPLOAD_DIR=${wpath}/public/uploads
YANDEX_MAPS_API_KEY=
EOF

  mkdir -p "${wpath}/public/uploads"

  # pnpm install inside the worktree (fast — uses shared pnpm store).
  ( cd "${wpath}" && pnpm install --prefer-offline --silent ) \
    > "${LOG_DIR}/${slug}-install.log" 2>&1 \
    || { echo "pnpm install failed, see ${LOG_DIR}/${slug}-install.log" >&2; exit 3; }

  # Register.
  printf '%s\t%s\t%s\t%s\t%s\n' "${slug}" "${idx}" "${branch}" "$(date -Iseconds)" "${idx}" \
    >> "${REGISTRY}"

  echo "[create] done. Workroom path: ${wpath}"
  cmd_ports "${slug}"
}

# ---------- remove ----------
cmd_remove() {
  local slug="${1:-}"
  require_slug "$slug"

  local wpath; wpath=$(workroom_path "$slug")
  local branch; branch=$(branch_of "$slug")

  if [[ -z "${branch}" ]]; then
    echo "ERROR: workroom '${slug}' not in registry" >&2
    exit 1
  fi

  echo "[remove] ${slug} (${branch})"
  # Refuse if dev servers are still up on this workroom's ports.
  if pgrep -f "workrooms/${slug}/" >/dev/null 2>&1; then
    echo "ERROR: active processes found for ${slug}. Stop them first:" >&2
    pgrep -af "workrooms/${slug}/" >&2
    exit 4
  fi

  git -C "${ROOT}" worktree remove --force "${wpath}" 2>/dev/null || rm -rf "${wpath}"
  git -C "${ROOT}" branch -D "${branch}" 2>/dev/null || true
  # Strip from registry.
  awk -v s="$slug" -F'\t' 'BEGIN{OFS="\t"} $1!=s' "${REGISTRY}" > "${REGISTRY}.tmp" \
    && mv "${REGISTRY}.tmp" "${REGISTRY}"
  echo "[remove] done"
}

# ---------- list ----------
cmd_list() {
  if [[ $(wc -l < "${REGISTRY}") -le 1 ]]; then
    echo "(no workrooms)"
    return 0
  fi
  printf '%-20s %-3s %-8s %-40s %s\n' SLUG IDX REDIS BRANCH PATH
  awk -F'\t' 'NR>1 {printf "%-20s %-3s DB=%-4s %-40s %s/workrooms/%s\n", $1, $2, $5, $3, "~", $1}' "${REGISTRY}"
}

# ---------- ports ----------
cmd_ports() {
  local slug="${1:-}"
  require_slug "$slug"
  local idx; idx=$(index_of "$slug")
  [[ -n "$idx" ]] || { echo "ERROR: no such workroom: $slug" >&2; exit 1; }
  cat <<EOF
workroom=${slug} index=${idx}
  NUXT_PORT                  = $((3000 + idx*10 + 1))
  MESSENGER_WEB_PORT         = $((3000 + idx*10 + 2))
  MESSENGER_CORE_PORT        = $((3000 + idx*10 + 3))
  COMMUNICATIONS_SERVICE_PORT= $((3000 + idx*10 + 4))
  REDIS_DB                   = ${idx}
EOF
}

# ---------- env (for shell sourcing) ----------
cmd_env() {
  local slug="${1:-}"
  require_slug "$slug"
  local wpath; wpath=$(workroom_path "$slug")
  [[ -f "${wpath}/.env" ]] || { echo "ERROR: no env for $slug" >&2; exit 1; }
  cat "${wpath}/.env"
}

# ---------- status ----------
cmd_status() {
  local slug="${1:-}"
  echo "=== Host load ==="
  uptime
  echo "CPU: $(nproc) cores | RAM: $(free -h | awk '/Mem:/ {print $3"/"$2}') | Disk: $(df -h /home | awk 'NR==2 {print $3"/"$2}')"
  echo
  echo "=== Workrooms ==="
  cmd_list
  echo
  echo "=== Live dev processes ==="
  pgrep -af "workrooms/" 2>&1 | head -20 || echo "(none)"
  echo
  echo "=== Listening dev ports (30xx) ==="
  ss -lntp 2>/dev/null | awk 'NR==1 || $4 ~ /:30[0-9]{2}$/' | head -20
}

# ---------- dispatch ----------
cmd="${1:-}"; shift || true
case "${cmd}" in
  create) cmd_create "$@";;
  remove) cmd_remove "$@";;
  list)   cmd_list "$@";;
  ports)  cmd_ports "$@";;
  env)    cmd_env "$@";;
  status) cmd_status "$@";;
  *) usage;;
esac
