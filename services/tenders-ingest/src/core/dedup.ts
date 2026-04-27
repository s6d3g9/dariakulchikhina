/**
 * In-process dedup of (sourceId, externalGuid) pairs within a single
 * cron tick. Serves as a fast pre-filter before the publisher; the
 * authoritative dedup is the partial unique index in Postgres
 * (`tenders_source_guid_unique`).
 *
 * Why a Set and not a Bloom filter: a single tick processes ~150–300
 * items per source after the OKPD2 filter (see §26 §5.1) — well below
 * the threshold where a Set's memory matters.
 */

export class SeenSet {
  private readonly seen = new Set<string>()

  /** Returns true if the key was added (not seen before), false otherwise. */
  add(sourceId: string, externalGuid: string): boolean {
    const key = `${sourceId}:${externalGuid}`
    if (this.seen.has(key)) return false
    this.seen.add(key)
    return true
  }

  size(): number {
    return this.seen.size
  }

  clear(): void {
    this.seen.clear()
  }
}
