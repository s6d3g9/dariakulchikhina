import { randomUUID } from 'node:crypto'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { readBearerToken, verifyMessengerToken } from '../../auth/auth.ts'
import { readMessengerConfig } from '../../config.ts'
import { findProjectById } from '../project-store.ts'
import {
  deleteProjectKnowledgeSource,
  insertProjectKnowledge,
  listProjectKnowledgeSources,
  searchProjectKnowledge,
} from './knowledge-store.ts'

function resolveSessionAuth(request: FastifyRequest) {
  const config = readMessengerConfig()
  const token = readBearerToken(request.headers.authorization ?? '')
  if (!token) return null
  return verifyMessengerToken(token, config.MESSENGER_CORE_AUTH_SECRET)
}

function zodErrorSummary(error: z.ZodError): string {
  return error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')
}

const projectIdParams = z.object({ id: z.string().uuid() })
const sourceIdParams = z.object({ id: z.string().uuid(), sourceId: z.string().uuid() })

const uploadBody = z.object({
  sourceUri: z.string().min(1).max(2000),
  text: z.string().min(1).max(1_000_000),
})

const searchBody = z.object({
  query: z.string().min(1).max(2000),
  k: z.number().int().min(1).max(20).default(5),
})

export function registerProjectKnowledgeRoutes(app: FastifyInstance): void {
  app.post('/projects/:id/knowledge', async (request, reply) => {
    const payload = resolveSessionAuth(request)
    if (!payload) return reply.code(401).send({ error: 'UNAUTHORIZED' })

    const params = projectIdParams.safeParse(request.params)
    if (!params.success) return reply.code(400).send({ error: 'INVALID_PARAMS' })

    const body = uploadBody.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: 'INVALID_PAYLOAD', details: zodErrorSummary(body.error) })

    const found = await findProjectById(params.data.id, payload.sub)
    if (!found.ok) return reply.code(404).send({ error: 'PROJECT_NOT_FOUND' })

    const sourceId = randomUUID()
    const result = await insertProjectKnowledge({
      projectId: params.data.id,
      sourceId,
      sourceUri: body.data.sourceUri,
      text: body.data.text,
    })

    return reply.code(201).send(result)
  })

  app.get('/projects/:id/knowledge', async (request, reply) => {
    const payload = resolveSessionAuth(request)
    if (!payload) return reply.code(401).send({ error: 'UNAUTHORIZED' })

    const params = projectIdParams.safeParse(request.params)
    if (!params.success) return reply.code(400).send({ error: 'INVALID_PARAMS' })

    const found = await findProjectById(params.data.id, payload.sub)
    if (!found.ok) return reply.code(404).send({ error: 'PROJECT_NOT_FOUND' })

    const sources = await listProjectKnowledgeSources(params.data.id)
    return { sources }
  })

  app.delete('/projects/:id/knowledge/:sourceId', async (request, reply) => {
    const payload = resolveSessionAuth(request)
    if (!payload) return reply.code(401).send({ error: 'UNAUTHORIZED' })

    const params = sourceIdParams.safeParse(request.params)
    if (!params.success) return reply.code(400).send({ error: 'INVALID_PARAMS' })

    const found = await findProjectById(params.data.id, payload.sub)
    if (!found.ok) return reply.code(404).send({ error: 'PROJECT_NOT_FOUND' })

    const deleted = await deleteProjectKnowledgeSource(params.data.id, params.data.sourceId)
    if (!deleted) return reply.code(404).send({ error: 'SOURCE_NOT_FOUND' })

    return reply.code(204).send()
  })

  app.post('/projects/:id/knowledge/search', async (request, reply) => {
    const payload = resolveSessionAuth(request)
    if (!payload) return reply.code(401).send({ error: 'UNAUTHORIZED' })

    const params = projectIdParams.safeParse(request.params)
    if (!params.success) return reply.code(400).send({ error: 'INVALID_PARAMS' })

    const body = searchBody.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: 'INVALID_PAYLOAD', details: zodErrorSummary(body.error) })

    const found = await findProjectById(params.data.id, payload.sub)
    if (!found.ok) return reply.code(404).send({ error: 'PROJECT_NOT_FOUND' })

    const chunks = await searchProjectKnowledge({
      projectId: params.data.id,
      query: body.data.query,
      k: body.data.k,
    })

    return { chunks }
  })
}
