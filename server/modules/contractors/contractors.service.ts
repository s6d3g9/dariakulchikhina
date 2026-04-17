import { z } from 'zod'
import { eq, sql } from 'drizzle-orm'
import { useDb } from '~/server/db/index'
import {
  contractors,
  projects,
  projectContractors,
} from '~/server/db/schema'

/**
 * Schema for contractor self-update (accessible by the contractor
 * themselves via /self.put.ts). Admin edits go through the broader
 * UpdateContractorSchema in shared/types/contractor.
 */
export const ContractorSelfUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  companyName: z.string().max(200).nullable().optional(),
  contactPerson: z.string().max(200).nullable().optional(),
  phone: z.string().max(50).nullable().optional(),
  email: z.string().max(200).nullable().optional(),
  messenger: z.string().max(100).nullable().optional(),
  messengerNick: z.string().max(100).nullable().optional(),
  website: z.string().max(500).nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
  workTypes: z.array(z.string().max(100)).max(50).optional(),
  roleTypes: z.array(z.string().max(100)).max(50).optional(),
  // Паспортные данные
  passportSeries: z.string().max(10).nullable().optional(),
  passportNumber: z.string().max(10).nullable().optional(),
  passportIssuedBy: z.string().max(500).nullable().optional(),
  passportIssueDate: z.string().max(20).nullable().optional(),
  passportDepartmentCode: z.string().max(20).nullable().optional(),
  birthDate: z.string().max(20).nullable().optional(),
  birthPlace: z.string().max(500).nullable().optional(),
  registrationAddress: z.string().max(500).nullable().optional(),
  snils: z.string().max(20).nullable().optional(),
  // Доп. контакты
  telegram: z.string().max(200).nullable().optional(),
  whatsapp: z.string().max(50).nullable().optional(),
  city: z.string().max(200).nullable().optional(),
  workRadius: z.string().max(100).nullable().optional(),
  // Реквизиты
  inn: z.string().max(20).nullable().optional(),
  kpp: z.string().max(20).nullable().optional(),
  ogrn: z.string().max(20).nullable().optional(),
  bankName: z.string().max(300).nullable().optional(),
  bik: z.string().max(20).nullable().optional(),
  settlementAccount: z.string().max(30).nullable().optional(),
  correspondentAccount: z.string().max(30).nullable().optional(),
  legalAddress: z.string().max(500).nullable().optional(),
  factAddress: z.string().max(500).nullable().optional(),
  // Финансовые / организационные
  taxSystem: z.string().max(50).nullable().optional(),
  paymentMethods: z.array(z.string().max(50)).max(10).optional(),
  hourlyRate: z.string().max(50).nullable().optional(),
  hasInsurance: z.boolean().optional(),
  insuranceDetails: z.string().max(1000).nullable().optional(),
  education: z.string().max(500).nullable().optional(),
  certifications: z.array(z.string().max(200)).max(20).optional(),
  experienceYears: z.number().int().min(0).max(100).nullable().optional(),
})
export type ContractorSelfUpdateInput = z.infer<typeof ContractorSelfUpdateSchema>

/**
 * List every contractor with a derived set of linked projects (via
 * `project_contractors`). The response strips the `slug` field — it is
 * part of the contractor's auth surface and must never leak to the
 * admin list view. Uses Postgres array_agg to do the join aggregation
 * in one round-trip.
 */
export async function listContractors() {
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
      projectIds: sql<number[]>`array_remove(array_agg(${projectContractors.projectId}), null)`,
      projectTitles: sql<string[]>`array_remove(array_agg(${projects.title}), null)`,
      projectSlugs: sql<string[]>`array_remove(array_agg(${projects.slug}), null)`,
    })
    .from(contractors)
    .leftJoin(projectContractors, eq(projectContractors.contractorId, contractors.id))
    .leftJoin(projects, eq(projects.id, projectContractors.projectId))
    .groupBy(contractors.id)
    .orderBy(contractors.name)

  return rows.map((r) => {
    const { slug: _slug, ...safe } = r.contractor
    return {
      ...safe,
      linkedProjectIds: Array.isArray(r.projectIds) ? r.projectIds : [],
      linkedProjectTitles: Array.isArray(r.projectTitles) ? r.projectTitles : [],
      linkedProjectSlugs: Array.isArray(r.projectSlugs) ? r.projectSlugs : [],
    }
  })
}

