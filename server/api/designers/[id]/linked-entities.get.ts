import { useDb } from '~/server/db/index'
import {
  designerProjects,
  sellerProjects, sellers,
  managerProjects, managers,
  galleryItems,
} from '~/server/db/schema'
import { eq, inArray } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!id || !Number.isFinite(id))
    throw createError({ statusCode: 400, statusMessage: 'Invalid designer id' })

  const db = useDb()

  // Get designer's project IDs
  const dpRows = await db
    .select({ projectId: designerProjects.projectId })
    .from(designerProjects)
    .where(eq(designerProjects.designerId, id))

  const projectIds = dpRows.map(r => r.projectId).filter(Boolean)

  // Sellers linked via sellerProjects
  let linkedSellers: any[] = []
  if (projectIds.length) {
    linkedSellers = await db
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

  // Managers linked via managerProjects
  let linkedManagers: any[] = []
  if (projectIds.length) {
    linkedManagers = await db
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

  // Gallery items (global)
  const gallery = await db
    .select()
    .from(galleryItems)
    .orderBy(galleryItems.sortOrder)

  // Deduplicate sellers and managers
  const sellerMap = new Map<number, any>()
  for (const s of linkedSellers) {
    if (!sellerMap.has(s.id)) {
      sellerMap.set(s.id, {
        id: s.id, slug: s.slug, name: s.name,
        companyName: s.companyName, phone: s.phone,
        email: s.email, city: s.city, categories: s.categories,
        projects: [],
      })
    }
    sellerMap.get(s.id).projects.push({
      projectId: s.projectId, notes: s.projectNotes, status: s.sellerStatus,
    })
  }

  const managerMap = new Map<number, any>()
  for (const m of linkedManagers) {
    if (!managerMap.has(m.id)) {
      managerMap.set(m.id, {
        id: m.id, slug: m.slug, name: m.name,
        role: m.role, phone: m.phone, email: m.email,
        telegram: m.telegram, city: m.city,
        projects: [],
      })
    }
    managerMap.get(m.id).projects.push({
      projectId: m.projectId, role: m.managerRole,
    })
  }

  return {
    sellers: [...sellerMap.values()],
    managers: [...managerMap.values()],
    gallery: gallery.filter((g: any) => g.category !== 'moodboard'),
    moodboards: gallery.filter((g: any) => g.category === 'moodboard'),
  }
})
