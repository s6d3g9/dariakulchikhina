import { randomUUID } from 'node:crypto'
import {
  useIngestDb,
  messengerAgentRuns,
  eq,
  isNull,
  and,
  sql,
  desc,
  lt,
  or,
  lte,
} from './ingest-db.ts'
import { encodeCursor, decodeCursor } from '../shared/cursor.ts'

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
  conversationId?: string
  agentId: string
  parentRunId?: string
  rootRunId?: string
  spawnedByAgentId?: string
  costUsd?: string
  tokenInTotal?: number
  tokenOutTotal?: number
  attachmentIds?: string[]
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

export async function createRun(input: {
  agentId: string
  conversationId: string
  parentRunId?: string
  spawnedByAgentId?: string
  prompt?: string
  attachmentIds?: string[]
}): Promise<{ runId: string; rootRunId: string }> {
  const db = useIngestDb()
  const runId = randomUUID()

  let rootRunId = runId
  if (input.parentRunId) {
    const [parent] = await db
      .select({ rootRunId: messengerAgentRuns.rootRunId })
      .from(messengerAgentRuns)
      .where(and(eq(messengerAgentRuns.id, input.parentRunId), isNull(messengerAgentRuns.deletedAt)))
      .limit(1)
    if (parent?.rootRunId) {
      rootRunId = parent.rootRunId as typeof runId
    }
  }

  await db.insert(messengerAgentRuns).values({
    id: runId,
    agentId: input.agentId,
    conversationId: input.conversationId,
    parentRunId: input.parentRunId ?? null,
    rootRunId,
    spawnedByAgentId: input.spawnedByAgentId ?? null,
    prompt: input.prompt ?? null,
    attachmentIds: input.attachmentIds ?? [],
    status: 'pending',
  })

  return { runId, rootRunId }
}

export async function listSubtree(
  rootRunId: string,
  cursor?: string | null,
  limit = 100,
): Promise<{ items: Array<{ runId: string; parentRunId: string | null; rootRunId: string; status: string; agentId: string; tokenInTotal: number; tokenOutTotal: number; costUsd: string; createdAt: string }>; nextCursor: string | null }> {
  const db = useIngestDb()
  const clampedLimit = Math.min(Math.max(limit, 1), 200)
  const decoded = decodeCursor(cursor)

  const baseConditions = [
    eq(messengerAgentRuns.rootRunId, rootRunId),
    isNull(messengerAgentRuns.deletedAt),
  ]

  const rows = await db
    .select({
      id: messengerAgentRuns.id,
      parentRunId: messengerAgentRuns.parentRunId,
      rootRunId: messengerAgentRuns.rootRunId,
      status: messengerAgentRuns.status,
      agentId: messengerAgentRuns.agentId,
      tokenInTotal: messengerAgentRuns.tokenInTotal,
      tokenOutTotal: messengerAgentRuns.tokenOutTotal,
      costUsd: messengerAgentRuns.costUsd,
      createdAt: messengerAgentRuns.createdAt,
    })
    .from(messengerAgentRuns)
    .where(
      decoded
        ? and(
            ...baseConditions,
            or(
              lt(messengerAgentRuns.createdAt, new Date(decoded.createdAt)),
              and(
                lte(messengerAgentRuns.createdAt, new Date(decoded.createdAt)),
                lt(messengerAgentRuns.id, decoded.id),
              ),
            ),
          )
        : and(...baseConditions),
    )
    .orderBy(desc(messengerAgentRuns.createdAt), desc(messengerAgentRuns.id))
    .limit(clampedLimit + 1)

  const hasMore = rows.length > clampedLimit
  const sliced = hasMore ? rows.slice(0, clampedLimit) : rows
  const last = sliced[sliced.length - 1]
  const nextCursor =
    hasMore && last
      ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id })
      : null

  return {
    items: sliced.map((r) => ({
      runId: r.id,
      parentRunId: r.parentRunId ?? null,
      rootRunId: r.rootRunId ?? rootRunId,
      status: r.status,
      agentId: r.agentId,
      tokenInTotal: r.tokenInTotal,
      tokenOutTotal: r.tokenOutTotal,
      costUsd: r.costUsd ?? '0',
      createdAt: r.createdAt.toISOString(),
    })),
    nextCursor,
  }
}

export async function updateTotals(
  runId: string,
  totals: { tokenIn: number; tokenOut: number; costUsd: number },
): Promise<void> {
  const db = useIngestDb()
  await db
    .update(messengerAgentRuns)
    .set({
      tokenInTotal: totals.tokenIn,
      tokenOutTotal: totals.tokenOut,
      costUsd: totals.costUsd.toFixed(8),
    })
    .where(eq(messengerAgentRuns.id, runId))
}
