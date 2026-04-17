import { writeFile, mkdir, unlink } from 'node:fs/promises'
import { join, extname } from 'node:path'
import { randomUUID } from 'node:crypto'
import { validateUploadedFile } from '~/server/modules/uploads/upload-validation.service'
import * as repo from './contractor-documents.repository'

const CONTRACTOR_DOC_DIR = join(
  process.cwd(),
  'public',
  'uploads',
  'contractor-docs',
)

export async function listContractorDocuments(contractorId: number) {
  return repo.listContractorDocuments(contractorId)
}

export interface UploadContractorDocumentInput {
  contractorId: number
  fileData: Buffer | Uint8Array
  filename: string | undefined
  mimeType: string | undefined
  title: string
  category: string
  notes: string | null
  expiresAt: string | null
}

/**
 * Validate and write a contractor document to the uploads directory,
 * then persist the row. Multipart parsing is done by the handler so the
 * service stays runtime-agnostic.
 */
export async function uploadContractorDocument(input: UploadContractorDocumentInput) {
  const validation = validateUploadedFile(
    input.fileData,
    input.filename,
    input.mimeType,
  )
  if (!validation.valid) {
    throw createError({ statusCode: 400, message: validation.error })
  }

  const ext = extname(input.filename || '.pdf')
  const filename = `contractor_${input.contractorId}_${randomUUID()}${ext}`
  await mkdir(CONTRACTOR_DOC_DIR, { recursive: true })
  await writeFile(join(CONTRACTOR_DOC_DIR, filename), input.fileData)

  const url = `/uploads/contractor-docs/${filename}`
  return repo.insertContractorDocument({
    contractorId: input.contractorId,
    category: input.category,
    title: input.title,
    filename,
    url,
    notes: input.notes,
    expiresAt: input.expiresAt,
  })
}

/**
 * Delete a contractor document. Verifies the doc belongs to the
 * contractor before removing the row and unlinking the file.
 */
export async function deleteContractorDocument(contractorId: number, docId: number) {
  const doc = await repo.findContractorDocumentOwned(contractorId, docId)
  if (!doc) return null

  if (doc.filename) {
    try {
      await unlink(join(CONTRACTOR_DOC_DIR, doc.filename))
    } catch {
      // ignore — file may already be gone
    }
  }

  await repo.deleteContractorDocumentRow(docId)
  return doc
}
