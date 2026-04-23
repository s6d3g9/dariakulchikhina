// eslint-disable-next-line no-restricted-imports
import { drizzle } from 'drizzle-orm/postgres-js'
// eslint-disable-next-line no-restricted-imports
import { eq, and, isNull, sql, gt, lt, lte, or, desc, asc, inArray } from 'drizzle-orm'
// eslint-disable-next-line no-restricted-imports
import postgres from 'postgres'
// eslint-disable-next-line no-restricted-imports
import {
  messengerAgents,
  messengerAgentRuns,
  messengerAgentRunEvents,
  messengerCliSessions,
  messengerSubscriptions,
  messengerAgentModelRouting,
  messengerProjectSkills,
  messengerProjectPlugins,
  messengerAgentTaskCompletions,
} from '../../../../server/db/schema/messenger.ts'
import { readMessengerConfig } from '../config.ts'

export {
  messengerAgents,
  messengerAgentRuns,
  messengerAgentRunEvents,
  messengerCliSessions,
  messengerSubscriptions,
  messengerAgentModelRouting,
  messengerProjectSkills,
  messengerProjectPlugins,
  messengerAgentTaskCompletions,
  eq, and, isNull, sql, gt, lt, lte, or, desc, asc, inArray,
}

const schema = {
  messengerAgents,
  messengerAgentRuns,
  messengerAgentRunEvents,
  messengerCliSessions,
  messengerSubscriptions,
  messengerAgentModelRouting,
  messengerProjectSkills,
  messengerProjectPlugins,
  messengerAgentTaskCompletions,
}
export type IngestDb = ReturnType<typeof drizzle<typeof schema>>

let _db: IngestDb | null = null

export function useIngestDb(): IngestDb {
  if (_db) return _db
  const config = readMessengerConfig()
  const url = config.MESSENGER_DB_URL ?? config.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5433/daria_admin_refactor'
  const client = postgres(url, { max: 5 })
  _db = drizzle(client, { schema })
  return _db
}
