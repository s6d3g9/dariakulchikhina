import { readFileSync } from 'fs'
import { join } from 'path'

let suggestionsCache: Record<string, unknown> | null = null

function loadSuggestions(): Record<string, unknown> {
  if (suggestionsCache) return suggestionsCache
  try {
    const filePath = join(process.cwd(), 'server', 'data', 'suggestions.json')
    suggestionsCache = JSON.parse(readFileSync(filePath, 'utf-8'))
  } catch {
    suggestionsCache = {}
  }
  return suggestionsCache!
}

function flattenCategory(data: unknown): string[] {
  if (Array.isArray(data)) return data as string[]
  const result: string[] = []
  for (const key of Object.keys(data as Record<string, unknown>)) {
    const val = (data as Record<string, unknown>)[key]
    if (Array.isArray(val)) result.push(...(val as string[]))
  }
  return result
}

export function getSuggestions(q: string, category: string): string[] {
  const db = loadSuggestions()
  if (category && db[category]) {
    const items = flattenCategory(db[category])
    return q ? items.filter(item => item.toLowerCase().includes(q)) : items
  }
  const all: string[] = []
  for (const cat of Object.keys(db)) all.push(...flattenCategory(db[cat]))
  const unique = [...new Set(all)]
  return q ? unique.filter(item => item.toLowerCase().includes(q)) : unique
}
