import { useDb } from '~/server/db'
import { defineEventHandler, readBody, createError } from 'h3'
import { z } from 'zod'
import { projects } from '~/server/db/schema'
import { eq } from 'drizzle-orm'

const dispatchSchema = z.object({
  memberId: z.string().min(1),
  message: z.string().min(1),
})

export default defineEventHandler(async (event) => {
  const slug = event.context.params?.slug
  if (!slug) throw createError({ statusCode: 400, message: 'Missing slug' })

  const body = await readBody(event)
  const parsed = dispatchSchema.safeParse(body)
  
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid payload', data: parsed.error })
  }

  const { memberId, message } = parsed.data

  const db = useDb()
  const projectRows = await db.select({ profile: projects.profile }).from(projects).where(eq(projects.slug, slug)).limit(1)
  
  if (!projectRows.length) {
    throw createError({ statusCode: 404, message: 'Project not found' })
  }
  
  const profile = projectRows[0].profile as any
  const team = profile?.hybridControl?.team || []
  
  const member = team.find((m: any) => m.id === memberId)
  if (!member) {
    throw createError({ statusCode: 404, message: 'Team member not found in project' })
  }

  const notifyBy = member.notifyBy || 'manual'

  // TODO: Actual integration gateway calls go here (LiveKit / Telegram / SMTP)
  console.log(`[DISPATCH] Sending message to ${member.name} (${member.contact}) via ${notifyBy}: ${message}`)
  
  // Here we simulate successful dispatch
  
  return {
    success: true,
    channel: notifyBy,
    dispatchedTo: member.name,
    messageSent: message
  }
})
