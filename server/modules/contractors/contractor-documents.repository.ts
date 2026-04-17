import { eq, and } from 'drizzle-orm'
import { useDb } from '~/server/db/index'
import { contractorDocuments } from '~/server/db/schema'

export async function listContractorDocuments(contractorId: number) {
  const db = useDb()
  return db
    .select()
    .from(contractorDocuments)
    .where(eq(contractorDocuments.contractorId, contractorId))
    .orderBy(contractorDocuments.createdAt)
}

export async function insertContractorDocument(values: {
  contractorId: number
  category: string
  title: string
  filename: string
  url: string
  notes: string | null
  expiresAt: string | null
}) {
  const db = useDb()
  const [doc] = await db.insert(contractorDocuments).values(values).returning()
  return doc
}

export async function findContractorDocumentOwned(
  contractorId: number,
  docId: number,
) {
  const db = useDb()
  const [doc] = await db
    .select()
    .from(contractorDocuments)
    .where(
      and(
        eq(contractorDocuments.id, docId),
        eq(contractorDocuments.contractorId, contractorId),
      ),
    )
    .limit(1)
  return doc ?? null
}

export async function deleteContractorDocumentRow(docId: number) {
  const db = useDb()
  await db.delete(contractorDocuments).where(eq(contractorDocuments.id, docId))
}
