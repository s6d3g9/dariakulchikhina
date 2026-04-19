/**
 * Node.js ESM loader hook — resolves `~/server/*` and `~/shared/*` path
 * aliases to their physical file-system equivalents, and handles relative
 * directory imports (e.g., './schema' → './schema/index.ts').
 */
import { existsSync, statSync } from 'node:fs'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { resolve as pathResolve, dirname, extname } from 'node:path'

// Four levels up from server/modules/projects/__tests__/ → repo root
const ROOT = pathResolve(dirname(fileURLToPath(import.meta.url)), '../../../../')

function tildeToAbsolute(specifier) {
  if (!specifier.startsWith('~/')) return null
  const rest = specifier.slice(2)
  let base
  if (rest.startsWith('server/')) base = pathResolve(ROOT, rest)
  else if (rest.startsWith('shared/')) base = pathResolve(ROOT, rest)
  else base = pathResolve(ROOT, 'app', rest)
  for (const candidate of [`${base}.ts`, pathResolve(base, 'index.ts'), base]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate
  }
  return null
}

export async function resolve(specifier, context, nextResolve) {
  // 1. Handle ~/... aliases
  const abs = tildeToAbsolute(specifier)
  if (abs) return nextResolve(pathToFileURL(abs).href, context)

  // 2. Handle relative directory imports (e.g., './schema' → './schema/index.ts')
  if (
    (specifier.startsWith('./') || specifier.startsWith('../')) &&
    context.parentURL?.startsWith('file://')
  ) {
    const parentDir = dirname(fileURLToPath(context.parentURL))
    const resolved = pathResolve(parentDir, specifier)

    if (existsSync(resolved) && statSync(resolved).isDirectory()) {
      const indexTs = pathResolve(resolved, 'index.ts')
      if (existsSync(indexTs)) return nextResolve(pathToFileURL(indexTs).href, context)
    }

    // Also handle extension-less relative imports (./foo → ./foo.ts)
    if (!extname(specifier)) {
      const asTs = `${resolved}.ts`
      if (existsSync(asTs) && statSync(asTs).isFile()) {
        return nextResolve(pathToFileURL(asTs).href, context)
      }
    }
  }

  return nextResolve(specifier, context)
}
