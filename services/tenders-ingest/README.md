# tenders-ingest

Standalone runtime that pulls tender notifications from external Russian
procurement platforms (zakupki.gov.ru, torgi.gov.ru, и др.), normalizes
them into a `UnifiedTender` shape and posts batches to the main app's
`POST /api/tenders/ingest` endpoint.

## Architecture

```
zakupki.gov.ru     ┌──────────────────────────────────┐
torgi.gov.ru   ──► │  services/tenders-ingest/        │  REST POST  ┌─────────┐
                   │  ┌──── source registry ───────┐  │ ──────────► │ main app│
                   │  │ pluggable Source adapters  │  │ idempotent  │ Postgres│
                   │  │ + unified pipeline         │  │             └─────────┘
                   │  └────────────────────────────┘  │
                   └──────────────────────────────────┘
```

See [docs/architecture-v5/25-tenders-platform.md](../../docs/architecture-v5/25-tenders-platform.md)
for the full spec and [§26](../../docs/architecture-v5/26-tenders-ingest-spec.md)
for verified endpoint URLs.

## Quick start (dev)

```bash
# From the repo root:
pnpm tenders:ingest:dev      # auto-runs ./src/index.ts with --watch
```

Required env (validated at boot):

| Var                                | Required | Default                      |
| ---------------------------------- | -------- | ---------------------------- |
| `MAIN_APP_URL`                     | yes      | —                            |
| `TENDERS_INGEST_SERVICE_TOKEN`     | yes      | —                            |
| `TENDERS_INGEST_HEALTH_PORT`       | no       | `3035`                       |
| `TENDERS_INGEST_LOG_LEVEL`         | no       | `info`                       |

Source-level toggles:

| Var                                          | Default |
| -------------------------------------------- | ------- |
| `TENDERS_INGEST_SOURCE_ZAKUPKI_ENABLED`      | `true`  |
| `TENDERS_INGEST_SOURCE_ZAKUPKI_BASE_URL`     | spec    |
| `TENDERS_INGEST_SOURCE_ZAKUPKI_CRON`         | `0 7 * * *` |
| `TENDERS_INGEST_SOURCE_TORGI_ENABLED`        | `true`  |
| `TENDERS_INGEST_SOURCE_TORGI_BASE_URL`       | spec    |
| `TENDERS_INGEST_SOURCE_TORGI_CRON`           | `0 */2 * * *` |

Secrets (zakupki ЕСИА token) live in the main app's `messenger_secrets`
table and are looked up by `secretsRef`. If the token is not set, the
zakupki source is `degraded:no-secret` and skipped — the service stays
healthy and torgi continues to run.

## Health

```bash
curl http://localhost:3035/health
```

```json
{
  "sources": { "zakupki": "degraded:no-secret", "torgi": "ok" },
  "startedAt": "2026-04-27T08:00:00.000Z",
  "uptimeSeconds": 42
}
```
