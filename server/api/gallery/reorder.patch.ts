import { useDb } from '~/server/db'
import { galleryItems } from '~/server/db/schema'
import { eq } from 'drizzle-orm'
import { requireAdmin } from '~/server/utils/auth'
import { z } from 'zod'

const ReorderSchema = z.object({
  items: z.array(z.object({
    id: z.number(),
    sortOrder: z.number(),
  })),
})

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const db = useDb()
  const body = await readValidatedNodeBody(event, ReorderSchema)

  // Batch update sort orders
  for (const item of body.items) {
    await db.update(galleryItems)
      .set({ sortOrder: item.sortOrder })
      .where(eq(galleryItems.id, item.id))
  }

  return { ok: true, updated: body.items.length }
})
