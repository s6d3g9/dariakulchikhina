import { randomUUID } from 'node:crypto'
import { useIngestDb, messengerAgentRuns, messengerAgentRunEvents, eq, and, isNull } from './ingest-db.ts'
// eslint-disable-next-line no-restricted-imports
import { lt, gt, or, asc, desc } from 'drizzle-orm'

export interface MessengerAgentRunArtifactRecord {
  kind: 'consultation' | 'file' | 'summary'
  label: string
  content: string
  agentId?: string
}

export interface MessengerAgentRunEventRecord {
  phase: 'started' | 'context' | 'files' | 'consulting' | 'reasoning' | 'completed' | 'failed'
  status: 'running' | 'completed' | 'failed'
  summary: string
  focus?: string
  activeTargetAgentIds: string[]
  fileNames: string[]
  artifacts: MessengerAgentRunArtifactRecord[]
  timestamp: string
}

export interface MessengerAgentRunRecord {
  runId: string
  parentRunId?: string
  conversationId?: string
  agentId: string
  status: 'running' | 'completed' | 'failed'
  startedAt: string
  updatedAt: string
  events: MessengerAgentRunEventRecord[]
}

export interface MessengerAgentEdgePayloadRecord {
  sourceAgentId: string
  targetAgentId: string
  mode: 'review' | 'enrich' | 'validate' | 'summarize' | 'route'
  payloadPreview: string
  runId: string
  conversationId?: string
  timestamp: string
}

const MAX_RUNS = 120
const MAX_EVENTS_PER_RUN = 40

const _runs: MessengerAgentRunRecord[] = []

export async function appendMessengerAgentRunEvent(input: {
  runId: string
  conversationId?: string
  agentId: string
  phase: MessengerAgentRunEventRecord['phase']
  status: MessengerAgentRunEventRecord['status']
  summary: string
  focus?: string
  activeTargetAgentIds?: string[]
  fileNames?: string[]
  artifacts?: MessengerAgentRunArtifactRecord[]
  timestamp?: string
}) {
  const timestamp = input.timestamp || new Date().toISOString()
  const event: MessengerAgentRunEventRecord = {
    phase: input.phase,
    status: input.status,
    summary: input.summary,
    focus: input.focus,
    activeTargetAgentIds: [...(input.activeTargetAgentIds || [])],
    fileNames: [...(input.fileNames || [])],
    artifacts: [...(input.artifacts || [])],
    timestamp,
  }

  const existingIndex = _runs.findIndex(run => run.runId === input.runId)
  if (existingIndex === -1) {
    _runs.unshift({
      runId: input.runId,
      conversationId: input.conversationId,
      agentId: input.agentId,
      status: input.status,
      startedAt: timestamp,
      updatedAt: timestamp,
      events: [event],
    })
  } else {
    const current = _runs[existingIndex]
    _runs[existingIndex] = {
      ...current,
      conversationId: input.conversationId || current.conversationId,
      status: input.status,
      updatedAt: timestamp,
      events: [...current.events, event].slice(-MAX_EVENTS_PER_RUN),
    }
  }

  _runs.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  if (_runs.length > MAX_RUNS) {
    _runs.splice(MAX_RUNS)
  }
}

export async function listMessengerAgentRuns(input: {
  agentId?: string
  limit?: number
}) {
  const limit = Math.min(Math.max(input.limit || 10, 1), 30)
  return _runs
    .filter(run => !input.agentId || run.agentId === input.agentId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, limit)
}

export async function getMessengerAgentRunById(runId: string) {
  return _runs.find(run => run.runId === runId) ?? null
}

export async function createMessengerAgentRun(input: {
  agentId: string
  parentRunId?: string
  prompt?: string
  model?: string
}): Promise<string> {
  const db = useIngestDb()
  const runId = randomUUID()
  await db.insert(messengerAgentRuns).values({
    id: runId,
    agentId: input.agentId,
    parentRunId: input.parentRunId ?? null,
    status: 'pending',
    prompt: input.prompt ?? null,
    model: input.model ?? null,
  })
  return runId
}

