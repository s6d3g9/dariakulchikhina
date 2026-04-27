/**
 * Node.js ESM loader hook for define-endpoint tests.
 * Resolves:
 *  - ~/server/* and ~/shared/* path aliases
 *  - extensionless relative TS imports (./foo → ./foo.ts)
 */
import { existsSync } from 'node:fs'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { resolve as pathResolve, dirname } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
// Four levels up: server/api/secrets/__tests__/ → repo root
const ROOT = pathResolve(__dirname, '../../../../')

export async function resolve(specifier, context, nextResolve) {
  // Tilde aliases
  if (specifier.startsWith('~/')) {
    let rel = specifier.slice(2)
    if (!rel.startsWith('server/') && !rel.startsWith('shared/')) {
      rel = 'app/' + rel
    }
    const base = pathResolve(ROOT, rel)
    if (existsSync(base + '.ts')) return nextResolve(pathToFileURL(base + '.ts').href, context)
    if (existsSync(base + '/index.ts')) return nextResolve(pathToFileURL(base + '/index.ts').href, context)
    return nextResolve(pathToFileURL(base).href, context)
  }

  // Extensionless relative imports → try appending .ts.
  // Note: a path like `./foo.service` does match `\.\w+$`, so we must
  // explicitly check for known extensions instead of "any dot suffix".
  const KNOWN_EXTS = /\.(ts|tsx|js|mjs|cjs|jsx|json|node)$/
  if ((specifier.startsWith('./') || specifier.startsWith('../')) && context.parentURL) {
    const parentDir = dirname(fileURLToPath(context.parentURL))
    const abs = pathResolve(parentDir, specifier)
    if (!KNOWN_EXTS.test(specifier)) {
      if (existsSync(abs + '.ts')) {
        return nextResolve(pathToFileURL(abs + '.ts').href, context)
      }
      if (existsSync(abs + '/index.ts')) {
        return nextResolve(pathToFileURL(abs + '/index.ts').href, context)
      }
    }
  }

  return nextResolve(specifier, context)
}
