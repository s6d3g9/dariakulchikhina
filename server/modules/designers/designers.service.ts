import { z } from 'zod'
import { eq, and, inArray, asc, sql } from 'drizzle-orm'
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
import { CORE_PAGES } from '~/shared/constants/pages'
import {
  getAvailableDesignerPackageKeySet,
  getNormalizedDesignerServiceKeySet,
  normalizeDesignerPackages,
  normalizeDesignerServices,
  normalizeDesignerSubscriptions,
} from '~/shared/utils/designer-catalogs'

// ── Schemas ────────────────────────────────────────────────────────────

export const CreateDesignerSchema = z.object({
  name: z.string().min(1),
  companyName: z.string().optional().default(''),
  phone: z.string().optional().default(''),
  email: z.string().optional().default(''),
  telegram: z.string().optional().default(''),
  website: z.string().optional().default(''),
  city: z.string().optional().default(''),
  experience: z.string().optional().default(''),
  about: z.string().optional().default(''),
  specializations: z.array(z.string()).optional().default([]),
  services: z.array(z.any()).optional().default([]),
  packages: z.array(z.any()).optional().default([]),
  subscriptions: z.array(z.any()).optional().default([]),
})
export type CreateDesignerInput = z.infer<typeof CreateDesignerSchema>

export const UpdateDesignerSchema = z.object({
  name: z.string().min(1).optional(),
  companyName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  telegram: z.string().optional(),
  website: z.string().optional(),
  city: z.string().optional(),
  experience: z.string().optional(),
  about: z.string().optional(),
  specializations: z.array(z.string()).optional(),
  services: z.array(z.any()).optional(),
  packages: z.array(z.any()).optional(),
  subscriptions: z.array(z.any()).optional(),
  clearProjectPackageKeysForIds: z.array(z.number().int().positive()).optional(),
})
export type UpdateDesignerInput = z.infer<typeof UpdateDesignerSchema>

export const CreateDesignerProjectSchema = z.object({
  designerId: z.number(),
  title: z.string().min(1),
  slug: z.string().min(1),
  packageKey: z.string().optional(),
  pricePerSqm: z.number().optional(),
  area: z.number().optional(),
  totalPrice: z.number().optional(),
  notes: z.string().optional(),
})
export type CreateDesignerProjectInput = z.infer<typeof CreateDesignerProjectSchema>

export const UpdateDesignerProjectSchema = z.object({
  designerProjectId: z.number().int().positive(),
  title: z.string().trim().min(1).optional(),
  packageKey: z.string().trim().optional().nullable(),
  pricePerSqm: z.number().int().nonnegative().optional().nullable(),
  area: z.number().int().nonnegative().optional().nullable(),
  totalPrice: z.number().int().nonnegative().optional().nullable(),
  status: z.enum(['draft', 'active', 'paused', 'completed', 'archived']).optional(),
  notes: z.string().optional().nullable(),
})
export type UpdateDesignerProjectInput = z.infer<typeof UpdateDesignerProjectSchema>

export const AddClientLinkSchema = z.object({
  designerProjectId: z.number(),
  clientId: z.number(),
})
export type AddClientLinkInput = z.infer<typeof AddClientLinkSchema>

export const AddContractorLinkSchema = z.object({
  designerProjectId: z.number(),
  contractorId: z.number(),
  role: z.string().optional(),
})
export type AddContractorLinkInput = z.infer<typeof AddContractorLinkSchema>

export const RemoveLinkSchema = z.object({
  type: z.enum(['client', 'contractor']),
  linkId: z.number(),
})
export type RemoveLinkInput = z.infer<typeof RemoveLinkSchema>

// ── Helpers ───────────────────────────────────────────────────────────

function getDuplicateCode(e: unknown): string | undefined {
  const err = e as { cause?: { code?: string }; code?: string }
  return err?.cause?.code ?? err?.code
}

