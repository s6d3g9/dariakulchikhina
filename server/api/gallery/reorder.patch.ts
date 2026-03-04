import { useDb } from '~/server/db'
import { galleryItems } from '~/server/db/schema'
import { eq } from 'drizzle-orm'
import { requireAdmin } from '~/server/utils/auth'
import { z } from 'zod'

const ReorderSchema = z.object({
  items: z.array(z.object({
    id: z.number(),
    sortOrder: z.number(),
  })).max(1000),
})

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const db = useDb()
  const body = await readValidatedNodeBody(event, ReorderSchema)

  // Wrap in transaction for consistency
  await db.transaction(async (tx) => {
    for (const item of body.items) {
      await tx.update(galleryItems)
        .set({ sortOrder: item.sortOrder })
        .where(eq(galleryItems.id, item.id))
    }
  })

  return { ok: true, updated: body.items.length }
})
