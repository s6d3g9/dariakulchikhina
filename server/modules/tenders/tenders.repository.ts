/**
 * Tenders repository — pure Drizzle queries. Service layer composes
 * these into bigger transactions; this file has no business logic.
 */

import { and, desc, eq, inArray, lt, sql } from 'drizzle-orm'
import { tenders, tenderEvents } from '~/server/db/schema'
import { useDb } from '~/server/db'
import type { TenderIngestItem } from '~/shared/types/tenders'

/**
 * Bulk upsert. Idempotent on `(source_id, external_guid)`:
 *  - new (source_id, external_guid) → INSERT
 *  - existing + same raw_payload_hash → no-op (skipped count)
 *  - existing + different raw_payload_hash → UPDATE, version+=1
 *
 * Returns counters so the API handler can assemble TenderIngestResponse.
 */
export interface UpsertCounters {
  inserted: number
  updated: number
  skipped: number
}

export async function upsertTendersBatch(
  items: TenderIngestItem[],
): Promise<UpsertCounters> {
  if (items.length === 0) return { inserted: 0, updated: 0, skipped: 0 }
  const db = useDb()

  // Drizzle's `onConflictDoUpdate` returning gives us the row state
  // *after* upsert. To distinguish inserted/updated/skipped we add a
  // sentinel column (`xmax = 0` ⇒ insert, else update — pure pg trick).
  // Dedup within the batch by (sourceId, externalGuid) — keep the LAST
  // occurrence, matching ON CONFLICT semantics so the final state always
  // wins over earlier duplicates in the same batch. Without this, Postgres
  // raises a unique-constraint error when two rows targeting the same key
  // land in a single INSERT ... ON CONFLICT statement.
  const seen = new Map<string, TenderIngestItem>()
  for (const it of items) {
    seen.set(`${it.sourceId}:${it.externalGuid}`, it)
  }
  const deduped = [...seen.values()]

  const rows = deduped.map((it) => ({
    sourceId: it.sourceId,
    externalGuid: it.externalGuid,
    law: it.law,
    procedureType: it.procedureType,
    publishedAt: new Date(it.publishedAt),
    customerInn: it.customer.inn,
    customerKpp: it.customer.kpp ?? null,
    customerName: it.customer.name,
    customerRegion: it.customer.region,
    title: it.title,
    description: it.description ?? null,
    okpd2: it.okpd2,
    startPrice: it.startPrice == null ? null : String(it.startPrice),
    currency: it.currency,
    deadlineAt: it.deadlineAt ? new Date(it.deadlineAt) : null,
    applicationStart: it.applicationStart ? new Date(it.applicationStart) : null,
    applicationEnd: it.applicationEnd ? new Date(it.applicationEnd) : null,
    documentsUrls: it.documentsUrls,
    rawPayloadHash: it.rawPayloadHash,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- jsonb accepts unknown
    rawPayload: it.rawPayload as any,
  }))

  const result = await db
    .insert(tenders)
    .values(rows)
    .onConflictDoUpdate({
      target: [tenders.sourceId, tenders.externalGuid],
      set: {
        law: sql`excluded.law`,
        procedureType: sql`excluded.procedure_type`,
        publishedAt: sql`excluded.published_at`,
        customerInn: sql`excluded.customer_inn`,
        customerKpp: sql`excluded.customer_kpp`,
        customerName: sql`excluded.customer_name`,
        customerRegion: sql`excluded.customer_region`,
        title: sql`excluded.title`,
        description: sql`excluded.description`,
        okpd2: sql`excluded.okpd2`,
        startPrice: sql`excluded.start_price`,
        currency: sql`excluded.currency`,
        deadlineAt: sql`excluded.deadline_at`,
        applicationStart: sql`excluded.application_start`,
        applicationEnd: sql`excluded.application_end`,
        documentsUrls: sql`excluded.documents_urls`,
        rawPayloadHash: sql`excluded.raw_payload_hash`,
        rawPayload: sql`excluded.raw_payload`,
        updatedAt: sql`now()`,
        version: sql`${tenders.version} + 1`,
      },
      where: sql`${tenders.rawPayloadHash} <> excluded.raw_payload_hash`,
    })
    .returning({
      id: tenders.id,
      version: tenders.version,
    })

  // Heuristic: the SET clause only fires when the WHERE matched, so any
  // returned row is either inserted (version=1) or updated (version>1).
  // Skipped rows (same hash) don't appear in `returning` because the
  // WHERE filtered them out — len(deduped) - len(result) = skipped.
  let inserted = 0
  let updated = 0
  for (const r of result) {
    if (r.version === 1) inserted++
    else updated++
  }
  const skipped = deduped.length - result.length
  return { inserted, updated, skipped }
}

