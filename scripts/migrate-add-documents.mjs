#!/usr/bin/env node
// scripts/migrate-add-documents.mjs
// Создаёт таблицу documents если её нет
import postgres from 'postgres'

const DB_URL = process.env.DATABASE_URL || 'postgresql://daria:daria_secret_2026@localhost:5433/daria_admin'
const sql = postgres(DB_URL, { max: 1 })

async function main() {
  console.log('=== Миграция: добавление таблицы documents ===')

  await sql`
    CREATE TABLE IF NOT EXISTS documents (
      id          SERIAL PRIMARY KEY,
      project_id  INTEGER REFERENCES projects(id) ON DELETE SET NULL,
      category    TEXT NOT NULL DEFAULT 'other',
      title       TEXT NOT NULL,
      filename    TEXT,
      url         TEXT,
      notes       TEXT,
      created_at  TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `
  console.log('✓ Таблица documents создана или уже существует')
  await sql.end()
  console.log('Готово.')
}

main().catch(e => { console.error(e); process.exit(1) })
