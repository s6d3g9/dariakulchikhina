import { z } from 'zod'
import { CORE_PAGES } from '~/shared/constants/pages'
import {
  getAvailableDesignerPackageKeySet,
  getNormalizedDesignerServiceKeySet,
  normalizeDesignerPackages,
  normalizeDesignerServices,
  normalizeDesignerSubscriptions,
} from '~/shared/utils/designer-catalogs'
import * as repo from './designers.repository'

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
  const rows = await repo.listAllDesigners()
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
  const designer = await repo.findDesignerById(id)
  if (!designer) return null

  const dpRows = await repo.listDesignerProjectsWithInfo(id)

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
    const dpClients = await repo.listClientsForDesignerProject(row.dp.id)
    const dpContractors = await repo.listContractorsForDesignerProject(row.dp.id)

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
  const normalizedServices = normalizeDesignerServices(body.services)
  const validServiceKeys = getNormalizedDesignerServiceKeySet(normalizedServices)

  return repo.insertDesigner({
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
}

/**
 * Admin-side partial update. Normalizes services/packages/subscriptions
 * against each other (package keys are re-validated against the new
 * service set) and optionally clears packageKey on selected designer
 * projects in the same transaction.
 */
export async function updateDesigner(id: number, body: UpdateDesignerInput) {
  const currentDesigner = await repo.findDesignerById(id)
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
  return repo.updateDesignerAndClearProjectKeys(id, updates, clearIds)
}

export async function deleteDesigner(id: number) {
  return repo.deleteDesignerRow(id)
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

  const designer = await repo.findDesignerById(routeDesignerId)
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
    project = await repo.insertProject({
      slug: body.slug,
      title: body.title,
      pages: [...CORE_PAGES],
      profile: {},
    })
  } catch (e: unknown) {
    if (getDuplicateCode(e) === '23505') {
      const existing = await repo.findProjectBySlug(body.slug)
      if (existing) {
        if (!existing.pages || existing.pages.length === 0) {
          await repo.updateProjectPages(existing.id, [...CORE_PAGES])
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
    const dp = await repo.insertDesignerProject({
      designerId: body.designerId,
      projectId: project.id,
      packageKey: normalizedPackageKey,
      pricePerSqm: body.pricePerSqm || null,
      area: body.area || null,
      totalPrice,
      status: 'draft',
      notes: body.notes || null,
    })
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
  const designer = await repo.findDesignerById(designerId)
  if (!designer) {
    throw createError({ statusCode: 404, statusMessage: 'Designer not found' })
  }

  const validServiceKeys = getNormalizedDesignerServiceKeySet(
    normalizeDesignerServices(designer.services),
  )
  const validPackageKeys = getAvailableDesignerPackageKeySet(designer.packages, {
    validServiceKeys,
  })

  const dp = await repo.findDesignerProjectOwned(body.designerProjectId, designerId)
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

  await repo.updateDesignerProjectRow(dp.id, {
    packageKey: normalizedPackageKey,
    pricePerSqm: body.pricePerSqm !== undefined ? body.pricePerSqm : dp.pricePerSqm,
    area: body.area !== undefined ? body.area : dp.area,
    totalPrice: body.totalPrice !== undefined ? body.totalPrice : computedTotal,
    status: body.status ?? dp.status,
    notes: body.notes !== undefined ? body.notes || null : dp.notes,
  })

  if (body.title !== undefined) {
    await repo.updateProjectTitle(dp.projectId, body.title)
  }

  return { ok: true as const }
}

// ── Link management ───────────────────────────────────────────────────

export async function addClientLink(body: AddClientLinkInput) {
  try {
    return await repo.insertDesignerProjectClient(body.designerProjectId, body.clientId)
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
  try {
    return await repo.insertDesignerProjectContractor(
      body.designerProjectId,
      body.contractorId,
      body.role || null,
    )
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
  if (body.type === 'client') {
    await repo.deleteDesignerProjectClientLink(body.linkId)
  } else {
    await repo.deleteDesignerProjectContractorLink(body.linkId)
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
  const projectIds = await repo.listDesignerProjectIds(designerId)

  const linkedSellers = await repo.listSellersForProjectIds(projectIds)
  const linkedManagers = await repo.listManagersForProjectIds(projectIds)
  const gallery = await repo.listAllGalleryOrderedBySortOrder()

  interface SellerView {
    id: number
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