export async function findTenderById(id: string) {
  const db = useDb()
  const [row] = await db.select().from(tenders).where(eq(tenders.id, id)).limit(1)
  return row ?? null
}

export interface ListTendersOptions {
  cursor?: string // base64-encoded `${publishedAt.toISOString()}|${id}`
  limit: number
  okpd2?: string[]
  regions?: string[]
  status?: string
  sourceId?: string
}

export interface ListTendersResult {
  items: typeof tenders.$inferSelect[]
  nextCursor: string | null
}

/**
 * Cursor pagination on (publishedAt DESC, id DESC) — stable when two
 * rows share the same publishedAt. Cursor is opaque base64 of the
 * tuple, decoded inside the repo.
 */
export async function listTenders(opts: ListTendersOptions): Promise<ListTendersResult> {
  const db = useDb()

  let cursorPublishedAt: Date | null = null
  let cursorId: string | null = null
  if (opts.cursor) {
    try {
      const [iso, id] = Buffer.from(opts.cursor, 'base64').toString('utf8').split('|')
      cursorPublishedAt = new Date(iso!)
      cursorId = id ?? null
    } catch {
      // Malformed cursor -> ignore, return from start. Caller may
      // discover via empty results.
    }
  }

  const conds = [sql`${tenders.deletedAt} is null`]
  if (opts.status) conds.push(eq(tenders.status, opts.status))
  if (opts.sourceId) conds.push(eq(tenders.sourceId, opts.sourceId))
  if (opts.regions && opts.regions.length > 0) {
    conds.push(inArray(tenders.customerRegion, opts.regions))
  }
  if (opts.okpd2 && opts.okpd2.length > 0) {
    // Array overlap — uses GIN index `tenders_okpd_gin`.
    conds.push(sql`${tenders.okpd2} && ${opts.okpd2}::text[]`)
  }
  if (cursorPublishedAt && cursorId) {
    conds.push(
      sql`(${tenders.publishedAt}, ${tenders.id}) < (${cursorPublishedAt}, ${cursorId})`,
    )
  } else if (cursorPublishedAt) {
    conds.push(lt(tenders.publishedAt, cursorPublishedAt))
  }

  const items = await db
    .select()
    .from(tenders)
    .where(and(...conds))
    .orderBy(desc(tenders.publishedAt), desc(tenders.id))
    .limit(opts.limit + 1)

  let nextCursor: string | null = null
  if (items.length > opts.limit) {
    items.pop() // drop the peeked row
    const last = items[items.length - 1]!
    nextCursor = Buffer.from(
      `${last.publishedAt.toISOString()}|${last.id}`,
      'utf8',
    ).toString('base64')
  }
  return { items, nextCursor }
}

/**
 * Append an event — used by ingest service after upsert and by status
 * transitions in W3+. Service-internal API.
 */
export async function insertTenderEvent(
  tenderId: string,
  type: string,
  actorId: string | null,
  payload: Record<string, unknown>,
) {
  const db = useDb()
  await db.insert(tenderEvents).values({
    tenderId,
    type,
    actorId,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload: payload as any,
  })
}
