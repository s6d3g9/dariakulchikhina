import { useDb } from '~/server/db/index'
import { contractorDocuments } from '~/server/db/schema'
import { eq } from 'drizzle-orm'
import { requireIntParam } from '~/server/utils/query'

export default defineEventHandler(async (event) => {
  const contractorId = requireIntParam(event, 'id')
  requireAdminOrContractor(event, contractorId)
  const db = useDb()
  const docs = await db
    .select()
    .from(contractorDocuments)
    .where(eq(contractorDocuments.contractorId, contractorId))
    .orderBy(contractorDocuments.createdAt)
  return docs
})
