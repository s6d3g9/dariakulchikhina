#!/usr/bin/env bash
set -euo pipefail
SETTINGS="${HOME}/.claude/settings.json"
[ -f "$SETTINGS" ] || echo '{}' > "$SETTINGS"

HOOK_JSON='{
  "SessionStart": [
    {
      "hooks": [
        {
          "type": "command",
          "command": "jq -c \"{session_id, cwd, timestamp: now, model: (.model // \\\"unknown\\\")}\" >> ~/log/claude-sessions.ndjson"
        }
      ]
    }
  ]
}'

jq --argjson h "$HOOK_JSON" '
  .hooks = (.hooks // {}) * $h
' "$SETTINGS" > "${SETTINGS}.tmp"
mv "${SETTINGS}.tmp" "$SETTINGS"

mkdir -p "${HOME}/log"

echo "Installed. Verify:"
jq '.hooks.SessionStart' "$SETTINGS"
