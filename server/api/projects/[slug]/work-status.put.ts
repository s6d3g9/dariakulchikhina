import { z } from 'zod'
import { replaceProjectWorkStatusBySlug } from '~/server/modules/projects/project-work-status.service'

const Body = z.object({
  items: z.array(z.object({
    id: z.number().optional(),
    contractorId: z.number().optional().nullable(),
    title: z.string(),
    workType: z.string().optional().nullable(),
    status: z.string().default('pending'),
    dateStart: z.string().optional().nullable(),
    dateEnd: z.string().optional().nullable(),
    budget: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    sortOrder: z.number().optional(),
  })).max(500)
})

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const slug = getRouterParam(event, 'slug')!
  const body = await readValidatedNodeBody(event, Body)
  const items = await replaceProjectWorkStatusBySlug(slug, body.items)
  if (!items) {
    throw createError({ statusCode: 404 })
  }

  return items
})