// ── Listing ────────────────────────────────────────────────────────────

/**
 * Admin list of designers. Normalizes the services/packages/subscriptions
 * JSONB arrays through shared `designer-catalogs` helpers so the UI can
 * rely on the canonical shape.
 */
export async function listDesigners() {
  const db = useDb()
  const rows = await db.select().from(designers).orderBy(asc(designers.createdAt))
  return rows.map((designer) => ({
    ...designer,
    services: normalizeDesignerServices(designer.services),
    packages: normalizeDesignerPackages(designer.packages, {
      validServiceKeys: getNormalizedDesignerServiceKeySet(designer.services),
    }),
    subscriptions: normalizeDesignerSubscriptions(designer.subscriptions, {
      validServiceKeys: getNormalizedDesignerServiceKeySet(designer.services),
    }),
  }))
}

/**
 * Fetch one designer plus their designerProjects with embedded clients and
 * contractors. Package key is validated against the designer's active
 * package set and replaced with null when it points at a missing key.
 */
export async function getDesignerWithProjects(id: number) {
  const db = useDb()
  const [designer] = await db.select().from(designers).where(eq(designers.id, id)).limit(1)
  if (!designer) return null

  const dpRows = await db
    .select({
      dp: designerProjects,
      projectSlug: projects.slug,
      projectTitle: projects.title,
      projectStatus: projects.status,
    })
    .from(designerProjects)
    .leftJoin(projects, eq(projects.id, designerProjects.projectId))
    .where(eq(designerProjects.designerId, id))

  const normalizedServices = normalizeDesignerServices(designer.services)
  const validServiceKeys = getNormalizedDesignerServiceKeySet(normalizedServices)
  const normalizedPackages = normalizeDesignerPackages(designer.packages, {
    validServiceKeys,
  })
  const validPackageKeys = getAvailableDesignerPackageKeySet(normalizedPackages, {
    validServiceKeys,
  })

  const dpList: Array<Record<string, unknown>> = []
  for (const row of dpRows) {
    const dpClients = await db
      .select({
        id: clients.id,
        name: clients.name,
        phone: clients.phone,
        email: clients.email,
      })
      .from(designerProjectClients)
      .innerJoin(clients, eq(clients.id, designerProjectClients.clientId))
      .where(eq(designerProjectClients.designerProjectId, row.dp.id))

    const dpContractors = await db
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
      .where(eq(designerProjectContractors.designerProjectId, row.dp.id))

    dpList.push({
      ...row.dp,
      packageKey: validPackageKeys.has(String(row.dp.packageKey || '').trim())
        ? row.dp.packageKey
        : null,
      projectSlug: row.projectSlug,
      projectTitle: row.projectTitle,
      projectStatus: row.projectStatus,
      clients: dpClients,
      contractors: dpContractors,
    })
  }

  return {
    ...designer,
    services: normalizedServices,
    packages: normalizedPackages,
    subscriptions: normalizeDesignerSubscriptions(designer.subscriptions, {
      validServiceKeys,
    }),
    designerProjects: dpList,
  }
}

// ── CRUD ───────────────────────────────────────────────────────────────

export async function createDesigner(body: CreateDesignerInput) {
  const db = useDb()
  const normalizedServices = normalizeDesignerServices(body.services)
  const validServiceKeys = getNormalizedDesignerServiceKeySet(normalizedServices)

  const [designer] = await db
    .insert(designers)
    .values({
      name: body.name,
      companyName: body.companyName || null,
      phone: body.phone || null,
      email: body.email || null,
      telegram: body.telegram || null,
      website: body.website || null,
      city: body.city || null,
      experience: body.experience || null,
      about: body.about || null,
      specializations: body.specializations,
      services: normalizedServices,
      packages: normalizeDesignerPackages(body.packages, { validServiceKeys }),
      subscriptions: normalizeDesignerSubscriptions(body.subscriptions, {
        validServiceKeys,
      }),
    })
    .returning()
  return designer
}

