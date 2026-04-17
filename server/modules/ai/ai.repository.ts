import { sql, eq } from 'drizzle-orm'
import { useDb } from '~/server/db/index'
import {
  projects,
  clients,
  contractors,
  pageContent,
} from '~/server/db/schema'

export interface LegalSourceCount {
  source: string
  source_name: string
  total: number
  indexed: number
}

/**
 * Aggregate row count + indexed embedding count per legal source.
 * Used by the admin "legal base status" panel.
 */
export async function listLegalSourceCounts(): Promise<LegalSourceCount[]> {
  const db = useDb()
  const rows = await db.execute(sql`
    SELECT
      source,
      source_name,
      COUNT(*)::int           AS total,
      COUNT(embedding)::int   AS indexed
    FROM legal_chunks
    GROUP BY source, source_name
    ORDER BY source
  `)
  return rows as unknown as LegalSourceCount[]
}

export async function findProjectBySlug(slug: string) {
  const db = useDb()
  const [proj] = await db
    .select()
    .from(projects)
    .where(eq(projects.slug, slug))
    .limit(1)
  return proj ?? null
}

export async function listPageContentByProject(projectId: number) {
  const db = useDb()
  return db.select().from(pageContent).where(eq(pageContent.projectId, projectId))
}

export async function findClientById(id: number) {
  const db = useDb()
  const [c] = await db.select().from(clients).where(eq(clients.id, id)).limit(1)
  return c ?? null
}

export async function findContractorById(id: number) {
  const db = useDb()
  const [c] = await db
    .select()
    .from(contractors)
    .where(eq(contractors.id, id))
    .limit(1)
  return c ?? null
}
