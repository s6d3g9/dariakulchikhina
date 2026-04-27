/**
 * Node.js ESM loader hook — resolves `~/server/*` and `~/shared/*` path
 * aliases to their physical file-system equivalents. Mirrors the
 * tsconfig paths so the smoke tests run outside the Nuxt build.
 */
import { existsSync } from 'node:fs'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { resolve as pathResolve, dirname } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
// Four levels up from server/modules/tenders/__tests__/ → repo root
const ROOT = pathResolve(__dirname, '../../../../')

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('~/')) {
    let rel = specifier.slice(2)
    if (!rel.startsWith('server/') && !rel.startsWith('shared/')) {
      rel = 'app/' + rel
    }
    const base = pathResolve(ROOT, rel)
    if (existsSync(base + '.ts')) {
      return nextResolve(pathToFileURL(base + '.ts').href, context)
    }
    if (existsSync(base + '/index.ts')) {
      return nextResolve(pathToFileURL(base + '/index.ts').href, context)
    }
    return nextResolve(pathToFileURL(base).href, context)
  }
  return nextResolve(specifier, context)
}
