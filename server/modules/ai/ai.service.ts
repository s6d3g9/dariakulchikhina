import { sql, eq } from 'drizzle-orm'
import { useDb } from '~/server/db/index'
import { projects, clients, contractors, pageContent } from '~/server/db/schema'
import { legalBaseReady } from '~/server/modules/ai/rag.service'

export async function getLegalStatus() {
  const db = useDb()

  const sources = await db.execute(sql`
    SELECT
      source,
      source_name,
      COUNT(*)::int           AS total,
      COUNT(embedding)::int   AS indexed
    FROM legal_chunks
    GROUP BY source, source_name
    ORDER BY source
  `)

  const { ready, count } = await legalBaseReady()

  return {
    ready,
    totalChunks: count,
    sources: (sources as unknown as any[]),
  }
}

export async function buildAiStreamContext(projectSlug: string, clientId: number, contractorId: number) {
  const db = useDb()
  const ctx: Record<string, any> = {}

  if (projectSlug) {
    const [proj] = await db.select().from(projects).where(eq(projects.slug, projectSlug)).limit(1)
    if (proj) {
      const profile = (proj.profile || {}) as Record<string, any>
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

      const pages = await db.select().from(pageContent).where(eq(pageContent.projectId, proj.id))
      ctx.pages = {}
      for (const pg of pages) {
        if (['first-contact', 'smart-brief', 'client-tz', 'moodboard', 'specifications'].includes(pg.pageSlug || '')) {
          const clean: Record<string, string> = {}
          for (const [k, v] of Object.entries((pg.content || {}) as Record<string, any>)) {
            if (v && (typeof v === 'string' || typeof v === 'number')) clean[k] = String(v)
          }
          if (Object.keys(clean).length) ctx.pages[pg.pageSlug!] = clean
        }
      }
    }
  }

  if (clientId) {
    const [c] = await db.select().from(clients).where(eq(clients.id, clientId)).limit(1)
    if (c) ctx.client = c
  }

  if (contractorId) {
    const [c] = await db.select().from(contractors).where(eq(contractors.id, contractorId)).limit(1)
    if (c) ctx.contractor = c
  }

  return ctx
}
