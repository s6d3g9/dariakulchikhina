import { randomUUID } from 'node:crypto'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { readBearerToken, verifyMessengerToken } from '../auth/auth.ts'
import { readMessengerConfig } from '../config.ts'
import { callClaudeSessionReply } from '../agents/claude-cli-reply.ts'
import { useIngestDb } from '../agents/ingest-db.ts'
// eslint-disable-next-line no-restricted-imports
import { messengerAgents } from '../../../../server/db/schema/messenger.ts'
// eslint-disable-next-line no-restricted-imports
import { eq, and, isNull } from 'drizzle-orm'
import {
  createProject,
  findProjectById,
  listProjects,
  updateProject,
  softDeleteProject,
  getProjectWithCounts,
} from './project-store.ts'
import {
  ProjectForbiddenError,
  listConnectors, createConnector, updateConnector, deleteConnector,
  listSkills, upsertSkill, deleteSkill,
  listPlugins, upsertPlugin, deletePlugin,
  listMcp, createMcp, updateMcp, deleteMcp,
  listExternalApis, createExternalApi, updateExternalApi, deleteExternalApi,
} from './project-resource-store.ts'

// --- auth ---

function resolveSessionAuth(request: FastifyRequest) {
  const config = readMessengerConfig()
  const token = readBearerToken(request.headers.authorization ?? '')
  if (!token) return null
  return verifyMessengerToken(token, config.MESSENGER_CORE_AUTH_SECRET)
}

// --- zod schemas ---

const createProjectBody = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).nullish(),
  icon: z.string().max(200).nullish(),
  color: z.string().max(50).nullish(),
  slug: z.string().max(200).nullish(),
})

const updateProjectBody = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullish(),
  icon: z.string().max(200).nullish(),
  color: z.string().max(50).nullish(),
  slug: z.string().max(200).nullish(),
  version: z.number().int().positive(),
})

const projectIdParams = z.object({ id: z.string().uuid() })
const entryIdParams = z.object({ id: z.string().uuid(), entryId: z.string() })

const connectorBody = z.object({
  type: z.string().min(1).max(100),
  label: z.string().min(1).max(200),
  config: z.record(z.unknown()).optional(),
  enabled: z.boolean().optional(),
  isDefault: z.boolean().optional(),
})

const connectorPatch = connectorBody.partial()

const skillUpsertBody = z.object({
  enabled: z.boolean().optional(),
  config: z.record(z.unknown()).optional(),
})

const pluginUpsertBody = z.object({
  enabled: z.boolean().optional(),
  config: z.record(z.unknown()).optional(),
})

const mcpBody = z.object({
  name: z.string().min(1).max(200),
  transport: z.string().min(1).max(50),
  endpoint: z.string().min(1).max(500),
  config: z.record(z.unknown()).optional(),
  enabled: z.boolean().optional(),
})

const mcpPatch = mcpBody.partial()

const externalApiBody = z.object({
  name: z.string().min(1).max(200),
  baseUrl: z.string().url().max(500),
  openapiRef: z.string().max(500).nullish(),
  authType: z.enum(['none', 'bearer', 'apikey', 'basic']).optional(),
  config: z.record(z.unknown()).optional(),
  enabled: z.boolean().optional(),
})

const externalApiPatch = externalApiBody.partial()

const createAgentBody = z.object({
  type: z.enum(['composer', 'orchestrator', 'worker', 'custom']),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullish(),
  model: z.string().max(100).nullish(),
  systemPrompt: z.string().max(10000).nullish(),
  skillBundleKind: z.string().max(100).nullish(),
})

const bootstrapBody = z.object({
  mode: z.enum(['manual', 'auto']),
  taskDescription: z.string().max(5000).optional(),
})

const proposalSchema = z.object({
  connectors: z.array(z.object({
    type: z.string(),
    label: z.string(),
    config: z.record(z.unknown()).optional(),
    enabled: z.boolean().optional(),
  })).default([]),
  skills: z.array(z.object({
    skillId: z.string(),
    enabled: z.boolean().optional(),
    config: z.record(z.unknown()).optional(),
  })).default([]),
  plugins: z.array(z.object({
    pluginId: z.string(),
    enabled: z.boolean().optional(),
    config: z.record(z.unknown()).optional(),
  })).default([]),
  mcp: z.array(z.object({
    name: z.string(),
    transport: z.string(),
    endpoint: z.string(),
    config: z.record(z.unknown()).optional(),
    enabled: z.boolean().optional(),
  })).default([]),
  externalApis: z.array(z.object({
    name: z.string(),
    baseUrl: z.string(),
    openapiRef: z.string().nullish(),
    authType: z.string().optional(),
    config: z.record(z.unknown()).optional(),
    enabled: z.boolean().optional(),
  })).default([]),
  agents: z.array(z.object({
    name: z.string(),
    type: z.enum(['composer', 'orchestrator', 'worker', 'custom']).optional(),
    description: z.string().nullish(),
    model: z.string().nullish(),
    skillBundleKind: z.string().nullish(),
  })).default([]),
})

