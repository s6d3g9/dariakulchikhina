import { mkdir, writeFile } from 'node:fs/promises'
import { basename, extname, resolve } from 'node:path'
import { randomUUID } from 'node:crypto'

import { resolveMessengerDataPath } from './storage-paths.ts'

export const MESSENGER_UPLOADS_ROOT = resolveMessengerDataPath('uploads')

// --- Per-user upload quota ---
const UPLOAD_QUOTA_MAX_BYTES_PER_DAY = 100 * 1024 * 1024 // 100 MB/day per user
const UPLOAD_QUOTA_MAX_FILES_PER_DAY = 200 // 200 files/day per user

interface UploadQuotaBucket {
  bytes: number
  files: number
  resetAt: number
}

const uploadQuotaMap = new Map<string, UploadQuotaBucket>()

// Cleanup stale quota buckets every 30 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, bucket] of uploadQuotaMap.entries()) {
    if (now >= bucket.resetAt) uploadQuotaMap.delete(key)
  }
}, 30 * 60 * 1000)

export function checkUploadQuota(userId: string, fileSize: number): void {
  const now = Date.now()
  const dayMs = 24 * 60 * 60 * 1000
  let bucket = uploadQuotaMap.get(userId)
  if (!bucket || now >= bucket.resetAt) {
    bucket = { bytes: 0, files: 0, resetAt: now + dayMs }
    uploadQuotaMap.set(userId, bucket)
  }
  if (bucket.bytes + fileSize > UPLOAD_QUOTA_MAX_BYTES_PER_DAY) {
    throw new Error('UPLOAD_QUOTA_EXCEEDED')
  }
  if (bucket.files + 1 > UPLOAD_QUOTA_MAX_FILES_PER_DAY) {
    throw new Error('UPLOAD_QUOTA_EXCEEDED')
  }
  // Atomic: increment immediately to prevent TOCTOU race
  bucket.bytes += fileSize
  bucket.files += 1
}

export function rollbackUploadUsage(userId: string, fileSize: number): void {
  const bucket = uploadQuotaMap.get(userId)
  if (bucket) {
    bucket.bytes = Math.max(0, bucket.bytes - fileSize)
    bucket.files = Math.max(0, bucket.files - 1)
  }
}

// Allowed MIME types for messenger uploads
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif',
  'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav',
  'video/webm', 'video/mp4',
  'application/pdf',
  'text/plain',
  'application/octet-stream', // encrypted E2EE blobs
])

// Dangerous extensions that must never be stored
const BLOCKED_EXTENSIONS = new Set([
  '.exe', '.bat', '.cmd', '.com', '.msi', '.scr', '.pif',
  '.sh', '.bash', '.zsh', '.csh',
  '.php', '.py', '.rb', '.pl', '.jsp', '.asp', '.aspx',
  '.jar', '.war', '.class',
  '.ps1', '.vbs', '.wsf', '.hta',
  '.svg', '.html', '.htm', '.xml', '.xhtml',
])

// Magic bytes for common file types
const MAGIC_BYTES: Array<{ mime: string; bytes: number[] }> = [
  { mime: 'image/jpeg', bytes: [0xFF, 0xD8, 0xFF] },
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4E, 0x47] },
  { mime: 'image/gif', bytes: [0x47, 0x49, 0x46] },
  { mime: 'image/webp', bytes: [0x52, 0x49, 0x46, 0x46] }, // RIFF
  { mime: 'application/pdf', bytes: [0x25, 0x50, 0x44, 0x46] }, // %PDF
]

function detectMimeFromMagicBytes(buffer: Buffer): string | null {
  for (const { mime, bytes } of MAGIC_BYTES) {
    if (buffer.length >= bytes.length && bytes.every((b, i) => buffer[i] === b)) {
      return mime
    }
  }
  return null
}

export function validateUploadedFile(filename: string, mimeType: string, buffer: Buffer) {
  const ext = extname(filename).toLowerCase()
  if (BLOCKED_EXTENSIONS.has(ext)) {
    throw new Error('FILE_TYPE_BLOCKED')
  }

  // Allow encrypted blobs (E2EE attachments) with application/octet-stream
  if (mimeType === 'application/octet-stream') {
    return
  }

  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new Error('FILE_TYPE_NOT_ALLOWED')
  }

  // Verify magic bytes match declared MIME type for known types
  const detected = detectMimeFromMagicBytes(buffer)
  if (detected && mimeType.startsWith('image/') && detected !== mimeType) {
    // MIME mismatch for images — potential bypass attempt
    throw new Error('FILE_TYPE_MISMATCH')
  }
}

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
  // Validate file type before storing
  validateUploadedFile(input.filename, input.mimeType, input.buffer)

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