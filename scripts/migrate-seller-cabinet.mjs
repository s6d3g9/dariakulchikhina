/**
 * Миграция: создание таблиц для кабинета селлера/поставщика
 *   - sellers
 *   - seller_projects
 *
 * Запуск: node scripts/migrate-seller-cabinet.mjs
 */
import 'dotenv/config'
import postgres from 'postgres'

const sql = postgres(process.env.DATABASE_URL)

async function main() {
  console.log('▸ Creating sellers table…')
  await sql`
    CREATE TABLE IF NOT EXISTS sellers (
      id              SERIAL PRIMARY KEY,
      name            TEXT NOT NULL,
      company_name    TEXT,
      contact_person  TEXT,
      phone           TEXT,
      email           TEXT,
      inn             TEXT,
      kpp             TEXT,
      ogrn            TEXT,
      bank_name       TEXT,
      bik             TEXT,
      settlement_account   TEXT,
      correspondent_account TEXT,
      legal_address   TEXT,
      fact_address    TEXT,
      categories      TEXT[] NOT NULL DEFAULT '{}',
      notes           TEXT,
      messenger       TEXT,
      messenger_nick  TEXT,
      website         TEXT,
      telegram        TEXT,
      whatsapp        TEXT,
      city            TEXT,
      delivery_terms  TEXT,
      payment_terms   TEXT,
      min_order       TEXT,
      discount        TEXT,
      rating          INTEGER,
      created_at      TIMESTAMP NOT NULL DEFAULT now(),
      updated_at      TIMESTAMP NOT NULL DEFAULT now()
    )
  `

  console.log('▸ Creating seller_projects table…')
  await sql`
    CREATE TABLE IF NOT EXISTS seller_projects (
      id          SERIAL PRIMARY KEY,
      seller_id   INTEGER NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
      project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      notes       TEXT,
      status      TEXT NOT NULL DEFAULT 'active',
      created_at  TIMESTAMP NOT NULL DEFAULT now(),
      UNIQUE(seller_id, project_id)
    )
  `

  console.log('✓ Seller cabinet migration complete!')
  await sql.end()
}

main().catch((e) => { console.error(e); process.exit(1) })
