import { useDb } from '~/server/db/index'
import { documents } from '~/server/db/schema'
import { eq } from 'drizzle-orm'
import { unlink } from 'fs/promises'
import path from 'path'
import { getUploadDir } from '~/server/utils/storage'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400 })

  const db = useDb()
  const [deleted] = await db.delete(documents).where(eq(documents.id, id)).returning()
  if (!deleted) throw createError({ statusCode: 404 })

  // Clean up file from disk
  if (deleted.filename) {
    const fn = path.basename(deleted.filename)
    if (fn && !fn.includes('..')) {
      try { await unlink(path.join(getUploadDir(), fn)) } catch { /* file may already be deleted */ }
    }
  }

  return { ok: true }
})
