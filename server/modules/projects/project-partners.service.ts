import { z } from 'zod'
import * as repo from '~/server/modules/projects/project-partners.repository'

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
  const id = await repo.findProjectIdBySlug(slug)
  if (id === null) throw createError({ statusCode: 404, message: 'Проект не найден' })
  return id
}

// ── Contractors ────────────────────────────────────────────────────────

/**
 * Contractors linked to the project. Strips auth-sensitive slug and
 * financial/passport PII before returning — this endpoint is accessible
 * to the project client, not just admin.
 */
export async function listProjectContractors(slug: string) {
  const projectId = await resolveProjectId(slug)
  const rows = await repo.listProjectContractorRows(projectId)

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
    return safe
  })
}

/** Idempotent: no-op if contractor is already linked. */
export async function addContractorToProject(slug: string, contractorId: number) {
  const projectId = await resolveProjectId(slug)
  await repo.insertProjectContractor(projectId, contractorId)
  return { ok: true as const }
}

export async function removeContractorFromProject(
  slug: string,
  contractorId: number,
) {
  const projectId = await resolveProjectId(slug)
  await repo.deleteProjectContractor(projectId, contractorId)
  return { ok: true as const }
}

// ── Designers ─────────────────────────────────────────────────────────

export async function listProjectDesigners(slug: string) {
  const projectId = await resolveProjectId(slug)
  const rows = await repo.listProjectDesignerRows(projectId)
  return rows.map((r) => r.designer)
}

/** Idempotent via onConflictDoNothing (unique key on (designerId, projectId)). */
export async function addDesignerToProject(slug: string, designerId: number) {
  const projectId = await resolveProjectId(slug)
  await repo.insertProjectDesigner(projectId, designerId)
  return { ok: true as const }
}

export async function removeDesignerFromProject(slug: string, designerId: number) {
  const projectId = await resolveProjectId(slug)
  await repo.deleteProjectDesigner(projectId, designerId)
  return { ok: true as const }
}

// ── Sellers ───────────────────────────────────────────────────────────

export async function listProjectSellers(slug: string) {
  const projectId = await resolveProjectId(slug)
  const rows = await repo.listProjectSellerRows(projectId)
  return rows.map((r) => r.seller)
}

export async function addSellerToProject(slug: string, sellerId: number) {
  const projectId = await resolveProjectId(slug)
  await repo.insertProjectSeller(projectId, sellerId)
  return { ok: true as const }
}

export async function removeSellerFromProject(slug: string, sellerId: number) {
  const projectId = await resolveProjectId(slug)
  await repo.deleteProjectSeller(projectId, sellerId)
  return { ok: true as const }
}
