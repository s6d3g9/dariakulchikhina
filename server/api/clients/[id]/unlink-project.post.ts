import { useDb } from '~/server/db/index'
import { clients, projects } from '~/server/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const Body = z.object({ projectSlug: z.string().min(1).max(200) })

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const clientId = Number(getRouterParam(event, 'id'))
  const { projectSlug } = await readValidatedNodeBody(event, Body)

  const db = useDb()

  const [client] = await db.select().from(clients).where(eq(clients.id, clientId))
  if (!client) throw createError({ statusCode: 404, statusMessage: 'Client not found' })

  const [project] = await db.select().from(projects).where(eq(projects.slug, projectSlug))
  if (!project) throw createError({ statusCode: 404, statusMessage: 'Project not found' })

  // Remove client from project profile
  const currentProfile = (project.profile as Record<string, any>) || {}
  const currentClientIds = Array.isArray(currentProfile.client_ids)
    ? currentProfile.client_ids.map((id: unknown) => String(id)).filter(Boolean)
    : []
  
  // Remove this client from the list
  const nextClientIds = currentClientIds.filter((id: string) => id !== String(client.id))
  
  const updatedProfile: Record<string, any> = {
    ...currentProfile,
    client_ids: nextClientIds,
  }

  // If this was the primary client
  if (currentProfile.client_id === String(client.id)) {
    if (nextClientIds.length > 0) {
      // Set new primary client
      updatedProfile.client_id = nextClientIds[0]
    } else {
      // Remove all client-related fields if no clients left
      delete updatedProfile.client_id
      delete updatedProfile.client_name
      delete updatedProfile.client_phone
      delete updatedProfile.client_email
      delete updatedProfile.client_messenger
      delete updatedProfile.client_messenger_nick
    }
  }

  const [updated] = await db.update(projects)
    .set({ profile: updatedProfile, updatedAt: new Date() })
    .where(eq(projects.slug, projectSlug))
    .returning()

  return { client, project: updated }
})