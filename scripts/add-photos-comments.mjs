import postgres from 'postgres'

const url = process.env.DATABASE_URL
if (!url) { console.error('DATABASE_URL not set'); process.exit(1) }

const sql = postgres(url)

// work_status_item_photos
await sql`
  CREATE TABLE IF NOT EXISTS work_status_item_photos (
    id SERIAL PRIMARY KEY,
    item_id INTEGER NOT NULL REFERENCES work_status_items(id) ON DELETE CASCADE,
    contractor_id INTEGER,
    url TEXT NOT NULL,
    caption TEXT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
  )
`
console.log('✓ work_status_item_photos')

// work_status_item_comments
await sql`
  CREATE TABLE IF NOT EXISTS work_status_item_comments (
    id SERIAL PRIMARY KEY,
    item_id INTEGER NOT NULL REFERENCES work_status_items(id) ON DELETE CASCADE,
    author_type TEXT NOT NULL,
    author_name TEXT NOT NULL,
    text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
  )
`
console.log('✓ work_status_item_comments')

await sql.end()
console.log('Migration done')
