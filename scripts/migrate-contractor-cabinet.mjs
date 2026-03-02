#!/usr/bin/env node
/**
 * Миграция: добавляем паспортные данные, доп. поля контрактора
 * и таблицу документов подрядчика (contractor_documents).
 */
import postgres from 'postgres'

const DB_URL = process.env.DATABASE_URL || 'postgresql://daria:daria_secret_2026@localhost:5433/daria_admin'
const sql = postgres(DB_URL, { max: 1 })

const QUERIES = [
  // ── Паспортные данные ──────────────────────────────────────────
  `ALTER TABLE contractors ADD COLUMN IF NOT EXISTS passport_series text`,
  `ALTER TABLE contractors ADD COLUMN IF NOT EXISTS passport_number text`,
  `ALTER TABLE contractors ADD COLUMN IF NOT EXISTS passport_issued_by text`,
  `ALTER TABLE contractors ADD COLUMN IF NOT EXISTS passport_issue_date text`,
  `ALTER TABLE contractors ADD COLUMN IF NOT EXISTS passport_department_code text`,
  `ALTER TABLE contractors ADD COLUMN IF NOT EXISTS birth_date text`,
  `ALTER TABLE contractors ADD COLUMN IF NOT EXISTS birth_place text`,
  `ALTER TABLE contractors ADD COLUMN IF NOT EXISTS registration_address text`,
  `ALTER TABLE contractors ADD COLUMN IF NOT EXISTS snils text`,

  // ── Дополнительные контактные данные ──────────────────────────
  `ALTER TABLE contractors ADD COLUMN IF NOT EXISTS telegram text`,
  `ALTER TABLE contractors ADD COLUMN IF NOT EXISTS whatsapp text`,
  `ALTER TABLE contractors ADD COLUMN IF NOT EXISTS city text`,
  `ALTER TABLE contractors ADD COLUMN IF NOT EXISTS work_radius text`,

  // ── Финансовые / организационные ──────────────────────────────
  `ALTER TABLE contractors ADD COLUMN IF NOT EXISTS tax_system text`,         // СНО: усн, осн, патент, нпд
  `ALTER TABLE contractors ADD COLUMN IF NOT EXISTS payment_methods text[]`,  // способы оплаты
  `ALTER TABLE contractors ADD COLUMN IF NOT EXISTS hourly_rate text`,
  `ALTER TABLE contractors ADD COLUMN IF NOT EXISTS has_insurance boolean DEFAULT false`,
  `ALTER TABLE contractors ADD COLUMN IF NOT EXISTS insurance_details text`,
  `ALTER TABLE contractors ADD COLUMN IF NOT EXISTS education text`,
  `ALTER TABLE contractors ADD COLUMN IF NOT EXISTS certifications text[]`,
  `ALTER TABLE contractors ADD COLUMN IF NOT EXISTS experience_years integer`,

  // ── Таблица документов подрядчика ─────────────────────────────
  `CREATE TABLE IF NOT EXISTS contractor_documents (
    id serial PRIMARY KEY,
    contractor_id integer NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
    category text NOT NULL DEFAULT 'other',
    title text NOT NULL,
    filename text,
    url text,
    notes text,
    expires_at text,
    created_at timestamp DEFAULT now() NOT NULL
  )`,
]

async function main() {
  for (const q of QUERIES) {
    console.log('→', q.slice(0, 80) + (q.length > 80 ? '…' : ''))
    await sql.unsafe(q)
  }
  console.log('✅ Миграция contractor-cabinet завершена')
  await sql.end()
}

main().catch(err => { console.error(err); process.exit(1) })
