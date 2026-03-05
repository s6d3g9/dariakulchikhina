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
      content     TEXT,
      template_key TEXT,
      created_at  TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `
  console.log('✓ Таблица documents создана или уже существует')

  // Добавляем новые колонки если не существуют (idempotent)
  await sql`ALTER TABLE documents ADD COLUMN IF NOT EXISTS content TEXT`
  await sql`ALTER TABLE documents ADD COLUMN IF NOT EXISTS template_key TEXT`
  console.log('✓ Колонки content и template_key добавлены')

  await sql.end()
  console.log('Готово.')
}

main().catch(e => { console.error(e); process.exit(1) })
