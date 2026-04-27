/**
 * Smoke test for the tenders module Zod schemas.
 * Run via: node --experimental-strip-types path/to/this/file.ts
 *
 * Mock-only: no DB access, no network. Verifies that the parser
 * accepts a well-shaped UnifiedTender-style payload and rejects
 * obvious malformations.
 */

import { strict as assert } from 'node:assert'
import {
  TenderIngestItemSchema,
  TenderIngestRequestSchema,
  TenderSearchQuerySchema,
  TenderStatusSchema,
} from '../tenders.types.ts'

const validItem = {
  sourceId: 'zakupki',
  externalGuid: '0173200001425000123',
  procedureType: 'epNotificationEF2020',
  law: '44-fz',
  publishedAt: '2026-04-27T07:00:00+03:00',
  customer: {
    inn: '7707083893',
    kpp: '770701001',
    name: 'ГБУ "Автомобильные дороги"',
    region: 'RU-MOW',
  },
  title: 'Ремонт асфальтобетонного покрытия Кутузовского проспекта',
  description: 'Капитальный ремонт участка от Триумфальной арки до МКАД',
  okpd2: ['42.11.20.200'],
  startPrice: 125_000_000,
  currency: 'RUB',
  deadlineAt: '2026-05-15T18:00:00+03:00',
  documentsUrls: [
    'https://zakupki.gov.ru/epz/order/notice/ea44/view/documents.html?regNumber=0173200001425000123',
  ],
  rawPayloadHash: 'a'.repeat(64),
  rawPayload: { snapshot: 'omitted-in-test' },
}

// 1. Schema accepts a well-formed item.
const parsed = TenderIngestItemSchema.parse(validItem)
assert.equal(parsed.sourceId, 'zakupki')
assert.equal(parsed.customer.region, 'RU-MOW')

// 2. Schema rejects an INN that is too short.
const badInn = { ...validItem, customer: { ...validItem.customer, inn: '1' } }
const r1 = TenderIngestItemSchema.safeParse(badInn)
assert.equal(r1.success, false, 'too-short INN should fail')

// 3. Schema rejects a non-RUB currency (W1 scope).
const badCurrency = { ...validItem, currency: 'EUR' }
const r2 = TenderIngestItemSchema.safeParse(badCurrency)
assert.equal(r2.success, false, 'non-RUB currency should fail')

// 4. Request envelope: idempotencyKey required, items capped at 500.
const reqOk = TenderIngestRequestSchema.parse({
  sourceId: 'zakupki',
  idempotencyKey: 'ingest-zakupki-deadbeef0001',
  items: [validItem],
})
assert.equal(reqOk.items.length, 1)

const reqEmpty = TenderIngestRequestSchema.safeParse({
  sourceId: 'zakupki',
  idempotencyKey: 'ingest-zakupki-deadbeef0002',
  items: [],
})
assert.equal(reqEmpty.success, false, 'empty items array should fail')

// 5. Search query with safe defaults.
const q = TenderSearchQuerySchema.parse({})
assert.equal(q.limit, 50, 'default limit is 50')

// 6. Status enum is locked to the canonical 7 values.
assert.deepEqual(
  TenderStatusSchema.options.slice().sort(),
  ['lost', 'new', 'preparing', 'reviewed', 'skipped', 'submitted', 'won'],
)

// eslint-disable-next-line no-console -- test output
console.log('tenders.types.test ok')
