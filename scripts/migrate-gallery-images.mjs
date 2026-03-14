/**
 * Миграция: добавляет колонки images, featured, width, height, properties
 * в таблицу gallery_items.
 *
 * Запуск: node --env-file=.env scripts/migrate-gallery-images.mjs
 */
import postgres from 'postgres'

const sql = postgres(process.env.DATABASE_URL)

async function migrate() {
  console.log('▶ Migrating gallery_items columns...')

  const cols = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'gallery_items'
  `
  const existing = new Set(cols.map(r => r.column_name))

  if (!existing.has('images')) {
    await sql`ALTER TABLE gallery_items ADD COLUMN images jsonb NOT NULL DEFAULT '[]'::jsonb`
    console.log('  ✓ images (jsonb)')
  } else {
    console.log('  • images already exists')
  }

  if (!existing.has('featured')) {
    await sql`ALTER TABLE gallery_items ADD COLUMN featured boolean NOT NULL DEFAULT false`
    console.log('  ✓ featured (boolean)')
  } else {
    console.log('  • featured already exists')
  }

  if (!existing.has('width')) {
    await sql`ALTER TABLE gallery_items ADD COLUMN width integer`
    console.log('  ✓ width (integer)')
  } else {
    console.log('  • width already exists')
  }

  if (!existing.has('height')) {
    await sql`ALTER TABLE gallery_items ADD COLUMN height integer`
    console.log('  ✓ height (integer)')
  } else {
    console.log('  • height already exists')
  }

  if (!existing.has('properties')) {
    await sql`ALTER TABLE gallery_items ADD COLUMN properties jsonb NOT NULL DEFAULT '{}'::jsonb`
    console.log('  ✓ properties (jsonb)')
  } else {
    console.log('  • properties already exists')
  }

  await sql.end()
  console.log('Migration complete!')
}

migrate().catch(err => {
  console.error('Migration error:', err.message)
  process.exit(1)
})