export async function updateMessengerAgentRunStatus(
  runId: string,
  status: string,
): Promise<void> {
  const db = useIngestDb()
  await db
    .update(messengerAgentRuns)
    .set({ status })
    .where(eq(messengerAgentRuns.id, runId))
}

export async function listMessengerAgentRunSubtree(input: {
  agentId: string
  rootRunId: string
  cursor?: string
  limit?: number
}): Promise<{ items: Array<typeof messengerAgentRuns.$inferSelect>; nextCursor: string | null }> {
  const db = useIngestDb()
  const limit = Math.min(Math.max(input.limit || 20, 1), 100)

  const conditions = [
    eq(messengerAgentRuns.agentId, input.agentId),
    isNull(messengerAgentRuns.deletedAt),
    or(
      eq(messengerAgentRuns.id, input.rootRunId),
      eq(messengerAgentRuns.parentRunId, input.rootRunId),
    ),
  ]
  if (input.cursor) {
    conditions.push(lt(messengerAgentRuns.createdAt, new Date(input.cursor)))
  }

  const rows = await db
    .select()
    .from(messengerAgentRuns)
    .where(and(...conditions))
    .orderBy(desc(messengerAgentRuns.createdAt))
    .limit(limit + 1)

  const hasMore = rows.length > limit
  const items = hasMore ? rows.slice(0, limit) : rows
  const nextCursor = hasMore ? items[items.length - 1].createdAt?.toISOString() ?? null : null
  return { items, nextCursor }
}

export async function listMessengerAgentRunEventsPaginated(input: {
  runId: string
  cursor?: string
  limit?: number
}): Promise<{ items: Array<typeof messengerAgentRunEvents.$inferSelect>; nextCursor: string | null }> {
  const db = useIngestDb()
  const limit = Math.min(Math.max(input.limit || 50, 1), 200)

  const conditions = [eq(messengerAgentRunEvents.runId, input.runId)]
  if (input.cursor) {
    conditions.push(gt(messengerAgentRunEvents.occurredAt, new Date(input.cursor)))
  }

  const rows = await db
    .select()
    .from(messengerAgentRunEvents)
    .where(and(...conditions))
    .orderBy(asc(messengerAgentRunEvents.occurredAt))
    .limit(limit + 1)

  const hasMore = rows.length > limit
  const items = hasMore ? rows.slice(0, limit) : rows
  const nextCursor = hasMore ? items[items.length - 1].occurredAt.toISOString() : null
  return { items, nextCursor }
}

export async function listMessengerAgentEdgePayloads(input: {
  agentId?: string
  limit?: number
}) {
  const limit = Math.min(Math.max(input.limit || 24, 1), 80)
  const edgePayloads: MessengerAgentEdgePayloadRecord[] = []

  for (const run of _runs) {
    if (input.agentId && run.agentId !== input.agentId) continue

    for (const event of run.events) {
      for (const artifact of event.artifacts) {
        if (artifact.kind !== 'consultation' || !artifact.agentId) continue

        const connection = (event as MessengerAgentRunEventRecord & {
          activeConnections?: Array<{
            targetAgentId: string
            mode: 'review' | 'enrich' | 'validate' | 'summarize' | 'route'
            payloadPreview?: string
          }>
        }).activeConnections?.find(item => item.targetAgentId === artifact.agentId)

        edgePayloads.push({
          sourceAgentId: run.agentId,
          targetAgentId: artifact.agentId,
          mode: connection?.mode || 'review',
          payloadPreview: connection?.payloadPreview || artifact.content,
          runId: run.runId,
          conversationId: run.conversationId,
          timestamp: event.timestamp,
        })
      }
    }
  }

  return edgePayloads
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, limit)
}
