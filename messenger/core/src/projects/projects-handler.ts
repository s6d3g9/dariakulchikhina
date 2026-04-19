import type { FastifyInstance, FastifyRequest } from 'fastify'
import { z } from 'zod'
import {
  listMessengerAgentProjects,
  getMessengerAgentProject,
  createMessengerAgentProject,
  deleteMessengerAgentProject,
} from './project-store.ts'
import {
  listProjectMcpServers,
  createProjectMcpServer,
  updateProjectMcpServer,
  deleteProjectMcpServer,
} from './project-mcp-store.ts'
import {
  listProjectExternalApis,
  createProjectExternalApi,
  updateProjectExternalApi,
  deleteProjectExternalApi,
} from './project-external-apis-store.ts'

type SessionResolver = (request: FastifyRequest) => Promise<{ user: { id: string } } | null>

const createProjectSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
})

const createMcpSchema = z.object({
  name: z.string().min(1).max(120),
  transport: z.enum(['http', 'stdio', 'sse']),
  endpoint: z.string().min(1),
  config: z.record(z.unknown()).optional(),
  enabled: z.boolean().optional(),
})

const updateMcpSchema = createMcpSchema.partial()

const createExternalApiSchema = z.object({
  name: z.string().min(1).max(120),
  baseUrl: z.string().min(1),
  openapiRef: z.string().optional(),
  authType: z.enum(['none', 'bearer', 'basic', 'header']).optional(),
  config: z.record(z.unknown()).optional(),
  enabled: z.boolean().optional(),
})

const updateExternalApiSchema = createExternalApiSchema.partial()

