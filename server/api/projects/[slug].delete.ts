import { useDb } from '~/server/db/index'
import { projects, uploads, workStatusItems, workStatusItemPhotos, documents } from '~/server/db/schema'
import { eq, inArray } from 'drizzle-orm'
import { unlink } from 'node:fs/promises'
import { join } from 'node:path'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const slug = getRouterParam(event, 'slug')!
  const db = useDb()

  // Resolve project id
  const [proj] = await db.select({ id: projects.id }).from(projects).where(eq(projects.slug, slug)).limit(1)
  if (!proj) throw createError({ statusCode: 404, statusMessage: 'Project not found' })

  // Collect files to clean up before FK cascades delete the rows
  const uploadRows = await db.select({ filename: uploads.filename }).from(uploads).where(eq(uploads.projectId, proj.id))
  const workItems = await db.select({ id: workStatusItems.id }).from(workStatusItems).where(eq(workStatusItems.projectId, proj.id))
  let photoUrls: { url: string | null }[] = []
  if (workItems.length) {
    photoUrls = await db.select({ url: workStatusItemPhotos.url }).from(workStatusItemPhotos)
      .where(inArray(workStatusItemPhotos.itemId, workItems.map(w => w.id)))
  }

  // Nullify project reference in documents (they use onDelete: 'set null')
  await db.update(documents).set({ projectId: null } as any).where(eq(documents.projectId, proj.id))

  // Delete project row (cascades to page_content, work_status_items, roadmap_stages, project_contractors, uploads)
  await db.delete(projects).where(eq(projects.id, proj.id))

  // Best-effort cleanup of physical files
  const base = join(process.cwd(), 'public')
  for (const row of uploadRows) {
    if (row.filename) {
      try { await unlink(join(base, 'uploads', row.filename)) } catch { /* file may not exist */ }
    }
  }
  for (const row of photoUrls) {
    if (row.url) {
      try { await unlink(join(base, row.url.replace(/^\//, ''))) } catch { /* file may not exist */ }
    }
  }

  return { ok: true }
})
