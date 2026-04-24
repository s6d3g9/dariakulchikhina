import { randomUUID } from 'node:crypto'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { useIngestDb, messengerAgents, messengerAgentRuns, messengerAgentRunEvents, messengerCliSessions, eq, and, isNull, sql } from './ingest-db.ts'
import { addAgentMessageToConversation, findConversationById } from '../conversations/conversation-store.ts'
import { findMessengerAgentById } from './agent-store.ts'
import { createRun, isCliAgent } from './agent-run-store.ts'
import { publishSessionDelta } from './orchestration-handler.ts'

// --- event schemas ---

const baseEvent = {
  runId: z.string().uuid(),
  ts: z.string().optional(),
}

const runStartSchema = z.object({ ...baseEvent, type: z.literal('run_start'), prompt: z.string().optional() })
const substateSchema = z.object({ ...baseEvent, type: z.literal('substate'), substate: z.string(), message: z.string().optional() })
const deltaSchema = z.object({ ...baseEvent, type: z.literal('delta'), delta: z.string() })
const toolUseSchema = z.object({ ...baseEvent, type: z.literal('tool_use'), tool: z.string(), toolUseId: z.string().optional(), input: z.unknown().optional() })
const tokensSchema = z.object({
  ...baseEvent,
  type: z.literal('tokens'),
  tokenIn: z.number().int().nonnegative(),
  tokenOut: z.number().int().nonnegative(),
  costUsd: z.number().nonnegative().optional(),
  cacheRead: z.number().int().nonnegative().optional(),
  cacheWrite: z.number().int().nonnegative().optional(),
})
const completeSchema = z.object({ ...baseEvent, type: z.literal('complete'), finalText: z.string().optional() })
const errorSchema = z.object({ ...baseEvent, type: z.literal('error'), message: z.string(), fatal: z.boolean().optional() })
const subagentStartSchema = z.object({
  ...baseEvent,
  type: z.literal('subagent_start'),
  toolUseId: z.string(),
  subagentType: z.string(),
  promptExcerpt: z.string().optional(),
})
const subagentEndSchema = z.object({
  ...baseEvent,
  type: z.literal('subagent_end'),
  toolUseId: z.string(),
  success: z.boolean(),
  message: z.string().optional(),
})

const eventSchema = z.discriminatedUnion('type', [
  runStartSchema,
  substateSchema,
  deltaSchema,
  toolUseSchema,
  tokensSchema,
  completeSchema,
  errorSchema,
  subagentStartSchema,
  subagentEndSchema,
])

type IngestEvent = z.infer<typeof eventSchema>

// --- rate limiter (token bucket, 50 events/sec per agent) ---

const RATE_LIMIT = 50
const rateLimitMap = new Map<string, { tokens: number; lastMs: number }>()

function consumeRateLimit(agentId: string): boolean {
  const now = Date.now()
  let bucket = rateLimitMap.get(agentId)
  if (!bucket) {
    rateLimitMap.set(agentId, { tokens: RATE_LIMIT - 1, lastMs: now })
    return true
  }
  const elapsed = (now - bucket.lastMs) / 1000
  bucket.tokens = Math.min(RATE_LIMIT, bucket.tokens + elapsed * RATE_LIMIT)
  bucket.lastMs = now
  if (bucket.tokens < 1) return false
  bucket.tokens -= 1
  return true
}

// --- subagent tracking ---

// Maps Task tool_use_id -> child agent_run_id for the lifetime of the
// messenger-core process. If messenger-core restarts between subagent_start
// and subagent_end, the child run stays in "running" status; a separate
// sweeper can reap orphans by checking runs where finished_at IS NULL.
const subagentRunMap = new Map<string, string>()

// --- persistence ---

type RunSnapshot = {
  rootRunId: string
  parentRunId: string | null
  conversationId: string | null
  status: string
  tokenInTotal: number
  tokenOutTotal: number
  costUsd: string
}

