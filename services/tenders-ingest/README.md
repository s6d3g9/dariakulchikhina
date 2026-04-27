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
table and are looked up at runtime via the secrets-resolver endpoint.

### Secrets-resolver contract

The service calls `GET /api/secrets/value?key=<secretsRef>` on the main app
using Bearer `TENDERS_INGEST_SERVICE_TOKEN`. This endpoint is separate from
the admin CRUD surface (`GET/POST /api/secrets`) and requires the same token
that authenticates ingest batches.

Response shape:
```json
{ "value": "plaintext-secret", "lastRotatedAt": "2026-04-27T08:00:00.000Z" }
```

404 means the key is not configured; the source falls back to
`degraded:no-secret` and yields zero items until the secret is added via the
admin UI. The service stays healthy and other sources continue to run.

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
