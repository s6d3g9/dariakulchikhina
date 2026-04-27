/**
 * Russian region codes — ОКАТО (2-digit prefix) ↔ ISO 3166-2:RU.
 *
 * Source verification: docs/architecture-v5/26-tenders-ingest-spec.md §4.
 * The shared layer holds the mapping so both the ingest service (mapper
 * input is ОКАТО) and the main app (search filter input is ISO) read
 * one source of truth.
 *
 * Pure constants — no runtime imports.
 */

/**
 * ОКАТО (first 2 digits) → ISO 3166-2:RU subdivision code.
 *
 * MVP scope: 6 регионов для cityofroads (Москва, МО, СПб, ЛО,
 * Краснодар, Татарстан). Расширение через тот же объект — добавление
 * пары — не ломает потребителей, только обогащает покрытие.
 */
export const OKATO_TO_ISO_3166: Readonly<Record<string, string>> = {
  '45': 'RU-MOW', // Москва
  '46': 'RU-MOS', // Московская область
  '40': 'RU-SPE', // Санкт-Петербург
  '41': 'RU-LEN', // Ленинградская область
  '03': 'RU-KDA', // Краснодарский край
  '92': 'RU-TA', // Республика Татарстан
} as const

/**
 * ISO 3166-2:RU codes that the cityofroads project considers in-scope.
 * Used by `services/tenders-ingest/src/core/filter/region.ts`.
 */
export const CITYOFROADS_REGIONS_ISO: readonly string[] = [
  'RU-MOW',
  'RU-MOS',
  'RU-SPE',
  'RU-LEN',
  'RU-KDA',
  'RU-TA',
] as const

/**
 * Convert any ОКАТО string to its ISO 3166-2:RU equivalent. Accepts
 * the full 11-digit ОКАТО (e.g. `46000000000`) and the 2-digit prefix
 * (e.g. `46`). Returns null on unknown / unmapped codes — caller
 * decides whether to drop the row or pass it through with a region
 * flagged for review.
 */
export function okatoToIso(okato: string | null | undefined): string | null {
  if (!okato) return null
  const trimmed = okato.trim()
  if (trimmed.length === 0) return null
  const prefix = trimmed.slice(0, 2)
  return OKATO_TO_ISO_3166[prefix] ?? null
}