async function persistEvent(
  db: ReturnType<typeof useIngestDb>,
  agentId: string,
  event: IngestEvent,
): Promise<{ eventId: string; run: RunSnapshot }> {
  // Verify the run exists and belongs to this agent
  const [run] = await db
    .select({
      id: messengerAgentRuns.id,
      status: messengerAgentRuns.status,
      rootRunId: messengerAgentRuns.rootRunId,
      parentRunId: messengerAgentRuns.parentRunId,
      conversationId: messengerAgentRuns.conversationId,
      tokenInTotal: messengerAgentRuns.tokenInTotal,
      tokenOutTotal: messengerAgentRuns.tokenOutTotal,
      costUsd: messengerAgentRuns.costUsd,
    })
    .from(messengerAgentRuns)
    .where(
      and(
        eq(messengerAgentRuns.id, event.runId),
        eq(messengerAgentRuns.agentId, agentId),
        isNull(messengerAgentRuns.deletedAt),
      ),
    )
    .limit(1)

  if (!run) {
    throw Object.assign(new Error('run not found'), { statusCode: 404 })
  }

  // Update run status / totals for lifecycle events
  if (event.type === 'run_start') {
    await db
      .update(messengerAgentRuns)
      .set({ status: 'running', startedAt: new Date() })
      .where(eq(messengerAgentRuns.id, event.runId))
  } else if (event.type === 'complete') {
    const now = new Date()
    await db
      .update(messengerAgentRuns)
      .set({ status: 'completed', finishedAt: now, result: event.finalText ?? null })
      .where(eq(messengerAgentRuns.id, event.runId))
    await db
      .update(messengerCliSessions)
      .set({ status: 'stopped', stoppedAt: now })
      .where(and(eq(messengerCliSessions.runId, event.runId), isNull(messengerCliSessions.deletedAt)))
    // Cascade: close any child subagent runs still marked running — the
    // parent finished cleanly so treat orphans as completed.
    await db
      .update(messengerAgentRuns)
      .set({ status: 'completed', finishedAt: now })
      .where(and(
        eq(messengerAgentRuns.parentRunId, event.runId),
        sql`${messengerAgentRuns.status} IN ('pending','running')`,
        isNull(messengerAgentRuns.deletedAt),
      ))
  } else if (event.type === 'error') {
    const now = new Date()
    await db
      .update(messengerAgentRuns)
      .set({ status: 'failed', finishedAt: now, error: event.message })
      .where(eq(messengerAgentRuns.id, event.runId))
    await db
      .update(messengerCliSessions)
      .set({ status: 'stopped', stoppedAt: now })
      .where(and(eq(messengerCliSessions.runId, event.runId), isNull(messengerCliSessions.deletedAt)))
    // Cascade: parent failed → any open child subagent runs are failed too.
    await db
      .update(messengerAgentRuns)
      .set({ status: 'failed', finishedAt: now, error: 'parent run terminated' })
      .where(and(
        eq(messengerAgentRuns.parentRunId, event.runId),
        sql`${messengerAgentRuns.status} IN ('pending','running')`,
        isNull(messengerAgentRuns.deletedAt),
      ))
  } else if (event.type === 'tokens') {
    const costIncrement = event.costUsd?.toFixed(8) ?? '0'
    await db
      .update(messengerAgentRuns)
      .set({
        tokenInTotal: sql`${messengerAgentRuns.tokenInTotal} + ${event.tokenIn}`,
        tokenOutTotal: sql`${messengerAgentRuns.tokenOutTotal} + ${event.tokenOut}`,
        costUsd: sql`${messengerAgentRuns.costUsd} + ${costIncrement}::numeric`,
      })
      .where(eq(messengerAgentRuns.id, event.runId))
  }

  // Subagent lifecycle: create/update a child agent_run linked by
  // toolUseId. The event row itself lands on the PARENT run's timeline
  // (so the session trace shows it in sequence); the `childRunId` is
  // stitched into the payload so the UI can link to the child's events.
  let childRunId: string | null = null
  if (event.type === 'subagent_start') {
    if (!run.conversationId) {
      throw Object.assign(new Error('parent run has no conversation'), { statusCode: 400 })
    }
    const created = await createRun({
      agentId,
      conversationId: run.conversationId,
      parentRunId: event.runId,
      spawnedByAgentId: agentId,
      prompt: event.promptExcerpt,
    })
    childRunId = created.runId
    await db
      .update(messengerAgentRuns)
      .set({ status: 'running', startedAt: new Date() })
      .where(eq(messengerAgentRuns.id, childRunId))
    subagentRunMap.set(event.toolUseId, childRunId)
  } else if (event.type === 'subagent_end') {
    childRunId = subagentRunMap.get(event.toolUseId) ?? null
    if (childRunId) {
      const now = new Date()
      await db
        .update(messengerAgentRuns)
        .set({
          status: event.success ? 'completed' : 'failed',
          finishedAt: now,
          result: event.success ? (event.message ?? null) : null,
          error: event.success ? null : (event.message ?? 'subagent failed'),
        })
        .where(eq(messengerAgentRuns.id, childRunId))
      subagentRunMap.delete(event.toolUseId)
    }
  }

  // Insert event row
  const eventId = randomUUID()
  let substate: string | null = null
  let tokenIn: number | null = null
  let tokenOut: number | null = null
  let message: string | null = null

  if (event.type === 'substate') {
    substate = event.substate
    message = event.message ?? null
  } else if (event.type === 'tokens') {
    tokenIn = event.tokenIn
    tokenOut = event.tokenOut
  } else if (event.type === 'error') {
    message = event.message
  } else if (event.type === 'delta') {
    message = event.delta
  } else if (event.type === 'tool_use') {
    message = event.tool
  } else if (event.type === 'subagent_start') {
    message = event.subagentType
  } else if (event.type === 'subagent_end') {
    message = event.success ? null : (event.message ?? 'subagent failed')
  }

  const payload: Record<string, unknown> = childRunId
    ? { ...event, childRunId }
    : (event as Record<string, unknown>)

  await db.insert(messengerAgentRunEvents).values({
    id: eventId,
    runId: event.runId,
    occurredAt: event.ts ? new Date(event.ts) : new Date(),
    substate,
    tokenIn,
    tokenOut,
    message,
    payload,
  })

  // Re-fetch updated totals for broadcast payload
  const [updated] = await db
    .select({
      status: messengerAgentRuns.status,
      rootRunId: messengerAgentRuns.rootRunId,
      parentRunId: messengerAgentRuns.parentRunId,
      conversationId: messengerAgentRuns.conversationId,
      tokenInTotal: messengerAgentRuns.tokenInTotal,
      tokenOutTotal: messengerAgentRuns.tokenOutTotal,
      costUsd: messengerAgentRuns.costUsd,
    })
    .from(messengerAgentRuns)
    .where(eq(messengerAgentRuns.id, event.runId))
    .limit(1)

  return {
    eventId,
    run: {
      rootRunId: (updated?.rootRunId ?? run.rootRunId) ?? event.runId,
      parentRunId: (updated?.parentRunId ?? run.parentRunId) ?? null,
      conversationId: (updated?.conversationId ?? run.conversationId) ?? null,
      status: updated?.status ?? run.status,
      tokenInTotal: updated?.tokenInTotal ?? run.tokenInTotal,
      tokenOutTotal: updated?.tokenOutTotal ?? run.tokenOutTotal,
      costUsd: updated?.costUsd ?? run.costUsd ?? '0',
    },
  }
}

