/**
 * Tenders module — public surface.
 *
 * Consumers (api handlers, tenders-ingest service via REST, MCP tools
 * in W5) import from this barrel — never reach into individual files.
 */

export {
  ingestBatch,
} from './tenders.ingest.service'

export {
  searchTenders,
  getTenderById,
} from './tenders.service'

export {
  TenderIngestRequestSchema,
  TenderIngestItemSchema,
  TenderSearchQuerySchema,
  TenderUpdateStatusSchema,
  TenderStatusSchema,
} from './tenders.types'

export {
  TenderNotFoundError,
  TenderIngestUnauthorizedError,
  TenderVersionConflictError,
} from './tenders.errors'

export type {
  TenderRow,
  TenderIngestRequest,
  TenderIngestResponse,
  TenderSearchQuery,
  TenderSearchResult,
  TenderStatus,
} from '~/shared/types/tenders'
