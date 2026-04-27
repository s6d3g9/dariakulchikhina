/**
 * Per-source incremental cursor.
 *
 * MVP: in-memory map keyed by sourceId. Production target is Redis
 * (`tenders:cursor:<sourceId>` STRING with the JSON-encoded
 * `SourceCursor`). The Redis backend is added in W2 — keeping the
 * interface stable lets us flip implementations behind one factory.
 *
 * The pipeline never inspects the `value` string — it's opaque per
 * source (filename for zakupki, ISO datetime for torgi, etc.).
 */

import type {
  SourceCursor,
  SourceId,
} from '~/shared/types/tenders-ingest.ts'

export interface CursorStore {
  load(sourceId: SourceId): Promise<SourceCursor | null>
  save(cursor: SourceCursor): Promise<void>
}

export class InMemoryCursorStore implements CursorStore {
  private readonly map = new Map<SourceId, SourceCursor>()

  load(sourceId: SourceId): Promise<SourceCursor | null> {
    return Promise.resolve(this.map.get(sourceId) ?? null)
  }

  save(cursor: SourceCursor): Promise<void> {
    this.map.set(cursor.sourceId, cursor)
    return Promise.resolve()
  }
}
