/**
 * scripts/migrate-add-project-type.mjs
 * Добавляет колонку project_type в таблицу projects.
 * Идемпотентный: повторный запуск безопасен.
 */
import postgres from 'postgres'
import { config } from 'dotenv'

config()

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set')
  process.exit(1)
}

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
