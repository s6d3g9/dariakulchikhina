import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { config } from '~/server/config'
import * as schema from './schema'

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null

export function useDb() {
  if (!_db) {
    const client = postgres(config.DATABASE_URL)
    _db = drizzle(client, { schema })
  }
  return _db
}
