import { and, eq, isNull, useIngestDb, messengerAgents } from './ingest-db.ts'

// Mirror AgentRow shape from agent-registry.repository — derived from the same table.
export type ChatAgentRow = typeof messengerAgents.$inferSelect

/**
 * Extended config stored in the jsonb `config` column of messenger_agents.
 * Fields here extend the core registry row with messenger-UI-specific metadata.
 */
interface AgentConfig {
  login?: string
  greeting?: string
  prompts?: string[]
  systemPrompt?: string
  modelOptions?: string[]
  claudeSessionSlug?: string
}

/** Consumer-facing shape expected by agent-store and downstream callers. */
export interface ChatAgentRecord {
  id: string
  login: string
  displayName: string
  description: string
  greeting: string
  prompts: string[]
  systemPrompt: string
  modelOptions: string[]
  claudeSessionSlug?: string
}

function rowToRecord(row: ChatAgentRow): ChatAgentRecord {
  const cfg = (row.config ?? {}) as AgentConfig
  return {
    id: row.id,
    login: cfg.login ?? `agent.${row.name.toLowerCase().replace(/\s+/g, '-')}`,
    displayName: row.name,
    description: row.description ?? '',
    greeting: cfg.greeting ?? '',
    prompts: Array.isArray(cfg.prompts) ? cfg.prompts : [],
    systemPrompt: cfg.systemPrompt ?? '',
    modelOptions: Array.isArray(cfg.modelOptions)
      ? cfg.modelOptions
      : row.model
        ? [row.model]
        : [],
    ...(cfg.claudeSessionSlug ? { claudeSessionSlug: cfg.claudeSessionSlug } : {}),
  }
}

/** Return all non-deleted agents from the registry, mapped to consumer records. */
export async function listChatAgents(): Promise<ChatAgentRecord[]> {
  const db = useIngestDb()
  const rows = await db
    .select()
    .from(messengerAgents)
    .where(isNull(messengerAgents.deletedAt))
  return rows.map(rowToRecord)
}

/** Find a single non-deleted agent by id. Returns null when not found. */
export async function findChatAgentById(id: string): Promise<ChatAgentRecord | null> {
  const db = useIngestDb()
  const [row] = await db
    .select()
    .from(messengerAgents)
    .where(and(eq(messengerAgents.id, id), isNull(messengerAgents.deletedAt)))
    .limit(1)
  return row ? rowToRecord(row) : null
}
