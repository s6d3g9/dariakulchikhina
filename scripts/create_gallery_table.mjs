import postgres from '/opt/daria-nuxt/node_modules/.pnpm/postgres@3.4.8/node_modules/postgres/cjs/src/index.js'
const sql = postgres(process.env.DATABASE_URL)
await sql`
  CREATE TABLE IF NOT EXISTS gallery_items (
    id serial PRIMARY KEY,
    category text NOT NULL,
    title text NOT NULL,
    image text,
    tags text[] NOT NULL DEFAULT '{}',
    description text,
    sort_order integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now()
  )
`
console.log('gallery_items: OK')
await sql.end()
