#!/usr/bin/env bash
# Runs every time the container starts (after rebuild or resume)
set -e

echo "⏳ Waiting for PostgreSQL..."
timeout 30 bash -c 'until pg_isready -h localhost -p 5433 -U daria 2>/dev/null; do sleep 1; done' || true

echo "🚀 Starting Nuxt dev server..."
cd /workspaces/daria_project
DATABASE_URL=postgresql://daria:daria_secret_2026@localhost:5433/daria_admin \
NUXT_SESSION_SECRET=daria2026supersecretkeyatleast32chars!! \
REDIS_URL=redis://localhost:6380 \
NODE_ENV=development \
pnpm dev &

echo "✅ Dev server starting on port 3000"
