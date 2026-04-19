#!/usr/bin/env bash
# setup-skill-plugins.sh — reproducibly install the plugins / marketplaces we
# rely on for worker subjectivity (composer, orchestrator, frontend-ui,
# backend-api, docs, etc.). Idempotent — safe to re-run.
set -euo pipefail

CLI="${CLAUDE_BIN:-$HOME/.local/bin/claude}"

if [ ! -x "$CLI" ]; then
  echo "ERROR: claude CLI not found at $CLI" >&2
  exit 1
fi

echo "[skills] adding marketplaces"
"$CLI" plugin marketplace list | grep -q anthropic-agent-skills || \
  "$CLI" plugin marketplace add anthropics/skills
"$CLI" plugin marketplace list | grep -q claude-code-plugins || \
  "$CLI" plugin marketplace add anthropics/claude-code

# Plugin catalogue we rely on. Trim / extend this list without forgetting to
# update scripts/workrooms/skill-bundles.json so kinds reference real plugins.
PLUGINS=(
  # from claude-code-plugins marketplace:
  code-review
  feature-dev
  frontend-design
  pr-review-toolkit
  security-guidance
  commit-commands
  plugin-dev
  # from anthropic-agent-skills marketplace:
  document-skills   # xlsx / docx / pptx / pdf
  example-skills    # skill-creator, mcp-builder, canvas-design, theme-factory, webapp-testing
)

for p in "${PLUGINS[@]}"; do
  if "$CLI" plugin list | grep -q "^\s*❯ $p@"; then
    echo "[skills]   = $p (already installed)"
  else
    echo "[skills]   + $p"
    "$CLI" plugin install "$p" >/dev/null
  fi
done

echo "[skills] done."
echo "[skills] installed:"
"$CLI" plugin list | awk '/❯/ {print "  " $0}'
