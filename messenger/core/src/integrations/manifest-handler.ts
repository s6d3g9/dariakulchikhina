import type { FastifyInstance } from 'fastify'

import { readBearerToken, verifyMessengerToken } from '../auth/auth.ts'
import { readMessengerConfig } from '../config.ts'
import { getManifestResult } from './manifest-loader.ts'

function resolveSessionAuth(request: { headers: { authorization?: string } }) {
  const config = readMessengerConfig()
  const token = readBearerToken(request.headers.authorization ?? '')
  if (!token) return null
  return verifyMessengerToken(token, config.MESSENGER_CORE_AUTH_SECRET)
}

export function registerManifestRoutes(app: FastifyInstance): void {
  app.get('/integrations/manifest', async (request, reply) => {
    const payload = resolveSessionAuth(request)
    if (!payload) return reply.code(401).send({ error: 'UNAUTHORIZED' })

    const result = getManifestResult()
    if (!result) return reply.code(503).send({ error: 'MANIFEST_NOT_LOADED' })

    return result
  })
}
