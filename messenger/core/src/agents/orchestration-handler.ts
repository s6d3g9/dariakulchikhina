import { spawnSync as _spawnSync, execFile as _execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { randomUUID } from 'node:crypto'
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
// eslint-disable-next-line no-restricted-imports
import { messengerProjects } from '../../../../server/db/schema/messenger-projects.ts'
import {
  useIngestDb,
  messengerAgents,
  messengerCliSessions,
  messengerAgentRuns,
  eq,
  and,
  isNull,
  or,
  desc,
  sql,
} from './ingest-db.ts'

const execFile = promisify(_execFile)

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

function getStateDir() {
  const HOME = homedir()
  return process.env.DASHBOARD_STATE_DIR ?? join(HOME, 'state/claude-sessions')
}

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
  claudeSessionUuid: z.string().optional(),
  logPath: z.string().optional(),
  runId: z.string().uuid().optional(),
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

      // Generate a placeholder slug — real one is patched by claude-session via
      // POST /cli-sessions when the tmux window is created.
      const placeholderSlug = 'run-' + runId.slice(0, 8)
      const [session] = await db
        .insert(messengerCliSessions)
        .values({ agentId, runId, slug: placeholderSlug, status: 'pending', model: model ?? null })
        .returning({ id: messengerCliSessions.id })

      return { runId, cliSessionId: session.id }
    },
  )

  // GET /agents/:agentId/active-run — latest non-completed run for an agent.
  // UI calls this on mount/open to restore the thinking indicator after a page
  // reload while the agent is still processing.
  app.get<{ Params: { agentId: string } }>(
    '/agents/:agentId/active-run',
    async (request, reply) => {
      if (!resolveSessionAuth(request)) {
        return reply.code(401).send({ error: 'UNAUTHORIZED' })
      }
      const { agentId } = request.params
      const [run] = await db
        .select({
          id: messengerAgentRuns.id,
          status: messengerAgentRuns.status,
          prompt: messengerAgentRuns.prompt,
          createdAt: messengerAgentRuns.createdAt,
          conversationId: messengerAgentRuns.conversationId,
        })
        .from(messengerAgentRuns)
        .where(and(
          eq(messengerAgentRuns.agentId, agentId),
          isNull(messengerAgentRuns.deletedAt),
          or(eq(messengerAgentRuns.status, 'pending'), eq(messengerAgentRuns.status, 'running')),
        ))
        .orderBy(desc(messengerAgentRuns.createdAt))
        .limit(1)
      return { run: run ?? null }
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
      await db
        .update(messengerCliSessions)
        .set({ status: 'stopped', stoppedAt: new Date() })
        .where(and(eq(messengerCliSessions.runId, runId), isNull(messengerCliSessions.deletedAt)))

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
      const stateDir = getStateDir()

      type SessionRow = {
        slug: string
        uuid: string
        window: string
        workroom: string
        model: string
        registryProjectId: string | null
        created: string
        kind: string
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
            registryProjectId: obj.project_id || null,
            status: isArchive ? 'done' : 'running',
            archivedAt: obj.archived_at ?? null,
          }]
        })
      }

      // Live tmux window names — registry entries without a window are zombies
      let liveTmuxWindows: Set<string> = new Set()
      try {
        const { execFileSync } = await import('node:child_process')
        const out = execFileSync('tmux', ['list-windows', '-t', 'cc', '-F', '#{window_name}'], {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'ignore'],
        })
        liveTmuxWindows = new Set(out.trim().split('\n').filter(Boolean))
      }
      catch {}

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
      let allAgents: Array<{ id: string; name: string; projectId: string | null; config: unknown }> = []
      try {
        allAgents = await db.select({ id: messengerAgents.id, name: messengerAgents.name, projectId: messengerAgents.projectId, config: messengerAgents.config })
          .from(messengerAgents)
          .where(isNull(messengerAgents.deletedAt))
      }
      catch {}

      const agentBySlug = new Map<string, { id: string; name: string; displayName: string; projectId: string | null }>()
      for (const agent of allAgents) {
        const cfg = (agent.config ?? {}) as Record<string, unknown>
        const slug = typeof cfg.claudeSessionSlug === 'string' ? cfg.claudeSessionSlug : null
        const displayName = typeof cfg.displayName === 'string' ? cfg.displayName : agent.name
        if (slug) agentBySlug.set(slug, { id: agent.id, name: agent.name, displayName, projectId: agent.projectId ?? null })
      }

      // Build slug → messenger_projects.id mapping via dashboard assignments
      // so sessions without a linked agent (workers) still resolve to a project.
      const slugToMessengerProjectId = new Map<string, string>()
      try {
        const dashboardStateRaw = readFileSync(join(stateDir, '.projects.json'), 'utf8')
        const dashboardState = JSON.parse(dashboardStateRaw) as {
          projects?: Array<{ id: string; name: string }>
          assignments?: Record<string, string>
        }
        const dashboardProjects = dashboardState.projects ?? []
        const assignments = dashboardState.assignments ?? {}

        const allMessengerProjects = await db
          .select({ id: messengerProjects.id, name: messengerProjects.name })
          .from(messengerProjects)
          .where(isNull(messengerProjects.deletedAt))
        const nameToMessengerId = new Map<string, string>()
        for (const mp of allMessengerProjects) nameToMessengerId.set(mp.name, mp.id)

        const dashboardIdToMessengerId = new Map<string, string>()
        for (const dp of dashboardProjects) {
          const messengerId = nameToMessengerId.get(dp.name)
          if (messengerId) dashboardIdToMessengerId.set(dp.id, messengerId)
        }
        for (const [slug, dashboardProjectId] of Object.entries(assignments)) {
          const messengerId = dashboardIdToMessengerId.get(dashboardProjectId)
          if (messengerId) slugToMessengerProjectId.set(slug, messengerId)
        }
      } catch {}

      // Override status for sessions the DB marks as stopped
      // (filesystem registry may still list them as running until archived)
      const runningSlugs = sessions.filter(s => s.status === 'running').map(s => s.slug)
      const stoppedSlugs = new Set<string>()
      if (runningSlugs.length) {
        try {
          const dbSessions = await db
            .select({ slug: messengerCliSessions.slug, status: messengerCliSessions.status })
            .from(messengerCliSessions)
            .where(and(isNull(messengerCliSessions.deletedAt)))
          for (const row of dbSessions) {
            if (row.status === 'stopped' && runningSlugs.includes(row.slug)) stoppedSlugs.add(row.slug)
          }
        } catch {}
      }

      // Per-session live activity: most-recent run + most-recent event per linked agent.
      // Uses DISTINCT ON for O(agents) instead of O(runs * events).
      type Activity = {
        lastActivityAt: string | null
        lastSubstate: string | null
        lastTool: string | null
        lastToolDescriptor: string | null
        lastMessagePreview: string | null
        runStatus: string | null
        tokenInTotal: number
        tokenOutTotal: number
        costUsd: number
      }
      const activityByAgent = new Map<string, Activity>()
      const linkedAgentIds = Array.from(new Set(
        sessions.flatMap(s => {
          const id = agentBySlug.get(s.slug)?.id
          return id ? [id] : []
        }),
      ))

      if (linkedAgentIds.length) {
        try {
          const lastRunRows = await db.execute<{
            agent_id: string
            run_id: string
            status: string
            token_in_total: number
            token_out_total: number
            cost_usd: string
          }>(sql`
            SELECT DISTINCT ON (agent_id)
              agent_id, id AS run_id, status,
              token_in_total, token_out_total, cost_usd
            FROM messenger_agent_runs
            WHERE agent_id IN (${sql.join(linkedAgentIds.map(id => sql`${id}::uuid`), sql`, `)})
            ORDER BY agent_id, created_at DESC
          `)
          const runRows = Array.isArray(lastRunRows) ? lastRunRows : (lastRunRows as { rows?: unknown[] }).rows ?? []
          const runIdToAgent = new Map<string, string>()
          for (const r of runRows as Array<{ agent_id: string; run_id: string; status: string; token_in_total: number; token_out_total: number; cost_usd: string }>) {
            runIdToAgent.set(r.run_id, r.agent_id)
            activityByAgent.set(r.agent_id, {
              lastActivityAt: null,
              lastSubstate: null,
              lastTool: null,
              lastToolDescriptor: null,
              lastMessagePreview: null,
              runStatus: r.status,
              tokenInTotal: Number(r.token_in_total) || 0,
              tokenOutTotal: Number(r.token_out_total) || 0,
              costUsd: Number(r.cost_usd) || 0,
            })
          }

          const runIds = Array.from(runIdToAgent.keys())
          if (runIds.length) {
            const lastEventRows = await db.execute<{
              run_id: string
              occurred_at: string
              substate: string | null
              message: string | null
              payload: Record<string, unknown> | null
            }>(sql`
              SELECT DISTINCT ON (run_id)
                run_id, occurred_at, substate, message, payload
              FROM messenger_agent_run_events
              WHERE run_id IN (${sql.join(runIds.map(id => sql`${id}::uuid`), sql`, `)})
              ORDER BY run_id, occurred_at DESC
            `)
            const eventRows = Array.isArray(lastEventRows) ? lastEventRows : (lastEventRows as { rows?: unknown[] }).rows ?? []
            for (const ev of eventRows as Array<{ run_id: string; occurred_at: string; substate: string | null; message: string | null; payload: Record<string, unknown> | null }>) {
              const agentId = runIdToAgent.get(ev.run_id)
              if (!agentId) continue
              const activity = activityByAgent.get(agentId)
              if (!activity) continue
              activity.lastActivityAt = typeof ev.occurred_at === 'string'
                ? ev.occurred_at
                : (ev.occurred_at as Date | undefined)?.toISOString() ?? null
              activity.lastSubstate = ev.substate
              if (ev.payload && typeof ev.payload === 'object') {
                const p = ev.payload as Record<string, unknown>
                if (p.type === 'tool_use' && typeof p.tool === 'string') {
                  activity.lastTool = p.tool
                  const input = p.input as Record<string, unknown> | undefined
                  activity.lastToolDescriptor =
                    typeof input?.command === 'string' ? String(input.command).slice(0, 140) :
                    typeof input?.file_path === 'string' ? String(input.file_path) :
                    typeof input?.pattern === 'string' ? String(input.pattern).slice(0, 100) :
                    null
                }
              }
              if (typeof ev.message === 'string' && ev.message.trim()) {
                activity.lastMessagePreview = ev.message.slice(0, 160)
              }
            }
          }
        }
        catch (err) {
          request.log?.warn?.({ err }, 'cli-sessions activity enrichment failed')
        }
      }

      return {
        sessions: sessions.map(s => {
          const agentId = agentBySlug.get(s.slug)?.id ?? null
          const activity = agentId ? activityByAgent.get(agentId) ?? null : null
          return {
            ...s,
            status: (s.status === 'running' && (stoppedSlugs.has(s.slug) || (liveTmuxWindows.size > 0 && !liveTmuxWindows.has(s.window)))) ? 'done' as const : s.status,
            agentId,
            agentDisplayName: agentBySlug.get(s.slug)?.displayName ?? null,
            agentProjectId: agentBySlug.get(s.slug)?.projectId ?? slugToMessengerProjectId.get(s.slug) ?? s.registryProjectId ?? null,
            lastActivityAt: activity?.lastActivityAt ?? null,
            lastSubstate: activity?.lastSubstate ?? null,
            lastTool: activity?.lastTool ?? null,
            lastToolDescriptor: activity?.lastToolDescriptor ?? null,
            lastMessagePreview: activity?.lastMessagePreview ?? null,
            runStatus: activity?.runStatus ?? null,
            tokenInTotal: activity?.tokenInTotal ?? 0,
            tokenOutTotal: activity?.tokenOutTotal ?? 0,
            costUsd: activity?.costUsd ?? 0,
          }
        }),
      }
    },
  )

  // PATCH /cli-sessions/:slug — change model (and effort when supported) from UI
  app.patch<{ Params: { slug: string }, Body: { model?: string, effort?: string } }>(
    '/cli-sessions/:slug',
    async (request, reply) => {
      if (!resolveSessionAuth(request)) {
        return reply.code(401).send({ error: 'UNAUTHORIZED' })
      }

      const { slug } = request.params
      const body = request.body ?? {}
      const { model, effort } = body

      if (!/^[a-z0-9-]{2,40}$/.test(slug)) {
        return reply.code(400).send({ error: 'INVALID_INPUT' })
      }

      if (!model && !effort) {
        return reply.code(400).send({ error: 'INVALID_INPUT' })
      }

      const VALID_MODELS = ['claude-opus-4-7', 'claude-sonnet-4-6', 'claude-haiku-4-5-20251001'] as const
      if (model !== undefined && !VALID_MODELS.includes(model as typeof VALID_MODELS[number])) {
        return reply.code(400).send({ error: 'INVALID_INPUT' })
      }

      const VALID_EFFORTS = ['low', 'medium', 'high'] as const
      if (effort !== undefined && !VALID_EFFORTS.includes(effort as typeof VALID_EFFORTS[number])) {
        return reply.code(400).send({ error: 'INVALID_INPUT' })
      }

      // TODO: claude-session binary does not yet support set-effort; implement once available
      if (!model && effort) {
        return reply.code(501).send({ error: 'NOT_IMPLEMENTED' })
      }

      const stateDir = getStateDir()
      let slugFound = false
      try {
        const content = readFileSync(join(stateDir, '.registry.tsv'), 'utf8')
        const lines = content.trim().split('\n')
        if (lines.length >= 2) {
          const headers = (lines[0] ?? '').split('\t')
          const slugIdx = headers.indexOf('slug')
          if (slugIdx !== -1) {
            slugFound = lines.slice(1).some(line => line.split('\t')[slugIdx] === slug)
          }
        }
      }
      catch {}

      if (!slugFound) {
        return reply.code(404).send({ error: 'NOT_FOUND' })
      }

      await execFile('/home/claudecode/bin/claude-session', ['set-model', slug, model!], { timeout: 10000 })

      return { slug, model, effort }
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

      const { agentId, workroomSlug, model, tmuxWindow, runId } = parsed.data

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
            .set({ model, tmuxWindow, status: 'running' })
            .where(eq(messengerCliSessions.id, existing.id))
          return { id: existing.id }
        }
      }

      const [inserted] = await db
        .insert(messengerCliSessions)
        .values({
          agentId,
          runId: runId ?? null,
          slug: workroomSlug ?? randomUUID(),
          workroom: workroomSlug ?? null,
          model,
          tmuxWindow,
          status: 'running',
        })
        .returning({ id: messengerCliSessions.id })

      return { id: inserted.id }
    },
  )
}
