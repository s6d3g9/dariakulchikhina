import { uploadContractorDocument } from '~/server/modules/contractors/contractor-documents.service'

/**
 * POST /api/contractors/[id]/documents — multipart upload. Fields:
 * `file` (required), `title`, `category`, `notes`, `expiresAt`.
 */
export default defineEventHandler(async (event) => {
  const contractorId = Number(getRouterParam(event, 'id'))
  requireAdminOrContractor(event, contractorId)

  const form = await readMultipartFormData(event)
  if (!form) throw createError({ statusCode: 400, message: 'No multipart data' })

  const fileField = form.find((f) => f.name === 'file')
  if (!fileField?.data) {
    throw createError({ statusCode: 400, message: 'File required' })
  }

  const title = form.find((f) => f.name === 'title')?.data?.toString() || 'Документ'
  const category = form.find((f) => f.name === 'category')?.data?.toString() || 'other'
  const notes = form.find((f) => f.name === 'notes')?.data?.toString() || null
  const expiresAt = form.find((f) => f.name === 'expiresAt')?.data?.toString() || null

  return await uploadContractorDocument({
    contractorId,
    fileData: fileField.data,
    filename: fileField.filename,
    mimeType: fileField.type,
    title,
    category,
    notes,
    expiresAt,
  })
})
