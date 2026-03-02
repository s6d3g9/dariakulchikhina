import { useDb } from '~/server/db'
import { galleryItems } from '~/server/db/schema'
import { eq } from 'drizzle-orm'
import { requireAdmin } from '~/server/utils/auth'
import { unlink } from 'fs/promises'
import path from 'path'
import { getUploadDir } from '~/server/utils/storage'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const db = useDb()
  const id = Number(getRouterParam(event, 'id'))
  // Fetch item first to get file references
  const [item] = await db.select().from(galleryItems).where(eq(galleryItems.id, id)).limit(1)
  if (!item) throw createError({ statusCode: 404 })

  await db.delete(galleryItems).where(eq(galleryItems.id, id))

  // Clean up files from disk
  const uploadDir = getUploadDir()
  const filesToDelete: string[] = []
  if (item.image) filesToDelete.push(path.basename(item.image))
  if (Array.isArray(item.images)) {
    for (const img of item.images) {
      if (typeof img === 'string' && img) filesToDelete.push(path.basename(img))
    }
  }
  for (const fn of filesToDelete) {
    if (fn && !fn.includes('..')) {
      try { await unlink(path.join(uploadDir, fn)) } catch { /* file may already be deleted */ }
    }
  }

  return { ok: true }
})
