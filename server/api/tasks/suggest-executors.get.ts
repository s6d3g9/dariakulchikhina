import { useDb } from '~/server/db/index'
import { contractors, tasks } from '~/server/db/schema'
import { eq, not, inArray, and, sql } from 'drizzle-orm'

/** GET /api/tasks/suggest-executors?workType=X&dateStart=Y
 *  Returns top-3 scored contractors for a given task.
 *
 *  Scoring:
 *   +50  specialization / workType match
 *   +0–50 rating × 10  (rating 0–5)
 *   +0–30 workload:  max(0, 30 − activeTaskCount × 5)
 *   +10  verified badge
 */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const db = useDb()
  const { workType } = getQuery(event) as { workType?: string }

  // Fetch all contractors
  const allContractors = await db.select({
    id:               contractors.id,
    name:             contractors.name,
    companyName:      contractors.companyName,
    phone:            contractors.phone,
    city:             contractors.city,
    workTypes:        contractors.workTypes,
    rating:           contractors.rating,
    verified:         contractors.verified,
    experienceYears:  contractors.experienceYears,
    nextAvailableDate: contractors.nextAvailableDate,
  }).from(contractors)

  // Count active tasks per contractor in one query
  const activeCounts: Record<number, number> = {}
  const activeRows = await db
    .select({
      contractorId: tasks.assignedContractorId,
      cnt: sql<number>`cast(count(*) as int)`,
    })
    .from(tasks)
    .where(not(inArray(tasks.status, ['done', 'cancelled'])))
    .groupBy(tasks.assignedContractorId)

  for (const row of activeRows) {
    if (row.contractorId !== null) activeCounts[row.contractorId] = row.cnt
  }

  // Score each contractor
  const scored = allContractors.map((c) => {
    const breakdown: Record<string, number> = {}

    // workType match
    const matchScore = workType && c.workTypes.includes(workType) ? 50 : 0
    breakdown['Специализация'] = matchScore

    // rating (0-5 → 0-50)
    const ratingScore = Math.round(Math.min(Number(c.rating ?? 0), 5) * 10)
    breakdown['Рейтинг'] = ratingScore

    // workload (lower = better)
    const active = activeCounts[c.id] ?? 0
    const workloadScore = Math.max(0, 30 - active * 5)
    breakdown['Загруженность'] = workloadScore

    // verified bonus
    const verifiedScore = c.verified ? 10 : 0
    breakdown['Верификация'] = verifiedScore

    const total = matchScore + ratingScore + workloadScore + verifiedScore

    return { contractor: c, score: total, breakdown, activeTasks: active }
  })

  // Sort by score desc, return top 3
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, 3)
})
