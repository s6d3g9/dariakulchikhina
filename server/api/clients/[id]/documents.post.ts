import { useDb } from '~/server/db/index'
import { documents } from '~/server/db/schema'
import { writeFile, mkdir } from 'node:fs/promises'
import { join, extname } from 'node:path'
import { randomUUID } from 'node:crypto'
import { validateUploadedFile } from '~/server/utils/upload-validation'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const clientId = Number(getRouterParam(event, 'id'))
  if (!clientId || !Number.isFinite(clientId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid client id' })
  }

  const form = await readMultipartFormData(event)
  if (!form) throw createError({ statusCode: 400, message: 'No multipart data' })

  const fileField = form.find(f => f.name === 'file')
  const title = form.find(f => f.name === 'title')?.data?.toString() || 'Документ'
  const kind = form.find(f => f.name === 'category')?.data?.toString() || 'other'
  const notes = form.find(f => f.name === 'notes')?.data?.toString() || null

  if (!fileField?.data) throw createError({ statusCode: 400, message: 'File required' })

  const validation = validateUploadedFile(fileField.data, fileField.filename, fileField.type)
  if (!validation.valid) throw createError({ statusCode: 400, message: validation.error })

  const ext = extname(fileField.filename || '.pdf')
  const filename = `client_${clientId}_${randomUUID()}${ext}`
  const uploadDir = join(process.cwd(), 'public', 'uploads', 'client-docs')
  await mkdir(uploadDir, { recursive: true })
  await writeFile(join(uploadDir, filename), fileField.data)

  const url = `/uploads/client-docs/${filename}`
  const db = useDb()
  const [doc] = await db.insert(documents).values({
    projectId: null,
    category: `client:${clientId}:${kind}`,
    title,
    filename,
    url,
    notes,
  }).returning()

  return {
    ...doc,
    category: kind,
  }
})
