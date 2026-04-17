import { z } from 'zod'
import * as repo from './contractors.repository'

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
  const rows = await repo.listContractorsWithProjects()
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
  return repo.insertContractor({
    slug: body.slug,
    name: body.name,
    contractorType: body.contractorType || 'master',
    parentId: body.parentId || null,
    workTypes: [],
  })
}

/**
 * Fetch a single contractor by id. Strips the auth-sensitive `slug`
 * before returning. Returns null when the id is missing.
 */
export async function getContractor(id: number) {
  const contractor = await repo.findContractorById(id)
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
  const updated = await repo.updateContractorRow(id, body)
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
  return repo.updateContractorRow(id, body)
}

/**
 * Delete a contractor. Also removes every child row where `parent_id`
 * points at this id — the FK has no cascade for that self-reference.
 */
export async function deleteContractor(id: number) {
  await repo.deleteContractorChildren(id)
  await repo.deleteContractorRow(id)
}

/**
 * List the staff rows belonging to a contractor company (rows where
 * `parent_id` equals the given id). Returns a trimmed contact/work
 * summary suitable for the admin staff tab.
 */
export async function listContractorStaff(parentId: number) {
  return repo.listContractorStaff(parentId)
}

/**
 * Projects that a contractor is linked to via `project_contractors`.
 * Ordered by project title for stable UI rendering.
 */
export async function listContractorProjects(contractorId: number) {
  return repo.listContractorProjects(contractorId)
}

/**
 * Helper for work-items and related subresources: returns the set of
 * contractor ids the caller is allowed to act on. A company contractor
 * is allowed to manage both its own row AND any `parent_id`-scoped
 * staff rows.
 */
export async function resolveContractorAndStaffIds(contractorId: number) {
  return repo.resolveContractorAndStaffIds(contractorId)
}
