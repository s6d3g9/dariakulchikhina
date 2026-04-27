/**
 * Tenders ingest contracts — cross-runtime types between
 * `services/tenders-ingest/` and `server/modules/tenders/`.
 *
 * Pure contract layer (no drizzle / h3 / ioredis imports). See
 * docs/architecture-v5/25-tenders-platform.md §3.2 and §3.6.1.
 */

// === Source identification ===================================================

/**
 * Stable id of a source platform. The id is used in DB rows
 * (`tenders.source_id`) and in idempotency keys, so additions go through
 * a PR rather than env config.
 */
export type SourceId =
  | 'zakupki'
  | 'torgi'
  // Post-MVP placeholders, all currently `enabled: false` in registry:
  | 'rts-tender'
  | 'sberbank-ast'
  | 'roseltorg'
  | 'tek-torg'
  | 'etp-gpb'
  | 'fabrikant'
  | 'rzd-etzp'
  | 'avtodor-tr'
  | 'gazprom-zakupki'
  | 'mos-zakupki'

// === Transport descriptors ===================================================

/**
 * Wire-level transport for a source. Each kind has its own client
 * implementation in `services/tenders-ingest/src/core/transport/<kind>/`.
 * Adding a new kind is a deliberate architectural change (PR + ADR).
 */
export type TransportKind = 'soap' | 'rest' | 'html' | 'opendata-http'

export interface SoapTransport {
  kind: 'soap'
  baseUrl: string
  service: string
  tokenHeaderName: string
  tokenLocation: 'soap-header' | 'http-header' | 'both'
}

export interface RestTransport {
  kind: 'rest'
  baseUrl: string
  auth?: 'none' | 'bearer' | 'apikey' | 'individualPerson_token'
  pagination: 'cursor' | 'offset' | 'page' | 'spring-page'
}

export interface HtmlTransport {
  kind: 'html'
  entryUrl: string
  userAgent?: string
  navigation: 'static' | 'spa'
}

export interface OpendataHttpTransport {
  kind: 'opendata-http'
  url: string
  format: 'xml' | 'json'
}

export type TransportConfig =
  | SoapTransport
  | RestTransport
  | HtmlTransport
  | OpendataHttpTransport

// === Cursor descriptors ======================================================

/**
 * Per-source incremental cursor. The actual `value` is stored in Redis,
 * its semantics (filename / id / page-token / datetime) are described
 * declaratively in `CursorConfig`.
 */
export type CursorConfig =
  | { kind: 'last-modified-filename' }
  | { kind: 'last-id'; field: string }
  | { kind: 'page-token' }
  | { kind: 'datetime'; field: string }

export interface SourceCursor {
  sourceId: SourceId
  /** opaque per-source string. Pipeline never inspects it; mapper does. */
  value: string
  /** ISO timestamp the cursor was last advanced. */
  updatedAt: string
}

// === Source declarative config ==============================================

/**
 * Declarative config for one source. The runtime uses this together with
 * a transport factory and a mapper registry to build a working `Source`
 * without per-platform code. See §3.6.4 for build procedure.
 */
export interface SourceConfig {
  id: SourceId
  label: string
  enabled: boolean
  /** Cron expression in service-local timezone (МСК). */
  schedule: string
  transport: TransportConfig
  cursor: CursorConfig
  /** Module path in the registry (e.g. 'sources/zakupki/mapper'). */
  mapperRef: string
  filters?: {
    okpd2Whitelist?: readonly string[]
    regionWhitelist?: readonly string[]
  }
  rateLimit?: {
    requestsPerMinute?: number
    concurrentDownloads?: number
  }
  /**
   * Reference into `messenger_secrets` row, e.g. 'tenders.zakupki.individualPersonToken'.
   * If set and the secret is missing, the source is skipped with status
   * `degraded:no-secret` rather than erroring out (graceful degradation).
   */
  secretsRef?: string
}

// === Source runtime contract ================================================

/**
 * Source adapter — minimal contract every platform implementation must
 * satisfy. The pipeline never inspects the underlying transport; it only
 * iterates `fetchBatch`, calls `parseItem`, and asks `serializeCursor`
 * for a checkpoint.
 */
export interface Source<TRaw = unknown> {
  readonly id: SourceId
  readonly schedule: string

  /**
   * Stream raw items starting from `cursor`. Must respect cancellation
   * via `signal`; long-running iterators check `signal.aborted` between
   * page boundaries.
   */
  fetchBatch(
    cursor: SourceCursor | null,
    signal: AbortSignal,
  ): AsyncIterable<TRaw>

  /**
   * Pure transform: raw → unified. Returns null to drop a malformed or
   * out-of-scope item without raising. Throws only for genuinely
   * unparseable payloads (corrupted XML, malformed JSON) which are
   * routed to DLQ by the pipeline.
   */
  parseItem(raw: TRaw): UnifiedTender | null

  /**
   * Serialize the source's internal state into a Redis-storable cursor.
   * Called after a batch is committed.
   */
  serializeCursor(state: SourceState): SourceCursor
}

/** Opaque per-source state object kept inside the adapter. */
export type SourceState = Record<string, unknown>

// === Unified tender ==========================================================

/**
 * The single payload shape that flows from any adapter into
 * `server/api/tenders/ingest`. All fields are normalized here:
 *  - `customer.region` is ISO 3166-2:RU (e.g. 'RU-MOW'), even if the
 *    upstream uses ОКАТО (mapper does the conversion).
 *  - `currency` is currently always 'RUB' — кто-то завтра захочет EUR,
 *    отдельный issue + миграция в Money type.
 *  - `rawPayloadHash` is the sha256 of canonicalised raw content; the
 *    main app uses it to skip re-publishing identical updates.
 */
export interface UnifiedTender {
  sourceId: SourceId
  externalGuid: string
  procedureType: string
  law: '44-fz' | '223-fz' | 'imushestvo' | 'other'
  /** ISO 8601 timestamp. */
  publishedAt: string
  customer: {
    inn: string
    kpp?: string
    name: string
    /** ISO 3166-2:RU after mapper normalization. */
    region: string
  }
  title: string
  description?: string
  okpd2: string[]
  startPrice: number | null
  currency: 'RUB'
  /** ISO 8601 or null when not announced. */
  deadlineAt: string | null
  applicationStart?: string
  applicationEnd?: string
  documentsUrls: string[]
  rawPayloadHash: string
  /** Original payload for analytics & debug — stored as jsonb in DB. */
  rawPayload: unknown
}

// === Health & metrics ========================================================

/**
 * Per-source status surfaced by the service `/health` endpoint and by
 * the project view. Distinguishes "ok" from "degraded:no-secret" so the
 * UI can show "configure your token" prompts (see §3.7.4).
 */
export type SourceHealthStatus =
  | 'ok'
  | 'disabled'
  | 'degraded:no-secret'
  | { kind: 'failed'; reason: string }

export interface IngestHealth {
  sources: Record<string, SourceHealthStatus>
  startedAt: string
  uptimeSeconds: number
}
