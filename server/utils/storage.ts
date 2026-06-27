import { promises as fs } from 'fs'
import path from 'path'

/**
 * Upload directory — defaults to a PRIVATE location outside public/.
 * Files are served through /api/files/[...path] with auth checks.
 */
export function getUploadDir(): string {
  return process.env.UPLOAD_DIR || path.join(process.cwd(), 'data', 'uploads')
}
export async function ensureUploadDir() {
  const dir = getUploadDir()
  await fs.mkdir(dir, { recursive: true })
  return dir
}
/**
 * Returns the URL for an uploaded file.
 * Uses /api/files/ proxy which enforces auth — never expose via /uploads/ directly.
 */
export function getUploadUrl(filename: string): string {
  return `/api/files/${filename}`
}
