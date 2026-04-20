import { sql, eq, and, not, inArray, lt, isNotNull } from 'drizzle-orm'
import { useDb } from '~/server/db/index'
import {
  projects,
  projectExtraServices,
  workStatusItems,
} from '~/server/db/schema'
import type { ProjectControlRow } from './admin.types'

export type { ProjectControlRow }

/**
 * Count extra-service rows currently in `requested` status across all
 * projects — client-initiated requests awaiting admin action.
 */
export async function countRequestedExtraServices(): Promise<number> {
  const db = useDb()
  const [row] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(projectExtraServices)
    .where(eq(projectExtraServices.status, 'requested'))
  return row?.count || 0
}

/**
 * Count work-status items whose `date_end` is in the past and whose
 * status is neither `done` nor `cancelled`. Uses today's ISO date at
 * UTC 00:00 — acceptable tolerance for a badge counter.
 */
export async function countOverdueWorkItems(): Promise<number> {
  const db = useDb()
  const today = new Date().toISOString().slice(0, 10)
  const [row] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(workStatusItems)
    .where(
      and(
        not(inArray(workStatusItems.status, ['done', 'cancelled'])),
        isNotNull(workStatusItems.dateEnd),
        lt(workStatusItems.dateEnd, today),
      ),
    )
  return row?.count || 0
}

/**
 * Fetch every project with enough shape to compute hybrid-control
 * health. The caller iterates these rows — there's no good way to
 * compute health in SQL since it lives in shared/utils.
 */
export async function listProjectsForControlCheck(): Promise<ProjectControlRow[]> {
  const db = useDb()
  const rows = await db
    .select({
      slug: projects.slug,
      status: projects.status,
      pages: projects.pages,
      profile: projects.profile,
    })
    .from(projects)
  return rows as ProjectControlRow[]
}
