import { useDb } from '~/server/db/index'
import { documents, designerProjects } from '~/server/db/schema'
import { and, eq } from 'drizzle-orm'
import { writeFile, mkdir } from 'node:fs/promises'
import { join, extname } from 'node:path'
import { randomUUID } from 'node:crypto'
import { validateUploadedFile } from '~/server/utils/upload-validation'

export default defineEventHandler(async (event) => {
  const designerId = requireDesigner(event)
  const dpId = Number(getRouterParam(event, 'id'))
  if (!dpId) throw createError({ statusCode: 400, statusMessage: 'Invalid id' })

  const db = useDb()

  // Verify project belongs to this designer
  const [dp] = await db
    .select({ projectId: designerProjects.projectId })
    .from(designerProjects)
    .where(and(eq(designerProjects.id, dpId), eq(designerProjects.designerId, designerId)))
    .limit(1)
  if (!dp) throw createError({ statusCode: 404, statusMessage: 'Проект не найден' })

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
  const filename = `project_${dp.projectId}_${randomUUID()}${ext}`
  const uploadDir = join(process.cwd(), 'public', 'uploads', 'project-docs')
  await mkdir(uploadDir, { recursive: true })
  await writeFile(join(uploadDir, filename), fileField.data)

  const url = `/uploads/project-docs/${filename}`
  const [doc] = await db.insert(documents).values({
    projectId: dp.projectId,
    category: kind,
    title,
    filename,
    url,
    notes,
  }).returning()

  return doc
})
