import { useDb } from '~/server/db/index'
import { projects, clients, contractors, projectContractors, pageContent } from '~/server/db/schema'
import { eq, inArray } from 'drizzle-orm'

/**
 * GET /api/documents/context?projectSlug=xxx
 * Returns aggregated data from project, its linked clients and contractors
 * for auto-populating document templates.
 */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const q = safeGetQuery(event)
  const projectSlug = (q.projectSlug as string) || ''

  const db = useDb()
  const result: Record<string, any> = {
    project: null,
    clients: [],
    contractors: [],
    today: new Date().toLocaleDateString('ru-RU'),
  }

  if (!projectSlug) {
    // Return all clients and contractors without project context
    const allClients = await db.select().from(clients).orderBy(clients.name)
    const allContractors = await db.select().from(contractors).orderBy(contractors.name)
    result.clients = allClients
    result.contractors = allContractors
    return result
  }

  // Fetch project
  const [proj] = await db.select().from(projects).where(eq(projects.slug, projectSlug)).limit(1)
  if (!proj) return result

  const profile = (proj.profile || {}) as Record<string, any>

  result.project = {
    id: proj.id,
    slug: proj.slug,
    title: proj.title,
    status: proj.status,
    // Flatten profile fields
    client_name: profile.client_name || profile.fio || '',
    phone: profile.phone || '',
    email: profile.email || '',
    objectAddress: profile.objectAddress || '',
    objectType: profile.objectType || '',
    objectArea: profile.objectArea || '',
    roomCount: profile.roomCount || '',
    budget: profile.budget || '',
    deadline: profile.deadline || '',
    floor: profile.floor || '',
    messenger: profile.messenger || '',
    messengerNick: profile.messengerNick || '',
    // Raw profile for any extra fields
    _profile: profile,
  }

  // Fetch page content for first-contact / smart-brief if available
  const pageRows = await db.select().from(pageContent)
    .where(eq(pageContent.projectId, proj.id))

  for (const pg of pageRows) {
    const content = (pg.content || {}) as Record<string, any>
    if (pg.pageSlug === 'first-contact' || pg.pageSlug === 'smart-brief') {
      // Merge useful fields into project
      for (const [k, v] of Object.entries(content)) {
        if (v && typeof v === 'string' && !result.project[k]) {
          result.project[k] = v
        }
      }
    }
  }

  // Fetch linked clients
  // Client IDs are stored in project profile as client_ids array or client_id
  const clientIds: number[] = []
  if (Array.isArray(profile.client_ids)) {
    clientIds.push(...profile.client_ids.map(Number).filter(Boolean))
  }
  if (profile.client_id) {
    const cid = Number(profile.client_id)
    if (cid && !clientIds.includes(cid)) clientIds.push(cid)
  }

  if (clientIds.length) {
    const linkedClients = await db.select().from(clients).where(inArray(clients.id, clientIds))
    result.clients = linkedClients
  } else {
    // Fallback: return all clients
    result.clients = await db.select().from(clients).orderBy(clients.name)
  }

  // Fetch linked contractors
  const pcRows = await db.select({ contractorId: projectContractors.contractorId })
    .from(projectContractors)
    .where(eq(projectContractors.projectId, proj.id))

  const contractorIds = pcRows.map(r => r.contractorId)
  if (contractorIds.length) {
    result.contractors = await db.select().from(contractors).where(inArray(contractors.id, contractorIds))
  } else {
    result.contractors = await db.select().from(contractors).orderBy(contractors.name)
  }

  return result
})
