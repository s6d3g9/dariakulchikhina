import { useDb } from '~/server/db/index'
import { projects } from '~/server/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const Schema = z.union([
  z.object({
    slug: z.string().min(1).max(200).toLowerCase().trim(),
  }),
  z.object({
    login: z.string().min(3).max(100).trim().toLowerCase(),
    password: z.string().min(1),
  }),
])

export default defineEventHandler(async (event) => {
  const body = await readValidatedNodeBody(event, Schema)
  const db = useDb()

  if ('slug' in body) {
    const [project] = await db
      .select({ id: projects.id, slug: projects.slug, title: projects.title, status: projects.status })
      .from(projects)
      .where(eq(projects.slug, body.slug))
      .limit(1)

    if (!project) {
      throw createError({ statusCode: 401, statusMessage: 'Проект не найден. Проверьте код доступа.' })
    }

    setClientSession(event, project.slug)
    return { ok: true, slug: project.slug, title: project.title }
  }

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

  if (!project || !project.clientPasswordHash) {
    throw createError({ statusCode: 401, statusMessage: 'Неверный логин или пароль' })
  }

  const ok = await verifyPassword(body.password, project.clientPasswordHash)
  if (!ok) {
    throw createError({ statusCode: 401, statusMessage: 'Неверный логин или пароль' })
  }

  setClientSession(event, project.slug)
  return { ok: true, slug: project.slug, title: project.title }
})
