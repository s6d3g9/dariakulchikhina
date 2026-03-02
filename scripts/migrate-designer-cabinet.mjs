/**
 * Миграция: создание таблиц для кабинета дизайнера
 *   - designers
 *   - designer_projects
 *   - designer_project_clients
 *   - designer_project_contractors
 *
 * Запуск: node scripts/migrate-designer-cabinet.mjs
 */
import 'dotenv/config'
import postgres from 'postgres'

const sql = postgres(process.env.DATABASE_URL)

async function main() {
  console.log('▸ Creating designers table…')
  await sql`
    CREATE TABLE IF NOT EXISTS designers (
      id              SERIAL PRIMARY KEY,
      user_id         INTEGER REFERENCES users(id),
      name            TEXT NOT NULL,
      company_name    TEXT,
      phone           TEXT,
      email           TEXT,
      telegram        TEXT,
      website         TEXT,
      city            TEXT,
      experience      TEXT,
      about           TEXT,
      specializations TEXT[] NOT NULL DEFAULT '{}',
      services        JSONB  NOT NULL DEFAULT '[]',
      packages        JSONB  NOT NULL DEFAULT '[]',
      created_at      TIMESTAMP NOT NULL DEFAULT now(),
      updated_at      TIMESTAMP NOT NULL DEFAULT now()
    )
  `

  console.log('▸ Creating designer_projects table…')
  await sql`
    CREATE TABLE IF NOT EXISTS designer_projects (
      id              SERIAL PRIMARY KEY,
      designer_id     INTEGER NOT NULL REFERENCES designers(id) ON DELETE CASCADE,
      project_id      INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      package_key     TEXT,
      price_per_sqm   INTEGER,
      area            INTEGER,
      total_price     INTEGER,
      status          TEXT NOT NULL DEFAULT 'draft',
      notes           TEXT,
      created_at      TIMESTAMP NOT NULL DEFAULT now(),
      UNIQUE(designer_id, project_id)
    )
  `

  console.log('▸ Creating designer_project_clients table…')
  await sql`
    CREATE TABLE IF NOT EXISTS designer_project_clients (
      id                    SERIAL PRIMARY KEY,
      designer_project_id   INTEGER NOT NULL REFERENCES designer_projects(id) ON DELETE CASCADE,
      client_id             INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      UNIQUE(designer_project_id, client_id)
    )
  `

  console.log('▸ Creating designer_project_contractors table…')
  await sql`
    CREATE TABLE IF NOT EXISTS designer_project_contractors (
      id                    SERIAL PRIMARY KEY,
      designer_project_id   INTEGER NOT NULL REFERENCES designer_projects(id) ON DELETE CASCADE,
      contractor_id         INTEGER NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
      role                  TEXT,
      UNIQUE(designer_project_id, contractor_id)
    )
  `

  console.log('✓ Designer cabinet migration complete!')
  await sql.end()
}

main().catch((e) => { console.error(e); process.exit(1) })
