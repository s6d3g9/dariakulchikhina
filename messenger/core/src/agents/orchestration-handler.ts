import { spawnSync as _spawnSync, execFile as _execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { readBearerToken, verifyMessengerToken } from '../auth/auth.ts'
import { readMessengerConfig } from '../config.ts'
import {
  createMessengerAgentRun,
  listMessengerAgentRunSubtree,
  listMessengerAgentRunEventsPaginated,
  updateMessengerAgentRunStatus,
} from './agent-run-store.ts'
import {
  useIngestDb,
  messengerAgents,
  messengerCliSessions,
  messengerAgentRuns,
  messengerAgentTaskCompletions,
  eq,
  and,
  isNull,
  inArray,
  sql,
  desc,
} from './ingest-db.ts'

// --- auth helpers ---

function resolveSessionAuth(request: FastifyRequest) {
  const config = readMessengerConfig()
  const token = readBearerToken(request.headers.authorization ?? '')
  if (!token) return null
  return verifyMessengerToken(token, config.MESSENGER_CORE_AUTH_SECRET)
}

async function resolveIngestAuth(db: ReturnType<typeof useIngestDb>, authHeader: string | undefined, agentId: string) {
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!token) return null
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
  return agent ?? null
}

const execFileAsync = promisify(_execFile)
const CLAUDE_SESSION_BIN = '/home/claudecode/bin/claude-session'

// --- schemas ---

const createRunBody = z.object({
  parentRunId: z.string().uuid().optional(),
  prompt: z.string(),
  attachmentIds: z.array(z.string()).optional(),
  model: z.string().optional(),
})

const cliSessionBody = z.object({
  agentId: z.string().uuid(),
  workroomSlug: z.string().optional(),
  model: z.string(),
  tmuxWindow: z.string(),
  claudeSessionUuid: z.string(),
  logPath: z.string(),
  runId: z.string().uuid().optional(),
})

const taskCompleteBody = z.object({
  slug: z.string().min(1),
  commitSha: z.string().regex(/^[0-9a-f]{40}$/, 'commitSha must be a 40-char hex string'),
  branch: z.string().min(1),
  commitsAboveBase: z.number().int().nonnegative(),
  gates: z.record(z.object({
    status: z.enum(['pass', 'fail']),
    detail: z.string().optional(),
  })).default({}),
})

// --- route registration ---

