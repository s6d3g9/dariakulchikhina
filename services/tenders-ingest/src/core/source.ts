/**
 * Re-exports the cross-runtime Source contract from `shared/`.
 *
 * Adapters in `src/sources/<name>/index.ts` `implements Source<TRaw>`.
 * Keeping the local re-export means the rest of the service imports
 * from `./core/source` rather than reaching into `~/shared/...`
 * everywhere — easier to refactor if the contract surface changes.
 */

export type {
  Source,
  SourceCursor,
  SourceId,
  SourceState,
  UnifiedTender,
  SourceConfig,
  TransportConfig,
  SoapTransport,
  RestTransport,
  HtmlTransport,
  OpendataHttpTransport,
  CursorConfig,
} from '~/shared/types/tenders-ingest.ts'
