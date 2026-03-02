import { useDb } from '~/server/db/index'
import { documents } from '~/server/db/schema'
import { and, eq, like, isNull } from 'drizzle-orm'
import { unlink } from 'node:fs/promises'
import { join } from 'node:path'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const clientId = Number(getRouterParam(event, 'id'))
  const docId = Number(getRouterParam(event, 'docId'))
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
    try {
      await unlink(join(process.cwd(), 'public', 'uploads', 'client-docs', doc.filename))
    } catch {
      // ignore fs errors
    }
  }

  await db.delete(documents).where(eq(documents.id, docId))
  return { ok: true }
})
