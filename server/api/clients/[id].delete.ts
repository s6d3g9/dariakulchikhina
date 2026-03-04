import { useDb } from '~/server/db/index'
import { clients, projects } from '~/server/db/schema'
import { eq, sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!id || !Number.isFinite(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid client id' })
  }
  const db = useDb()

  // Clean up client_id references in projects.profile JSON
  // Find projects that reference this client in their profile
  const linkedProjects = await db.select({ id: projects.id, profile: projects.profile })
    .from(projects)
    .where(sql`${projects.profile}->>'client_id' = ${String(id)}`)

  for (const proj of linkedProjects) {
    const profile = (proj.profile || {}) as Record<string, any>
    delete profile.client_id
    await db.update(projects).set({ profile }).where(eq(projects.id, proj.id))
  }

  // Also clean up client_ids arrays that reference this client
  const projectsWithArray = await db.select({ id: projects.id, profile: projects.profile })
    .from(projects)
    .where(sql`${projects.profile}->'client_ids' @> ${JSON.stringify([id])}::jsonb`)

  for (const proj of projectsWithArray) {
    const profile = (proj.profile || {}) as Record<string, any>
    if (Array.isArray(profile.client_ids)) {
      profile.client_ids = profile.client_ids.filter((cid: any) => Number(cid) !== id)
    }
    await db.update(projects).set({ profile }).where(eq(projects.id, proj.id))
  }

  await db.delete(clients).where(eq(clients.id, id))
  return { ok: true }
})
