import { writeFile } from 'fs/promises'
import { randomUUID } from 'crypto'
import path from 'path'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const form = await readMultipartFormData(event)
  if (!form) throw createError({ statusCode: 400, statusMessage: 'No form data' })
  const filePart = form.find(p => p.name === 'file')
  if (!filePart || !filePart.data) throw createError({ statusCode: 400, statusMessage: 'No file' })
  const dir = await ensureUploadDir()
  const ext = path.extname(filePart.filename || '.bin')
  const filename = `${randomUUID()}${ext}`
  await writeFile(path.join(dir, filename), filePart.data)
  return { url: getUploadUrl(filename), filename }
})
