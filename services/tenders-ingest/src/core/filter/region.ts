/**
 * Region whitelist — re-exports from shared layer so the ingest service
 * has a stable import-from-`./core/filter/region` and the main app gets
 * the same canonical list from `~/shared/constants/regions`.
 *
 * Источник: docs/architecture-v5/26-tenders-ingest-spec.md §4.
 */

export {
  CITYOFROADS_REGIONS_ISO,
  OKATO_TO_ISO_3166,
  okatoToIso,
} from '~/shared/constants/regions.ts'

import { CITYOFROADS_REGIONS_ISO } from '~/shared/constants/regions.ts'

/**
 * Returns true if the tender's region (already normalized to ISO 3166-2:RU
 * by the source mapper) is in the cityofroads scope.
 */
export function matchesRegionWhitelist(
  isoRegion: string | null | undefined,
  whitelist: readonly string[] = CITYOFROADS_REGIONS_ISO,
): boolean {
  if (!isoRegion) return false
  return whitelist.includes(isoRegion)
}
