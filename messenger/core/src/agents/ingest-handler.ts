import { randomUUID } from 'node:crypto'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { useIngestDb, messengerAgents, messengerAgentRuns, messengerAgentRunEvents, eq, and, isNull, sql } from './ingest-db.ts'
import { addAgentMessageToConversation, findConversationById } from '../conversations/conversation-store.ts'
import { findMessengerAgentById } from './agent-store.ts'
import { isCliAgent } from './agent-run-store.ts'

// --- event schemas ---

const baseEvent = {
  runId: z.string().uuid(),
  ts: z.string().optional(),
}

const runStartSchema = z.object({ ...baseEvent, type: z.literal('run_start'), prompt: z.string().optional() })
const substateSchema = z.object({ ...baseEvent, type: z.literal('substate'), substate: z.string(), message: z.string().optional() })
const deltaSchema = z.object({ ...baseEvent, type: z.literal('delta'), delta: z.string() })
const toolUseSchema = z.object({ ...baseEvent, type: z.literal('tool_use'), tool: z.string(), input: z.unknown().optional() })
const tokensSchema = z.object({
  ...baseEvent,
  type: z.literal('tokens'),
  tokenIn: z.number().int().nonnegative(),
  tokenOut: z.number().int().nonnegative(),
  costUsd: z.number().nonnegative().optional(),
})
const completeSchema = z.object({ ...baseEvent, type: z.literal('complete'), finalText: z.string().optional() })
const errorSchema = z.object({ ...baseEvent, type: z.literal('error'), message: z.string(), fatal: z.boolean().optional() })

const eventSchema = z.discriminatedUnion('type', [
  runStartSchema,
  substateSchema,
  deltaSchema,
  toolUseSchema,
  tokensSchema,
  completeSchema,
  errorSchema,
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
    await db
      .update(messengerAgentRuns)
      .set({ status: 'completed', finishedAt: new Date(), result: event.finalText ?? null })
      .where(eq(messengerAgentRuns.id, event.runId))
  } else if (event.type === 'error') {
    await db
      .update(messengerAgentRuns)
      .set({ status: 'failed', finishedAt: new Date(), error: event.message })
      .where(eq(messengerAgentRuns.id, event.runId))
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
  }

  await db.insert(messengerAgentRunEvents).values({
    id: eventId,
    runId: event.runId,
    occurredAt: event.ts ? new Date(event.ts) : new Date(),
    substate,
    tokenIn,
    tokenOut,
    message,
    payload: event as Record<string, unknown>,
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
        broadcastToChannel(`agent-stream:${agentId}`, { ...event, persistedEventId })
        const substate = event.type === 'substate' ? event.substate : undefined
        broadcastToChannel(`agent-tree:${run.rootRunId}`, {
          runId: event.runId,
          parentRunId: run.parentRunId,
          status: run.status,
          substate,
          tokenInTotal: run.tokenInTotal,
          tokenOutTotal: run.tokenOutTotal,
          costUsd: run.costUsd,
        })

        if (event.type === 'complete' && event.finalText && run.conversationId) {
          try {
            const [agent, cliAgent] = await Promise.all([
              findMessengerAgentById(agentId),
              isCliAgent(agentId),
            ])
            if (agent) {
              await addAgentMessageToConversation(run.conversationId, agent, event.finalText, { plaintext: cliAgent })
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
