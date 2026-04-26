import { randomUUID, timingSafeEqual } from 'node:crypto'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { readMessengerConfig } from '../config.ts'
import { readBearerToken, verifyMessengerToken } from '../auth/auth.ts'
import {
  useIngestDb,
  messengerAgents,
  messengerAgentRuns,
  eq,
  and,
  isNull,
  sql,
  desc,
} from './ingest-db.ts'
// eslint-disable-next-line no-restricted-imports
import { messengerConversations } from '../../../../server/db/schema/messenger.ts'
// eslint-disable-next-line no-restricted-imports
import { messengerProjects } from '../../../../server/db/schema/messenger-projects.ts'

function verifyBridgeToken(authHeader: string | undefined, expected: string): boolean {
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!token || !expected) return false
  const tBuf = Buffer.from(token)
  const eBuf = Buffer.from(expected)
  if (tBuf.length !== eBuf.length) return false
  return timingSafeEqual(tBuf, eBuf)
}

function resolveSessionAuth(request: FastifyRequest) {
  const config = readMessengerConfig()
  let token = readBearerToken(request.headers.authorization ?? '')
  if (!token) {
    const q = (request.query ?? {}) as { token?: string }
    if (typeof q.token === 'string' && q.token) token = q.token
  }
  if (!token) return null
  return verifyMessengerToken(token, config.MESSENGER_CORE_AUTH_SECRET)
}

// W4 contract: every provision call MUST carry an explicit `ownerUserId` AND
// `projectId`. The bridge client (clicore2messenger host-supervisor) is now
// the single source of truth for both — no env fallback, no JSON-mapping file.
// The previous `~/.host-bridge-projects.json` lookup and the
// `HOST_BRIDGE_OWNER_USER_ID` server-side default were removed in W4 because
// they let the system silently provision agents with a NULL project, which
// W1 / W2 explicitly forbid.
const provisionBodySchema = z.object({
  sessionId: z.string().uuid(),
  ownerUserId: z.string().uuid(),
  projectId: z.string().uuid(),
  cwd: z.string().min(1),
  hostname: z.string().min(1),
  gitBranch: z.string().optional(),
  sessionVersion: z.string().optional(),
  sessionStartedAt: z.string().optional(),
})

const completeBodySchema = z.object({
  reason: z.enum(['idle', 'rotated', 'shutdown']).optional(),
})

