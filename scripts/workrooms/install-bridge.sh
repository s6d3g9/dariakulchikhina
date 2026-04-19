#!/usr/bin/env bash
# Install claude-stream-bridge and claude-session symlinks into ~/bin
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BRIDGE_SRC="$SCRIPT_DIR/claude-stream-bridge.ts"
SESSION_SRC="$SCRIPT_DIR/claude-session.sh"
BIN_DIR="$HOME/bin"

mkdir -p "$BIN_DIR"

ln -sf "$BRIDGE_SRC" "$BIN_DIR/claude-stream-bridge"
chmod +x "$BRIDGE_SRC"
echo "Installed: $BIN_DIR/claude-stream-bridge -> $BRIDGE_SRC"

ln -sf "$SESSION_SRC" "$BIN_DIR/claude-session"
chmod +x "$SESSION_SRC"
echo "Installed: $BIN_DIR/claude-session -> $SESSION_SRC"

echo "Make sure $BIN_DIR is in your PATH."
