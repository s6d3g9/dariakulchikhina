import { eq } from 'drizzle-orm'

import { useDb } from '~/server/db'
import { projects } from '~/server/db/schema'

export function isNumericProjectId(value: string) {
  return /^\d+$/.test(value)
}

export async function getProjectById(projectId: number) {
  const db = useDb()
  const [project] = await db
    .select({
      id: projects.id,
      slug: projects.slug,
      title: projects.title,
    })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1)

  return project ?? null
}