#!/usr/bin/env bash
# Persistent SSH tunnel with auto-reconnect
# Usage: bash scripts/tunnel-keep.sh &
SSH_KEY="${HOME}/.ssh/id_ed25519_lichu"
REMOTE_USER="lichu"
REMOTE_HOST="152.53.176.165"
LOCAL_PORT="3002"
REMOTE_PORT="3002"
PID_FILE="/tmp/liza-tunnel.pid"

echo $$ > "$PID_FILE"
echo "[tunnel] started PID $$, port ${LOCAL_PORT} -> ${REMOTE_HOST}:${REMOTE_PORT}"

while true; do
  ssh -i "$SSH_KEY" \
      -o StrictHostKeyChecking=no \
      -o ServerAliveInterval=15 \
      -o ServerAliveCountMax=3 \
      -o ExitOnForwardFailure=yes \
      -o ConnectTimeout=10 \
      -N -L "${LOCAL_PORT}:localhost:${REMOTE_PORT}" \
      "${REMOTE_USER}@${REMOTE_HOST}" 2>/dev/null
  EXIT=$?
  echo "[tunnel] disconnected (exit $EXIT), reconnecting in 5s..."
  sleep 5
done
