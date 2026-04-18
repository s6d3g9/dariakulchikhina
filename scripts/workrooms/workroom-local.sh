#!/usr/bin/env bash
# workroom-local.sh — thin SSH wrapper around ~/bin/workroom on daria-dev.
# Lets you drive the parallel-workroom system from the Windows host without
# remembering the SSH boilerplate.
#
# Usage (from the repo root):
#   ./scripts/workrooms/workroom-local.sh create <slug> [base_branch]
#   ./scripts/workrooms/workroom-local.sh list
#   ./scripts/workrooms/workroom-local.sh status [slug]
#   ./scripts/workrooms/workroom-local.sh ports <slug>
#   ./scripts/workrooms/workroom-local.sh env <slug>
#   ./scripts/workrooms/workroom-local.sh remove <slug>
#   ./scripts/workrooms/workroom-local.sh run <slug> -- <cmd...>
#   ./scripts/workrooms/workroom-local.sh shell <slug>
#
# `run` executes an arbitrary command inside the workroom with its .env loaded.
# `shell` opens an interactive SSH session cd'd into the workroom.

set -euo pipefail

SSH_HOST="${DARIA_DEV_HOST:-daria-dev}"

die() { echo "ERROR: $*" >&2; exit 1; }

cmd="${1:-}"; shift || true

case "${cmd}" in
  create|remove|list|ports|env|status)
    exec ssh "${SSH_HOST}" "~/bin/workroom ${cmd} $*"
    ;;
  run)
    slug="${1:-}"; shift || die "slug required"
    [[ "${1:-}" == "--" ]] && shift
    [[ $# -gt 0 ]] || die "command required after --"
    # -q makes the quoting robust across an ssh round-trip.
    exec ssh "${SSH_HOST}" "set -a; cd ~/workrooms/${slug} && . ./.env && set +a && $*"
    ;;
  shell)
    slug="${1:-}"; shift || die "slug required"
    exec ssh -t "${SSH_HOST}" "cd ~/workrooms/${slug} && exec bash -l"
    ;;
  ""|-h|--help)
    sed -n '2,25p' "$0"
    ;;
  *)
    die "unknown command: ${cmd}. See --help"
    ;;
esac
