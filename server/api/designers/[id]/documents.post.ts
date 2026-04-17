import { uploadDesignerDocument } from '~/server/modules/designers/designer-documents.service'

/**
 * POST /api/designers/[id]/documents — multipart upload of a
 * designer-scoped document.
 */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const designerId = Number(getRouterParam(event, 'id'))
  if (!designerId || !Number.isFinite(designerId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid designer id' })
  }

  const form = await readMultipartFormData(event)
  if (!form) throw createError({ statusCode: 400, message: 'No multipart data' })

  const fileField = form.find((f) => f.name === 'file')
  if (!fileField?.data) throw createError({ statusCode: 400, message: 'File required' })

  const title = form.find((f) => f.name === 'title')?.data?.toString() || 'Документ'
  const kind = form.find((f) => f.name === 'category')?.data?.toString() || 'other'
  const notes = form.find((f) => f.name === 'notes')?.data?.toString() || null

  return await uploadDesignerDocument({
    designerId,
    fileData: fileField.data,
    filename: fileField.filename,
    mimeType: fileField.type,
    title,
    kind,
    notes,
  })
})
