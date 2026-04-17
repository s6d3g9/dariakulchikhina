import { uploadWorkItemPhoto } from '~/server/modules/contractors/contractor-work-items.service'

/**
 * POST /api/contractors/[id]/work-items/[itemId]/photos — multipart
 * upload. Fields: `file` (required), `caption`.
 */
export default defineEventHandler(async (event) => {
  const contractorId = Number(getRouterParam(event, 'id'))
  const itemId = Number(getRouterParam(event, 'itemId'))
  requireAdminOrContractor(event, contractorId)

  const form = await readMultipartFormData(event)
  if (!form) throw createError({ statusCode: 400, statusMessage: 'No form data' })

  const filePart = form.find((p) => p.name === 'file')
  if (!filePart?.data) throw createError({ statusCode: 400, statusMessage: 'No file' })

  const captionPart = form.find((p) => p.name === 'caption')
  const caption = captionPart ? String(captionPart.data) : null

  return await uploadWorkItemPhoto({
    contractorId,
    itemId,
    fileData: filePart.data,
    filename: filePart.filename,
    mimeType: filePart.type,
    caption,
  })
})
