import { randomUUID, timingSafeEqual } from 'node:crypto'
import { hostname } from 'node:os'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { readMessengerConfig } from '../config.ts'
import {
  useIngestDb,
  messengerAgents,
  messengerAgentRuns,
  eq,
  and,
  isNull,
  sql,
  desc,
  or,
} from './ingest-db.ts'
// eslint-disable-next-line no-restricted-imports
import { messengerConversations } from '../../../../server/db/schema/messenger.ts'

function verifyBridgeToken(authHeader: string | undefined, expected: string): boolean {
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!token || !expected) return false
  const tBuf = Buffer.from(token)
  const eBuf = Buffer.from(expected)
  if (tBuf.length !== eBuf.length) return false
  return timingSafeEqual(tBuf, eBuf)
}

const provisionBodySchema = z.object({
  sessionId: z.string().uuid(),
  sessionStartedAt: z.string().optional(),
})

export function registerHostSessionRoutes(app: FastifyInstance) {
  const config = readMessengerConfig()
  const bridgeToken = config.HOST_BRIDGE_TOKEN
  const ownerUserId = config.HOST_BRIDGE_OWNER_USER_ID

  if (!bridgeToken || !ownerUserId) {
    app.log.warn('HOST_BRIDGE_TOKEN or HOST_BRIDGE_OWNER_USER_ID not set — host-session routes disabled')
    return
  }

  app.post('/agents/host-session/provision', async (request, reply) => {
    if (!verifyBridgeToken(request.headers.authorization, bridgeToken)) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }

    const parsed = provisionBodySchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'INVALID_PAYLOAD', issues: parsed.error.issues })
    }

    const { sessionId } = parsed.data
    const db = useIngestDb()

    const result = await db.transaction(async (tx) => {
      const [existingAgent] = await tx
        .select({
          id: messengerAgents.id,
          ingestToken: messengerAgents.ingestToken,
        })
        .from(messengerAgents)
        .where(
          and(
            sql`${messengerAgents.config}->>'sessionId' = ${sessionId}`,
            sql`${messengerAgents.config}->>'type' = 'host-session'`,
            isNull(messengerAgents.deletedAt),
          ),
        )
        .limit(1)

      if (existingAgent) {
        const [existingConv] = await tx
          .select({ id: messengerConversations.id })
          .from(messengerConversations)
          .where(
            and(
              eq(messengerConversations.kind, 'agent'),
              eq(messengerConversations.userAId, ownerUserId),
              sql`${messengerConversations.policy}->>'_agentId' = ${existingAgent.id}`,
              isNull(messengerConversations.deletedAt),
            ),
          )
          .limit(1)

        const convId = existingConv?.id ?? null

        const [latestRun] = await tx
          .select({ id: messengerAgentRuns.id, status: messengerAgentRuns.status })
          .from(messengerAgentRuns)
          .where(
            and(
              eq(messengerAgentRuns.agentId, existingAgent.id),
              isNull(messengerAgentRuns.deletedAt),
            ),
          )
          .orderBy(desc(messengerAgentRuns.createdAt))
          .limit(1)

        let runId: string
        if (latestRun && latestRun.status === 'running') {
          runId = latestRun.id
        } else {
          runId = randomUUID()
          await tx.insert(messengerAgentRuns).values({
            id: runId,
            agentId: existingAgent.id,
            conversationId: convId!,
            rootRunId: runId,
            status: 'running',
            prompt: `host session ${sessionId}`,
            startedAt: new Date(),
          })
        }

        return {
          agentId: existingAgent.id,
          conversationId: convId,
          runId,
          ingestToken: existingAgent.ingestToken,
        }
      }

      // Create new agent + conversation + run
      const agentId = randomUUID()
      const ingestToken = randomUUID()
      const now = new Date()

      await tx.insert(messengerAgents).values({
        id: agentId,
        ownerUserId,
        name: `Host Session ${sessionId.slice(0, 8)}`,
        ingestToken,
        config: {
          type: 'host-session',
          sessionId,
          host: hostname(),
        },
        createdAt: now,
        updatedAt: now,
      })

      const agentPolicy = {
        secret: false,
        allowMutualDelete: false,
        encryptedMessages: false,
        encryptedAttachments: false,
        encryptedVoice: false,
        callsSecurityMode: 'webrtc-only',
        allowForwardOut: true,
        hideListPreview: false,
        _agentId: agentId,
      }

      const [conv] = await tx
        .insert(messengerConversations)
        .values({
          kind: 'agent',
          userAId: ownerUserId,
          userBId: null,
          policy: agentPolicy,
          createdAt: now,
          updatedAt: now,
        })
        .returning({ id: messengerConversations.id })

      const runId = randomUUID()
      await tx.insert(messengerAgentRuns).values({
        id: runId,
        agentId,
        conversationId: conv.id,
        rootRunId: runId,
        status: 'running',
        prompt: `host session ${sessionId}`,
        startedAt: now,
      })

      return {
        agentId,
        conversationId: conv.id,
        runId,
        ingestToken,
      }
    })

    return reply.code(200).send(result)
  })

  app.patch<{ Params: { sessionId: string } }>(
    '/agents/host-session/:sessionId/complete',
    async (request, reply) => {
      if (!verifyBridgeToken(request.headers.authorization, bridgeToken)) {
        return reply.code(401).send({ error: 'UNAUTHORIZED' })
      }

      const { sessionId } = request.params
      if (!sessionId) {
        return reply.code(400).send({ error: 'INVALID_PARAMS' })
      }

      const db = useIngestDb()

      const [agent] = await db
        .select({ id: messengerAgents.id })
        .from(messengerAgents)
        .where(
          and(
            sql`${messengerAgents.config}->>'sessionId' = ${sessionId}`,
            sql`${messengerAgents.config}->>'type' = 'host-session'`,
            isNull(messengerAgents.deletedAt),
          ),
        )
        .limit(1)

      if (!agent) {
        return reply.code(404).send({ error: 'AGENT_NOT_FOUND' })
      }

      const [runningRun] = await db
        .select({ id: messengerAgentRuns.id })
        .from(messengerAgentRuns)
        .where(
          and(
            eq(messengerAgentRuns.agentId, agent.id),
            or(
              eq(messengerAgentRuns.status, 'running'),
              eq(messengerAgentRuns.status, 'pending'),
            ),
            isNull(messengerAgentRuns.deletedAt),
          ),
        )
        .orderBy(desc(messengerAgentRuns.createdAt))
        .limit(1)

      if (!runningRun) {
        return reply.code(200).send({ ok: true, note: 'no active run' })
      }

      await db
        .update(messengerAgentRuns)
        .set({ status: 'completed', finishedAt: new Date() })
        .where(eq(messengerAgentRuns.id, runningRun.id))

      return reply.code(200).send({ ok: true, runId: runningRun.id })
    },
  )
}
