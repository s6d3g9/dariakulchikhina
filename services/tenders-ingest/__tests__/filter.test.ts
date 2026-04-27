/**
 * Filter unit tests — OKPD2 prefix matching and region whitelist.
 */
import assert from 'node:assert/strict'
import {
  CITYOFROADS_OKPD2_WHITELIST,
  matchesOkpd2Whitelist,
} from '../src/core/filter/okpd.ts'
import { matchesRegionWhitelist } from '../src/core/filter/region.ts'

export async function runFilterTests(): Promise<void> {
  // OKPD2 — exact match
  assert.equal(matchesOkpd2Whitelist(['42.11.10.110']), true)
  // OKPD2 — prefix match (sub-code under 42.11.20.100)
  assert.equal(matchesOkpd2Whitelist(['42.11.20.100.5']), true)
  // OKPD2 — multiple codes, one matches
  assert.equal(matchesOkpd2Whitelist(['10.11.30', '42.13.20.100']), true)
  // OKPD2 — none match
  assert.equal(matchesOkpd2Whitelist(['10.11.30', '99.00.00']), false)
  // OKPD2 — empty input
  assert.equal(matchesOkpd2Whitelist([]), false)
  // OKPD2 — whitelist contains group prefix
  assert(CITYOFROADS_OKPD2_WHITELIST.includes('42.11'))

  // Region — exact match
  assert.equal(matchesRegionWhitelist('RU-MOW'), true)
  assert.equal(matchesRegionWhitelist('RU-MOS'), true)
  // Region — out of scope
  assert.equal(matchesRegionWhitelist('RU-NIZ'), false)
  // Region — null/empty
  assert.equal(matchesRegionWhitelist(null), false)
  assert.equal(matchesRegionWhitelist(''), false)

  console.log('filter.test ok')
}
