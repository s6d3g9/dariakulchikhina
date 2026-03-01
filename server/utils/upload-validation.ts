/**
 * File upload validation helpers.
 * Whitelist allowed MIME types and enforce size limits.
 */
import path from 'path'

/** Maximum file size in bytes (20 MB) */
export const MAX_FILE_SIZE = 20 * 1024 * 1024

/** Allowed MIME types for uploads */
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/avif',
  'image/heic',
  'image/heif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
])

/** Allowed extensions (fallback when MIME not reliable) */
const ALLOWED_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg',
  '.avif', '.heic', '.heif',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx',
])

/** Dangerous extensions that should NEVER be allowed */
const BLOCKED_EXTENSIONS = new Set([
  '.exe', '.sh', '.bat', '.cmd', '.ps1', '.msi',
  '.com', '.scr', '.pif', '.vbs', '.js', '.mjs',
  '.php', '.py', '.rb', '.pl', '.cgi', '.jsp',
  '.war', '.jar', '.class', '.dll', '.so',
])

export interface FileValidationResult {
  valid: boolean
  error?: string
}

export function validateUploadedFile(
  data: Buffer | Uint8Array,
  filename: string | undefined,
  mimeType: string | undefined,
): FileValidationResult {
  // 1. Size check
  if (data.length > MAX_FILE_SIZE) {
    return { valid: false, error: `Файл превышает лимит ${MAX_FILE_SIZE / 1024 / 1024} MB` }
  }

  // 2. Extension check
  const ext = path.extname(filename || '').toLowerCase()
  if (BLOCKED_EXTENSIONS.has(ext)) {
    return { valid: false, error: `Запрещённый тип файла: ${ext}` }
  }
  if (ext && !ALLOWED_EXTENSIONS.has(ext)) {
    return { valid: false, error: `Неподдерживаемый формат файла: ${ext}` }
  }

  // 3. MIME type check (if provided)
  if (mimeType && !ALLOWED_MIME_TYPES.has(mimeType)) {
    // Be lenient if extension is allowed but MIME is unknown/application/octet-stream
    if (mimeType !== 'application/octet-stream') {
      return { valid: false, error: `Запрещённый MIME-тип: ${mimeType}` }
    }
  }

  // 4. Magic bytes heuristic for common image formats
  if (data.length >= 4) {
    const isJpeg = data[0] === 0xFF && data[1] === 0xD8
    const isPng = data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4E && data[3] === 0x47
    const isGif = data[0] === 0x47 && data[1] === 0x49 && data[2] === 0x46
    const isPdf = data[0] === 0x25 && data[1] === 0x50 && data[2] === 0x44 && data[3] === 0x46

    // If the extension claims to be an image but magic bytes don't match any known format,
    // and it's also not a PDF or document — reject
    const imageExts = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif'])
    if (imageExts.has(ext) && !isJpeg && !isPng && !isGif && data.length > 10) {
      // Allow webp (RIFF header) and avif (ftyp box)
      const isRiff = data[0] === 0x52 && data[1] === 0x49 && data[2] === 0x46 && data[3] === 0x46
      const isFtyp = data[4] === 0x66 && data[5] === 0x74 && data[6] === 0x79 && data[7] === 0x70
      if (!isRiff && !isFtyp) {
        return { valid: false, error: 'Содержимое файла не соответствует заявленному формату изображения' }
      }
    }
  }

  return { valid: true }
}

/**
 * Sanitize filename: strip path components, limit length.
 */
export function sanitizeFilename(filename: string | undefined): string {
  if (!filename) return 'file.bin'
  // Remove path components
  const base = path.basename(filename)
  // Remove special characters except dots, dashes, underscores
  const clean = base.replace(/[^a-zA-Z0-9._-]/g, '_')
  // Limit length
  return clean.slice(0, 200)
}
