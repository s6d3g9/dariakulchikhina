import { useDb } from '~/server/db/index'
import { documents } from '~/server/db/schema'
import { and, eq, like, isNull } from 'drizzle-orm'
import { unlink } from 'node:fs/promises'
import { join, resolve, basename } from 'node:path'
import { getUploadDir } from '~/server/utils/storage'
import { requireIntParam } from '~/server/utils/query'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const clientId = requireIntParam(event, 'id')
  const docId = requireIntParam(event, 'docId')
  if (!clientId || !Number.isFinite(clientId) || !docId || !Number.isFinite(docId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid params' })
  }

  const db = useDb()
  const [doc] = await db
    .select()
    .from(documents)
    .where(and(
      eq(documents.id, docId),
      like(documents.category, `client:${clientId}:%`),
      isNull(documents.projectId),
    ))
    .limit(1)

  if (!doc) throw createError({ statusCode: 404, statusMessage: 'Document not found' })

  if (doc.filename) {
    const dir = resolve(getUploadDir(), 'client-docs')
    const target = resolve(dir, basename(doc.filename))
    if (target.startsWith(dir)) {
      try { await unlink(target) } catch { /* ignore fs errors */ }
    }
  }

  await db.delete(documents).where(eq(documents.id, docId))
  return { ok: true }
})