/**
 * Admin-side partial update. Normalizes services/packages/subscriptions
 * against each other (package keys are re-validated against the new
 * service set) and optionally clears packageKey on selected designer
 * projects in the same transaction.
 */
export async function updateDesigner(id: number, body: UpdateDesignerInput) {
  const db = useDb()
  const [currentDesigner] = await db
    .select()
    .from(designers)
    .where(eq(designers.id, id))
    .limit(1)
  if (!currentDesigner) return null

  const normalizedServices =
    body.services !== undefined
      ? normalizeDesignerServices(body.services)
      : normalizeDesignerServices(currentDesigner.services)
  const validServiceKeys = getNormalizedDesignerServiceKeySet(normalizedServices)

  const updates: Record<string, unknown> = { updatedAt: new Date() }
  if (body.name !== undefined) updates.name = body.name
  if (body.companyName !== undefined) updates.companyName = body.companyName || null
  if (body.phone !== undefined) updates.phone = body.phone || null
  if (body.email !== undefined) updates.email = body.email || null
  if (body.telegram !== undefined) updates.telegram = body.telegram || null
  if (body.website !== undefined) updates.website = body.website || null
  if (body.city !== undefined) updates.city = body.city || null
  if (body.experience !== undefined) updates.experience = body.experience || null
  if (body.about !== undefined) updates.about = body.about || null
  if (body.specializations !== undefined) updates.specializations = body.specializations
  if (body.services !== undefined) updates.services = normalizedServices
  if (body.packages !== undefined) {
    updates.packages = normalizeDesignerPackages(body.packages, { validServiceKeys })
  }
  if (body.subscriptions !== undefined) {
    updates.subscriptions = normalizeDesignerSubscriptions(body.subscriptions, {
      validServiceKeys,
    })
  }

  const clearIds = Array.from(new Set(body.clearProjectPackageKeysForIds || []))

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

export async function deleteDesigner(id: number) {
  const db = useDb()
  await db.delete(designers).where(eq(designers.id, id))
}

// ── Designer ↔ Project management ─────────────────────────────────────

/**
 * Create a new project row (or reuse an existing one by slug) and link
 * it to the designer. Backfills `CORE_PAGES` if the existing project
 * was created with empty `pages`. Returns { designerProject, project }.
 */
export async function createDesignerProject(
  routeDesignerId: number,
  body: CreateDesignerProjectInput,
) {
  if (body.designerId !== routeDesignerId) {
    throw createError({ statusCode: 400, statusMessage: 'Designer id mismatch' })
  }

  const db = useDb()
  const [designer] = await db
    .select()
    .from(designers)
    .where(eq(designers.id, routeDesignerId))
    .limit(1)
  if (!designer) {
    throw createError({ statusCode: 404, statusMessage: 'Designer not found' })
  }

  const validServiceKeys = getNormalizedDesignerServiceKeySet(
    normalizeDesignerServices(designer.services),
  )
  const validPackageKeys = getAvailableDesignerPackageKeySet(designer.packages, {
    validServiceKeys,
  })
  const normalizedPackageKey = validPackageKeys.has(
    String(body.packageKey || '').trim(),
  )
    ? String(body.packageKey).trim()
    : null

  let project: { id: number; slug: string; title: string; pages: string[] } | undefined
  try {
    ;[project] = (await db
      .insert(projects)
      .values({
        slug: body.slug,
        title: body.title,
        pages: [...CORE_PAGES],
        profile: {},
      })
      .returning()) as typeof project[]
  } catch (e: unknown) {
    if (getDuplicateCode(e) === '23505') {
      const [existing] = await db
        .select()
        .from(projects)
        .where(eq(projects.slug, body.slug))
        .limit(1)
      if (existing) {
        if (!existing.pages || existing.pages.length === 0) {
          await db
            .update(projects)
            .set({ pages: [...CORE_PAGES] })
            .where(eq(projects.id, existing.id))
          project = { ...existing, pages: [...CORE_PAGES] }
        } else {
          project = existing
        }
      } else {
        throw createError({
          statusCode: 400,
          statusMessage: `Slug «${body.slug}» уже занят`,
        })
      }
    } else {
      throw e
    }
  }

  if (!project) {
    throw createError({ statusCode: 500, statusMessage: 'Project create failed' })
  }

  const totalPrice =
    body.totalPrice || (body.pricePerSqm || 0) * (body.area || 0) || null

  try {
    const [dp] = await db
      .insert(designerProjects)
      .values({
        designerId: body.designerId,
        projectId: project.id,
        packageKey: normalizedPackageKey,
        pricePerSqm: body.pricePerSqm || null,
        area: body.area || null,
        totalPrice,
        status: 'draft',
        notes: body.notes || null,
      })
      .returning()
    return { designerProject: dp, project }
  } catch (e: unknown) {
    if (getDuplicateCode(e) === '23505') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Этот проект уже привязан к дизайнеру',
      })
    }
    throw e
  }
}

