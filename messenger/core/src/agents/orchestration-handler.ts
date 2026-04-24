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
  messengerAgentTaskCompletions,
  eq,
  and,
  isNull,
  or,
  desc,
  sql,
  inArray,
} from './ingest-db.ts'

const execFile = promisify(_execFile)

// --- cli-session delta broadcaster (in-process SSE fan-out) ---

type SessionDelta = {
  slug: string
  reason: 'created' | 'event' | 'stopped' | 'archived' | 'patched'
  ts: string
  agentId?: string | null
  runId?: string | null
  substate?: string | null
  tool?: string | null
  tokenIn?: number
  tokenOut?: number
  message?: string | null
}

const sessionDeltaListeners = new Set<(evt: SessionDelta) => void>()

export function subscribeSessionDeltas(fn: (evt: SessionDelta) => void) {
  sessionDeltaListeners.add(fn)
  return () => { sessionDeltaListeners.delete(fn) }
}

export function publishSessionDelta(evt: SessionDelta) {
  for (const fn of sessionDeltaListeners) {
    try { fn(evt) } catch { /* swallow — one broken listener shouldn't stop others */ }
  }
}

// --- auth helpers ---

function resolveSessionAuth(request: FastifyRequest) {
  const config = readMessengerConfig()
  let token = readBearerToken(request.headers.authorization ?? '')
  // Fallback for SSE / img tags that can't set Authorization header.
  if (!token) {
    const q = (request.query ?? {}) as { token?: string }
    if (typeof q.token === 'string' && q.token) token = q.token
  }
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
      const agentById = new Map<string, { id: string; name: string; projectId: string | null; config: unknown }>()
      for (const agent of allAgents) {
        agentById.set(agent.id, agent)
        const cfg = (agent.config ?? {}) as Record<string, unknown>
        const slug = typeof cfg.claudeSessionSlug === 'string' ? cfg.claudeSessionSlug : null
        const displayName = typeof cfg.displayName === 'string' ? cfg.displayName : agent.name
        if (slug) agentBySlug.set(slug, { id: agent.id, name: agent.name, displayName, projectId: agent.projectId ?? null })
      }

      // Fallback: map slug → agent via messenger_cli_sessions.agent_id for dynamic
      // worker sessions that reuse the same agent across multiple runs (no static
      // claudeSessionSlug config). The DB row is the source of truth for which
      // agent actually spawned the session.
      try {
        const cliSessionAgents = await db
          .select({ slug: messengerCliSessions.slug, agentId: messengerCliSessions.agentId })
          .from(messengerCliSessions)
          .where(isNull(messengerCliSessions.deletedAt))
        for (const row of cliSessionAgents) {
          if (!row.agentId || agentBySlug.has(row.slug)) continue
          const agent = agentById.get(row.agentId)
          if (!agent) continue
          const cfg = (agent.config ?? {}) as Record<string, unknown>
          const displayName = typeof cfg.displayName === 'string' ? cfg.displayName : agent.name
          agentBySlug.set(row.slug, { id: agent.id, name: agent.name, displayName, projectId: agent.projectId ?? null })
        }
      } catch {}

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
      const archivedAtBySlug = new Map<string, string>()
      try {
        const dbSessions = await db
          .select({ slug: messengerCliSessions.slug, status: messengerCliSessions.status, archivedAt: messengerCliSessions.archivedAt })
          .from(messengerCliSessions)
          .where(and(isNull(messengerCliSessions.deletedAt)))
        for (const row of dbSessions) {
          if (row.status === 'stopped' && runningSlugs.includes(row.slug)) stoppedSlugs.add(row.slug)
          if (row.archivedAt) archivedAtBySlug.set(row.slug, row.archivedAt instanceof Date ? row.archivedAt.toISOString() : String(row.archivedAt))
        }
      } catch {}

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

      // Tmux is the authoritative liveness signal. An event-stream silence doesn't
      // mean the session died — Claude can think for 20+ minutes on one turn. We
      // only mark `done` when (a) tmux confirms the window is gone, or (b) the DB
      // has a stoppedAt from the ingest handler's `complete`/`error` event.
      // ACTIVITY_IDLE_MS is purely cosmetic (for an "idle" badge in the UI), never
      // for status itself.
      const ACTIVITY_IDLE_MS = 15 * 60_000
      // "Active" = running AND recently executing an operation. Used by the
      // chat UI to show only sessions that are currently working, not every
      // long-running tmux window. 90s captures "Claude is thinking/calling
      // tools right now"; longer gaps read as "dormant".
      const ACTIVE_ACTIVITY_MS = 90_000
      const now = Date.now()

      // Signals 1/2/3 from clicore-integ: spawn tree, finish outcome, task completions.
      // Keyed by agentId; reuses linkedAgentIds from activity enrichment above.
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
      const taskCountByAgent = new Map<string, { total: number; today: number }>()

      if (linkedAgentIds.length > 0) {
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
            .where(and(inArray(messengerAgentRuns.agentId, linkedAgentIds), isNull(messengerAgentRuns.deletedAt)))
            .orderBy(messengerAgentRuns.agentId, desc(messengerAgentRuns.createdAt))

          for (const row of latestRuns) {
            if (row.agentId) latestRunByAgent.set(row.agentId, row as LatestRunInfo)
          }
        }
        catch {}

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

        try {
          const taskCounts = await db
            .select({
              agentId: messengerAgentTaskCompletions.agentId,
              total: sql<number>`cast(count(*) as int)`,
              today: sql<number>`cast(count(*) filter (where ${messengerAgentTaskCompletions.createdAt} >= date_trunc('day', now() at time zone 'UTC')) as int)`,
            })
            .from(messengerAgentTaskCompletions)
            .where(inArray(messengerAgentTaskCompletions.agentId, linkedAgentIds))
            .groupBy(messengerAgentTaskCompletions.agentId)

          for (const row of taskCounts) {
            taskCountByAgent.set(row.agentId, { total: row.total, today: row.today })
          }
        }
        catch {}
      }

      return {
        sessions: sessions.map(s => {
          const agentId = agentBySlug.get(s.slug)?.id ?? null
          const activity = agentId ? activityByAgent.get(agentId) ?? null : null
          const run = agentId ? latestRunByAgent.get(agentId) : undefined
          const taskCounts = agentId ? taskCountByAgent.get(agentId) : undefined
          const tmuxChecked = liveTmuxWindows.size > 0
          const tmuxAlive = tmuxChecked && liveTmuxWindows.has(s.window)
          const tmuxDead = tmuxChecked && !tmuxAlive
          const dbStopped = stoppedSlugs.has(s.slug)
          // Tmux-authoritative status. If we couldn't read tmux (empty set), fall
          // back to what the registry file says so the dropdown isn't empty on
          // transient tmux failures.
          let computedStatus: 'running' | 'done' = s.status
          if (s.status === 'running') {
            if (tmuxAlive) computedStatus = 'running'
            else if (tmuxDead) computedStatus = 'done'
            else if (dbStopped) computedStatus = 'done'
            // else: tmux not readable → keep registry's 'running'
          }
          const idleForMs = activity?.lastActivityAt
            ? now - new Date(activity.lastActivityAt).getTime()
            : null
          const isIdle = computedStatus === 'running' && idleForMs !== null && idleForMs > ACTIVITY_IDLE_MS
          // Treat sessions that have never emitted an event yet as active for
          // their first ACTIVE_ACTIVITY_MS window — the CLI bootstrap takes a
          // few seconds, so we don't want brand-new sessions to flicker "idle".
          const createdAtMs = s.created ? new Date(s.created).getTime() : null
          const sinceCreatedMs = createdAtMs ? now - createdAtMs : null
          const recentActivity = idleForMs !== null && idleForMs < ACTIVE_ACTIVITY_MS
          const recentlyCreated = idleForMs === null && sinceCreatedMs !== null && sinceCreatedMs < ACTIVE_ACTIVITY_MS
          const isActive = computedStatus === 'running' && (recentActivity || recentlyCreated)
          return {
            ...s,
            status: computedStatus,
            agentId,
            agentDisplayName: agentBySlug.get(s.slug)?.displayName ?? null,
            agentProjectId: agentBySlug.get(s.slug)?.projectId ?? slugToMessengerProjectId.get(s.slug) ?? s.registryProjectId ?? null,
            lastActivityAt: activity?.lastActivityAt ?? null,
            idleForMs,
            isIdle,
            isActive,
            lastSubstate: activity?.lastSubstate ?? null,
            lastTool: activity?.lastTool ?? null,
            lastToolDescriptor: activity?.lastToolDescriptor ?? null,
            lastMessagePreview: activity?.lastMessagePreview ?? null,
            runStatus: activity?.runStatus ?? null,
            tokenInTotal: activity?.tokenInTotal ?? 0,
            tokenOutTotal: activity?.tokenOutTotal ?? 0,
            costUsd: activity?.costUsd ?? 0,
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
            archivedAt: archivedAtBySlug.get(s.slug) ?? null,
          }
        }),
      }
    },
  )

  // GET /cli-sessions/:slug/trace — last N events across all runs for the agent
  // linked to this slug. Used by the in-chat trace panel for debugging + monitoring.
  app.get<{ Params: { slug: string }; Querystring: { limit?: string } }>(
    '/cli-sessions/:slug/trace',
    async (request, reply) => {
      if (!resolveSessionAuth(request)) {
        return reply.code(401).send({ error: 'UNAUTHORIZED' })
      }
      const { slug } = request.params
      if (!/^[a-z0-9-]{2,40}$/.test(slug)) {
        return reply.code(400).send({ error: 'INVALID_INPUT' })
      }
      const limit = Math.min(Math.max(parseInt(request.query.limit ?? '100', 10) || 100, 1), 500)

      // Resolve agent linked to this slug via either config.claudeSessionSlug
      // or messenger_cli_sessions.agent_id.
      let agentId: string | null = null
      try {
        const [row] = await db
          .select({ id: messengerAgents.id })
          .from(messengerAgents)
          .where(and(
            sql`${messengerAgents.config}->>'claudeSessionSlug' = ${slug}`,
            isNull(messengerAgents.deletedAt),
          ))
          .limit(1)
        if (row) agentId = row.id
      } catch {}
      if (!agentId) {
        try {
          const [row] = await db
            .select({ agentId: messengerCliSessions.agentId })
            .from(messengerCliSessions)
            .where(and(eq(messengerCliSessions.slug, slug), isNull(messengerCliSessions.deletedAt)))
            .orderBy(desc(messengerCliSessions.createdAt))
            .limit(1)
          if (row?.agentId) agentId = row.agentId
        } catch {}
      }
      if (!agentId) return { slug, agentId: null, events: [] }

      const eventRows = await db.execute<{
        event_id: string
        run_id: string
        occurred_at: string
        substate: string | null
        token_in: number | null
        token_out: number | null
        message: string | null
        payload: Record<string, unknown> | null
      }>(sql`
        SELECT e.id AS event_id, e.run_id, e.occurred_at, e.substate,
               e.token_in, e.token_out, e.message, e.payload
        FROM messenger_agent_run_events e
        JOIN messenger_agent_runs r ON r.id = e.run_id
        WHERE r.agent_id = ${agentId}::uuid AND r.deleted_at IS NULL
        ORDER BY e.occurred_at DESC
        LIMIT ${limit}
      `)
      const rows = Array.isArray(eventRows) ? eventRows : (eventRows as { rows?: unknown[] }).rows ?? []
      const events = (rows as Array<{
        event_id: string; run_id: string; occurred_at: string | Date;
        substate: string | null; token_in: number | null; token_out: number | null;
        message: string | null; payload: Record<string, unknown> | null;
      }>).map(r => {
        const p = (r.payload ?? {}) as Record<string, unknown>
        const kind = typeof p.type === 'string' ? p.type : (r.substate ?? 'event')
        const tool = p.type === 'tool_use' && typeof p.tool === 'string' ? p.tool : null
        const toolInput = p.type === 'tool_use' && p.input && typeof p.input === 'object'
          ? p.input as Record<string, unknown>
          : null
        const subagentType = (p.type === 'subagent_start' || p.type === 'subagent_end') && typeof p.subagentType === 'string'
          ? p.subagentType
          : null
        const toolUseId = (p.type === 'subagent_start' || p.type === 'subagent_end' || p.type === 'tool_use') && typeof p.toolUseId === 'string'
          ? p.toolUseId
          : null
        const childRunId = typeof p.childRunId === 'string' ? p.childRunId : null
        const success = p.type === 'subagent_end' && typeof p.success === 'boolean' ? p.success : null
        return {
          eventId: r.event_id,
          runId: r.run_id,
          occurredAt: typeof r.occurred_at === 'string' ? r.occurred_at : r.occurred_at.toISOString(),
          kind,
          substate: r.substate,
          tool,
          toolDescriptor: toolInput
            ? (typeof toolInput.command === 'string' ? String(toolInput.command).slice(0, 200)
              : typeof toolInput.file_path === 'string' ? String(toolInput.file_path)
              : typeof toolInput.pattern === 'string' ? String(toolInput.pattern).slice(0, 140)
              : null)
            : null,
          tokenIn: r.token_in ?? 0,
          tokenOut: r.token_out ?? 0,
          message: r.message ? r.message.slice(0, 400) : null,
          subagentType,
          toolUseId,
          childRunId,
          subagentSuccess: success,
        }
      }).reverse() // oldest → newest for timeline rendering
      return { slug, agentId, events }
    },
  )

  // GET /cli-sessions/stream — Server-Sent Events for live session deltas.
  // Forwards the internal `cli-sessions:delta` broadcast channel so the UI
  // can refresh without polling. The ingest handler and session lifecycle
  // points publish { slug, reason, ts } messages to that channel.
  app.get('/cli-sessions/stream', async (request, reply) => {
    if (!resolveSessionAuth(request)) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    })
    reply.raw.write(`: connected ${new Date().toISOString()}\n\n`)
    const keepalive = setInterval(() => {
      try { reply.raw.write(`: ping ${Date.now()}\n\n`) } catch { /* client gone */ }
    }, 15000)
    const send = (evt: Record<string, unknown>) => {
      try { reply.raw.write(`data: ${JSON.stringify(evt)}\n\n`) } catch { /* client gone */ }
    }
    // Hook into the same broadcaster used by the ingest pipeline — we piggy-back
    // on the `cli-sessions:delta` channel name for session-level deltas.
    const unsubscribe = subscribeSessionDeltas(send)
    request.raw.on('close', () => {
      clearInterval(keepalive)
      unsubscribe()
    })
    // Keep the handler alive — fastify awaits this promise.
    await new Promise<void>((resolve) => {
      request.raw.on('close', () => resolve())
    })
  })

  // PATCH /cli-sessions/:slug — change model/effort from UI, or archive/unarchive
  app.patch<{ Params: { slug: string }, Body: { model?: string, effort?: string, archived?: boolean } }>(
    '/cli-sessions/:slug',
    async (request, reply) => {
      if (!resolveSessionAuth(request)) {
        return reply.code(401).send({ error: 'UNAUTHORIZED' })
      }

      const { slug } = request.params
      const body = request.body ?? {}
      const { model, effort, archived } = body

      if (!/^[a-z0-9-]{2,40}$/.test(slug)) {
        return reply.code(400).send({ error: 'INVALID_INPUT' })
      }

      if (model === undefined && effort === undefined && archived === undefined) {
        return reply.code(400).send({ error: 'INVALID_INPUT' })
      }

      // Handle archive toggle — DB-only, no filesystem check needed
      if (archived !== undefined) {
        const archivedAt = archived ? new Date() : null
        await db
          .update(messengerCliSessions)
          .set({ archivedAt })
          .where(and(eq(messengerCliSessions.slug, slug), isNull(messengerCliSessions.deletedAt)))
        publishSessionDelta({ slug, reason: archived ? 'archived' : 'patched', ts: new Date().toISOString() })
        return { slug, archived }
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

  // POST /cli-sessions/:slug/stop — kill tmux window, mark DB stopped, broadcast delta.
  // Used by the "Stop" button in the chat-header session capsule. Idempotent:
  // if tmux already died, we still update DB state and publish so the UI
  // converges quickly without waiting for the 30s reconciler.
  app.post<{ Params: { slug: string } }>(
    '/cli-sessions/:slug/stop',
    async (request, reply) => {
      if (!resolveSessionAuth(request)) {
        return reply.code(401).send({ error: 'UNAUTHORIZED' })
      }
      const { slug } = request.params
      if (!/^[a-z0-9-]{2,40}$/.test(slug)) {
        return reply.code(400).send({ error: 'INVALID_INPUT' })
      }

      const [existing] = await db
        .select({ id: messengerCliSessions.id, status: messengerCliSessions.status })
        .from(messengerCliSessions)
        .where(and(eq(messengerCliSessions.slug, slug), isNull(messengerCliSessions.deletedAt)))
        .limit(1)
      if (!existing) return reply.code(404).send({ error: 'NOT_FOUND' })

      try {
        await execFile('/home/claudecode/bin/claude-session', ['kill', slug], { timeout: 10000 })
      } catch (err) {
        request.log?.warn?.({ err, slug }, 'claude-session kill failed — marking stopped anyway')
      }

      const now = new Date()
      await db
        .update(messengerCliSessions)
        .set({ status: 'stopped', stoppedAt: now })
        .where(eq(messengerCliSessions.id, existing.id))
      publishSessionDelta({ slug, reason: 'stopped', ts: now.toISOString() })
      return { slug, stopped: true }
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

      const finalSlug = workroomSlug ?? randomUUID()
      const [inserted] = await db
        .insert(messengerCliSessions)
        .values({
          agentId,
          runId: runId ?? null,
          slug: finalSlug,
          workroom: workroomSlug ?? null,
          model,
          tmuxWindow,
          status: 'running',
        })
        .returning({ id: messengerCliSessions.id })

      publishSessionDelta({ slug: finalSlug, reason: 'created', ts: new Date().toISOString(), agentId, runId: runId ?? null })
      return { id: inserted.id }
    },
  )

  // --- tmux reconciler ---
  // Runs every 30s. For any session DB row with status='running' whose tmux
  // window is no longer in `tmux list-windows -t cc`, flips status to
  // 'stopped' and publishes a delta so the UI updates instantly. This closes
  // the gap where a session dies without emitting a `complete`/`error` event.
  const RECONCILE_INTERVAL_MS = 30_000
  const reconcileTick = async () => {
    try {
      const { execFileSync } = await import('node:child_process')
      let liveWindows: Set<string>
      try {
        const out = execFileSync('tmux', ['list-windows', '-t', 'cc', '-F', '#{window_name}'], {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'ignore'],
        })
        liveWindows = new Set(out.trim().split('\n').filter(Boolean))
      } catch {
        // tmux unreadable — skip this tick rather than mark everything dead
        return
      }
      const runningRows = await db
        .select({ id: messengerCliSessions.id, slug: messengerCliSessions.slug, window: messengerCliSessions.tmuxWindow })
        .from(messengerCliSessions)
        .where(and(eq(messengerCliSessions.status, 'running'), isNull(messengerCliSessions.deletedAt)))
      const now = new Date()
      for (const row of runningRows) {
        if (!row.window || liveWindows.has(row.window)) continue
        await db
          .update(messengerCliSessions)
          .set({ status: 'stopped', stoppedAt: now })
          .where(eq(messengerCliSessions.id, row.id))
        publishSessionDelta({ slug: row.slug, reason: 'stopped', ts: now.toISOString() })
      }
    } catch (err) {
      app.log.warn({ err }, 'cli-session reconciler tick failed')
    }
  }
  const reconcileTimer = setInterval(reconcileTick, RECONCILE_INTERVAL_MS)
  // Kick once on startup so stale DB state gets cleaned up immediately.
  setTimeout(reconcileTick, 5_000)
  app.addHook('onClose', async () => { clearInterval(reconcileTimer) })
}
