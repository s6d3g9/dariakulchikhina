import { useDb } from '~/server/db/index'
import { projects } from '~/server/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const Schema = z.object({
  slug: z.string().min(1).max(200).toLowerCase().trim(),
})

export default defineEventHandler(async (event) => {
  const { slug } = await readValidatedNodeBody(event, Schema)
  const db = useDb()

  const [project] = await db
    .select({ id: projects.id, slug: projects.slug, title: projects.title, status: projects.status })
    .from(projects)
    .where(eq(projects.slug, slug))
    .limit(1)

  if (!project) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized', message: 'Проект не найден. Проверьте код доступа.' })
  }

  setClientSession(event, project.slug)
  return { ok: true, slug: project.slug, title: project.title }
})
