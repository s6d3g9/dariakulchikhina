/**
 * Source registry — declarative catalogue of all known platforms.
 *
 * MVP enables `zakupki` and `torgi`. The other 10 platforms from §25
 * §3.6.4 are listed with `enabled: false` and a `TODO(<wave>)` note;
 * adding a new source is a 3-line edit + a mapper file.
 *
 * The factory below builds a `Source` instance from a `SourceConfig`
 * and the runtime context (logger, secrets resolver). Pipeline doesn't
 * know what's behind the interface — only the registry does.
 */

import type {
  Source,
  SourceConfig,
  SourceId,
} from '../core/source.ts'
import type { Logger } from '../observability/logger.ts'
import { ZakupkiSource } from './zakupki/index.ts'
import { TorgiSource } from './torgi/index.ts'

export interface BuildSourceContext {
  logger: Logger
  /**
   * Resolves a `secretsRef` to plaintext. The implementation in
   * `index.ts` calls `GET /api/secrets?key=...` on the main app with
   * the service token. Returns null when the secret isn't configured —
   * caller is responsible for marking the source `degraded:no-secret`.
   */
  resolveSecret: (ref: string) => Promise<string | null>
  fetchImpl?: typeof fetch
}

/**
 * Source declarations. Each entry is a pure constant — runtime hooks
 * (network, secrets) are passed via `BuildSourceContext`.
 *
 * Defaults align with §26: zakupki cron `0 7 * * *`, torgi every 2 hours.
 */
export const SOURCE_REGISTRY: ReadonlyArray<SourceConfig> = [
  {
    id: 'zakupki',
    label: 'zakupki.gov.ru (ЕИС)',
    enabled: true,
    schedule: '0 7 * * *',
    transport: {
      kind: 'soap',
      baseUrl: 'https://int44.zakupki.gov.ru/eis-integration/services',
      service: 'getDocsIP',
      tokenHeaderName: 'individualPerson_token',
      tokenLocation: 'both',
    },
    cursor: { kind: 'last-modified-filename' },
    mapperRef: 'sources/zakupki/mapper',
    filters: {
      // Defaults inherited from pipeline; explicit here so the registry
      // is the single declarative source of truth.
      regionWhitelist: ['RU-MOW', 'RU-MOS', 'RU-SPE', 'RU-LEN', 'RU-KDA', 'RU-TA'],
    },
    rateLimit: { requestsPerMinute: 30, concurrentDownloads: 2 },
    secretsRef: 'tenders.zakupki.individualPersonToken',
  },
  {
    id: 'torgi',
    label: 'torgi.gov.ru (ГИС Торги)',
    enabled: true,
    schedule: '0 */2 * * *',
    transport: {
      kind: 'rest',
      baseUrl: 'https://torgi.gov.ru/new/api/public',
      auth: 'none',
      pagination: 'spring-page',
    },
    cursor: { kind: 'datetime', field: 'firstVersionPublicationDate' },
    mapperRef: 'sources/torgi/mapper',
    rateLimit: { requestsPerMinute: 30, concurrentDownloads: 2 },
  },
  // === Post-MVP placeholders (§25 §3.6.4) ====================================
  // Adding implementations is a separate PR per platform — the entry
  // here flips `enabled: true` and the mapperRef points at the new file.
  ...placeholder('rts-tender', 'rts-tender.ru'),
  ...placeholder('sberbank-ast', 'sberbank-ast.ru'),
  ...placeholder('roseltorg', 'roseltorg.ru'),
  ...placeholder('tek-torg', 'tektorg.ru'),
  ...placeholder('etp-gpb', 'etp.gpb.ru'),
  ...placeholder('fabrikant', 'fabrikant.ru'),
  ...placeholder('rzd-etzp', 'etzp.rzd.ru'),
  ...placeholder('avtodor-tr', 'avtodor-tr.ru'),
  ...placeholder('gazprom-zakupki', 'gazprombank.zakupki'),
  ...placeholder('mos-zakupki', 'zakupki.mos.ru'),
]

function placeholder(id: SourceId, label: string): SourceConfig[] {
  return [
    {
      id,
      label,
      enabled: false,
      schedule: '0 0 * * *',
      transport: { kind: 'html', entryUrl: 'https://example.invalid', navigation: 'static' },
      cursor: { kind: 'page-token' },
      mapperRef: `sources/${id}/mapper`, // TODO(W2+): implement
    },
  ]
}

/**
 * Build a runtime `Source` for one config. Returns null if the config
 * is disabled or if a required secret is missing (the latter is
 * promoted to `degraded:no-secret` by the caller).
 */
export async function buildSource(
  cfg: SourceConfig,
  ctx: BuildSourceContext,
): Promise<{ source: Source; status: 'ok' | 'disabled' | 'degraded:no-secret' }> {
  if (!cfg.enabled) {
    return {
      source: emptySource(cfg.id, cfg.schedule),
      status: 'disabled',
    }
  }

  const childLogger = ctx.logger.child({ sourceId: cfg.id })

  switch (cfg.id) {
    case 'zakupki': {
      if (cfg.transport.kind !== 'soap') {
        throw new Error(`[registry] zakupki must use soap transport`)
      }
      const token = cfg.secretsRef
        ? await ctx.resolveSecret(cfg.secretsRef)
        : null
      const source = new ZakupkiSource({
        baseUrl: cfg.transport.baseUrl,
        individualPersonToken: token,
        logger: childLogger,
        schedule: cfg.schedule,
        okato2List: ['45', '46', '40', '41', '03', '92'],
        fetchImpl: ctx.fetchImpl,
      })
      return {
        source,
        status: token ? 'ok' : 'degraded:no-secret',
      }
    }
    case 'torgi': {
      if (cfg.transport.kind !== 'rest') {
        throw new Error(`[registry] torgi must use rest transport`)
      }
      const source = new TorgiSource({
        baseUrl: cfg.transport.baseUrl,
        logger: childLogger,
        schedule: cfg.schedule,
        fetchImpl: ctx.fetchImpl,
      })
      return { source, status: 'ok' }
    }
    default:
      // Disabled placeholder — synthesize an empty source so the rest of
      // the wiring doesn't blow up if someone toggles `enabled: true`
      // without writing a mapper.
      return {
        source: emptySource(cfg.id, cfg.schedule),
        status: 'disabled',
      }
  }
}

function emptySource(id: SourceId, schedule: string): Source {
  return {
    id,
    schedule,
    // eslint-disable-next-line require-yield
    async *fetchBatch() {
      return
    },
    parseItem: () => null,
    serializeCursor: () => ({
      sourceId: id,
      value: '',
      updatedAt: new Date().toISOString(),
    }),
  }
}
