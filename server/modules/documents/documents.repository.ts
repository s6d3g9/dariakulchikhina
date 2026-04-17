import { eq, desc, inArray } from 'drizzle-orm'
import { useDb } from '~/server/db/index'
import { documents, projects, clients, contractors, projectContractors, pageContent } from '~/server/db/schema'

export async function findDocumentById(id: number) {
  const db = useDb()
  const [doc] = await db.select().from(documents).where(eq(documents.id, id)).limit(1)
  return doc ?? null
}

export async function findProjectBySlug(slug: string) {
  const db = useDb()
  const [proj] = await db.select().from(projects).where(eq(projects.slug, slug)).limit(1)
  return proj ?? null
}

export async function listDocumentsByProjectId(projectId: number) {
  const db = useDb()
  return db
    .select()
    .from(documents)
    .where(eq(documents.projectId, projectId))
    .orderBy(desc(documents.createdAt))
}

export async function listAllDocumentsWithProject() {
  const db = useDb()
  const joined = await db
    .select({
      doc: documents,
      projectTitle: projects.title,
      projectSlug: projects.slug,
    })
    .from(documents)
    .leftJoin(projects, eq(documents.projectId, projects.id))
    .orderBy(desc(documents.createdAt))
  return joined.map((r) => ({
    ...r.doc,
    projectTitle: r.projectTitle ?? null,
    projectSlug: r.projectSlug ?? null,
  }))
}

export async function insertDocument(values: {
  title: string
  category: string
  filename: string | null
  url: string | null
  projectId: number | null
  notes: string | null
  content: string | null
  templateKey: string | null
}) {
  const db = useDb()
  const [doc] = await db.insert(documents).values(values).returning()
  return doc
}

export async function updateDocumentRow(id: number, updates: Record<string, unknown>) {
  const db = useDb()
  const [doc] = await db.update(documents).set(updates).where(eq(documents.id, id)).returning()
  return doc ?? null
}

export async function deleteDocumentRow(id: number) {
  const db = useDb()
  const [deleted] = await db.delete(documents).where(eq(documents.id, id)).returning()
  return deleted ?? null
}

export async function listPageContentByProjectId(projectId: number) {
  const db = useDb()
  return db.select().from(pageContent).where(eq(pageContent.projectId, projectId))
}

export async function listClientsByIds(ids: number[]) {
  const db = useDb()
  if (ids.length === 0) return []
  return db.select().from(clients).where(inArray(clients.id, ids))
}

export async function listAllClients() {
  const db = useDb()
  return db.select().from(clients).orderBy(clients.name)
}

export async function listProjectContractorIds(projectId: number) {
  const db = useDb()
  const rows = await db
    .select({ contractorId: projectContractors.contractorId })
    .from(projectContractors)
    .where(eq(projectContractors.projectId, projectId))
  return rows.map((r) => r.contractorId)
}

export async function listContractorsByIds(ids: number[]) {
  const db = useDb()
  if (ids.length === 0) return []
  return db.select().from(contractors).where(inArray(contractors.id, ids))
}

export async function listAllContractors() {
  const db = useDb()
  return db.select().from(contractors).orderBy(contractors.name)
}
