import { eq, and, inArray, asc } from 'drizzle-orm'
import { useDb } from '~/server/db/index'
import {
  designers,
  designerProjects,
  designerProjectClients,
  designerProjectContractors,
  projects,
  clients,
  contractors,
  sellers,
  sellerProjects,
  managers,
  managerProjects,
  galleryItems,
} from '~/server/db/schema'

// ── Designer CRUD ─────────────────────────────────────────────────────

export async function findDesignerById(id: number) {
  const db = useDb()
  const [designer] = await db.select().from(designers).where(eq(designers.id, id)).limit(1)
  return designer ?? null
}

export async function listAllDesigners() {
  const db = useDb()
  return db.select().from(designers).orderBy(asc(designers.createdAt))
}

export async function insertDesigner(values: {
  name: string
  companyName: string | null
  phone: string | null
  email: string | null
  telegram: string | null
  website: string | null
  city: string | null
  experience: string | null
  about: string | null
  specializations: string[]
  services: Record<string, unknown>[]
  packages: Record<string, unknown>[]
  subscriptions: Record<string, unknown>[]
}) {
  const db = useDb()
  const [designer] = await db.insert(designers).values(values).returning()
  return designer
}

/**
 * Update designer fields and optionally clear `packageKey` on a set of
 * designer-project rows — both in a single transaction for atomicity.
 */
export async function updateDesignerAndClearProjectKeys(
  id: number,
  updates: Record<string, unknown>,
  clearIds: number[],
) {
  const db = useDb()
  return db.transaction(async (tx) => {
    const [designer] = await tx
      .update(designers)
      .set(updates)
      .where(eq(designers.id, id))
      .returning()

    if (clearIds.length) {
      await tx
        .update(designerProjects)
        .set({ packageKey: null })
        .where(
          and(
            eq(designerProjects.designerId, id),
            inArray(designerProjects.id, clearIds),
          ),
        )
    }

    return designer
  })
}

export async function deleteDesignerRow(id: number) {
  const db = useDb()
  await db.delete(designers).where(eq(designers.id, id))
}

// ── Designer projects ─────────────────────────────────────────────────

export async function listDesignerProjectsWithInfo(designerId: number) {
  const db = useDb()
  return db
    .select({
      dp: designerProjects,
      projectSlug: projects.slug,
      projectTitle: projects.title,
      projectStatus: projects.status,
    })
    .from(designerProjects)
    .leftJoin(projects, eq(projects.id, designerProjects.projectId))
    .where(eq(designerProjects.designerId, designerId))
}

export async function listClientsForDesignerProject(dpId: number) {
  const db = useDb()
  return db
    .select({
      id: clients.id,
      name: clients.name,
      phone: clients.phone,
      email: clients.email,
    })
    .from(designerProjectClients)
    .innerJoin(clients, eq(clients.id, designerProjectClients.clientId))
    .where(eq(designerProjectClients.designerProjectId, dpId))
}

export async function listContractorsForDesignerProject(dpId: number) {
  const db = useDb()
  return db
    .select({
      id: contractors.id,
      name: contractors.name,
      role: designerProjectContractors.role,
    })
    .from(designerProjectContractors)
    .innerJoin(
      contractors,
      eq(contractors.id, designerProjectContractors.contractorId),
    )
    .where(eq(designerProjectContractors.designerProjectId, dpId))
}

export async function insertProject(values: {
  slug: string
  title: string
  pages: string[]
  profile: Record<string, string>
}) {
  const db = useDb()
  const [project] = await db.insert(projects).values(values).returning()
  return project
}

export async function findProjectBySlug(slug: string) {
  const db = useDb()
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.slug, slug))
    .limit(1)
  return project ?? null
}

export async function updateProjectPages(projectId: number, pages: string[]) {
  const db = useDb()
  await db.update(projects).set({ pages }).where(eq(projects.id, projectId))
}

export async function insertDesignerProject(values: {
  designerId: number
  projectId: number
  packageKey: string | null
  pricePerSqm: number | null
  area: number | null
  totalPrice: number | null
  status: string
  notes: string | null
}) {
  const db = useDb()
  const [dp] = await db.insert(designerProjects).values(values).returning()
  return dp
}

export async function findDesignerProjectOwned(dpId: number, designerId: number) {
  const db = useDb()
  const [dp] = await db
    .select()
    .from(designerProjects)
    .where(
      and(
        eq(designerProjects.id, dpId),
        eq(designerProjects.designerId, designerId),
      ),
    )
    .limit(1)
  return dp ?? null
}

export async function updateDesignerProjectRow(
  dpId: number,
  updates: Record<string, unknown>,
) {
  const db = useDb()
  await db
    .update(designerProjects)
    .set(updates)
    .where(eq(designerProjects.id, dpId))
}

export async function updateProjectTitle(projectId: number, title: string) {
  const db = useDb()
  await db.update(projects).set({ title }).where(eq(projects.id, projectId))
}

// ── Link management ───────────────────────────────────────────────────

export async function insertDesignerProjectClient(dpId: number, clientId: number) {
  const db = useDb()
  const [row] = await db
    .insert(designerProjectClients)
    .values({ designerProjectId: dpId, clientId })
    .returning()
  return row
}

export async function insertDesignerProjectContractor(
  dpId: number,
  contractorId: number,
  role: string | null,
) {
  const db = useDb()
  const [row] = await db
    .insert(designerProjectContractors)
    .values({ designerProjectId: dpId, contractorId, role })
    .returning()
  return row
}

export async function deleteDesignerProjectClientLink(linkId: number) {
  const db = useDb()
  await db
    .delete(designerProjectClients)
    .where(eq(designerProjectClients.id, linkId))
}

export async function deleteDesignerProjectContractorLink(linkId: number) {
  const db = useDb()
  await db
    .delete(designerProjectContractors)
    .where(eq(designerProjectContractors.id, linkId))
}

// ── Linked-entities aggregation ───────────────────────────────────────

export async function listDesignerProjectIds(designerId: number) {
  const db = useDb()
  const rows = await db
    .select({ projectId: designerProjects.projectId })
    .from(designerProjects)
    .where(eq(designerProjects.designerId, designerId))
  return rows.map((r) => r.projectId).filter(Boolean) as number[]
}

export async function listSellersForProjectIds(projectIds: number[]) {
  const db = useDb()
  if (!projectIds.length) return []
  return db
    .select({
      id: sellers.id,
      name: sellers.name,
      companyName: sellers.companyName,
      phone: sellers.phone,
      email: sellers.email,
      city: sellers.city,
      categories: sellers.categories,
      projectId: sellerProjects.projectId,
      projectNotes: sellerProjects.notes,
      sellerStatus: sellerProjects.status,
    })
    .from(sellerProjects)
    .innerJoin(sellers, eq(sellers.id, sellerProjects.sellerId))
    .where(inArray(sellerProjects.projectId, projectIds))
}

export async function listManagersForProjectIds(projectIds: number[]) {
  const db = useDb()
  if (!projectIds.length) return []
  return db
    .select({
      id: managers.id,
      slug: managers.slug,
      name: managers.name,
      role: managers.role,
      phone: managers.phone,
      email: managers.email,
      telegram: managers.telegram,
      city: managers.city,
      projectId: managerProjects.projectId,
      managerRole: managerProjects.role,
    })
    .from(managerProjects)
    .innerJoin(managers, eq(managers.id, managerProjects.managerId))
    .where(inArray(managerProjects.projectId, projectIds))
}

export async function listAllGalleryOrderedBySortOrder() {
  const db = useDb()
  return db.select().from(galleryItems).orderBy(galleryItems.sortOrder)
}
