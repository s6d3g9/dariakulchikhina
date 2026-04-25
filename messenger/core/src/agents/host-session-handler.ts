import { randomUUID, timingSafeEqual } from 'node:crypto'
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
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

function loadProjectsMap(filePath: string | undefined): Record<string, string> {
  if (!filePath || !existsSync(filePath)) return {}
  try {
    const raw = readFileSync(filePath, 'utf8')
    const parsed = JSON.parse(raw) as unknown
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, string>
    }
  } catch {
    // ignore malformed file — treat as empty map
  }
  return {}
}

const provisionBodySchema = z.object({
  sessionId: z.string().uuid(),
  cwd: z.string().min(1),
  hostname: z.string().min(1),
  gitBranch: z.string().optional(),
  sessionVersion: z.string().optional(),
  sessionStartedAt: z.string().optional(),
})

const completeBodySchema = z.object({
  reason: z.enum(['idle', 'rotated', 'shutdown']).optional(),
})

interface DlqStats {
  lastDlqAt: string | null
  dlqCount24h: number
}

function readDlqStats(stateDir: string): DlqStats {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000
  let lastMtime = 0
  let count24h = 0

  let entries: string[]
  try {
    entries = readdirSync(stateDir)
  } catch {
    return { lastDlqAt: null, dlqCount24h: 0 }
  }

  for (const entry of entries) {
    if (!entry.endsWith('.dlq.ndjson')) continue
    try {
      const mtime = statSync(join(stateDir, entry)).mtimeMs
      if (mtime > lastMtime) lastMtime = mtime
      if (mtime > cutoff) count24h++
    } catch {
      // ignore unreadable entries
    }
  }

  return {
    lastDlqAt: lastMtime > 0 ? new Date(lastMtime).toISOString() : null,
    dlqCount24h: count24h,
  }
}

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

    const { sessionId, cwd, hostname, gitBranch, sessionVersion, sessionStartedAt } = parsed.data

    if (!cwd.startsWith('/') || cwd.includes('..')) {
      return reply.code(400).send({ error: 'INVALID_CWD' })
    }

    const projectKey = cwd.split('/').filter(Boolean).pop() ?? 'home'
    const projectsMap = loadProjectsMap(config.HOST_BRIDGE_PROJECTS_FILE)
    const messengerProjectId = projectsMap[cwd] ?? null

    const db = useIngestDb()

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

        // Idempotent project binding: update if a mapping now exists and isn't set yet
        if (messengerProjectId && existingAgent.projectId !== messengerProjectId) {
          await tx
            .update(messengerAgents)
            .set({ projectId: messengerProjectId, updatedAt: new Date() })
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
          projectId: messengerProjectId,
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

  app.get('/agents/host-session/health', async (request, reply) => {
    if (!verifyBridgeToken(request.headers.authorization, bridgeToken)) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }

    const db = useIngestDb()

    const rows = await db.execute(sql`
      SELECT
        COUNT(*)::int       FILTER (WHERE r.status = 'running')          AS active_runs_count,
        COUNT(DISTINCT r.agent_id) FILTER (WHERE r.status = 'running')   AS active_agents_count,
        MAX(r.started_at)                                                  AS last_provision_at
      FROM messenger_agent_runs r
      JOIN messenger_agents a ON r.agent_id = a.id
      WHERE a.config->>'type' = 'host-session'
        AND r.deleted_at IS NULL
        AND a.deleted_at IS NULL
    `)

    const row = rows[0] as {
      active_runs_count: number
      active_agents_count: number
      last_provision_at: Date | null
    } | undefined

    const stateDir = config.DLQ_STATE_DIR ?? join(homedir(), 'state', 'claude-bridge')
    const dlq = readDlqStats(stateDir)

    return reply.code(200).send({
      ok: true,
      activeRunsCount: row?.active_runs_count ?? 0,
      activeAgentsCount: row?.active_agents_count ?? 0,
      lastDlqAt: dlq.lastDlqAt,
      dlqCount24h: dlq.dlqCount24h,
      lastProvisionAt: row?.last_provision_at ? new Date(row.last_provision_at).toISOString() : null,
      uptime: { messengerCore: Math.floor(process.uptime() * 1000) },
    })
  })
}
