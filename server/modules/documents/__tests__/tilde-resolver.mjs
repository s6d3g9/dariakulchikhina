/**
 * Node.js module hook that resolves Nuxt-style `~/server/*` path aliases
 * and directory imports so that --experimental-strip-types can run server
 * modules directly.
 *
 * Registered via: node --import ./server/modules/documents/__tests__/tilde-resolver.mjs
 */
import { registerHooks } from 'node:module'
import { resolve, dirname, extname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { existsSync, statSync } from 'node:fs'

// Resolve monorepo root (this file lives 5 levels deep: server/modules/documents/__tests__/)
const ROOT = resolve(fileURLToPath(import.meta.url), '../../../../../')

function tildeToAbsolute(specifier) {
  if (!specifier.startsWith('~/')) return null
  const rest = specifier.slice(2)

  let base
  if (rest.startsWith('server/')) base = resolve(ROOT, rest)
  else if (rest.startsWith('shared/')) base = resolve(ROOT, rest)
  else base = resolve(ROOT, 'app', rest)

  for (const candidate of [`${base}.ts`, resolve(base, 'index.ts'), base]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate
  }
  return null
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    const abs = tildeToAbsolute(specifier)
    if (abs) return nextResolve(pathToFileURL(abs).href, context)

    if (
      (specifier.startsWith('./') || specifier.startsWith('../')) &&
      context.parentURL?.startsWith('file://')
    ) {
      const parentDir = dirname(fileURLToPath(context.parentURL))
      const resolved = resolve(parentDir, specifier)

      if (existsSync(resolved) && statSync(resolved).isDirectory()) {
        const indexTs = resolve(resolved, 'index.ts')
        if (existsSync(indexTs)) return nextResolve(pathToFileURL(indexTs).href, context)
      }

      // Handle extension-less imports and TypeScript module names like
      // './foo.service', './foo.repository' (extname returns '.service' etc.)
      if (extname(specifier) !== '.ts' && extname(specifier) !== '.mjs' && extname(specifier) !== '.js') {
        const asTs = `${resolved}.ts`
        if (existsSync(asTs) && statSync(asTs).isFile()) {
          return nextResolve(pathToFileURL(asTs).href, context)
        }
      }
    }

    return nextResolve(specifier, context)
  },
})
