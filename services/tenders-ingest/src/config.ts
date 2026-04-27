/**
 * Fail-fast configuration for tenders-ingest.
 *
 * The service refuses to boot if `MAIN_APP_URL` or
 * `TENDERS_INGEST_SERVICE_TOKEN` are missing — these are required to
 * publish any data at all. Source-specific URLs/crons are optional
 * with sensible defaults from §26 spec.
 */

interface IngestConfig {
  mainAppUrl: string
  serviceToken: string
  healthPort: number
  logLevel: 'debug' | 'info' | 'warn' | 'error'
  sources: {
    zakupki: {
      enabled: boolean
      baseUrl: string
      cron: string
    }
    torgi: {
      enabled: boolean
      baseUrl: string
      cron: string
    }
  }
}

function readEnv(name: string, required = false, fallback = ''): string {
  const v = process.env[name]
  if (v == null || v === '') {
    if (required) {
      throw new Error(`[tenders-ingest:config] env ${name} is required`)
    }
    return fallback
  }
  return v
}

function readBool(name: string, fallback: boolean): boolean {
  const v = process.env[name]
  if (v == null || v === '') return fallback
  return v === '1' || v.toLowerCase() === 'true'
}

function readInt(name: string, fallback: number): number {
  const v = process.env[name]
  if (v == null || v === '') return fallback
  const n = Number.parseInt(v, 10)
  return Number.isFinite(n) ? n : fallback
}

export function loadConfig(): IngestConfig {
  return {
    mainAppUrl: readEnv('MAIN_APP_URL', true),
    serviceToken: readEnv('TENDERS_INGEST_SERVICE_TOKEN', true),
    healthPort: readInt('TENDERS_INGEST_HEALTH_PORT', 3035),
    logLevel: (readEnv('TENDERS_INGEST_LOG_LEVEL', false, 'info') as IngestConfig['logLevel']),
    sources: {
      zakupki: {
        enabled: readBool('TENDERS_INGEST_SOURCE_ZAKUPKI_ENABLED', true),
        baseUrl: readEnv(
          'TENDERS_INGEST_SOURCE_ZAKUPKI_BASE_URL',
          false,
          'https://int44.zakupki.gov.ru/eis-integration/services',
        ),
        cron: readEnv('TENDERS_INGEST_SOURCE_ZAKUPKI_CRON', false, '0 7 * * *'),
      },
      torgi: {
        enabled: readBool('TENDERS_INGEST_SOURCE_TORGI_ENABLED', true),
        baseUrl: readEnv(
          'TENDERS_INGEST_SOURCE_TORGI_BASE_URL',
          false,
          'https://torgi.gov.ru/new/api/public',
        ),
        cron: readEnv('TENDERS_INGEST_SOURCE_TORGI_CRON', false, '0 */2 * * *'),
      },
    },
  }
}

export type { IngestConfig }
