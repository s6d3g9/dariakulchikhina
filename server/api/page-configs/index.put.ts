import { useDb } from '~/server/db/index'
import { pageConfigs } from '~/server/db/schema'
import { z } from 'zod'

const BodySchema = z.object({
  pages: z.array(z.object({
    slug: z.string().min(1),
    title: z.string().min(1),
    pageTitle: z.string().optional().nullable(),
    fontSize: z.number().int().min(10).max(28).optional(),
    sortOrder: z.number().int().optional(),
  })).min(1),
})

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const body = await readValidatedNodeBody(event, BodySchema)
  const db = useDb()

  await db.transaction(async (tx) => {
    await tx.delete(pageConfigs)
    await tx.insert(pageConfigs).values(
      body.pages.map((p, index) => ({
        slug: p.slug,
        title: p.title,
        pageTitle: p.pageTitle || '',
        fontSize: p.fontSize ?? 16,
        sortOrder: p.sortOrder ?? index,
      })),
    )
  })

  return db.select().from(pageConfigs).orderBy(pageConfigs.sortOrder, pageConfigs.id)
})
