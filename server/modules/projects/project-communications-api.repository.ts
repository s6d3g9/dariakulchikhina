import { desc, eq, isNull, or } from 'drizzle-orm'

import { useDb } from '~/server/db/index'
import { contractors, documents, projectExtraServices, projects, workStatusItems } from '~/server/db/schema'

export async function findProjectBySlug(slug: string) {
  const db = useDb()
  const [project] = await db
    .select({
      id: projects.id,
      slug: projects.slug,
      title: projects.title,
      status: projects.status,
      projectType: projects.projectType,
      pages: projects.pages,
      profile: projects.profile,
      updatedAt: projects.updatedAt,
    })
    .from(projects)
    .where(eq(projects.slug, slug))
    .limit(1)
  return project ?? null
}

export async function listActionCatalogData(projectId: number) {
  return Promise.all([
    useDb()
      .select({
        id: workStatusItems.id,
        title: workStatusItems.title,
        status: workStatusItems.status,
        workType: workStatusItems.workType,
        contractorId: workStatusItems.contractorId,
        contractorName: contractors.name,
        dateStart: workStatusItems.dateStart,
        dateEnd: workStatusItems.dateEnd,
        notes: workStatusItems.notes,
      })
      .from(workStatusItems)
      .leftJoin(contractors, eq(workStatusItems.contractorId, contractors.id))
      .where(eq(workStatusItems.projectId, projectId))
      .orderBy(workStatusItems.sortOrder),
    useDb()
      .select({
        id: documents.id,
        projectId: documents.projectId,
        category: documents.category,
        title: documents.title,
        filename: documents.filename,
        url: documents.url,
        notes: documents.notes,
        templateKey: documents.templateKey,
        createdAt: documents.createdAt,
      })
      .from(documents)
      .where(or(eq(documents.projectId, projectId), isNull(documents.projectId)))
      .orderBy(desc(documents.createdAt)),
    useDb()
      .select({
        id: projectExtraServices.id,
        title: projectExtraServices.title,
        status: projectExtraServices.status,
        requestedBy: projectExtraServices.requestedBy,
        totalPrice: projectExtraServices.totalPrice,
        description: projectExtraServices.description,
      })
      .from(projectExtraServices)
      .where(eq(projectExtraServices.projectId, projectId))
      .orderBy(desc(projectExtraServices.createdAt)),
  ])
}

export async function updateProjectProfile(slug: string, profile: Record<string, unknown>) {
  const db = useDb()
  const [updated] = await db
    .update(projects)
    .set({
      profile: profile as unknown as Record<string, string>,
      updatedAt: new Date(),
    })
    .where(eq(projects.slug, slug))
    .returning({
      id: projects.id,
      slug: projects.slug,
      profile: projects.profile,
      updatedAt: projects.updatedAt,
    })
  return updated ?? null
}
