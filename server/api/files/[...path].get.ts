/**
 * GET /api/files/[...path]
 * Auth-protected file serving proxy.
 * Requires at least one valid session (admin, client, or contractor).
 */
import { createReadStream, existsSync, statSync } from 'node:fs'
import path from 'node:path'
import { Readable } from 'node:stream'
import { createError, defineEventHandler, getRouterParam, sendStream, setResponseHeader, type H3Event } from 'h3'
import { getAdminSession, getClientSession, getContractorSession } from '~/server/utils/auth'
import { getUploadDir } from '~/server/utils/storage'

const MIME_MAP: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
}

export default defineEventHandler(async (event: H3Event) => {
  // Require any authenticated session
  const isAdmin = !!getAdminSession(event)
  const isClient = !!getClientSession(event)
  const isContractor = !!getContractorSession(event)

  if (!isAdmin && !isClient && !isContractor) {
    throw createError({ statusCode: 401, statusMessage: 'Требуется авторизация' })
  }

  const filePath = getRouterParam(event, 'path')
  if (!filePath) {
    throw createError({ statusCode: 400, statusMessage: 'Не указан путь к файлу' })
  }

  // Sanitize: use basename of each segment to prevent directory traversal
  const segments = filePath.split('/').map((segment: string) => path.basename(segment)).filter(Boolean)
  if (segments.length === 0 || segments.some((segment: string) => segment.startsWith('.'))) {
    throw createError({ statusCode: 400, statusMessage: 'Недопустимый путь' })
  }

  const uploadDir = getUploadDir()
  const fullPath = path.resolve(uploadDir, ...segments)

  // Double-check: resolved path must be inside upload dir
  if (!fullPath.startsWith(path.resolve(uploadDir))) {
    throw createError({ statusCode: 403, statusMessage: 'Доступ запрещён' })
  }

  if (!existsSync(fullPath)) {
    throw createError({ statusCode: 404, statusMessage: 'Файл не найден' })
  }

  const stat = statSync(fullPath)
  if (!stat.isFile()) {
    throw createError({ statusCode: 404, statusMessage: 'Файл не найден' })
  }

  const ext = path.extname(fullPath).toLowerCase()
  const contentType = MIME_MAP[ext] || 'application/octet-stream'

  setResponseHeader(event, 'Content-Type', contentType)
  setResponseHeader(event, 'Content-Length', String(stat.size))
  setResponseHeader(event, 'Cache-Control', 'private, max-age=3600')
  setResponseHeader(event, 'X-Content-Type-Options', 'nosniff')

  // Force download for non-image types, inline for images
  const isImage = contentType.startsWith('image/')
  const filename = segments[segments.length - 1]
  if (isImage) {
    setResponseHeader(event, 'Content-Disposition', `inline; filename="${encodeURIComponent(filename)}"`)
  } else {
    setResponseHeader(event, 'Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`)
  }

  const stream = Readable.toWeb(createReadStream(fullPath)) as ReadableStream
  return sendStream(event, stream)
})
