import { useDb } from '~/server/db/index'
import { projects, workStatusItems } from '~/server/db/schema'
import { sql, eq } from 'drizzle-orm'
import { normalizeRoadmapStatus } from '~~/shared/utils/roadmap'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const db = useDb()

  const rows = await db
    .select({
      id: projects.id,
      slug: projects.slug,
      title: projects.title,
      status: projects.status,
      pages: projects.pages,
      createdAt: projects.createdAt,
      taskTotal: sql<number>`cast(count(${workStatusItems.id}) as int)`,
      taskDone: sql<number>`cast(sum(case when ${workStatusItems.status} = 'done' then 1 else 0 end) as int)`,
      taskOverdue: sql<number>`cast(sum(case when ${workStatusItems.status} not in ('done','cancelled') and ${workStatusItems.dateEnd} is not null and ${workStatusItems.dateEnd} < current_date::text then 1 else 0 end) as int)`,
      roadmapSummary: sql<Array<{ id: number; title: string; status: string; sortOrder: number }>>`
        coalesce(
          (
            select jsonb_agg(
              jsonb_build_object(
                'id', rs.id,
                'title', rs.title,
                'status', rs.status,
                'sortOrder', rs.sort_order,
                'stageKey', rs.stage_key
              )
              order by rs.sort_order, rs.id
            )
            from roadmap_stages rs
            where rs.project_id = ${projects.id}
          ),
          '[]'::jsonb
        )
      `,
    })
    .from(projects)
    .leftJoin(workStatusItems, eq(workStatusItems.projectId, projects.id))
    .groupBy(projects.id)
    .orderBy(projects.createdAt)

  return rows.map((row: any) => ({
    ...row,
    roadmapSummary: Array.isArray(row.roadmapSummary)
      ? row.roadmapSummary.map((stage: any) => ({
          ...stage,
          status: normalizeRoadmapStatus(stage?.status),
        }))
      : [],
  }))
})
