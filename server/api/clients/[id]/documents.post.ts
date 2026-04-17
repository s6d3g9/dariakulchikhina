import { uploadClientDocument } from '~/server/modules/clients/clients.service'

/**
 * POST /api/clients/[id]/documents — multipart upload of a client
 * document. Fields: `file` (required), `title`, `category`, `notes`.
 */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const clientId = Number(getRouterParam(event, 'id'))
  if (!clientId || !Number.isFinite(clientId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid client id' })
  }

  const form = await readMultipartFormData(event)
  if (!form) throw createError({ statusCode: 400, message: 'No multipart data' })

  const fileField = form.find((f) => f.name === 'file')
  if (!fileField?.data) throw createError({ statusCode: 400, message: 'File required' })

  const title = form.find((f) => f.name === 'title')?.data?.toString() || 'Документ'
  const kind = form.find((f) => f.name === 'category')?.data?.toString() || 'other'
  const notes = form.find((f) => f.name === 'notes')?.data?.toString() || null

  return await uploadClientDocument({
    clientId,
    fileData: fileField.data,
    filename: fileField.filename,
    mimeType: fileField.type,
    title,
    kind,
    notes,
  })
})
