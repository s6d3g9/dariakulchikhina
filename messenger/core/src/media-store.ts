import { mkdir, writeFile } from 'node:fs/promises'
import { basename, extname, resolve } from 'node:path'
import { randomUUID } from 'node:crypto'

export const MESSENGER_UPLOADS_ROOT = resolve(process.cwd(), 'data', 'uploads')

export interface StoredMediaFile {
  name: string
  mimeType: string
  size: number
  url: string
}

function sanitizeFileName(input: string) {
  return basename(input).replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'file'
}

export async function storeUploadedMedia(input: { filename: string; mimeType: string; buffer: Buffer }) {
  await mkdir(MESSENGER_UPLOADS_ROOT, { recursive: true })

  const safeBase = sanitizeFileName(input.filename)
  const extension = extname(safeBase)
  const stem = extension ? safeBase.slice(0, -extension.length) : safeBase
  const storedName = `${stem}-${randomUUID()}${extension}`
  const filePath = resolve(MESSENGER_UPLOADS_ROOT, storedName)

  await writeFile(filePath, input.buffer)

  return {
    name: safeBase,
    mimeType: input.mimeType || 'application/octet-stream',
    size: input.buffer.byteLength,
    url: `/uploads/${storedName}`,
  } satisfies StoredMediaFile
}