/**
 * Partial update of a designer-project pairing. Validates `packageKey`
 * against the designer's current package set. Also propagates a `title`
 * change to the underlying `projects` row.
 */
export async function updateDesignerProject(
  designerId: number,
  body: UpdateDesignerProjectInput,
) {
  const db = useDb()

  const [designer] = await db
    .select()
    .from(designers)
    .where(eq(designers.id, designerId))
    .limit(1)
  if (!designer) {
    throw createError({ statusCode: 404, statusMessage: 'Designer not found' })
  }

  const validServiceKeys = getNormalizedDesignerServiceKeySet(
    normalizeDesignerServices(designer.services),
  )
  const validPackageKeys = getAvailableDesignerPackageKeySet(designer.packages, {
    validServiceKeys,
  })

  const [dp] = await db
    .select()
    .from(designerProjects)
    .where(
      and(
        eq(designerProjects.id, body.designerProjectId),
        eq(designerProjects.designerId, designerId),
      ),
    )
    .limit(1)
  if (!dp) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Проект дизайнера не найден',
    })
  }

  const nextPrice = body.pricePerSqm ?? dp.pricePerSqm
  const nextArea = body.area ?? dp.area
  const computedTotal = nextPrice && nextArea ? nextPrice * nextArea : null
  const normalizedPackageKey =
    body.packageKey !== undefined
      ? validPackageKeys.has(String(body.packageKey || '').trim())
        ? String(body.packageKey).trim()
        : null
      : dp.packageKey

  await db
    .update(designerProjects)
    .set({
      packageKey: normalizedPackageKey,
      pricePerSqm: body.pricePerSqm !== undefined ? body.pricePerSqm : dp.pricePerSqm,
      area: body.area !== undefined ? body.area : dp.area,
      totalPrice: body.totalPrice !== undefined ? body.totalPrice : computedTotal,
      status: body.status ?? dp.status,
      notes: body.notes !== undefined ? body.notes || null : dp.notes,
    })
    .where(eq(designerProjects.id, dp.id))

  if (body.title !== undefined) {
    await db
      .update(projects)
      .set({ title: body.title })
      .where(eq(projects.id, dp.projectId))
  }

  return { ok: true as const }
}

// ── Link management ───────────────────────────────────────────────────

export async function addClientLink(body: AddClientLinkInput) {
  const db = useDb()
  try {
    const [row] = await db
      .insert(designerProjectClients)
      .values({
        designerProjectId: body.designerProjectId,
        clientId: body.clientId,
      })
      .returning()
    return row
  } catch (e: unknown) {
    if (getDuplicateCode(e) === '23505') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Клиент уже привязан к проекту',
      })
    }
    throw e
  }
}

