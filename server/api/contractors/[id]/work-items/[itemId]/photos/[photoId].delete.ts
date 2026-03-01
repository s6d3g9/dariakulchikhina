import { unlink } from 'fs/promises'
import path from 'path'
import { useDb } from '~/server/db/index'
import { workStatusItemPhotos, workStatusItems, contractors } from '~/server/db/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { getUploadDir } from '~/server/utils/storage'

export default defineEventHandler(async (event) => {
  const contractorId = Number(getRouterParam(event, 'id'))
  const itemId = Number(getRouterParam(event, 'itemId'))
  const photoId = Number(getRouterParam(event, 'photoId'))

  // Auth: admin or authenticated contractor
  requireAdminOrContractor(event, contractorId)

  const db = useDb()

  const staff = await db
    .select({ id: contractors.id })
    .from(contractors)
    .where(eq(contractors.parentId, contractorId))
  const allIds = [contractorId, ...staff.map((s: any) => s.id)]

  const [item] = await db
    .select({ id: workStatusItems.id })
    .from(workStatusItems)
    .where(and(eq(workStatusItems.id, itemId), inArray(workStatusItems.contractorId, allIds)))
    .limit(1)
  if (!item) throw createError({ statusCode: 403 })

  const [photo] = await db
    .delete(workStatusItemPhotos)
    .where(and(eq(workStatusItemPhotos.id, photoId), eq(workStatusItemPhotos.itemId, itemId)))
    .returning()

  if (!photo) throw createError({ statusCode: 404 })

  // Удаляем файл (path traversal protection)
  try {
    const filename = path.basename(photo.url)
    if (filename && !filename.includes('..')) {
      await unlink(path.join(getUploadDir(), filename))
    }
  } catch { /* файл мог быть удалён вручную */ }

  return { ok: true }
})
