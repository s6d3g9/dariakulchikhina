import { useDb } from '~/server/db/index'
import { clients, projects } from '~/server/db/schema'
import { eq } from 'drizzle-orm'
import { readNodeBody } from '~/server/utils/body'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const clientId = Number(getRouterParam(event, 'id'))
  const body = await readNodeBody(event) as any
  const projectSlug = body.projectSlug as string
  if (!projectSlug) throw createError({ statusCode: 400, statusMessage: 'projectSlug required' })

  const db = useDb()

  const [client] = await db.select().from(clients).where(eq(clients.id, clientId))
  if (!client) throw createError({ statusCode: 404, statusMessage: 'Client not found' })

  const [project] = await db.select().from(projects).where(eq(projects.slug, projectSlug))
  if (!project) throw createError({ statusCode: 404, statusMessage: 'Project not found' })

  // Merge client data + brief into project profile
  const currentProfile = (project.profile as Record<string, any>) || {}
  const brief = (client.brief as Record<string, any>) || {}
  const updatedProfile = {
    ...currentProfile,
    client_id: String(client.id),
    client_name: client.name,
    ...(client.phone    && { client_phone: client.phone }),
    ...(client.email    && { client_email: client.email }),
    ...(client.address  && { objectAddress: currentProfile.objectAddress || client.address }),
    ...(client.messenger && { client_messenger: client.messenger }),
    ...(client.messengerNick && { client_messenger_nick: client.messengerNick }),
    // Brief fields (only fill if not already in profile)
    ...(brief.style_preference && !currentProfile.style_preference && { style_preference: brief.style_preference }),
    ...(brief.budget           && !currentProfile.budget           && { budget: brief.budget }),
    ...(brief.deadline_wish    && !currentProfile.deadline         && { deadline: brief.deadline_wish }),
    ...(brief.rooms            && !currentProfile.rooms            && { rooms: brief.rooms }),
    ...(brief.wishes           && !currentProfile.client_wishes    && { client_wishes: brief.wishes }),
    ...(brief.about_me         && !currentProfile.client_about     && { client_about: brief.about_me }),
  }

  const [updated] = await db.update(projects)
    .set({ profile: updatedProfile, updatedAt: new Date() })
    .where(eq(projects.slug, projectSlug))
    .returning()

  return { client, project: updated }
})
