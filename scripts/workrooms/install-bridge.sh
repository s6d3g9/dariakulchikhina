#!/usr/bin/env bash
# Install claude-stream-bridge symlink into ~/bin
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BRIDGE_SRC="$SCRIPT_DIR/claude-stream-bridge.ts"
BIN_DIR="$HOME/bin"

mkdir -p "$BIN_DIR"

ln -sf "$BRIDGE_SRC" "$BIN_DIR/claude-stream-bridge"
chmod +x "$BRIDGE_SRC"

echo "Installed: $BIN_DIR/claude-stream-bridge -> $BRIDGE_SRC"
echo "Make sure $BIN_DIR is in your PATH."
