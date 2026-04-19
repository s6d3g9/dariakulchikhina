import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import { readMessengerConfig } from '../config.ts'
import * as schema from './schema.ts'

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null

export function useMessengerDb() {
  if (!_db) {
    const config = readMessengerConfig()
    const client = postgres(config.MESSENGER_CORE_DATABASE_URL)
    _db = drizzle(client, { schema })
  }
  return _db
}