// --- route registration ---

export function registerIngestRoutes(
  app: FastifyInstance,
  broadcastToChannel: (channel: string, event: Record<string, unknown>) => void,
  emitToUsers?: (userIds: string[], event: Record<string, unknown>) => void,
) {
  const db = useIngestDb()

  app.post<{ Params: { agentId: string } }>(
    '/agents/:agentId/stream',
    async (request, reply) => {
      const { agentId } = request.params

      // Auth: Bearer token must match ingest_token
      const authHeader = request.headers.authorization ?? ''
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
      if (!token) {
        return reply.code(401).send({ error: 'UNAUTHORIZED' })
      }

      const [agent] = await db
        .select({ id: messengerAgents.id })
        .from(messengerAgents)
        .where(
          and(
            eq(messengerAgents.id, agentId),
            eq(messengerAgents.ingestToken, token),
            isNull(messengerAgents.deletedAt),
          ),
        )
        .limit(1)

      if (!agent) {
        return reply.code(401).send({ error: 'UNAUTHORIZED' })
      }

      // Rate limit
      if (!consumeRateLimit(agentId)) {
        return reply.code(429).send({ error: 'RATE_LIMIT_EXCEEDED' })
      }

      // Parse body
      const parsed = eventSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.code(400).send({ error: 'INVALID_PAYLOAD', issues: parsed.error.issues })
      }

      const event = parsed.data

      // Validate tokens non-negative (Zod already enforces this, but explicit check for clarity)
      if (event.type === 'tokens' && (event.tokenIn < 0 || event.tokenOut < 0)) {
        return reply.code(400).send({ error: 'INVALID_TOKEN_COUNTS' })
      }

      try {
        const { eventId: persistedEventId, run } = await persistEvent(db, agentId, event)
        const substate = event.type === 'substate' ? event.substate : undefined
        const agentTreePayload = {
          runId: event.runId,
          parentRunId: run.parentRunId,
          status: run.status,
          substate,
          tokenInTotal: run.tokenInTotal,
          tokenOutTotal: run.tokenOutTotal,
          costUsd: run.costUsd,
        }

        if (event.type === 'complete' && event.finalText && run.conversationId) {
          // Save agent message to conversation BEFORE broadcasting complete so that
          // loadMessages() triggered by the frontend on receiving complete always
          // finds the message already in the DB (no race condition).
          try {
            const [agent, cliAgent] = await Promise.all([
              findMessengerAgentById(agentId),
              isCliAgent(agentId),
            ])
            if (agent) {
              // Store only the final text; reasoning/tool-use trace lives in
              // run events and is fetched on-demand by the message UI when the
              // user expands the plate attached to this message.
              await addAgentMessageToConversation(run.conversationId, agent, event.finalText, { plaintext: cliAgent, runId: event.runId })
              if (emitToUsers) {
                const conversation = await findConversationById(run.conversationId)
                if (conversation) {
                  const ts = new Date().toISOString()
                  const participants = [conversation.userAId, conversation.userBId].filter(Boolean)
                  emitToUsers(participants, { type: 'conversations.updated', conversationId: conversation.id, timestamp: ts })
                  emitToUsers(participants, { type: 'messages.updated', conversationId: conversation.id, timestamp: ts })
                }
              }
            }
          } catch (err2) {
            request.log.warn(err2, 'ingest: failed to save agent reply to conversation')
          }
        }

        // Broadcast after message is saved so frontend loadMessages() sees it immediately
        broadcastToChannel(`agent-stream:${agentId}`, { ...event, persistedEventId })
        broadcastToChannel(`agent-tree:${run.rootRunId}`, agentTreePayload)

        // Fan out cli-session level delta so the monitoring dropdown refreshes
        // without polling. Reason `stopped` for terminal events, otherwise `event`.
        try {
          let sessionSlug: string | null = null
          try {
            const [cliRow] = await db
              .select({ slug: messengerCliSessions.slug })
              .from(messengerCliSessions)
              .where(and(eq(messengerCliSessions.runId, event.runId), isNull(messengerCliSessions.deletedAt)))
              .limit(1)
            sessionSlug = cliRow?.slug ?? null
          } catch {}
          if (sessionSlug) {
            const terminal = event.type === 'complete' || event.type === 'error'
            publishSessionDelta({
              slug: sessionSlug,
              reason: terminal ? 'stopped' : 'event',
              ts: new Date().toISOString(),
              agentId,
              runId: event.runId,
              substate: event.type === 'substate' ? event.substate : null,
              tool: event.type === 'tool_use' ? event.tool : null,
              tokenIn: event.type === 'tokens' ? event.tokenIn : undefined,
              tokenOut: event.type === 'tokens' ? event.tokenOut : undefined,
              message: event.type === 'substate' ? (event.message ?? null)
                : event.type === 'error' ? event.message
                : null,
            })
          }
        } catch (err3) {
          request.log.warn(err3, 'ingest: session delta fan-out failed')
        }

        return { persistedEventId }
      } catch (err: unknown) {
        const e = err as { statusCode?: number; message?: string }
        if (e.statusCode === 404) {
          return reply.code(404).send({ error: 'RUN_NOT_FOUND' })
        }
        request.log.error(err, 'ingest persistence failed')
        return reply.code(500).send({ error: 'INTERNAL_ERROR' })
      }
    },
  )
}