export async function addContractorLink(body: AddContractorLinkInput) {
  const db = useDb()
  try {
    const [row] = await db
      .insert(designerProjectContractors)
      .values({
        designerProjectId: body.designerProjectId,
        contractorId: body.contractorId,
        role: body.role || null,
      })
      .returning()
    return row
  } catch (e: unknown) {
    if (getDuplicateCode(e) === '23505') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Подрядчик уже привязан к проекту',
      })
    }
    throw e
  }
}

export async function removeLink(body: RemoveLinkInput) {
  const db = useDb()
  if (body.type === 'client') {
    await db
      .delete(designerProjectClients)
      .where(eq(designerProjectClients.id, body.linkId))
  } else {
    await db
      .delete(designerProjectContractors)
      .where(eq(designerProjectContractors.id, body.linkId))
  }
}

// ── Linked-entities aggregation ───────────────────────────────────────

/**
 * Returns the set of peripheral entities the designer consoles surface:
 * sellers and managers linked to any of the designer's projects, plus
 * the global gallery split into regular gallery items and moodboards.
 * Deduplicates sellers/managers by id and attaches their project scope.
 */
export async function getDesignerLinkedEntities(designerId: number) {
  const db = useDb()

  const dpRows = await db
    .select({ projectId: designerProjects.projectId })
    .from(designerProjects)
    .where(eq(designerProjects.designerId, designerId))

  const projectIds = dpRows.map((r) => r.projectId).filter(Boolean)

  let linkedSellers: Array<{
    id: number
    name: string
    companyName: string | null
    phone: string | null
    email: string | null
    city: string | null
    categories: string[]
    projectId: number | null
    projectNotes: string | null
    sellerStatus: string
  }> = []
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

  let linkedManagers: Array<{
    id: number
    slug: string | null
    name: string
    role: string | null
    phone: string | null
    email: string | null
    telegram: string | null
    city: string | null
    projectId: number
    managerRole: string
  }> = []
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

  const gallery = await db
    .select()
    .from(galleryItems)
    .orderBy(galleryItems.sortOrder)

  interface SellerView {
    id: number
    slug?: string | null
    name: string
    companyName: string | null
    phone: string | null
    email: string | null
    city: string | null
    categories: string[]
    projects: Array<{ projectId: number | null; notes: string | null; status: string }>
  }
  const sellerMap = new Map<number, SellerView>()
  for (const s of linkedSellers) {
    if (!sellerMap.has(s.id)) {
      sellerMap.set(s.id, {
        id: s.id,
        name: s.name,
        companyName: s.companyName,
        phone: s.phone,
        email: s.email,
        city: s.city,
        categories: s.categories,
        projects: [],
      })
    }
    sellerMap.get(s.id)!.projects.push({
      projectId: s.projectId,
      notes: s.projectNotes,
      status: s.sellerStatus,
    })
  }

  interface ManagerView {
    id: number
    slug: string | null
    name: string
    role: string | null
    phone: string | null
    email: string | null
    telegram: string | null
    city: string | null
    projects: Array<{ projectId: number; role: string }>
  }
  const managerMap = new Map<number, ManagerView>()
  for (const m of linkedManagers) {
    if (!managerMap.has(m.id)) {
      managerMap.set(m.id, {
        id: m.id,
        slug: m.slug,
        name: m.name,
        role: m.role,
        phone: m.phone,
        email: m.email,
        telegram: m.telegram,
        city: m.city,
        projects: [],
      })
    }
    managerMap.get(m.id)!.projects.push({
      projectId: m.projectId,
      role: m.managerRole,
    })
  }

  return {
    sellers: [...sellerMap.values()],
    managers: [...managerMap.values()],
    gallery: gallery.filter((g) => g.category !== 'moodboard'),
    moodboards: gallery.filter((g) => g.category === 'moodboard'),
  }
}

// Silence unused-import warnings for symbols imported only for SQL types
void sql