export function registerOrchestrationRoutes(
  app: FastifyInstance,
  broadcastToChannel: (channel: string, event: Record<string, unknown>) => void,
  opts: { spawnSync?: typeof _spawnSync } = {},
) {
  const spawnSync = opts.spawnSync ?? _spawnSync
  const db = useIngestDb()

  // POST /agents/:agentId/runs
  app.post<{ Params: { agentId: string } }>(
    '/agents/:agentId/runs',
    async (request, reply) => {
      if (!resolveSessionAuth(request)) {
        return reply.code(401).send({ error: 'UNAUTHORIZED' })
      }

      const { agentId } = request.params
      const [agent] = await db
        .select({ id: messengerAgents.id })
        .from(messengerAgents)
        .where(and(eq(messengerAgents.id, agentId), isNull(messengerAgents.deletedAt)))
        .limit(1)
      if (!agent) return reply.code(404).send({ error: 'AGENT_NOT_FOUND' })

      const parsed = createRunBody.safeParse(request.body)
      if (!parsed.success) {
        return reply.code(400).send({ error: 'INVALID_PAYLOAD', issues: parsed.error.issues })
      }

      const { parentRunId, prompt, model } = parsed.data
      const runId = await createMessengerAgentRun({ agentId, parentRunId, prompt, model })

      const [session] = await db
        .insert(messengerCliSessions)
        .values({ agentId, runId, status: 'pending', model: model ?? null })
        .returning({ id: messengerCliSessions.id })

      return { runId, cliSessionId: session.id }
    },
  )

  // POST /agents/:agentId/runs/:runId/cancel
  app.post<{ Params: { agentId: string; runId: string } }>(
    '/agents/:agentId/runs/:runId/cancel',
    async (request, reply) => {
      if (!resolveSessionAuth(request)) {
        return reply.code(401).send({ error: 'UNAUTHORIZED' })
      }

      const { agentId, runId } = request.params

      const [run] = await db
        .select({ id: messengerAgentRuns.id, status: messengerAgentRuns.status })
        .from(messengerAgentRuns)
        .where(
          and(
            eq(messengerAgentRuns.id, runId),
            eq(messengerAgentRuns.agentId, agentId),
            isNull(messengerAgentRuns.deletedAt),
          ),
        )
        .limit(1)
      if (!run) return reply.code(404).send({ error: 'RUN_NOT_FOUND' })

      const [cliSession] = await db
        .select({ tmuxWindow: messengerCliSessions.tmuxWindow })
        .from(messengerCliSessions)
        .where(
          and(
            eq(messengerCliSessions.runId, runId),
            isNull(messengerCliSessions.deletedAt),
          ),
        )
        .limit(1)

      if (cliSession?.tmuxWindow) {
        spawnSync('tmux', ['send-keys', '-t', cliSession.tmuxWindow, 'C-c', ''], {
          timeout: 3000,
        })
      }

      await updateMessengerAgentRunStatus(runId, 'cancelled')

      broadcastToChannel(`agent-stream:${agentId}`, {
        type: 'substate',
        runId,
        substate: 'idle',
      })

      return { cancelled: true }
    },
  )

  // GET /agents/:agentId/runs
  app.get<{ Params: { agentId: string }; Querystring: { rootRunId?: string; cursor?: string; limit?: string } }>(
    '/agents/:agentId/runs',
    async (request, reply) => {
      if (!resolveSessionAuth(request)) {
        return reply.code(401).send({ error: 'UNAUTHORIZED' })
      }

      const { agentId } = request.params
      const { rootRunId, cursor, limit } = request.query

      if (!rootRunId) {
        return reply.code(400).send({ error: 'rootRunId_REQUIRED' })
      }

      const result = await listMessengerAgentRunSubtree({
        agentId,
        rootRunId,
        cursor,
        limit: limit ? parseInt(limit, 10) : undefined,
      })

      return result
    },
  )

  // GET /agents/:agentId/runs/:runId/events
  app.get<{ Params: { agentId: string; runId: string }; Querystring: { cursor?: string; limit?: string } }>(
    '/agents/:agentId/runs/:runId/events',
    async (request, reply) => {
      if (!resolveSessionAuth(request)) {
        return reply.code(401).send({ error: 'UNAUTHORIZED' })
      }

      const { agentId, runId } = request.params
      const { cursor, limit } = request.query

      const [run] = await db
        .select({ id: messengerAgentRuns.id })
        .from(messengerAgentRuns)
        .where(
          and(
            eq(messengerAgentRuns.id, runId),
            eq(messengerAgentRuns.agentId, agentId),
            isNull(messengerAgentRuns.deletedAt),
          ),
        )
        .limit(1)
      if (!run) return reply.code(404).send({ error: 'RUN_NOT_FOUND' })

      const result = await listMessengerAgentRunEventsPaginated({
        runId,
        cursor,
        limit: limit ? parseInt(limit, 10) : undefined,
      })

      return result
    },
  )

  // GET /cli-sessions — read filesystem registry + match to messenger agents
  app.get<{ Querystring: { includeArchived?: string } }>(
    '/cli-sessions',
    async (request, reply) => {
      if (!resolveSessionAuth(request)) {
        return reply.code(401).send({ error: 'UNAUTHORIZED' })
      }

      const includeArchived = request.query.includeArchived === 'true' || request.query.includeArchived === '1'
      const HOME = homedir()
      const stateDir = process.env.DASHBOARD_STATE_DIR ?? join(HOME, 'state/claude-sessions')

      type SessionRow = {
        slug: string
        uuid: string
        window: string
        workroom: string
        model: string
        created: string
        kind: string
        effort: string
        status: 'running' | 'done'
        archivedAt: string | null
      }

      function parseRegistry(content: string, isArchive: boolean): SessionRow[] {
        const lines = content.trim().split('\n')
        if (lines.length < 2) return []
        const headers = (lines[0] ?? '').split('\t')
        return lines.slice(1).flatMap((line) => {
          const cols = line.split('\t')
          const obj: Record<string, string> = {}
          headers.forEach((h, i) => { obj[h] = cols[i] ?? '' })
          if (!obj.slug) return []
          return [{
            slug: obj.slug,
            uuid: obj.uuid ?? '',
            window: obj.window ?? '',
            workroom: obj.workroom ?? '',
            model: obj.model ?? '',
            created: obj.created ?? '',
            kind: obj.kind ?? '',
            effort: obj.effort ?? '',
            status: isArchive ? 'done' : 'running',
            archivedAt: obj.archived_at ?? null,
          }]
        })
      }

      const sessions: SessionRow[] = []
      try {
        sessions.push(...parseRegistry(readFileSync(join(stateDir, '.registry.tsv'), 'utf8'), false))
      }
      catch {}

      if (includeArchived) {
        try {
          sessions.push(...parseRegistry(readFileSync(join(stateDir, 'archive', '.registry.tsv'), 'utf8'), true))
        }
        catch {}
      }

      // Map slugs → agent records via config.claudeSessionSlug
      let allAgents: Array<{ id: string; name: string; config: unknown }> = []
      try {
        allAgents = await db.select({ id: messengerAgents.id, name: messengerAgents.name, config: messengerAgents.config })
          .from(messengerAgents)
          .where(isNull(messengerAgents.deletedAt))
      }
      catch {}

      const agentBySlug = new Map<string, { id: string; name: string; displayName: string }>()
      for (const agent of allAgents) {
        const cfg = (agent.config ?? {}) as Record<string, unknown>
        const slug = typeof cfg.claudeSessionSlug === 'string' ? cfg.claudeSessionSlug : null
        const displayName = typeof cfg.displayName === 'string' ? cfg.displayName : agent.name
        if (slug) agentBySlug.set(slug, { id: agent.id, name: agent.name, displayName })
      }

      // Collect unique agentIds that have matching sessions
      const uniqueAgentIds = [...new Set(
        sessions
          .map(s => agentBySlug.get(s.slug)?.id)
          .filter((id): id is string => id !== undefined),
      )]

      // Signal 1 + 2: latest run per agent (DISTINCT ON pattern, one query)
      type LatestRunInfo = {
        agentId: string
        runId: string
        parentRunId: string | null
        spawnedByAgentId: string | null
        rootRunId: string | null
        finishedAt: Date | null
        result: string | null
        error: string | null
      }
      const latestRunByAgent = new Map<string, LatestRunInfo>()
      const childCountByRunId = new Map<string, number>()
      // Signal 3: task completion counts
      const taskCountByAgent = new Map<string, { total: number; today: number }>()

      if (uniqueAgentIds.length > 0) {
        try {
          const latestRuns = await db
            .selectDistinctOn([messengerAgentRuns.agentId], {
              agentId: messengerAgentRuns.agentId,
              runId: messengerAgentRuns.id,
              parentRunId: messengerAgentRuns.parentRunId,
              spawnedByAgentId: messengerAgentRuns.spawnedByAgentId,
              rootRunId: messengerAgentRuns.rootRunId,
              finishedAt: messengerAgentRuns.finishedAt,
              result: sql<string | null>`LEFT(${messengerAgentRuns.result}, 240)`,
              error: sql<string | null>`LEFT(${messengerAgentRuns.error}, 240)`,
            })
            .from(messengerAgentRuns)
            .where(and(inArray(messengerAgentRuns.agentId, uniqueAgentIds), isNull(messengerAgentRuns.deletedAt)))
            .orderBy(messengerAgentRuns.agentId, desc(messengerAgentRuns.createdAt))

          for (const row of latestRuns) {
            if (row.agentId) latestRunByAgent.set(row.agentId, row as LatestRunInfo)
          }
        }
        catch {}

        // Signal 1: child run counts for each latest run
        const latestRunIds = [...latestRunByAgent.values()].map(r => r.runId)
        if (latestRunIds.length > 0) {
          try {
            const childCounts = await db
              .select({
                parentRunId: messengerAgentRuns.parentRunId,
                childCount: sql<number>`cast(count(*) as int)`,
              })
              .from(messengerAgentRuns)
              .where(and(inArray(messengerAgentRuns.parentRunId, latestRunIds), isNull(messengerAgentRuns.deletedAt)))
              .groupBy(messengerAgentRuns.parentRunId)

            for (const row of childCounts) {
              if (row.parentRunId) childCountByRunId.set(row.parentRunId, row.childCount)
            }
          }
          catch {}
        }

        // Signal 3: all-time and today task completion counts
        try {
          const taskCounts = await db
            .select({
              agentId: messengerAgentTaskCompletions.agentId,
              total: sql<number>`cast(count(*) as int)`,
              today: sql<number>`cast(count(*) filter (where ${messengerAgentTaskCompletions.createdAt} >= date_trunc('day', now() at time zone 'UTC')) as int)`,
            })
            .from(messengerAgentTaskCompletions)
            .where(inArray(messengerAgentTaskCompletions.agentId, uniqueAgentIds))
            .groupBy(messengerAgentTaskCompletions.agentId)

          for (const row of taskCounts) {
            taskCountByAgent.set(row.agentId, { total: row.total, today: row.today })
          }
        }
        catch {}
      }

      return {
        sessions: sessions.map((s) => {
          const agentId = agentBySlug.get(s.slug)?.id ?? null
          const run = agentId ? latestRunByAgent.get(agentId) : undefined
          const taskCounts = agentId ? taskCountByAgent.get(agentId) : undefined

          return {
            ...s,
            agentId,
            agentDisplayName: agentBySlug.get(s.slug)?.displayName ?? null,
            // Signal 1 — spawn tree
            parentRunId: run?.parentRunId ?? null,
            parentAgentId: run?.spawnedByAgentId ?? null,
            rootRunId: run?.rootRunId ?? null,
            childRunCount: run != null ? (childCountByRunId.get(run.runId) ?? 0) : null,
            // Signal 2 — final outcome (null while run is active)
            finishedAt: run?.finishedAt ?? null,
            runResult: (run?.finishedAt != null ? run.result : null) ?? null,
            runError: (run?.finishedAt != null ? run.error : null) ?? null,
            // Signal 3 — task completion
            taskCompletionCount: taskCounts?.total ?? null,
            taskCompletionToday: taskCounts?.today ?? null,
          }
        }),
      }
    },
  )

  // POST /agents/:agentId/task-complete — worker self-reports completion
  app.post<{ Params: { agentId: string } }>(
    '/agents/:agentId/task-complete',
    async (request, reply) => {
      if (!resolveSessionAuth(request)) {
        return reply.code(401).send({ error: 'UNAUTHORIZED' })
      }

      const { agentId } = request.params
      const [agent] = await db
        .select({ id: messengerAgents.id })
        .from(messengerAgents)
        .where(and(eq(messengerAgents.id, agentId), isNull(messengerAgents.deletedAt)))
        .limit(1)
      if (!agent) return reply.code(404).send({ error: 'AGENT_NOT_FOUND' })

      const parsed = taskCompleteBody.safeParse(request.body)
      if (!parsed.success) {
        return reply.code(400).send({ error: 'INVALID_PAYLOAD', issues: parsed.error.issues })
      }

      const { slug, commitSha, branch, commitsAboveBase, gates } = parsed.data

      const [session] = await db
        .select({ id: messengerCliSessions.id })
        .from(messengerCliSessions)
        .where(and(eq(messengerCliSessions.slug, slug), isNull(messengerCliSessions.deletedAt)))
        .limit(1)
      if (!session) return reply.code(400).send({ error: 'SLUG_NOT_FOUND' })

      const [inserted] = await db
        .insert(messengerAgentTaskCompletions)
        .values({ agentId, slug, commitSha, branch, commitsAboveBase, gates })
        .returning()

      return reply.code(201).send(inserted)
    },
  )

  // POST /cli-sessions — auth via ingest bearer token
  app.post<{ Body: unknown }>(
    '/cli-sessions',
    async (request, reply) => {
      const parsed = cliSessionBody.safeParse(request.body)
      if (!parsed.success) {
        return reply.code(400).send({ error: 'INVALID_PAYLOAD', issues: parsed.error.issues })
      }

      const { agentId, workroomSlug, model, tmuxWindow, claudeSessionUuid, logPath, runId } = parsed.data

      const agent = await resolveIngestAuth(db, request.headers.authorization, agentId)
      if (!agent) return reply.code(401).send({ error: 'UNAUTHORIZED' })

      // Upsert: if a cli session already exists for this runId, update it; else insert
      if (runId) {
        const [existing] = await db
          .select({ id: messengerCliSessions.id })
          .from(messengerCliSessions)
          .where(
            and(
              eq(messengerCliSessions.runId, runId),
              isNull(messengerCliSessions.deletedAt),
            ),
          )
          .limit(1)

        if (existing) {
          await db
            .update(messengerCliSessions)
            .set({ workroomSlug: workroomSlug ?? null, model, tmuxWindow, claudeSessionUuid, logPath, status: 'running', updatedAt: new Date() })
            .where(eq(messengerCliSessions.id, existing.id))
          return { id: existing.id }
        }
      }

      const [inserted] = await db
        .insert(messengerCliSessions)
        .values({
          agentId,
          runId: runId ?? null,
          workroomSlug: workroomSlug ?? null,
          model,
          tmuxWindow,
          claudeSessionUuid,
          logPath,
          status: 'running',
        })
        .returning({ id: messengerCliSessions.id })

      return { id: inserted.id }
    },
  )

  // PATCH /cli-sessions/:slug — update model and/or effort for a running session.
  // Calls claude-session set-model / set-effort which updates the registry and kills
  // the tmux window so the next send picks up the new flags via --resume.
  const patchCliSessionBody = z.object({
    model: z.string().optional(),
    effort: z.enum(['low', 'medium', 'high']).optional(),
  }).refine(d => d.model !== undefined || d.effort !== undefined, {
    message: 'At least one of model or effort is required',
  })

  app.patch<{ Params: { slug: string } }>(
    '/cli-sessions/:slug',
    async (request, reply) => {
      if (!resolveSessionAuth(request)) {
        return reply.code(401).send({ error: 'UNAUTHORIZED' })
      }

      const { slug } = request.params
      const parsed = patchCliSessionBody.safeParse(request.body)
      if (!parsed.success) {
        return reply.code(400).send({ error: 'INVALID_INPUT', issues: parsed.error.issues })
      }

      const { model, effort } = parsed.data

      if (model) {
        await execFileAsync(CLAUDE_SESSION_BIN, ['set-model', slug, model], { timeout: 10000 })
      }
      if (effort) {
        await execFileAsync(CLAUDE_SESSION_BIN, ['set-effort', slug, effort], { timeout: 10000 })
      }

      return { slug, ...(model !== undefined && { model }), ...(effort !== undefined && { effort }) }
    },
  )
}