export function registerProjectConfigRoutes(app: FastifyInstance, resolveSession: SessionResolver): void {
  // ── Projects ───────────────────────────────────────────────────────────────

  app.get('/projects', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) return reply.code(401).send({ error: 'UNAUTHORIZED' })
    const projects = await listMessengerAgentProjects(session.user.id)
    return { projects }
  })

  app.post('/projects', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) return reply.code(401).send({ error: 'UNAUTHORIZED' })
    const parsed = createProjectSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'INVALID_PAYLOAD' })
    const project = await createMessengerAgentProject(session.user.id, parsed.data)
    return reply.code(201).send({ project })
  })

  app.get<{ Params: { projectId: string } }>('/projects/:projectId', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) return reply.code(401).send({ error: 'UNAUTHORIZED' })
    const project = await getMessengerAgentProject(request.params.projectId)
    if (!project || project.ownerUserId !== session.user.id) return reply.code(404).send({ error: 'NOT_FOUND' })
    return { project }
  })

  app.delete<{ Params: { projectId: string } }>('/projects/:projectId', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) return reply.code(401).send({ error: 'UNAUTHORIZED' })
    const project = await getMessengerAgentProject(request.params.projectId)
    if (!project || project.ownerUserId !== session.user.id) return reply.code(404).send({ error: 'NOT_FOUND' })
    await deleteMessengerAgentProject(request.params.projectId)
    return { ok: true }
  })

  // ── MCP Servers ────────────────────────────────────────────────────────────

  app.get<{ Params: { projectId: string } }>('/projects/:projectId/mcp', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) return reply.code(401).send({ error: 'UNAUTHORIZED' })
    const project = await getMessengerAgentProject(request.params.projectId)
    if (!project || project.ownerUserId !== session.user.id) return reply.code(404).send({ error: 'NOT_FOUND' })
    const servers = await listProjectMcpServers(request.params.projectId)
    return { servers }
  })

  app.post<{ Params: { projectId: string } }>('/projects/:projectId/mcp', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) return reply.code(401).send({ error: 'UNAUTHORIZED' })
    const project = await getMessengerAgentProject(request.params.projectId)
    if (!project || project.ownerUserId !== session.user.id) return reply.code(404).send({ error: 'NOT_FOUND' })
    const parsed = createMcpSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'INVALID_PAYLOAD' })
    const server = await createProjectMcpServer(request.params.projectId, parsed.data)
    return reply.code(201).send({ server })
  })

  app.patch<{ Params: { projectId: string; entryId: string } }>('/projects/:projectId/mcp/:entryId', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) return reply.code(401).send({ error: 'UNAUTHORIZED' })
    const project = await getMessengerAgentProject(request.params.projectId)
    if (!project || project.ownerUserId !== session.user.id) return reply.code(404).send({ error: 'NOT_FOUND' })
    const parsed = updateMcpSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'INVALID_PAYLOAD' })
    const server = await updateProjectMcpServer(request.params.entryId, request.params.projectId, parsed.data)
    if (!server) return reply.code(404).send({ error: 'NOT_FOUND' })
    return { server }
  })

  app.delete<{ Params: { projectId: string; entryId: string } }>('/projects/:projectId/mcp/:entryId', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) return reply.code(401).send({ error: 'UNAUTHORIZED' })
    const project = await getMessengerAgentProject(request.params.projectId)
    if (!project || project.ownerUserId !== session.user.id) return reply.code(404).send({ error: 'NOT_FOUND' })
    await deleteProjectMcpServer(request.params.entryId, request.params.projectId)
    return { ok: true }
  })

  // MCP health-check: attempts to reach the endpoint and returns status
  app.post<{ Params: { projectId: string; entryId: string } }>('/projects/:projectId/mcp/:entryId/ping', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) return reply.code(401).send({ error: 'UNAUTHORIZED' })
    const project = await getMessengerAgentProject(request.params.projectId)
    if (!project || project.ownerUserId !== session.user.id) return reply.code(404).send({ error: 'NOT_FOUND' })
    const servers = await listProjectMcpServers(request.params.projectId)
    const server = servers.find(s => s.id === request.params.entryId)
    if (!server) return reply.code(404).send({ error: 'NOT_FOUND' })

    // Only HTTP/SSE transports are pingable via fetch
    if (server.transport !== 'http' && server.transport !== 'sse') {
      return { status: 'ok', message: 'stdio transport — no network ping available' }
    }

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 5000)
      const res = await fetch(server.endpoint, {
        method: 'GET',
        signal: controller.signal,
        headers: { Accept: 'application/json, text/plain, */*' },
      }).finally(() => clearTimeout(timeout))
      return { status: res.ok ? 'ok' : 'error', httpStatus: res.status }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'unreachable'
      return { status: 'unreachable', message }
    }
  })

  // ── External APIs ──────────────────────────────────────────────────────────

  app.get<{ Params: { projectId: string } }>('/projects/:projectId/external-apis', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) return reply.code(401).send({ error: 'UNAUTHORIZED' })
    const project = await getMessengerAgentProject(request.params.projectId)
    if (!project || project.ownerUserId !== session.user.id) return reply.code(404).send({ error: 'NOT_FOUND' })
    const apis = await listProjectExternalApis(request.params.projectId)
    return { apis }
  })

  app.post<{ Params: { projectId: string } }>('/projects/:projectId/external-apis', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) return reply.code(401).send({ error: 'UNAUTHORIZED' })
    const project = await getMessengerAgentProject(request.params.projectId)
    if (!project || project.ownerUserId !== session.user.id) return reply.code(404).send({ error: 'NOT_FOUND' })
    const parsed = createExternalApiSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'INVALID_PAYLOAD' })
    const api = await createProjectExternalApi(request.params.projectId, parsed.data)
    return reply.code(201).send({ api })
  })

  app.patch<{ Params: { projectId: string; entryId: string } }>('/projects/:projectId/external-apis/:entryId', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) return reply.code(401).send({ error: 'UNAUTHORIZED' })
    const project = await getMessengerAgentProject(request.params.projectId)
    if (!project || project.ownerUserId !== session.user.id) return reply.code(404).send({ error: 'NOT_FOUND' })
    const parsed = updateExternalApiSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'INVALID_PAYLOAD' })
    const api = await updateProjectExternalApi(request.params.entryId, request.params.projectId, parsed.data)
    if (!api) return reply.code(404).send({ error: 'NOT_FOUND' })
    return { api }
  })

  app.delete<{ Params: { projectId: string; entryId: string } }>('/projects/:projectId/external-apis/:entryId', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) return reply.code(401).send({ error: 'UNAUTHORIZED' })
    const project = await getMessengerAgentProject(request.params.projectId)
    if (!project || project.ownerUserId !== session.user.id) return reply.code(404).send({ error: 'NOT_FOUND' })
    await deleteProjectExternalApi(request.params.entryId, request.params.projectId)
    return { ok: true }
  })
}
