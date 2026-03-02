import { readFileSync } from 'fs'
import { join } from 'path'

let suggestionsCache: Record<string, any> | null = null

function loadSuggestions(): Record<string, any> {
  if (suggestionsCache) return suggestionsCache
  try {
    const filePath = join(process.cwd(), 'server', 'data', 'suggestions.json')
    const raw = readFileSync(filePath, 'utf-8')
    suggestionsCache = JSON.parse(raw)
  } catch {
    suggestionsCache = {}
  }
  return suggestionsCache!
}

function flattenCategory(data: any): string[] {
  if (Array.isArray(data)) return data
  const result: string[] = []
  for (const key of Object.keys(data)) {
    if (Array.isArray(data[key])) {
      result.push(...data[key])
    }
  }
  return result
}

export default defineEventHandler((event) => {
  // Auth: require any authenticated session (admin, client, or contractor)
  const admin = getAdminSession(event)
  const client = getClientSession(event)
  const contractor = getContractorSession(event)
  if (!admin && !client && !contractor) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  const params = getQuery(event)

  const q = ((params.q as string) || '').toLowerCase().trim()
  const category = (params.category as string) || ''

  const db = loadSuggestions()

  if (category && db[category]) {
    const items = flattenCategory(db[category])
    if (!q) return items
    return items.filter((item: string) => item.toLowerCase().includes(q))
  }

  const all: string[] = []
  for (const cat of Object.keys(db)) {
    all.push(...flattenCategory(db[cat]))
  }
  const unique = [...new Set(all)]
  if (!q) return unique
  return unique.filter((item: string) => item.toLowerCase().includes(q))
})
