import { useDb } from '~/server/db/index'
import { documents, projects } from '~/server/db/schema'
import { eq, desc } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const query = safeGetQuery(event)
  const category    = (query.category as string) || ''
  const projectSlug = (query.projectSlug as string) || ''

  const db = useDb()

  let rows: any[] = []

  if (projectSlug) {
    const [project] = await db.select({ id: projects.id, title: projects.title })
      .from(projects).where(eq(projects.slug, projectSlug)).limit(1)
    if (!project) return []
    rows = category
      ? await db.select().from(documents)
          .where(eq(documents.projectId, project.id))
          .orderBy(desc(documents.createdAt))
      : await db.select().from(documents)
          .where(eq(documents.projectId, project.id))
          .orderBy(desc(documents.createdAt))
    // filter category in JS to avoid complex where
    if (category) rows = rows.filter(r => r.category === category)
  } else {
    rows = await db.select({
      doc: documents,
      projectTitle: projects.title,
      projectSlug: projects.slug,
    })
      .from(documents)
      .leftJoin(projects, eq(documents.projectId, projects.id))
      .orderBy(desc(documents.createdAt))

    // flatten and filter
    rows = rows.map((r: any) => ({
      ...r.doc,
      projectTitle: r.projectTitle || null,
      projectSlug: r.projectSlug || null,
    }))
    if (category) rows = rows.filter(r => r.category === category)
  }

  return rows
})
