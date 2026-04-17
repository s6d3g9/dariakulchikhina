import { legalBaseReady } from './rag.service'
import * as repo from './ai.repository'

const PROJECT_PAGE_SLUGS_IN_CONTEXT = [
  'first-contact',
  'smart-brief',
  'client-tz',
  'moodboard',
  'specifications',
] as const

export async function getLegalStatus() {
  const [sources, readiness] = await Promise.all([
    repo.listLegalSourceCounts(),
    legalBaseReady(),
  ])
  return {
    ready: readiness.ready,
    totalChunks: readiness.count,
    sources,
  }
}

/**
 * Assemble the context object handed to the LLM stream. Pulls project
 * metadata + whitelist-filtered page content, plus optional client and
 * contractor rows. All reads go through the repository — this service
 * focuses on the shape of the context and which project profile fields
 * make it into the prompt.
 */
export async function buildAiStreamContext(
  projectSlug: string,
  clientId: number,
  contractorId: number,
) {
  const ctx: Record<string, unknown> = {}

  if (projectSlug) {
    const proj = await repo.findProjectBySlug(projectSlug)
    if (proj) {
      const profile = (proj.profile || {}) as Record<string, unknown>
      ctx.project = {
        title: proj.title,
        objectAddress: profile.objectAddress || '',
        objectType: profile.objectType || '',
        objectArea: profile.objectArea || '',
        budget: profile.budget || '',
        deadline: profile.deadline || '',
        style: profile.style || '',
        client_name: profile.client_name || '',
        phone: profile.phone || '',
        email: profile.email || '',
        passport_series: profile.passport_series || '',
        passport_number: profile.passport_number || '',
        passport_issued_by: profile.passport_issued_by || '',
        passport_issue_date: profile.passport_issue_date || '',
        passport_registration_address: profile.passport_registration_address || '',
        passport_inn: profile.passport_inn || '',
      }

      const pages = await repo.listPageContentByProject(proj.id)
      const pageMap: Record<string, Record<string, string>> = {}
      for (const pg of pages) {
        const slug = pg.pageSlug || ''
        if (!PROJECT_PAGE_SLUGS_IN_CONTEXT.includes(slug as never)) continue
        const clean: Record<string, string> = {}
        for (const [k, v] of Object.entries(
          (pg.content || {}) as Record<string, unknown>,
        )) {
          if (v != null && (typeof v === 'string' || typeof v === 'number')) {
            clean[k] = String(v)
          }
        }
        if (Object.keys(clean).length) pageMap[slug] = clean
      }
      ctx.pages = pageMap
    }
  }

  if (clientId) {
    const c = await repo.findClientById(clientId)
    if (c) ctx.client = c
  }

  if (contractorId) {
    const c = await repo.findContractorById(contractorId)
    if (c) ctx.contractor = c
  }

  return ctx
}