type Proposal = z.infer<typeof proposalSchema>

const applyBootstrapBody = z.object({
  proposal: proposalSchema,
})

// --- agent type defaults ---

const COMPOSER_SYSTEM_PROMPT = 'You are the Composer — the top-level strategic agent. You do not edit code directly. Your role: discuss strategy, architecture, and priorities with the user. When there is execution work, formulate it as instructions for the orchestrator. Answer concisely with concrete action items when appropriate.'

const ORCHESTRATOR_SYSTEM_PROMPT = 'You are the Orchestrator tech lead. Route tasks to specialized agents, build work plans, and determine next steps. Answer concisely and structurally. First identify the task type, then route it to the right agents or modules, then provide a work plan, risks, and next step.'

function agentTypeDefaults(type: string): { name: string; model: string; skillBundleKind: string; systemPrompt: string } {
  switch (type) {
    case 'composer':
      return { name: 'Composer', model: 'sonnet', skillBundleKind: 'composer', systemPrompt: COMPOSER_SYSTEM_PROMPT }
    case 'orchestrator':
      return { name: 'Orchestrator', model: 'sonnet', skillBundleKind: 'orchestrator', systemPrompt: ORCHESTRATOR_SYSTEM_PROMPT }
    default:
      return { name: type, model: 'sonnet', skillBundleKind: type, systemPrompt: '' }
  }
}

// --- error helpers ---

function zodErrorSummary(err: z.ZodError): string {
  return err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ')
}

// --- route registration ---

