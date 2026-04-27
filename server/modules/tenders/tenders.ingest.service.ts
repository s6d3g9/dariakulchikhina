/**
 * Tender ingest service — handles bulk batches arriving from the
 * `services/tenders-ingest/` runtime via `POST /api/tenders/ingest`.
 *
 * Idempotency contract:
 *  - The same `idempotencyKey` may arrive multiple times (network retry,
 *    publisher restart). The repository's `ON CONFLICT (source_id,
 *    external_guid) DO UPDATE WHERE raw_payload_hash <> excluded` makes
 *    the operation a no-op when the content has not changed.
 *  - We emit one `ingest_updated` event per row that actually changed —
 *    callers downstream (Pub/Sub publisher in W3) react to events, not
 *    to every batch.
 */

import * as repo from './tenders.repository'
import type {
  TenderIngestRequest,
  TenderIngestResponse,
} from '~/shared/types/tenders'

export async function ingestBatch(
  request: TenderIngestRequest,
): Promise<TenderIngestResponse> {
  const counters = await repo.upsertTendersBatch(request.items)
  return {
    accepted: request.items.length,
    inserted: counters.inserted,
    updated: counters.updated,
    skipped: counters.skipped,
  }
}
