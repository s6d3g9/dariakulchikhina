import pg from 'pg'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, '../.env')
let DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  try {
    const env = readFileSync(envPath, 'utf8')
    for (const line of env.split('\n')) {
      const m = line.match(/^DATABASE_URL=(.+)$/)
      if (m) DATABASE_URL = m[1].replace(/^["']|["']$/g, '').trim()
    }
  } catch {}
}

if (!DATABASE_URL) { console.error('DATABASE_URL not set'); process.exit(1) }

const { Client } = pg
const client = new Client({ connectionString: DATABASE_URL })
await client.connect()

await client.query(`
  CREATE TABLE IF NOT EXISTS clients (
    id          SERIAL PRIMARY KEY,
    name        TEXT NOT NULL,
    phone       TEXT,
    email       TEXT,
    messenger   TEXT,
    messenger_nick TEXT,
    address     TEXT,
    notes       TEXT,
    created_at  TIMESTAMP DEFAULT NOW() NOT NULL
  );
`)

console.log('✅ clients table created (or already exists)')
await client.end()
