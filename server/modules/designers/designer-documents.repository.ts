import { eq, and, like, isNull } from 'drizzle-orm'
import { useDb } from '~/server/db/index'
import { documents } from '~/server/db/schema'

export async function listDesignerDocumentsByPrefix(prefix: string) {
  const db = useDb()
  return db
    .select()
    .from(documents)
    .where(and(like(documents.category, `${prefix}%`), isNull(documents.projectId)))
    .orderBy(documents.createdAt)
}

export async function insertDesignerDocument(values: {
  projectId: null
  category: string
  title: string
  filename: string
  url: string
  notes: string | null
}) {
  const db = useDb()
  const [doc] = await db.insert(documents).values(values).returning()
  return doc
}

export async function findDesignerDocumentByIdAndPrefix(
  docId: number,
  prefix: string,
) {
  const db = useDb()
  const [doc] = await db
    .select()
    .from(documents)
    .where(
      and(
        eq(documents.id, docId),
        like(documents.category, `${prefix}%`),
        isNull(documents.projectId),
      ),
    )
    .limit(1)
  return doc ?? null
}

export async function deleteDesignerDocumentRow(docId: number) {
  const db = useDb()
  await db.delete(documents).where(eq(documents.id, docId))
}
