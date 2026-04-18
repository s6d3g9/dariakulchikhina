import { resolve } from 'node:path'
import { readMessengerConfig } from '../config.ts'

const runtimeDataDir = readMessengerConfig().MESSENGER_CORE_DATA_DIR?.trim()

export const MESSENGER_CORE_DATA_ROOT = runtimeDataDir
  ? resolve(runtimeDataDir)
  : resolve(process.cwd(), 'data')

export function resolveMessengerDataPath(...segments: string[]) {
  return resolve(MESSENGER_CORE_DATA_ROOT, ...segments)
}