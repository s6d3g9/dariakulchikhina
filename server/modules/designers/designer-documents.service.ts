import { writeFile, mkdir, unlink } from 'node:fs/promises'
import { join, extname } from 'node:path'
import { randomUUID } from 'node:crypto'
import { validateUploadedFile } from '~/server/modules/uploads/upload-validation.service'
import * as repo from './designer-documents.repository'

const DESIGNER_DOC_DIR = join(
  process.cwd(),
  'public',
  'uploads',
  'designer-docs',
)

const designerCategoryPrefix = (designerId: number) => `designer:${designerId}:`

/**
 * List documents filed under a designer (same pattern as client docs:
 * category column stores `designer:<id>:<kind>` and `projectId` is null).
 * The prefix is stripped before returning so the UI sees a plain category.
 */
export async function listDesignerDocuments(designerId: number) {
  const prefix = designerCategoryPrefix(designerId)
  const rows = await repo.listDesignerDocumentsByPrefix(prefix)
  return rows.map((row) => ({
    ...row,
    category: row.category.replace(prefix, ''),
  }))
}

export interface UploadDesignerDocumentInput {
  designerId: number
  fileData: Buffer | Uint8Array
  filename: string | undefined
  mimeType: string | undefined
  title: string
  kind: string
  notes: string | null
}

/**
 * Validate and persist an uploaded designer document, filing it into
 * `public/uploads/designer-docs/` and inserting a `documents` row with
 * the `designer:<id>:<kind>` category prefix.
 */
export async function uploadDesignerDocument(input: UploadDesignerDocumentInput) {
  const validation = validateUploadedFile(
    input.fileData,
    input.filename,
    input.mimeType,
  )
  if (!validation.valid) {
    throw createError({ statusCode: 400, message: validation.error })
  }

  const ext = extname(input.filename || '.pdf')
  const filename = `designer_${input.designerId}_${randomUUID()}${ext}`
  await mkdir(DESIGNER_DOC_DIR, { recursive: true })
  await writeFile(join(DESIGNER_DOC_DIR, filename), input.fileData)

  const url = `/uploads/designer-docs/${filename}`
  const doc = await repo.insertDesignerDocument({
    projectId: null,
    category: `${designerCategoryPrefix(input.designerId)}${input.kind}`,
    title: input.title,
    filename,
    url,
    notes: input.notes,
  })

  return { ...doc, category: input.kind }
}

/**
 * Delete a designer-scoped document. Verifies the `designer:<id>:`
 * prefix before removing the row and unlinking the file.
 */
export async function deleteDesignerDocument(designerId: number, docId: number) {
  const prefix = designerCategoryPrefix(designerId)
  const doc = await repo.findDesignerDocumentByIdAndPrefix(docId, prefix)
  if (!doc) return null

  if (doc.filename) {
    try {
      await unlink(join(DESIGNER_DOC_DIR, doc.filename))
    } catch {
      // ignore — file may already be gone
    }
  }

  await repo.deleteDesignerDocumentRow(docId)
  return doc
}
