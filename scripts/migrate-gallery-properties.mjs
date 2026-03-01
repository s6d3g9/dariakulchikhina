/**
 * Миграция: добавляет колонку `properties` (JSONB) в таблицу gallery_items.
 * Хранит структурированные свойства строительных/отделочных материалов —
 * физические, тактильные, химические, визуальные, коммерческие и др.
 *
 * Запуск: node scripts/migrate-gallery-properties.mjs
 */
import postgres from 'postgres'
import 'dotenv/config'

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set')
  process.exit(1)
}

const sql = postgres(DATABASE_URL)

async function migrate() {
  console.log('▶ Adding properties JSONB column to gallery_items...')

  // Проверяем, существует ли колонка
  const [exists] = await sql`
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gallery_items' AND column_name = 'properties'
  `

  if (exists) {
    console.log('✓ Column "properties" already exists, skipping.')
  } else {
    await sql`
      ALTER TABLE gallery_items
      ADD COLUMN properties JSONB NOT NULL DEFAULT '{}'::jsonb
    `
    console.log('✓ Column "properties" added successfully.')
  }

  // Создаём GIN индекс для эффективного полнотекстового поиска по свойствам
  await sql`
    CREATE INDEX IF NOT EXISTS idx_gallery_items_properties
    ON gallery_items USING GIN (properties)
  `
  console.log('✓ GIN index on properties created.')

  await sql.end()
  console.log('✅ Migration complete.')
}

migrate().catch((err) => {
  console.error('❌ Migration failed:', err)
  process.exit(1)
})
