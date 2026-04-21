/**
 * dashboard-handler — narrow surface for the claude-web-dashboard (port 9090)
 * to stay in sync with the messenger runtime (port 3300).
 *
 * Auth: shared secret via `MESSENGER_DASHBOARD_TOKEN` env (Bearer). Narrower
 * than the user session + narrower than the ingest token — this surface is
 * read-mostly and only exposes the bits the dashboard needs to render.
 *
 * Routes:
 *   GET   /dashboard/agents
 *     List messenger agents (id / displayName / modelOptions / current model)
 *     so the dashboard can render agent-tied chat-session cards with the same
 *     metadata the messenger-web sees.
 *
 *   PATCH /dashboard/agents/:agentId/model
 *     { model: string } → persist only the `model` field, preserve everything
 *     else in the agent-settings JSON store. `buildMessengerAgentReply()`
 *     reads `settings.model` every turn, so the change is picked up on the
 *     very next reply — no restart needed. This is the "sync" point with
 *     the messenger UI.
 *
 *   GET   /dashboard/cli-sessions/registry[?includeArchive=1]
 *     Single source of truth for tmux cli-sessions (slug/uuid/window/model…)
 *     read straight from `~/state/claude-sessions/.registry.tsv`. Both the
 *     dashboard (9090) and the messenger-web (3300) can hit this endpoint
 *     to render the same session list.
 */
import { existsSync, readFileSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { readMessengerConfig } from '../config.ts'
import { findMessengerAgentById, listMessengerAgents } from './agent-store.ts'
import { getMessengerAgentSettings, updateMessengerAgentSettings } from './agent-settings-store.ts'

const MODEL_PATCH_SCHEMA = z.object({
  model: z.string().trim().min(1).max(120),
})

// --- auth ---

function resolveDashboardAuth(request: FastifyRequest): boolean {
  const config = readMessengerConfig()
  const expected = (config.MESSENGER_DASHBOARD_TOKEN ?? '').trim()
  if (!expected) return false
  const header = request.headers.authorization ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  if (!token) return false
  // Constant-time-ish compare for short tokens — Node's timingSafeEqual needs
  // equal-length buffers; for the expected vs-provided length mismatch we
  // just return false outright.
  if (token.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < token.length; i++) {
    diff |= token.charCodeAt(i) ^ expected.charCodeAt(i)
  }
  return diff === 0
}

// --- cli-session registry reader ---

const HOME = homedir()
const ACTIVE_REGISTRY = join(HOME, 'state/claude-sessions/.registry.tsv')
const ARCHIVE_REGISTRY = join(HOME, 'state/claude-sessions/archive/.registry.tsv')

interface RegistrySession {
  slug: string
  uuid: string
  window: string
  workroom: string
  model: string
  created: string
  kind: string
  archived: boolean
  archivedAt: string | null
  logSize: number | null
  logMtimeMs: number | null
}

function readRegistryFile(tsvPath: string, archived: boolean): RegistrySession[] {
  if (!existsSync(tsvPath)) return []

  let raw: string
  try {
    raw = readFileSync(tsvPath, 'utf8')
  } catch {
    return []
  }

  const lines = raw.trim().split('\n')
  if (lines.length < 2) return []

  const stateDir = join(HOME, archived ? 'state/claude-sessions/archive' : 'state/claude-sessions')

  const sessions: RegistrySession[] = []
  for (const line of lines.slice(1)) {
    const cols = line.split('\t')
    if (cols.length < 6) continue
    const [slug, uuid, window, workroom, model, created, seventh] = cols
    if (!slug) continue

    // 7th column: `kind` in active registry, `archived_at` in archive.
    const kind = archived ? '' : (seventh || '').trim()
    const archivedAt = archived ? (seventh || '').trim() || null : null

    const logPath = join(stateDir, `${slug}.log`)
    let logSize: number | null = null
    let logMtimeMs: number | null = null
    try {
      if (existsSync(logPath)) {
        const st = statSync(logPath)
        logSize = st.size
        logMtimeMs = st.mtimeMs
      }
    } catch {
      // ignore
    }

    sessions.push({
      slug,
      uuid: uuid || '',
      window: window || '',
      workroom: workroom || '',
      model: model || '',
      created: created || '',
      kind,
      archived,
      archivedAt,
      logSize,
      logMtimeMs,
    })
  }
  return sessions
}

// --- route registration ---

export function registerDashboardRoutes(app: FastifyInstance) {
  app.get('/dashboard/agents', async (request, reply) => {
    if (!resolveDashboardAuth(request)) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }

    const agents = await listMessengerAgents()
    const settingsList = await Promise.all(
      agents.map((agent) => getMessengerAgentSettings(agent.id)),
    )

    return {
      agents: agents.map((agent, index) => ({
        id: agent.id,
        login: agent.login,
        displayName: agent.displayName,
        description: agent.description,
        modelOptions: agent.modelOptions,
        claudeSessionSlug: agent.claudeSessionSlug ?? null,
        settings: {
          model: settingsList[index].model,
          updatedAt: settingsList[index].updatedAt,
        },
      })),
    }
  })

  app.patch<{ Params: { agentId: string }; Body: unknown }>(
    '/dashboard/agents/:agentId/model',
    async (request, reply) => {
      if (!resolveDashboardAuth(request)) {
        return reply.code(401).send({ error: 'UNAUTHORIZED' })
      }

      const parsed = MODEL_PATCH_SCHEMA.safeParse(request.body)
      if (!parsed.success) {
        return reply.code(400).send({ error: 'INVALID_PAYLOAD', issues: parsed.error.issues })
      }

      const agent = await findMessengerAgentById(request.params.agentId)
      if (!agent) {
        return reply.code(404).send({ error: 'AGENT_NOT_FOUND' })
      }

      const current = await getMessengerAgentSettings(agent.id)
      const updated = await updateMessengerAgentSettings(agent.id, {
        model: parsed.data.model,
        apiKey: current.apiKey,
        ssh: current.ssh,
        knowledge: current.knowledge,
        connections: current.connections,
        graphPosition: current.graphPosition,
      })

      return {
        agentId: agent.id,
        model: updated.model,
        updatedAt: updated.updatedAt,
      }
    },
  )

  app.get<{ Querystring: { includeArchive?: string } }>(
    '/dashboard/cli-sessions/registry',
    async (request, reply) => {
      if (!resolveDashboardAuth(request)) {
        return reply.code(401).send({ error: 'UNAUTHORIZED' })
      }
      const includeArchive =
        request.query.includeArchive === '1' || request.query.includeArchive === 'true'
      const active = readRegistryFile(ACTIVE_REGISTRY, false)
      const archived = includeArchive ? readRegistryFile(ARCHIVE_REGISTRY, true) : []
      return { sessions: [...active, ...archived] }
    },
  )
}
