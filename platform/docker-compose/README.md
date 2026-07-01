# platform/docker-compose/ — локальный dev-стек v6

Единая команда для подъёма всей инфры v6 на ноутбуке разработчика. Ни один сервис из `services/*` не требует вручную поднимать Postgres/Redis/NATS — это всё здесь.

## Быстрый старт

```bash
cd platform/docker-compose
cp .env.example .env
docker compose up -d
```

Проверка:

```bash
docker compose ps
docker compose logs -f <service>
```

Остановка:

```bash
docker compose down              # сохранить данные
docker compose down -v           # полностью, включая volumes
```

## Сервисы и порты

| Сервис | Порт (host) | URL | Назначение |
|---|---|---|---|
| Postgres 16 | `5432` | `postgres://daria:daria@localhost:5432` | OLTP для всех сервисов |
| Redis 7 | `6379` | `redis://localhost:6379` | Cache, presence, rate-limit |
| NATS JetStream | `4222` + UI `8222` | `nats://localhost:4222` | Event backbone |
| Temporal server | `7233` | gRPC | Durable workflows |
| Temporal Web UI | `8080` | http://localhost:8080 | Воркфлоу-дашборд |
| SigNoz UI | `3301` | http://localhost:3301 | Traces / logs / metrics |
| SigNoz OTLP | `4317` (gRPC) / `4318` (HTTP) | — | OpenTelemetry collector |
| MinIO API | `9000` | http://localhost:9000 | S3-compat API |
| MinIO Console | `9001` | http://localhost:9001 | Web UI |
| Meilisearch | `7700` | http://localhost:7700 | Search engine |
| Zitadel | `8081` | http://localhost:8081 | Identity UI + API |
| Mailhog | `1025` (SMTP) / `8025` (UI) | http://localhost:8025 | Dev SMTP |

Все порты конфигурируются через `.env` (см. `.env.example`).

## Базы данных

Postgres создаётся с несколькими логическими БД под разные слои:

- `identity_db` — для Zitadel (если не отдельный Postgres)
- `platform_db` — wallet, payments, notifications, credentials-vault
- `domain_db` — pattern, timeline, booking, inventory, ownership, authorship, …
- `audit_db` — append-only аудит-лог (зеркалится в ClickHouse позже)

ClickHouse и ScyllaDB появляются в фазах 2 и 7 соответственно — не в MVP-стеке.

## Troubleshooting

- **Порты заняты**: измени `.env`, не редактируй `docker-compose.yml` напрямую.
- **Zitadel не стартует**: требует Postgres готовности, подожди 30 секунд после `up -d`.
- **SigNoz тяжёлый**: можно закомментировать `profiles: ["observability"]` сервисы при dev'е без трейсов.

## Статус

`docker-compose.yml` — создаётся в Фазе 0 как первый реальный артефакт. Сейчас — только README (placeholder для команды).
