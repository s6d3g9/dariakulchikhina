import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { useDb } from '~/server/db/index'
import {
  projects,
  contractors,
  projectContractors,
  designers,
  designerProjects,
  sellers,
  sellerProjects,
} from '~/server/db/schema'

// ── Schemas ────────────────────────────────────────────────────────────

export const AddContractorSchema = z.object({
  contractorId: z.number().int().positive(),
})
export type AddContractorInput = z.infer<typeof AddContractorSchema>

export const AddDesignerSchema = z.object({
  designerId: z.number().int().positive(),
})
export type AddDesignerInput = z.infer<typeof AddDesignerSchema>

export const AddSellerSchema = z.object({
  sellerId: z.number().int().positive(),
})
export type AddSellerInput = z.infer<typeof AddSellerSchema>

// ── Helper ─────────────────────────────────────────────────────────────

async function resolveProjectId(slug: string): Promise<number> {
  const db = useDb()
  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.slug, slug))
    .limit(1)
  if (!project) throw createError({ statusCode: 404, message: 'Проект не найден' })
  return project.id
}

// ── Contractors ────────────────────────────────────────────────────────

/**
 * Contractors linked to the project. Strips auth-sensitive slug and
 * financial/passport PII before returning — this endpoint is accessible
 * to the project client, not just admin.
 */
export async function listProjectContractors(slug: string) {
  const projectId = await resolveProjectId(slug)
  const db = useDb()
  const rows = await db
    .select({
      contractor: {
        id: contractors.id,
        slug: contractors.slug,
        name: contractors.name,
        companyName: contractors.companyName,
        contactPerson: contractors.contactPerson,
        phone: contractors.phone,
        email: contractors.email,
        inn: contractors.inn,
        kpp: contractors.kpp,
        ogrn: contractors.ogrn,
        bankName: contractors.bankName,
        bik: contractors.bik,
        settlementAccount: contractors.settlementAccount,
        correspondentAccount: contractors.correspondentAccount,
        legalAddress: contractors.legalAddress,
        factAddress: contractors.factAddress,
        workTypes: contractors.workTypes,
        roleTypes: contractors.roleTypes,
        contractorType: contractors.contractorType,
        parentId: contractors.parentId,
        notes: contractors.notes,
        messenger: contractors.messenger,
        messengerNick: contractors.messengerNick,
        website: contractors.website,
        passportSeries: contractors.passportSeries,
        passportNumber: contractors.passportNumber,
        passportIssuedBy: contractors.passportIssuedBy,
        passportIssueDate: contractors.passportIssueDate,
        passportDepartmentCode: contractors.passportDepartmentCode,
        birthDate: contractors.birthDate,
        birthPlace: contractors.birthPlace,
        registrationAddress: contractors.registrationAddress,
        snils: contractors.snils,
        telegram: contractors.telegram,
        whatsapp: contractors.whatsapp,
        city: contractors.city,
        workRadius: contractors.workRadius,
        taxSystem: contractors.taxSystem,
        paymentMethods: contractors.paymentMethods,
        hourlyRate: contractors.hourlyRate,
        hasInsurance: contractors.hasInsurance,
        insuranceDetails: contractors.insuranceDetails,
        education: contractors.education,
        certifications: contractors.certifications,
        experienceYears: contractors.experienceYears,
      },
    })
    .from(projectContractors)
    .innerJoin(contractors, eq(projectContractors.contractorId, contractors.id))
    .where(eq(projectContractors.projectId, projectId))
    .orderBy(contractors.name)

  return rows.map((r) => {
    const c = r.contractor as Record<string, unknown>
    // Strip auth slug + financial/passport PII before returning.
    const {
      slug: _slug,
      passportSeries: _ps,
      passportNumber: _pn,
      passportIssuedBy: _pi,
      passportIssueDate: _pd,
      snils: _sn,
      inn: _inn,
      bankName: _bn,
      bik: _bk,
      settlementAccount: _sa,
      correspondentAccount: _ca,
      ...safe
    } = c
    void _slug, _ps, _pn, _pi, _pd, _sn, _inn, _bn, _bk, _sa, _ca
    return safe
  })
}

/** Idempotent: no-op if contractor is already linked. */
export async function addContractorToProject(slug: string, contractorId: number) {
  const projectId = await resolveProjectId(slug)
  const db = useDb()
  await db
    .insert(projectContractors)
    .values({ projectId, contractorId })
    .onConflictDoNothing()
  return { ok: true as const }
}

export async function removeContractorFromProject(
  slug: string,
  contractorId: number,
) {
  const projectId = await resolveProjectId(slug)
  const db = useDb()
  await db
    .delete(projectContractors)
    .where(
      and(
        eq(projectContractors.projectId, projectId),
        eq(projectContractors.contractorId, contractorId),
      ),
    )
  return { ok: true as const }
}

// ── Designers ─────────────────────────────────────────────────────────

export async function listProjectDesigners(slug: string) {
  const projectId = await resolveProjectId(slug)
  const db = useDb()
  const rows = await db
    .select({ designer: designers })
    .from(designerProjects)
    .innerJoin(designers, eq(designerProjects.designerId, designers.id))
    .where(eq(designerProjects.projectId, projectId))
    .orderBy(designers.name)
  return rows.map((r) => r.designer)
}

/** Idempotent via onConflictDoNothing (unique key on (designerId, projectId)). */
export async function addDesignerToProject(slug: string, designerId: number) {
  const projectId = await resolveProjectId(slug)
  const db = useDb()
  await db
    .insert(designerProjects)
    .values({ projectId, designerId })
    .onConflictDoNothing()
  return { ok: true as const }
}

export async function removeDesignerFromProject(slug: string, designerId: number) {
  const projectId = await resolveProjectId(slug)
  const db = useDb()
  await db
    .delete(designerProjects)
    .where(
      and(
        eq(designerProjects.projectId, projectId),
        eq(designerProjects.designerId, designerId),
      ),
    )
  return { ok: true as const }
}

// ── Sellers ───────────────────────────────────────────────────────────

export async function listProjectSellers(slug: string) {
  const projectId = await resolveProjectId(slug)
  const db = useDb()
  const rows = await db
    .select({ seller: sellers })
    .from(sellerProjects)
    .innerJoin(sellers, eq(sellerProjects.sellerId, sellers.id))
    .where(eq(sellerProjects.projectId, projectId))
    .orderBy(sellers.name)
  return rows.map((r) => r.seller)
}

export async function addSellerToProject(slug: string, sellerId: number) {
  const projectId = await resolveProjectId(slug)
  const db = useDb()
  await db
    .insert(sellerProjects)
    .values({ projectId, sellerId })
    .onConflictDoNothing()
  return { ok: true as const }
}

export async function removeSellerFromProject(slug: string, sellerId: number) {
  const projectId = await resolveProjectId(slug)
  const db = useDb()
  await db
    .delete(sellerProjects)
    .where(
      and(
        eq(sellerProjects.projectId, projectId),
        eq(sellerProjects.sellerId, sellerId),
      ),
    )
  return { ok: true as const }
}