export interface CreateContractorInput {
  slug: string
  name: string
  contractorType?: string
  parentId?: number | null
}

/**
 * Insert a new contractor row. Keeps the parity with the legacy handler
 * by defaulting `contractorType` to `'master'` and `workTypes` to an
 * empty array when omitted.
 */
export async function createContractor(body: CreateContractorInput) {
  const db = useDb()
  const [contractor] = await db
    .insert(contractors)
    .values({
      slug: body.slug,
      name: body.name,
      contractorType: body.contractorType || 'master',
      parentId: body.parentId || null,
      workTypes: [],
    })
    .returning()
  return contractor
}

/**
 * Fetch a single contractor by id. Strips the auth-sensitive `slug`
 * before returning. Returns null when the id is missing.
 */
export async function getContractor(id: number) {
  const db = useDb()
  const [contractor] = await db
    .select()
    .from(contractors)
    .where(eq(contractors.id, id))
    .limit(1)
  if (!contractor) return null
  const { slug: _slug, ...safe } = contractor
  return safe
}

/**
 * Admin update — accepts the full UpdateContractorSchema shape from
 * shared/types. Strips `slug` from the response for the same reason as
 * getContractor.
 */
export async function updateContractorAsAdmin(
  id: number,
  body: Record<string, unknown>,
) {
  const db = useDb()
  const [updated] = await db
    .update(contractors)
    .set(body)
    .where(eq(contractors.id, id))
    .returning()
  if (!updated) return null
  const { slug: _slug, ...safe } = updated as Record<string, unknown>
  return safe
}

/**
 * Self-update for contractors — restricted fields only (see
 * ContractorSelfUpdateSchema). Does not strip slug from the response
 * because the contractor already owns it.
 */
export async function updateContractorSelf(
  id: number,
  body: ContractorSelfUpdateInput,
) {
  const db = useDb()
  const [updated] = await db
    .update(contractors)
    .set(body)
    .where(eq(contractors.id, id))
    .returning()
  return updated ?? null
}

/**
 * Delete a contractor. Also removes every child row where `parent_id`
 * points at this id — the FK has no cascade for that self-reference.
 */
export async function deleteContractor(id: number) {
  const db = useDb()
  // Delete child contractors (masters) first — parentId has no FK cascade
  await db.delete(contractors).where(eq(contractors.parentId, id))
  await db.delete(contractors).where(eq(contractors.id, id))
}

/**
 * List the staff rows belonging to a contractor company (rows where
 * `parent_id` equals the given id). Returns a trimmed contact/work
 * summary suitable for the admin staff tab.
 */
export async function listContractorStaff(parentId: number) {
  const db = useDb()
  return db
    .select({
      id: contractors.id,
      name: contractors.name,
      phone: contractors.phone,
      email: contractors.email,
      messenger: contractors.messenger,
      messengerNick: contractors.messengerNick,
      workTypes: contractors.workTypes,
      roleTypes: contractors.roleTypes,
      notes: contractors.notes,
    })
    .from(contractors)
    .where(eq(contractors.parentId, parentId))
    .orderBy(contractors.name)
}

/**
 * Projects that a contractor is linked to via `project_contractors`.
 * Ordered by project title for stable UI rendering.
 */
export async function listContractorProjects(contractorId: number) {
  const db = useDb()
  return db
    .select({
      id: projects.id,
      slug: projects.slug,
      title: projects.title,
      status: projects.status,
    })
    .from(projectContractors)
    .innerJoin(projects, eq(projectContractors.projectId, projects.id))
    .where(eq(projectContractors.contractorId, contractorId))
    .orderBy(projects.title)
}

/**
 * Helper for work-items and related subresources: returns the set of
 * contractor ids the caller is allowed to act on. A company contractor
 * is allowed to manage both its own row AND any `parent_id`-scoped
 * staff rows.
 */
export async function resolveContractorAndStaffIds(contractorId: number) {
  const db = useDb()
  const staff = await db
    .select({ id: contractors.id })
    .from(contractors)
    .where(eq(contractors.parentId, contractorId))
  return [contractorId, ...staff.map((s) => s.id)]
}