export function registerProjectsRoutes(
  app: FastifyInstance,
  _broadcastToChannel?: (channel: string, event: Record<string, unknown>) => void,
): void {
  const db = useIngestDb()

  // GET /projects
  app.get('/projects', async (request, reply) => {
    const payload = resolveSessionAuth(request)
    if (!payload) return reply.code(401).send({ error: 'UNAUTHORIZED' })

    const projects = await listProjects(payload.sub)
    return { projects }
  })

  // POST /projects
  app.post('/projects', async (request, reply) => {
    const payload = resolveSessionAuth(request)
    if (!payload) return reply.code(401).send({ error: 'UNAUTHORIZED' })

    const parsed = createProjectBody.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'INVALID_PAYLOAD', details: zodErrorSummary(parsed.error) })

    const project = await createProject({ ownerUserId: payload.sub, ...parsed.data })
    return reply.code(201).send({ project })
  })

  // GET /projects/:id
  app.get<{ Params: { id: string } }>('/projects/:id', async (request, reply) => {
    const payload = resolveSessionAuth(request)
    if (!payload) return reply.code(401).send({ error: 'UNAUTHORIZED' })

    const params = projectIdParams.safeParse(request.params)
    if (!params.success) return reply.code(400).send({ error: 'INVALID_PARAMS' })

    const result = await getProjectWithCounts(params.data.id, payload.sub)
    if (!result.ok) return reply.code(404).send({ error: 'PROJECT_NOT_FOUND' })
    return { project: result.project }
  })

  // PATCH /projects/:id
  app.patch<{ Params: { id: string } }>('/projects/:id', async (request, reply) => {
    const payload = resolveSessionAuth(request)
    if (!payload) return reply.code(401).send({ error: 'UNAUTHORIZED' })

    const params = projectIdParams.safeParse(request.params)
    if (!params.success) return reply.code(400).send({ error: 'INVALID_PARAMS' })

    const parsed = updateProjectBody.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'INVALID_PAYLOAD', details: zodErrorSummary(parsed.error) })

    const result = await updateProject(params.data.id, payload.sub, parsed.data)
    if (!result.ok) {
      if (result.error === 'NOT_FOUND') return reply.code(404).send({ error: 'PROJECT_NOT_FOUND' })
      return reply.code(409).send({ error: 'VERSION_CONFLICT' })
    }
    return { project: result.project }
  })

  // DELETE /projects/:id
  app.delete<{ Params: { id: string } }>('/projects/:id', async (request, reply) => {
    const payload = resolveSessionAuth(request)
    if (!payload) return reply.code(401).send({ error: 'UNAUTHORIZED' })

    const params = projectIdParams.safeParse(request.params)
    if (!params.success) return reply.code(400).send({ error: 'INVALID_PARAMS' })

    const result = await softDeleteProject(params.data.id, payload.sub)
    if (!result.ok) return reply.code(404).send({ error: 'PROJECT_NOT_FOUND' })
    return { ok: true }
  })

  // --- Connectors ---

  app.get<{ Params: { id: string } }>('/projects/:id/connectors', async (request, reply) => {
    const payload = resolveSessionAuth(request)
    if (!payload) return reply.code(401).send({ error: 'UNAUTHORIZED' })
    const params = projectIdParams.safeParse(request.params)
    if (!params.success) return reply.code(400).send({ error: 'INVALID_PARAMS' })
    const found = await findProjectById(params.data.id, payload.sub)
    if (!found.ok) return reply.code(404).send({ error: 'PROJECT_NOT_FOUND' })
    return { connectors: await listConnectors(params.data.id) }
  })

  app.post<{ Params: { id: string } }>('/projects/:id/connectors', async (request, reply) => {
    const payload = resolveSessionAuth(request)
    if (!payload) return reply.code(401).send({ error: 'UNAUTHORIZED' })
    const params = projectIdParams.safeParse(request.params)
    if (!params.success) return reply.code(400).send({ error: 'INVALID_PARAMS' })
    const parsed = connectorBody.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'INVALID_PAYLOAD', details: zodErrorSummary(parsed.error) })
    try {
      const connector = await createConnector(params.data.id, payload.sub, parsed.data)
      return reply.code(201).send({ connector })
    } catch (e) {
      if (e instanceof ProjectForbiddenError) return reply.code(403).send({ error: 'PROJECT_FORBIDDEN' })
      throw e
    }
  })

  app.patch<{ Params: { id: string; entryId: string } }>('/projects/:id/connectors/:entryId', async (request, reply) => {
    const payload = resolveSessionAuth(request)
    if (!payload) return reply.code(401).send({ error: 'UNAUTHORIZED' })
    const params = entryIdParams.safeParse(request.params)
    if (!params.success) return reply.code(400).send({ error: 'INVALID_PARAMS' })
    const parsed = connectorPatch.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'INVALID_PAYLOAD', details: zodErrorSummary(parsed.error) })
    try {
      const connector = await updateConnector(params.data.entryId, payload.sub, parsed.data)
      if (!connector) return reply.code(404).send({ error: 'NOT_FOUND' })
      return { connector }
    } catch (e) {
      if (e instanceof ProjectForbiddenError) return reply.code(403).send({ error: 'PROJECT_FORBIDDEN' })
      throw e
    }
  })

  app.delete<{ Params: { id: string; entryId: string } }>('/projects/:id/connectors/:entryId', async (request, reply) => {
    const payload = resolveSessionAuth(request)
    if (!payload) return reply.code(401).send({ error: 'UNAUTHORIZED' })
    const params = entryIdParams.safeParse(request.params)
    if (!params.success) return reply.code(400).send({ error: 'INVALID_PARAMS' })
    try {
      const ok = await deleteConnector(params.data.entryId, payload.sub)
      if (!ok) return reply.code(404).send({ error: 'NOT_FOUND' })
      return { ok: true }
    } catch (e) {
      if (e instanceof ProjectForbiddenError) return reply.code(403).send({ error: 'PROJECT_FORBIDDEN' })
      throw e
    }
  })

  // --- Skills ---

  app.get<{ Params: { id: string } }>('/projects/:id/skills', async (request, reply) => {
    const payload = resolveSessionAuth(request)
    if (!payload) return reply.code(401).send({ error: 'UNAUTHORIZED' })
    const params = projectIdParams.safeParse(request.params)
    if (!params.success) return reply.code(400).send({ error: 'INVALID_PARAMS' })
    const found = await findProjectById(params.data.id, payload.sub)
    if (!found.ok) return reply.code(404).send({ error: 'PROJECT_NOT_FOUND' })
    return { skills: await listSkills(params.data.id) }
  })

  app.post<{ Params: { id: string } }>('/projects/:id/skills', async (request, reply) => {
    const payload = resolveSessionAuth(request)
    if (!payload) return reply.code(401).send({ error: 'UNAUTHORIZED' })
    const params = projectIdParams.safeParse(request.params)
    if (!params.success) return reply.code(400).send({ error: 'INVALID_PARAMS' })
    const parsed = z.object({ skillId: z.string().min(1).max(200), ...skillUpsertBody.shape }).safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'INVALID_PAYLOAD', details: zodErrorSummary(parsed.error) })
    try {
      const { skillId, ...rest } = parsed.data
      const skill = await upsertSkill(params.data.id, payload.sub, skillId, rest)
      return reply.code(200).send({ skill })
    } catch (e) {
      if (e instanceof ProjectForbiddenError) return reply.code(403).send({ error: 'PROJECT_FORBIDDEN' })
      throw e
    }
  })

  app.patch<{ Params: { id: string; entryId: string } }>('/projects/:id/skills/:entryId', async (request, reply) => {
    const payload = resolveSessionAuth(request)
    if (!payload) return reply.code(401).send({ error: 'UNAUTHORIZED' })
    const params = entryIdParams.safeParse(request.params)
    if (!params.success) return reply.code(400).send({ error: 'INVALID_PARAMS' })
    const parsed = skillUpsertBody.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'INVALID_PAYLOAD', details: zodErrorSummary(parsed.error) })
    try {
      const skill = await upsertSkill(params.data.id, payload.sub, params.data.entryId, parsed.data)
      return { skill }
    } catch (e) {
      if (e instanceof ProjectForbiddenError) return reply.code(403).send({ error: 'PROJECT_FORBIDDEN' })
      throw e
    }
  })

  app.delete<{ Params: { id: string; entryId: string } }>('/projects/:id/skills/:entryId', async (request, reply) => {
    const payload = resolveSessionAuth(request)
    if (!payload) return reply.code(401).send({ error: 'UNAUTHORIZED' })
    const params = entryIdParams.safeParse(request.params)
    if (!params.success) return reply.code(400).send({ error: 'INVALID_PARAMS' })
    try {
      const ok = await deleteSkill(params.data.id, payload.sub, params.data.entryId)
      if (!ok) return reply.code(404).send({ error: 'NOT_FOUND' })
      return { ok: true }
    } catch (e) {
      if (e instanceof ProjectForbiddenError) return reply.code(403).send({ error: 'PROJECT_FORBIDDEN' })
      throw e
    }
  })

  // --- Plugins ---

  app.get<{ Params: { id: string } }>('/projects/:id/plugins', async (request, reply) => {
    const payload = resolveSessionAuth(request)
    if (!payload) return reply.code(401).send({ error: 'UNAUTHORIZED' })
    const params = projectIdParams.safeParse(request.params)
    if (!params.success) return reply.code(400).send({ error: 'INVALID_PARAMS' })
    const found = await findProjectById(params.data.id, payload.sub)
    if (!found.ok) return reply.code(404).send({ error: 'PROJECT_NOT_FOUND' })
    return { plugins: await listPlugins(params.data.id) }
  })

  app.post<{ Params: { id: string } }>('/projects/:id/plugins', async (request, reply) => {
    const payload = resolveSessionAuth(request)
    if (!payload) return reply.code(401).send({ error: 'UNAUTHORIZED' })
    const params = projectIdParams.safeParse(request.params)
    if (!params.success) return reply.code(400).send({ error: 'INVALID_PARAMS' })
    const parsed = z.object({ pluginId: z.string().min(1).max(200), ...pluginUpsertBody.shape }).safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'INVALID_PAYLOAD', details: zodErrorSummary(parsed.error) })
    try {
      const { pluginId, ...rest } = parsed.data
      const plugin = await upsertPlugin(params.data.id, payload.sub, pluginId, rest)
      return reply.code(200).send({ plugin })
    } catch (e) {
      if (e instanceof ProjectForbiddenError) return reply.code(403).send({ error: 'PROJECT_FORBIDDEN' })
      throw e
    }
  })

  app.patch<{ Params: { id: string; entryId: string } }>('/projects/:id/plugins/:entryId', async (request, reply) => {
    const payload = resolveSessionAuth(request)
    if (!payload) return reply.code(401).send({ error: 'UNAUTHORIZED' })
    const params = entryIdParams.safeParse(request.params)
    if (!params.success) return reply.code(400).send({ error: 'INVALID_PARAMS' })
    const parsed = pluginUpsertBody.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'INVALID_PAYLOAD', details: zodErrorSummary(parsed.error) })
    try {
      const plugin = await upsertPlugin(params.data.id, payload.sub, params.data.entryId, parsed.data)
      return { plugin }
    } catch (e) {
      if (e instanceof ProjectForbiddenError) return reply.code(403).send({ error: 'PROJECT_FORBIDDEN' })
      throw e
    }
  })

  app.delete<{ Params: { id: string; entryId: string } }>('/projects/:id/plugins/:entryId', async (request, reply) => {
    const payload = resolveSessionAuth(request)
    if (!payload) return reply.code(401).send({ error: 'UNAUTHORIZED' })
    const params = entryIdParams.safeParse(request.params)
    if (!params.success) return reply.code(400).send({ error: 'INVALID_PARAMS' })
    try {
      const ok = await deletePlugin(params.data.id, payload.sub, params.data.entryId)
      if (!ok) return reply.code(404).send({ error: 'NOT_FOUND' })
      return { ok: true }
    } catch (e) {
      if (e instanceof ProjectForbiddenError) return reply.code(403).send({ error: 'PROJECT_FORBIDDEN' })
      throw e
    }
  })

  // --- MCP ---

  app.get<{ Params: { id: string } }>('/projects/:id/mcp', async (request, reply) => {
    const payload = resolveSessionAuth(request)
    if (!payload) return reply.code(401).send({ error: 'UNAUTHORIZED' })
    const params = projectIdParams.safeParse(request.params)
    if (!params.success) return reply.code(400).send({ error: 'INVALID_PARAMS' })
    const found = await findProjectById(params.data.id, payload.sub)
    if (!found.ok) return reply.code(404).send({ error: 'PROJECT_NOT_FOUND' })
    return { mcp: await listMcp(params.data.id) }
  })

  app.post<{ Params: { id: string } }>('/projects/:id/mcp', async (request, reply) => {
    const payload = resolveSessionAuth(request)
    if (!payload) return reply.code(401).send({ error: 'UNAUTHORIZED' })
    const params = projectIdParams.safeParse(request.params)
    if (!params.success) return reply.code(400).send({ error: 'INVALID_PARAMS' })
    const parsed = mcpBody.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'INVALID_PAYLOAD', details: zodErrorSummary(parsed.error) })
    try {
      const entry = await createMcp(params.data.id, payload.sub, parsed.data)
      return reply.code(201).send({ mcp: entry })
    } catch (e) {
      if (e instanceof ProjectForbiddenError) return reply.code(403).send({ error: 'PROJECT_FORBIDDEN' })
      throw e
    }
  })

  app.patch<{ Params: { id: string; entryId: string } }>('/projects/:id/mcp/:entryId', async (request, reply) => {
    const payload = resolveSessionAuth(request)
    if (!payload) return reply.code(401).send({ error: 'UNAUTHORIZED' })
    const params = entryIdParams.safeParse(request.params)
    if (!params.success) return reply.code(400).send({ error: 'INVALID_PARAMS' })
    const parsed = mcpPatch.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'INVALID_PAYLOAD', details: zodErrorSummary(parsed.error) })
    try {
      const entry = await updateMcp(params.data.entryId, payload.sub, parsed.data)
      if (!entry) return reply.code(404).send({ error: 'NOT_FOUND' })
      return { mcp: entry }
    } catch (e) {
      if (e instanceof ProjectForbiddenError) return reply.code(403).send({ error: 'PROJECT_FORBIDDEN' })
      throw e
    }
  })

  app.delete<{ Params: { id: string; entryId: string } }>('/projects/:id/mcp/:entryId', async (request, reply) => {
    const payload = resolveSessionAuth(request)
    if (!payload) return reply.code(401).send({ error: 'UNAUTHORIZED' })
    const params = entryIdParams.safeParse(request.params)
    if (!params.success) return reply.code(400).send({ error: 'INVALID_PARAMS' })
    try {
      const ok = await deleteMcp(params.data.entryId, payload.sub)
      if (!ok) return reply.code(404).send({ error: 'NOT_FOUND' })
      return { ok: true }
    } catch (e) {
      if (e instanceof ProjectForbiddenError) return reply.code(403).send({ error: 'PROJECT_FORBIDDEN' })
      throw e
    }
  })

  // --- External APIs ---

  app.get<{ Params: { id: string } }>('/projects/:id/external-apis', async (request, reply) => {
    const payload = resolveSessionAuth(request)
    if (!payload) return reply.code(401).send({ error: 'UNAUTHORIZED' })
    const params = projectIdParams.safeParse(request.params)
    if (!params.success) return reply.code(400).send({ error: 'INVALID_PARAMS' })
    const found = await findProjectById(params.data.id, payload.sub)
    if (!found.ok) return reply.code(404).send({ error: 'PROJECT_NOT_FOUND' })
    return { externalApis: await listExternalApis(params.data.id) }
  })

  app.post<{ Params: { id: string } }>('/projects/:id/external-apis', async (request, reply) => {
    const payload = resolveSessionAuth(request)
    if (!payload) return reply.code(401).send({ error: 'UNAUTHORIZED' })
    const params = projectIdParams.safeParse(request.params)
    if (!params.success) return reply.code(400).send({ error: 'INVALID_PARAMS' })
    const parsed = externalApiBody.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'INVALID_PAYLOAD', details: zodErrorSummary(parsed.error) })
    try {
      const api = await createExternalApi(params.data.id, payload.sub, parsed.data)
      return reply.code(201).send({ externalApi: api })
    } catch (e) {
      if (e instanceof ProjectForbiddenError) return reply.code(403).send({ error: 'PROJECT_FORBIDDEN' })
      throw e
    }
  })

  app.patch<{ Params: { id: string; entryId: string } }>('/projects/:id/external-apis/:entryId', async (request, reply) => {
    const payload = resolveSessionAuth(request)
    if (!payload) return reply.code(401).send({ error: 'UNAUTHORIZED' })
    const params = entryIdParams.safeParse(request.params)
    if (!params.success) return reply.code(400).send({ error: 'INVALID_PARAMS' })
    const parsed = externalApiPatch.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'INVALID_PAYLOAD', details: zodErrorSummary(parsed.error) })
    try {
      const api = await updateExternalApi(params.data.entryId, payload.sub, parsed.data)
      if (!api) return reply.code(404).send({ error: 'NOT_FOUND' })
      return { externalApi: api }
    } catch (e) {
      if (e instanceof ProjectForbiddenError) return reply.code(403).send({ error: 'PROJECT_FORBIDDEN' })
      throw e
    }
  })

  app.delete<{ Params: { id: string; entryId: string } }>('/projects/:id/external-apis/:entryId', async (request, reply) => {
    const payload = resolveSessionAuth(request)
    if (!payload) return reply.code(401).send({ error: 'UNAUTHORIZED' })
    const params = entryIdParams.safeParse(request.params)
    if (!params.success) return reply.code(400).send({ error: 'INVALID_PARAMS' })
    try {
      const ok = await deleteExternalApi(params.data.entryId, payload.sub)
      if (!ok) return reply.code(404).send({ error: 'NOT_FOUND' })
      return { ok: true }
    } catch (e) {
      if (e instanceof ProjectForbiddenError) return reply.code(403).send({ error: 'PROJECT_FORBIDDEN' })
      throw e
    }
  })

  // --- Project-scoped agents ---

  app.get<{ Params: { id: string } }>('/projects/:id/agents', async (request, reply) => {
    const payload = resolveSessionAuth(request)
    if (!payload) return reply.code(401).send({ error: 'UNAUTHORIZED' })
    const params = projectIdParams.safeParse(request.params)
    if (!params.success) return reply.code(400).send({ error: 'INVALID_PARAMS' })
    const found = await findProjectById(params.data.id, payload.sub)
    if (!found.ok) return reply.code(404).send({ error: 'PROJECT_NOT_FOUND' })

    const agents = await db
      .select()
      .from(messengerAgents)
      .where(
        and(
          eq(messengerAgents.projectId, params.data.id),
          isNull(messengerAgents.deletedAt),
        ),
      )
    return { agents }
  })

  app.post<{ Params: { id: string } }>('/projects/:id/agents', async (request, reply) => {
    const payload = resolveSessionAuth(request)
    if (!payload) return reply.code(401).send({ error: 'UNAUTHORIZED' })
    const params = projectIdParams.safeParse(request.params)
    if (!params.success) return reply.code(400).send({ error: 'INVALID_PARAMS' })
    const found = await findProjectById(params.data.id, payload.sub)
    if (!found.ok) return reply.code(404).send({ error: 'PROJECT_NOT_FOUND' })

    const parsed = createAgentBody.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'INVALID_PAYLOAD', details: zodErrorSummary(parsed.error) })

    const defaults = agentTypeDefaults(parsed.data.type)
    const agentConfig: Record<string, unknown> = {
      type: parsed.data.type,
      skillBundleKind: parsed.data.skillBundleKind ?? defaults.skillBundleKind,
      systemPrompt: parsed.data.systemPrompt ?? defaults.systemPrompt,
    }

    const [agent] = await db
      .insert(messengerAgents)
      .values({
        id: randomUUID(),
        ownerUserId: payload.sub,
        projectId: params.data.id,
        name: parsed.data.name ?? defaults.name,
        description: parsed.data.description ?? null,
        model: parsed.data.model ?? defaults.model,
        ingestToken: randomUUID(),
        config: agentConfig,
      })
      .returning()
    return reply.code(201).send({ agent })
  })

  app.delete<{ Params: { id: string; agentId: string } }>('/projects/:id/agents/:agentId', async (request, reply) => {
    const payload = resolveSessionAuth(request)
    if (!payload) return reply.code(401).send({ error: 'UNAUTHORIZED' })
    const params = z.object({ id: z.string().uuid(), agentId: z.string().uuid() }).safeParse(request.params)
    if (!params.success) return reply.code(400).send({ error: 'INVALID_PARAMS' })

    const [agent] = await db
      .select({ id: messengerAgents.id, ownerUserId: messengerAgents.ownerUserId })
      .from(messengerAgents)
      .where(
        and(
          eq(messengerAgents.id, params.data.agentId),
          eq(messengerAgents.projectId, params.data.id),
          isNull(messengerAgents.deletedAt),
        ),
      )
      .limit(1)
    if (!agent) return reply.code(404).send({ error: 'NOT_FOUND' })
    if (agent.ownerUserId !== payload.sub) return reply.code(403).send({ error: 'PROJECT_FORBIDDEN' })

    await db
      .update(messengerAgents)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(messengerAgents.id, params.data.agentId))
    return { ok: true }
  })

  // --- Bootstrap ---

  app.post<{ Params: { id: string } }>('/projects/:id/bootstrap', async (request, reply) => {
    const payload = resolveSessionAuth(request)
    if (!payload) return reply.code(401).send({ error: 'UNAUTHORIZED' })
    const params = projectIdParams.safeParse(request.params)
    if (!params.success) return reply.code(400).send({ error: 'INVALID_PARAMS' })

    const found = await findProjectById(params.data.id, payload.sub)
    if (!found.ok) return reply.code(404).send({ error: 'PROJECT_NOT_FOUND' })

    const parsed = bootstrapBody.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'INVALID_PAYLOAD', details: zodErrorSummary(parsed.error) })

    if (parsed.data.mode === 'manual') {
      return { ok: true, composerAgentId: null, proposal: null }
    }

    if (!parsed.data.taskDescription) {
      return reply.code(400).send({ error: 'INVALID_PAYLOAD', details: 'taskDescription required for auto mode' })
    }

    // Ensure composer agent exists
    const [existingComposer] = await db
      .select({ id: messengerAgents.id, config: messengerAgents.config })
      .from(messengerAgents)
      .where(
        and(
          eq(messengerAgents.projectId, params.data.id),
          isNull(messengerAgents.deletedAt),
        ),
      )
      .limit(1)

    let composerAgentId: string
    let composerSystemPrompt: string

    if (existingComposer) {
      composerAgentId = existingComposer.id
      const cfg = existingComposer.config as Record<string, unknown> | null
      composerSystemPrompt = typeof cfg?.systemPrompt === 'string' ? cfg.systemPrompt : COMPOSER_SYSTEM_PROMPT
    } else {
      const defaults = agentTypeDefaults('composer')
      const agentConfig: Record<string, unknown> = {
        type: 'composer',
        skillBundleKind: defaults.skillBundleKind,
        systemPrompt: defaults.systemPrompt,
      }
      const [newAgent] = await db
        .insert(messengerAgents)
        .values({
          id: randomUUID(),
          ownerUserId: payload.sub,
          projectId: params.data.id,
          name: defaults.name,
          model: defaults.model,
          ingestToken: randomUUID(),
          config: agentConfig,
        })
        .returning()
      composerAgentId = newAgent!.id
      composerSystemPrompt = defaults.systemPrompt
    }

    // Snapshot current project config
    const { project } = found
    const [connectors, skills, plugins, mcp, externalApis] = await Promise.all([
      listConnectors(params.data.id),
      listSkills(params.data.id),
      listPlugins(params.data.id),
      listMcp(params.data.id),
      listExternalApis(params.data.id),
    ])
    const snapshot = { name: project.name, description: project.description, connectors, skills, plugins, mcp, externalApis }

    const prompt = [
      `Project context: ${JSON.stringify(snapshot)}.`,
      `Task from user: ${parsed.data.taskDescription}.`,
      'Respond ONLY with JSON of shape { connectors: [], skills: [], plugins: [], mcp: [], externalApis: [], agents: [{name,type,description,model,skillBundleKind}] }. No prose.',
    ].join(' ')

    let rawReply: string
    try {
      rawReply = await callClaudeSessionReply({
        slug: 'composer',
        model: 'sonnet',
        systemPrompt: composerSystemPrompt,
        message: prompt,
      })
    } catch (e) {
      return reply.code(502).send({ error: 'BOOTSTRAP_CLI_ERROR', details: e instanceof Error ? e.message : String(e) })
    }

    let proposal: Proposal | null = null
    try {
      const jsonMatch = rawReply.match(/\{[\s\S]*\}/)
      const parsed2 = proposalSchema.safeParse(JSON.parse(jsonMatch?.[0] ?? rawReply))
      if (parsed2.success) proposal = parsed2.data
    } catch {
      // parse failed, return raw
    }

    return {
      composerAgentId,
      proposal,
      rawReply: proposal ? undefined : rawReply,
      applyUrl: proposal ? `/projects/${params.data.id}/bootstrap/apply` : undefined,
    }
  })

  app.post<{ Params: { id: string } }>('/projects/:id/bootstrap/apply', async (request, reply) => {
    const payload = resolveSessionAuth(request)
    if (!payload) return reply.code(401).send({ error: 'UNAUTHORIZED' })
    const params = projectIdParams.safeParse(request.params)
    if (!params.success) return reply.code(400).send({ error: 'INVALID_PARAMS' })

    const found = await findProjectById(params.data.id, payload.sub)
    if (!found.ok) return reply.code(404).send({ error: 'PROJECT_NOT_FOUND' })

    const parsed = applyBootstrapBody.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'INVALID_PAYLOAD', details: zodErrorSummary(parsed.error) })

    const { proposal } = parsed.data
    const projectId = params.data.id
    const ownerUserId = payload.sub

    let connectorCount = 0
    let skillCount = 0
    let pluginCount = 0
    let mcpCount = 0
    let externalApiCount = 0
    let agentCount = 0

    for (const c of proposal.connectors) {
      await createConnector(projectId, ownerUserId, { type: c.type, label: c.label, config: c.config, enabled: c.enabled })
      connectorCount++
    }
    for (const s of proposal.skills) {
      await upsertSkill(projectId, ownerUserId, s.skillId, { enabled: s.enabled, config: s.config })
      skillCount++
    }
    for (const p of proposal.plugins) {
      await upsertPlugin(projectId, ownerUserId, p.pluginId, { enabled: p.enabled, config: p.config })
      pluginCount++
    }
    for (const m of proposal.mcp) {
      await createMcp(projectId, ownerUserId, { name: m.name, transport: m.transport, endpoint: m.endpoint, config: m.config, enabled: m.enabled })
      mcpCount++
    }
    for (const a of proposal.externalApis) {
      await createExternalApi(projectId, ownerUserId, { name: a.name, baseUrl: a.baseUrl, openapiRef: a.openapiRef, authType: a.authType, config: a.config, enabled: a.enabled })
      externalApiCount++
    }
    for (const ag of proposal.agents) {
      const defaults = agentTypeDefaults(ag.type ?? 'custom')
      const agentConfig: Record<string, unknown> = {
        type: ag.type ?? 'custom',
        skillBundleKind: ag.skillBundleKind ?? defaults.skillBundleKind,
        systemPrompt: defaults.systemPrompt,
      }
      await db.insert(messengerAgents).values({
        id: randomUUID(),
        ownerUserId,
        projectId,
        name: ag.name ?? defaults.name,
        description: ag.description ?? null,
        model: ag.model ?? defaults.model,
        ingestToken: randomUUID(),
        config: agentConfig,
      })
      agentCount++
    }

    return {
      ok: true,
      counts: { connectors: connectorCount, skills: skillCount, plugins: pluginCount, mcp: mcpCount, externalApis: externalApiCount, agents: agentCount },
    }
  })
}
