import { asc, eq, inArray } from 'drizzle-orm'
import { useDb } from '~/server/db/index'
import { sellers, sellerProjects, projects } from '~/server/db/schema'

export async function findSellerById(id: number) {
  const db = useDb()
  const [seller] = await db.select().from(sellers).where(eq(sellers.id, id)).limit(1)
  return seller ?? null
}

export async function listAllSellers() {
  const db = useDb()
  return db.select().from(sellers).orderBy(asc(sellers.createdAt))
}

export async function listSellersByProjectSlug(projectSlug: string) {
  const db = useDb()
  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.slug, projectSlug))
    .limit(1)
  if (!project) return null
  const rows = await db
    .select({ seller: sellers })
    .from(sellerProjects)
    .innerJoin(sellers, eq(sellerProjects.sellerId, sellers.id))
    .where(eq(sellerProjects.projectId, project.id))
    .orderBy(asc(sellers.name))
  return rows.map((r) => r.seller)
}

export async function insertSeller(values: {
  name: string
  companyName: string | null
  contactPerson: string | null
  phone: string | null
  email: string | null
  telegram: string | null
  website: string | null
  city: string | null
  categories: string[]
  notes: string | null
}) {
  const db = useDb()
  const [seller] = await db.insert(sellers).values(values).returning()
  return seller
}

export async function updateSellerRow(id: number, updates: Record<string, unknown>) {
  const db = useDb()
  const [updated] = await db
    .update(sellers)
    .set(updates)
    .where(eq(sellers.id, id))
    .returning()
  return updated ?? null
}

export async function deleteSellerRow(id: number) {
  const db = useDb()
  await db.delete(sellers).where(eq(sellers.id, id))
}

export async function listSellerProjects(sellerId: number) {
  const db = useDb()
  return db
    .select({
      id: projects.id,
      slug: projects.slug,
      title: projects.title,
      status: projects.status,
    })
    .from(sellerProjects)
    .innerJoin(projects, eq(sellerProjects.projectId, projects.id))
    .where(eq(sellerProjects.sellerId, sellerId))
}
