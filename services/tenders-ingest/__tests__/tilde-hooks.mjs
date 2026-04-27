/**
 * ESM loader hook for tenders-ingest tests. Resolves `~/shared/*` to
 * the repo-root shared directory. The service tsconfig uses the same
 * mapping (`paths: { '~/shared/*': ['../../shared/*'] }`).
 */
import { existsSync } from 'node:fs'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { resolve as pathResolve, dirname } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
// __tests__ is one level under services/tenders-ingest/, so root = ../../..
const ROOT = pathResolve(__dirname, '../../../')

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('~/')) {
    const rel = specifier.slice(2)
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