export function registerHostSessionRoutes(app: FastifyInstance) {
  const config = readMessengerConfig()
  const bridgeToken = config.HOST_BRIDGE_TOKEN

  if (!bridgeToken) {
    app.log.warn('HOST_BRIDGE_TOKEN not set — host-session routes disabled')
    return
  }

  app.post('/agents/host-session/provision', async (request, reply) => {
    if (!verifyBridgeToken(request.headers.authorization, bridgeToken)) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }

    // Pre-parse so we can return precise error codes for the two new
    // required fields. The bridge client treats these as fail-fast — there
    // is no graceful degradation to a NULL project.
    const rawBody = (request.body ?? {}) as Record<string, unknown>
    if (typeof rawBody.ownerUserId !== 'string' || rawBody.ownerUserId.length === 0) {
      return reply.code(400).send({ error: 'OWNER_USER_ID_REQUIRED' })
    }
    if (typeof rawBody.projectId !== 'string' || rawBody.projectId.length === 0) {
      return reply.code(400).send({ error: 'PROJECT_ID_REQUIRED' })
    }

    const parsed = provisionBodySchema.safeParse(rawBody)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'INVALID_PAYLOAD', issues: parsed.error.issues })
    }

    const {
      sessionId,
      ownerUserId,
      projectId,
      cwd,
      hostname,
      gitBranch,
      sessionVersion,
      sessionStartedAt,
    } = parsed.data

    if (!cwd.startsWith('/') || cwd.includes('..')) {
      return reply.code(400).send({ error: 'INVALID_CWD' })
    }

    const projectKey = cwd.split('/').filter(Boolean).pop() ?? 'home'
    const db = useIngestDb()

    // Validate the project exists, is owned by the caller, and is not
    // soft-deleted. A 404 here is a hard fail — the operator must
    // re-check the --project-id they passed to the supervisor.
    const [projectRow] = await db
      .select({ id: messengerProjects.id })
      .from(messengerProjects)
      .where(
        and(
          eq(messengerProjects.id, projectId),
          eq(messengerProjects.ownerUserId, ownerUserId),
          isNull(messengerProjects.deletedAt),
        ),
      )
      .limit(1)
    if (!projectRow) {
      return reply.code(404).send({ error: 'PROJECT_NOT_FOUND' })
    }

    const result = await db.transaction(async (tx) => {
      // One project-agent per (hostname × cwd × ownerUserId)
      const [existingAgent] = await tx
        .select({
          id: messengerAgents.id,
          ingestToken: messengerAgents.ingestToken,
          projectId: messengerAgents.projectId,
        })
        .from(messengerAgents)
        .where(
          and(
            sql`${messengerAgents.config}->>'type' = 'host-session'`,
            sql`${messengerAgents.config}->>'hostname' = ${hostname}`,
            sql`${messengerAgents.config}->>'cwd' = ${cwd}`,
            eq(messengerAgents.ownerUserId, ownerUserId),
            isNull(messengerAgents.deletedAt),
          ),
        )
        .limit(1)

      let agentId: string
      let ingestToken: string
      let conversationId: string

      if (existingAgent) {
        agentId = existingAgent.id
        ingestToken = existingAgent.ingestToken

        // Bind the validated projectId when the row currently has none.
        // We never override an existing projectId silently — if the
        // operator wants to re-home the agent they do it via the admin UI.
        if (existingAgent.projectId === null) {
          await tx
            .update(messengerAgents)
            .set({ projectId, updatedAt: new Date() })
            .where(eq(messengerAgents.id, agentId))
        }

        const [existingConv] = await tx
          .select({ id: messengerConversations.id })
          .from(messengerConversations)
          .where(
            and(
              eq(messengerConversations.kind, 'agent'),
              eq(messengerConversations.userAId, ownerUserId),
              sql`${messengerConversations.policy}->>'_agentId' = ${agentId}`,
              isNull(messengerConversations.deletedAt),
            ),
          )
          .limit(1)

        conversationId = existingConv?.id ?? ''
      } else {
        agentId = randomUUID()
        ingestToken = randomUUID()
        const now = new Date()

        await tx.insert(messengerAgents).values({
          id: agentId,
          ownerUserId,
          projectId,
          name: `${hostname}:${projectKey}`,
          ingestToken,
          config: {
            type: 'host-session',
            hostname,
            cwd,
            projectKey,
            createdBy: 'host-bridge',
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

        conversationId = conv.id
      }

      // Idempotent run: reuse existing running run for this sessionId
      const [existingRun] = await tx
        .select({ id: messengerAgentRuns.id })
        .from(messengerAgentRuns)
        .where(
          and(
            eq(messengerAgentRuns.agentId, agentId),
            eq(messengerAgentRuns.status, 'running'),
            sql`${messengerAgentRuns.sessionMetadata}->>'sessionId' = ${sessionId}`,
            isNull(messengerAgentRuns.deletedAt),
          ),
        )
        .limit(1)

      if (existingRun) {
        return { agentId, conversationId, runId: existingRun.id, ingestToken }
      }

      const runId = randomUUID()
      const gitSuffix = gitBranch ? `@${gitBranch}` : ''
      await tx.insert(messengerAgentRuns).values({
        id: runId,
        agentId,
        conversationId,
        rootRunId: runId,
        status: 'running',
        attachmentIds: [],
        prompt: `Session ${sessionId.slice(0, 8)} @ ${cwd}${gitSuffix}`,
        sessionMetadata: {
          sessionId,
          cwd,
          hostname,
          gitBranch: gitBranch ?? null,
          sessionVersion: sessionVersion ?? null,
          sessionStartedAt: sessionStartedAt ?? null,
        },
        startedAt: new Date(),
      })

      return { agentId, conversationId, runId, ingestToken }
    })

    return reply.code(200).send(result)
  })

  app.patch<{ Params: { runId: string } }>(
    '/agents/host-session/runs/:runId/complete',
    async (request, reply) => {
      if (!verifyBridgeToken(request.headers.authorization, bridgeToken)) {
        return reply.code(401).send({ error: 'UNAUTHORIZED' })
      }

      const { runId } = request.params
      if (!runId) {
        return reply.code(400).send({ error: 'INVALID_PARAMS' })
      }

      const parsed = completeBodySchema.safeParse(request.body ?? {})
      if (!parsed.success) {
        return reply.code(400).send({ error: 'INVALID_PAYLOAD', issues: parsed.error.issues })
      }

      const db = useIngestDb()

      const [run] = await db
        .select({ id: messengerAgentRuns.id, status: messengerAgentRuns.status })
        .from(messengerAgentRuns)
        .where(
          and(
            eq(messengerAgentRuns.id, runId),
            isNull(messengerAgentRuns.deletedAt),
          ),
        )
        .limit(1)

      if (!run) {
        return reply.code(404).send({ error: 'RUN_NOT_FOUND' })
      }

      if (run.status === 'completed' || run.status === 'failed') {
        return reply.code(200).send({ ok: true, note: 'already terminal' })
      }

      await db
        .update(messengerAgentRuns)
        .set({ status: 'completed', finishedAt: new Date() })
        .where(eq(messengerAgentRuns.id, runId))

      return reply.code(200).send({ ok: true, runId })
    },
  )

  app.get('/agents/host-session/runs/active', async (request, reply) => {
    const session = resolveSessionAuth(request)
    if (!session) return reply.code(401).send({ error: 'UNAUTHORIZED' })

    const db = useIngestDb()

    const rows = await db
      .select({
        id: messengerAgentRuns.id,
        agentId: messengerAgentRuns.agentId,
        agentName: messengerAgents.name,
        createdAt: messengerAgentRuns.createdAt,
        sessionMetadata: messengerAgentRuns.sessionMetadata,
      })
      .from(messengerAgentRuns)
      .innerJoin(messengerAgents, eq(messengerAgentRuns.agentId, messengerAgents.id))
      .where(
        and(
          eq(messengerAgentRuns.status, 'running'),
          sql`${messengerAgents.config}->>'type' = 'host-session'`,
          eq(messengerAgents.ownerUserId, session.sub),
          isNull(messengerAgentRuns.deletedAt),
          isNull(messengerAgents.deletedAt),
        ),
      )
      .orderBy(desc(messengerAgentRuns.createdAt))
      .limit(100)

    const runs = rows.map((r) => {
      const meta = (r.sessionMetadata ?? {}) as Record<string, unknown>
      return {
        id: r.id,
        agentId: r.agentId,
        agentName: r.agentName,
        createdAt: r.createdAt,
        sessionId: typeof meta.sessionId === 'string' ? meta.sessionId : null,
        cwd: typeof meta.cwd === 'string' ? meta.cwd : null,
        parentRunId: typeof meta.parentRunId === 'string' ? meta.parentRunId : null,
        isSubagent: meta.isSubagent === true,
      }
    })

    return reply.code(200).send({ runs })
  })
}
