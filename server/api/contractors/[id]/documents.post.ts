import { useDb } from '~/server/db/index'
import { contractorDocuments } from '~/server/db/schema'
import { writeFile, mkdir } from 'node:fs/promises'
import { join, extname } from 'node:path'
import { randomUUID } from 'node:crypto'
import { validateUploadedFile } from '~/server/utils/upload-validation'

export default defineEventHandler(async (event) => {
  const contractorId = Number(getRouterParam(event, 'id'))
  requireAdminOrContractor(event, contractorId)

  const form = await readMultipartFormData(event)
  if (!form) throw createError({ statusCode: 400, message: 'No multipart data' })

  const fileField = form.find(f => f.name === 'file')
  const title = form.find(f => f.name === 'title')?.data?.toString() || 'Документ'
  const category = form.find(f => f.name === 'category')?.data?.toString() || 'other'
  const notes = form.find(f => f.name === 'notes')?.data?.toString() || null
  const expiresAt = form.find(f => f.name === 'expiresAt')?.data?.toString() || null

  if (!fileField?.data) throw createError({ statusCode: 400, message: 'File required' })

  const validation = validateUploadedFile(fileField.data, fileField.filename, fileField.type)
  if (!validation.valid) throw createError({ statusCode: 400, message: validation.error })

  const ext = extname(fileField.filename || '.pdf')
  const filename = `contractor_${contractorId}_${randomUUID()}${ext}`
  const uploadDir = join(process.cwd(), 'public', 'uploads', 'contractor-docs')
  await mkdir(uploadDir, { recursive: true })
  await writeFile(join(uploadDir, filename), fileField.data)

  const url = `/uploads/contractor-docs/${filename}`
  const db = useDb()
  const [doc] = await db.insert(contractorDocuments).values({
    contractorId,
    category,
    title,
    filename,
    url,
    notes,
    expiresAt,
  }).returning()

  return doc
})
