/**
 * Migration: add subscriptions JSONB column to designers table
 */
import 'dotenv/config'
import postgres from 'postgres'

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) { console.error('DATABASE_URL not set'); process.exit(1) }

const sql = postgres(DATABASE_URL)

async function run() {
  try {
    // Check if column exists
    const rows = await sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'designers' AND column_name = 'subscriptions'
    `
    if (rows.length) {
      console.log('✔ Column "subscriptions" already exists, skipping.')
      return
    }

    await sql`
      ALTER TABLE designers
      ADD COLUMN subscriptions jsonb NOT NULL DEFAULT '[]'::jsonb
    `
    console.log('✔ Added subscriptions column to designers table.')
  } finally {
    await sql.end()
  }
}

run().catch(err => { console.error(err); process.exit(1) })
