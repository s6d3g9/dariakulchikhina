import { useDb } from '~/server/db/index'
import { contractorDocuments } from '~/server/db/schema'
import { eq, and } from 'drizzle-orm'
import { unlink } from 'node:fs/promises'
import { join } from 'node:path'

export default defineEventHandler(async (event) => {
  const contractorId = Number(getRouterParam(event, 'id'))
  const docId = Number(getRouterParam(event, 'docId'))
  requireAdminOrContractor(event, contractorId)

  const db = useDb()
  const [doc] = await db
    .select()
    .from(contractorDocuments)
    .where(and(eq(contractorDocuments.id, docId), eq(contractorDocuments.contractorId, contractorId)))
    .limit(1)

  if (!doc) throw createError({ statusCode: 404 })

  // Try to delete file from disk
  if (doc.filename) {
    try {
      await unlink(join(process.cwd(), 'public', 'uploads', 'contractor-docs', doc.filename))
    } catch { /* ignore */ }
  }

  await db.delete(contractorDocuments).where(eq(contractorDocuments.id, docId))
  return { ok: true }
})
