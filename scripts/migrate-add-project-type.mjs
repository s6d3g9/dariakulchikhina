/**
 * scripts/migrate-add-project-type.mjs
 * Добавляет колонку project_type в таблицу projects.
 * Идемпотентный: повторный запуск безопасен.
 */
import postgres from 'postgres'

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://daria:daria_secret_2026@localhost:5433/daria_admin'

const sql = postgres(DATABASE_URL)

async function run() {
  console.log('▶ Adding project_type column to projects...')

  await sql`
    ALTER TABLE projects
    ADD COLUMN IF NOT EXISTS project_type TEXT NOT NULL DEFAULT 'apartment'
  `

  console.log('✔ projects.project_type column ready')
  await sql.end()
}

run().catch(err => {
  console.error('Migration failed:', err)
  process.exit(1)
})
