import { useIngestDb, sql } from './ingest-db.ts'
import type { IngestDb } from './ingest-db.ts'

interface ArchiveLogger {
  info(msg: string): void
  error(obj: unknown, msg: string): void
}

const INTERVAL_MS = 10 * 60 * 1000

async function sweep(db: IngestDb, logger: ArchiveLogger) {
  const rows = await db.execute(
    sql`UPDATE messenger_cli_sessions
        SET archived_at = now()
        WHERE status = 'stopped'
          AND archived_at IS NULL
          AND stopped_at < now() - interval '24 hours'
        RETURNING id`,
  )
  logger.info(`auto-archive sweep: archived ${rows.length} session(s)`)
}

export function startAutoArchive(db: IngestDb, logger: ArchiveLogger): void {
  sweep(db, logger).catch((err: unknown) => logger.error(err, 'auto-archive initial sweep failed'))
  setInterval(
    () => sweep(db, logger).catch((err: unknown) => logger.error(err, 'auto-archive sweep failed')),
    INTERVAL_MS,
  )
}
