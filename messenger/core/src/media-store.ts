import { mkdir, writeFile } from 'node:fs/promises'
import { basename, extname, resolve } from 'node:path'
import { randomUUID } from 'node:crypto'

import { resolveMessengerDataPath } from './storage-paths.ts'

export const MESSENGER_UPLOADS_ROOT = resolveMessengerDataPath('uploads')

export interface StoredMediaFile {
  name: string
  mimeType: string
  size: number
  url: string
}

function sanitizeFileName(input: string) {
  return basename(input).replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'file'
}

function sanitizeDirectoryName(input?: string) {
  if (!input) {
    return ''
  }

  return input
    .split('/')
    .map(part => part.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, ''))
    .filter(Boolean)
    .join('/')
}

export async function storeUploadedMedia(input: { filename: string; mimeType: string; buffer: Buffer; directory?: string }) {
  const safeDirectory = sanitizeDirectoryName(input.directory)
  const targetRoot = safeDirectory
    ? resolve(MESSENGER_UPLOADS_ROOT, safeDirectory)
    : MESSENGER_UPLOADS_ROOT

  await mkdir(targetRoot, { recursive: true })

  const safeBase = sanitizeFileName(input.filename)
  const extension = extname(safeBase)
  const stem = extension ? safeBase.slice(0, -extension.length) : safeBase
  const storedName = `${stem}-${randomUUID()}${extension}`
  const filePath = resolve(targetRoot, storedName)

  await writeFile(filePath, input.buffer)

  const relativePath = safeDirectory ? `${safeDirectory}/${storedName}` : storedName

  return {
    name: safeBase,
    mimeType: input.mimeType || 'application/octet-stream',
    size: input.buffer.byteLength,
    url: `/uploads/${relativePath}`,
  } satisfies StoredMediaFile
}