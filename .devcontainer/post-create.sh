#!/usr/bin/env bash
# Runs ONCE after container is first created
set -e

echo "📦 Installing pnpm..."
npm install -g pnpm@latest --silent

echo "📦 Installing project dependencies..."
cd /workspaces/daria_project
pnpm install

echo "⏳ Waiting for PostgreSQL..."
until pg_isready -h localhost -p 5433 -U daria 2>/dev/null; do
  sleep 1
done
echo "✅ PostgreSQL is ready"

echo "🗃️ Running DB migrations..."
# Apply schema
PGPASSWORD=daria_secret_2026 psql -h localhost -p 5433 -U daria -d daria_admin \
  -f server/db/schema.sql 2>/dev/null || true

# Apply extras
PGPASSWORD=daria_secret_2026 psql -h localhost -p 5433 -U daria -d daria_admin \
  -f server/db/extras.sql 2>/dev/null || true

# Designer stage column migration
PGPASSWORD=daria_secret_2026 psql -h localhost -p 5433 -U daria -d daria_admin -c \
  "ALTER TABLE designer_projects ADD COLUMN IF NOT EXISTS stage TEXT DEFAULT 'smart_brief';" 2>/dev/null || true

echo "🌱 Seeding designer test account..."
node --input-type=module << 'EOF'
import postgres from './node_modules/postgres/src/index.js'
import { createHash } from 'crypto'

const sql = postgres('postgresql://daria:daria_secret_2026@localhost:5433/daria_admin')

// Simple bcrypt-style hash using sha256 (for dev only)
// Actually let's use the same pattern as the app
try {
  // Check if test designer exists
  const existing = await sql`SELECT id FROM designers WHERE email = 'test@designer.ru' LIMIT 1`
  if (existing.length === 0) {
    // Use bcryptjs to hash password
    const { hashSync } = await import('./node_modules/bcryptjs/dist/bcryptjs.mjs').catch(() =>
      import('./node_modules/bcryptjs/lib/bcrypt.js')
    ).catch(() => ({ hashSync: (p) => p }))
    const hash = typeof hashSync === 'function' ? hashSync('test123', 10) : 'test123'
    
    await sql`
      INSERT INTO designers (name, email, password_hash, created_at)
      VALUES ('Тест Дизайнер', 'test@designer.ru', ${hash}, NOW())
    `
    console.log('✅ Designer test@designer.ru created (password: test123)')
  } else {
    console.log('✅ Designer test@designer.ru already exists')
  }
} catch (e) {
  console.log('⚠️  Seed skipped:', e.message)
}

await sql.end()
EOF

echo ""
echo "✅ Setup complete!"
echo ""
echo "🚀 To start dev server:"
echo "   pnpm dev"
echo ""
echo "🔑 Designer login: test@designer.ru / test123"
echo "🔑 Admin login: see DESIGNER_INITIAL_EMAIL in devcontainer.json"
