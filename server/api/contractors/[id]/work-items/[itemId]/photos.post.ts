import { writeFile } from 'fs/promises'
import { randomUUID } from 'crypto'
import path from 'path'
import { useDb } from '~/server/db/index'
import { workStatusItemPhotos, workStatusItems, contractors } from '~/server/db/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { ensureUploadDir, getUploadUrl } from '~/server/utils/storage'

export default defineEventHandler(async (event) => {
  const contractorId = Number(getRouterParam(event, 'id'))
  const itemId = Number(getRouterParam(event, 'itemId'))
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

  const form = await readMultipartFormData(event)
  if (!form) throw createError({ statusCode: 400, statusMessage: 'No form data' })
  const filePart = form.find(p => p.name === 'file')
  if (!filePart?.data) throw createError({ statusCode: 400, statusMessage: 'No file' })
  const captionPart = form.find(p => p.name === 'caption')
  const caption = captionPart ? String(captionPart.data) : null

  const dir = await ensureUploadDir()
  const ext = path.extname(filePart.filename || '.jpg')
  const filename = `${randomUUID()}${ext}`
  await writeFile(path.join(dir, filename), filePart.data)
  const url = getUploadUrl(filename)

  const [photo] = await db.insert(workStatusItemPhotos).values({
    itemId,
    contractorId,
    url,
    caption,
  }).returning()

  return photo
})
