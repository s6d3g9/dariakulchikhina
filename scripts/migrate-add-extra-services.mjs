/**
 * migrate-add-extra-services.mjs
 * Создаёт таблицу project_extra_services для системы дополнительных услуг.
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
  console.log('▶ Creating project_extra_services table...')

  await sql`
    CREATE TABLE IF NOT EXISTS project_extra_services (
      id               SERIAL PRIMARY KEY,
      project_id       INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      requested_by     TEXT NOT NULL DEFAULT 'client',
      service_key      TEXT,
      title            TEXT NOT NULL,
      description      TEXT,
      quantity         TEXT NOT NULL DEFAULT '1',
      unit             TEXT NOT NULL DEFAULT 'услуга',
      unit_price       INTEGER,
      total_price      INTEGER,
      status           TEXT NOT NULL DEFAULT 'requested',
      client_notes     TEXT,
      admin_notes      TEXT,
      contract_doc_id  INTEGER REFERENCES documents(id) ON DELETE SET NULL,
      invoice_doc_id   INTEGER REFERENCES documents(id) ON DELETE SET NULL,
      created_at       TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at       TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `
  console.log('  ✓ project_extra_services created (or already exists)')

  // Индексы для быстрых выборок по проекту
  await sql`
    CREATE INDEX IF NOT EXISTS idx_extra_services_project_id
      ON project_extra_services(project_id)
  `
  console.log('  ✓ index on project_id')

  await sql`
    CREATE INDEX IF NOT EXISTS idx_extra_services_status
      ON project_extra_services(status)
  `
  console.log('  ✓ index on status')

  console.log('✅ Migration complete')
  await sql.end()
}

run().catch((e) => {
  console.error('❌ Migration failed:', e)
  process.exit(1)
})
