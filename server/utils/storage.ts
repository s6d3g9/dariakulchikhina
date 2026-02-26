import { promises as fs } from 'fs'
import path from 'path'

export function getUploadDir(): string {
  return process.env.UPLOAD_DIR || path.join(process.cwd(), 'public', 'uploads')
}
export async function ensureUploadDir() {
  const dir = getUploadDir()
  await fs.mkdir(dir, { recursive: true })
  return dir
}
export function getUploadUrl(filename: string): string {
  return `/uploads/${filename}`
}
