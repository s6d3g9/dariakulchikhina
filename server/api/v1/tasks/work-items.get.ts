import { createHash } from 'node:crypto'
import { asc, eq, inArray, sql } from 'drizzle-orm'

import { useDb } from '~/server/db'
import {
  contractors,
  projects,
  workStatusItemComments,
  workStatusItemPhotos,
  workStatusItems,
} from '~/server/db/schema'
import { createApiV1Envelope } from '~/server/utils/api-v1'
import {
  createApiV1TasksWorkItemsDto,
  type ApiV1TaskContractorRow,
  type ApiV1TaskLegacyWorkItemRow,
} from '~/server/utils/api-v1-tasks'
import { requireAdmin } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const query = safeGetQuery(event)
  const q = typeof query.q === 'string' ? query.q : ''
  const projectSlug = typeof query.projectSlug === 'string' ? query.projectSlug : ''
  const assigneeId = typeof query.assigneeId === 'string' ? query.assigneeId : ''
  const status = typeof query.status === 'string' ? query.status : ''
  const limit = Number(query.limit || 100)
  const offset = Number(query.offset || 0)

  const db = useDb()
  const [contractorRows, rawWorkItemRows] = await Promise.all([
    db
      .select({
        id: contractors.id,
        name: contractors.name,
        companyName: contractors.companyName,
        contactPerson: contractors.contactPerson,
        phone: contractors.phone,
        email: contractors.email,
        messenger: contractors.messenger,
        messengerNick: contractors.messengerNick,
        workTypes: contractors.workTypes,
        roleTypes: contractors.roleTypes,
        contractorType: contractors.contractorType,
        parentId: contractors.parentId,
        createdAt: contractors.createdAt,
      })
      .from(contractors)
      .orderBy(asc(contractors.name))
      .limit(1000),
    db
      .select({
        id: workStatusItems.id,
        project: {
          id: projects.id,
          slug: projects.slug,
          title: projects.title,
          status: projects.status,
          projectType: projects.projectType,
          updatedAt: projects.updatedAt,
        },
        contractorId: workStatusItems.contractorId,
        title: workStatusItems.title,
        workType: workStatusItems.workType,
        status: workStatusItems.status,
        dateStart: workStatusItems.dateStart,
        dateEnd: workStatusItems.dateEnd,
        sortOrder: workStatusItems.sortOrder,
      })
      .from(workStatusItems)
      .innerJoin(projects, eq(projects.id, workStatusItems.projectId))
      .orderBy(asc(projects.title), asc(workStatusItems.sortOrder))
      .limit(5000),
  ])

  const itemIds = rawWorkItemRows.map(item => item.id)
  const photoCountByItemId: Record<number, number> = {}
  const commentCountByItemId: Record<number, number> = {}

  if (itemIds.length) {
    const [photoCounts, commentCounts] = await Promise.all([
      db
        .select({
          itemId: workStatusItemPhotos.itemId,
          count: sql<number>`cast(count(*) as int)`,
        })
        .from(workStatusItemPhotos)
        .where(inArray(workStatusItemPhotos.itemId, itemIds))
        .groupBy(workStatusItemPhotos.itemId),
      db
        .select({
          itemId: workStatusItemComments.itemId,
          count: sql<number>`cast(count(*) as int)`,
        })
        .from(workStatusItemComments)
        .where(inArray(workStatusItemComments.itemId, itemIds))
        .groupBy(workStatusItemComments.itemId),
    ])

    for (const row of photoCounts) photoCountByItemId[row.itemId] = row.count
    for (const row of commentCounts) commentCountByItemId[row.itemId] = row.count
  }

  const workItemRows = rawWorkItemRows.map(item => ({
    ...item,
    photoCount: photoCountByItemId[item.id] || 0,
    commentCount: commentCountByItemId[item.id] || 0,
  }))

  const data = createApiV1TasksWorkItemsDto({
    contractors: contractorRows as ApiV1TaskContractorRow[],
    workItems: workItemRows as ApiV1TaskLegacyWorkItemRow[],
    filters: {
      q,
      projectSlug,
      assigneeId,
      status,
      limit,
      offset,
    },
  })

  const revisionHash = createHash('sha1')
    .update(JSON.stringify({
      summary: data.summary,
      filters: data.filters,
      items: data.items.map(item => ({
        id: item.id,
        project: item.project.id,
        assignee: item.assignee?.id || '',
        legalSubject: item.legalSubject?.id || '',
        workerStatus: item.workerStatus,
        photoCount: item.photoCount,
        commentCount: item.commentCount,
      })),
    }))
    .digest('hex')

  return createApiV1Envelope(event, data, {
    revision: `tasks-work-items:${revisionHash}`,
  })
})
