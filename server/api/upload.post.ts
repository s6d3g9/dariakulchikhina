import { writeFile } from 'fs/promises'
import { randomUUID } from 'crypto'
import path from 'path'
import { validateUploadedFile } from '~/server/utils/upload-validation'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const form = await readMultipartFormData(event)
  if (!form) throw createError({ statusCode: 400, statusMessage: 'No form data' })
  const filePart = form.find(p => p.name === 'file')
  if (!filePart || !filePart.data) throw createError({ statusCode: 400, statusMessage: 'No file' })

  // Validate file type and size
  const validation = validateUploadedFile(filePart.data, filePart.filename, filePart.type)
  if (!validation.valid) {
    throw createError({ statusCode: 400, statusMessage: validation.error || 'Invalid file' })
  }

  const dir = await ensureUploadDir()
  const ext = path.extname(filePart.filename || '.bin')
  const filename = `${randomUUID()}${ext}`
  await writeFile(path.join(dir, filename), filePart.data)
  return { url: getUploadUrl(filename), filename }
})
