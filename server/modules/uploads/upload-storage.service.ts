import { promises as fs } from 'fs'
import path from 'path'
import { config } from '~/server/config'

export function getUploadDir(): string {
  const configured = config.UPLOAD_DIR
  return path.isAbsolute(configured) ? configured : path.join(process.cwd(), configured)
}
export async function ensureUploadDir() {
  const dir = getUploadDir()
  await fs.mkdir(dir, { recursive: true })
  return dir
}
export function getUploadUrl(filename: string): string {
  return `/uploads/${filename}`
}
