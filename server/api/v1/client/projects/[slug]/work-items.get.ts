import { createHash } from 'node:crypto'
import { eq, inArray, sql } from 'drizzle-orm'

import { useDb } from '~/server/db'
import { contractors, projects, workStatusItemPhotos, workStatusItems } from '~/server/db/schema'
import { createApiV1Envelope } from '~/server/utils/api-v1'
import { createApiV1ClientProjectWorkItemsDto } from '~/server/utils/api-v1-client-work-items'
import { requireAdminOrClient } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Project slug is required' })
  }

  requireAdminOrClient(event, slug)

  const db = useDb()
  const [project] = await db
    .select({
      id: projects.id,
      slug: projects.slug,
      title: projects.title,
      status: projects.status,
      projectType: projects.projectType,
      updatedAt: projects.updatedAt,
    })
    .from(projects)
    .where(eq(projects.slug, slug))
    .limit(1)

  if (!project) {
    throw createError({ statusCode: 404, statusMessage: 'Project not found' })
  }

  const rows = await db
    .select({
      id: workStatusItems.id,
      title: workStatusItems.title,
      status: workStatusItems.status,
      workType: workStatusItems.workType,
      contractorName: contractors.name,
      contractorCompanyName: contractors.companyName,
      dateStart: workStatusItems.dateStart,
      dateEnd: workStatusItems.dateEnd,
      sortOrder: workStatusItems.sortOrder,
    })
    .from(workStatusItems)
    .leftJoin(contractors, eq(workStatusItems.contractorId, contractors.id))
    .where(eq(workStatusItems.projectId, project.id))
    .orderBy(workStatusItems.sortOrder)

  const itemIds = rows.map(row => row.id)
  const photoCountByItemId: Record<number, number> = {}

  if (itemIds.length) {
    const photoCounts = await db
      .select({
        itemId: workStatusItemPhotos.itemId,
        count: sql<number>`cast(count(*) as int)`,
      })
      .from(workStatusItemPhotos)
      .where(inArray(workStatusItemPhotos.itemId, itemIds))
      .groupBy(workStatusItemPhotos.itemId)

    for (const row of photoCounts) {
      photoCountByItemId[row.itemId] = row.count
    }
  }

  const data = createApiV1ClientProjectWorkItemsDto(project, rows, photoCountByItemId)
  const revisionHash = createHash('sha1')
    .update(JSON.stringify(data.items.map(item => ({
      id: item.id,
      status: item.status,
      dateStart: item.dateStart,
      dateEnd: item.dateEnd,
      photoCount: item.photoCount,
    }))))
    .digest('hex')

  return createApiV1Envelope(event, data, {
    revision: `work-items:${revisionHash}`,
  })
})
