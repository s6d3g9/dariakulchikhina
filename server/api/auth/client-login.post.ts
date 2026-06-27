import { useDb } from '~/server/db/index'
import { projects } from '~/server/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { enforceLoginThrottle, recordLoginFailure, recordLoginSuccess, getClientIp } from '~/server/utils/login-throttle'

const Schema = z.object({
  login: z.string().min(3).max(100).trim().toLowerCase(),
  password: z.string().min(1).max(200),
})

export default defineEventHandler(async (event) => {
  await enforceLoginThrottle(event)
  const body = await readValidatedNodeBody(event, Schema)
  const db = useDb()

  const [project] = await db
    .select({
      id: projects.id,
      slug: projects.slug,
      title: projects.title,
      clientPasswordHash: projects.clientPasswordHash,
    })
    .from(projects)
    .where(eq(projects.clientLogin, body.login))
    .limit(1)

  const DUMMY_HASH = '$2a$12$000000000000000000000uGBPRnpKe7P6TBGgKOjHR0INdZOhHIi'
  const ok = await verifyPassword(body.password, project?.clientPasswordHash || DUMMY_HASH)

  if (!project || !project.clientPasswordHash || !ok) {
    recordLoginFailure(getClientIp(event))
    throw createError({ statusCode: 401, statusMessage: 'Неверный логин или пароль' })
  }

  recordLoginSuccess(getClientIp(event))
  setClientSession(event, project.slug)
  return { ok: true, slug: project.slug, title: project.title }
})
