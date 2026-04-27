/**
 * torgi mapper unit test — fixture lot card → UnifiedTender.
 *
 * Fixture is a minimal but realistic spring-page item. Mapper must:
 *  - convert ОКАТО → ISO 3166-2:RU,
 *  - reject lots with unknown region or missing INN/name,
 *  - sha256 the canonicalised payload.
 */
import assert from 'node:assert/strict'
import { mapTorgiLotCard } from '../../src/sources/torgi/mapper.ts'

export async function runTorgiMapperTests(): Promise<void> {
  const fixture: Record<string, unknown> = {
    id: 'lot-12345',
    noticeNumber: 'NTC-99',
    firstVersionPublicationDate: '2026-04-26T08:00:00Z',
    lotStatus: 'PUBLISHED',
    catCode: 5,
    customer: {
      inn: '7707083893',
      kpp: '770701001',
      name: 'ТУ Росимущества по Москве',
      okato: '45000000000',
    },
    lotName: 'Земельный участок 12 га под АБЗ',
    description: 'Кадастровый № 77:12:000000',
    okpd2: ['68.10.11', '42.11.20.100'],
    priceMin: 25_000_000,
    applicationsStartDate: '2026-04-27T00:00:00Z',
    applicationsEndDate: '2026-05-27T18:00:00Z',
    documentsUrls: ['https://torgi.gov.ru/docs/lot-12345.pdf'],
    procedureType: 'AUCTION',
  }

  const tender = mapTorgiLotCard(fixture as never)
  assert.ok(tender, 'mapper returned null for valid fixture')
  assert.equal(tender.sourceId, 'torgi')
  assert.equal(tender.externalGuid, 'lot-12345')
  assert.equal(tender.customer.region, 'RU-MOW')
  assert.equal(tender.customer.inn, '7707083893')
  assert.equal(tender.title, 'Земельный участок 12 га под АБЗ')
  assert.equal(tender.startPrice, 25_000_000)
  assert.equal(tender.currency, 'RUB')
  assert.equal(tender.law, 'imushestvo')
  assert.equal(tender.documentsUrls.length, 1)
  assert.equal(tender.rawPayloadHash.length, 64) // sha256 hex

  // Unknown region → null
  const noRegion = mapTorgiLotCard({
    ...fixture,
    customer: { ...(fixture.customer as object), okato: '99000000000' },
  } as never)
  assert.equal(noRegion, null)

  // Missing INN → null
  const noInn = mapTorgiLotCard({
    ...fixture,
    customer: { ...(fixture.customer as object), inn: '' },
  } as never)
  assert.equal(noInn, null)

  console.log('torgi-mapper.test ok')
}
