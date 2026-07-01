# platform/ — инфра-конфиги (Layer 1)

Всё, что описывает, **где** и **как** работают сервисы из `services/*`. Никакого бизнес-кода, только конфигурация инфры.

## Подпапки

| Путь | Что лежит |
|---|---|
| `docker-compose/` | Локальный dev-стек: все БД, NATS, Temporal, SigNoz, MinIO, Meilisearch, Zitadel |
| `k8s/` | Kubernetes манифесты + Helm charts + Argo CD applications (Фаза 6) |
| `terraform/` | Провижининг у провайдера: Hetzner / Yandex Cloud / другой (Фаза 6) |
| `gateway/` | Traefik config + dynamic rules |
| `observability/` | SigNoz dashboards, alert-rules, OpenTelemetry collectors |
| `nats/` | JetStream cluster config + stream definitions |
| `temporal/` | Temporal server config + namespace definitions |

## Локальный dev-стек

`platform/docker-compose/docker-compose.yml` — единственная команда для подъёма всей инфры на ноутбуке:

```bash
cd platform/docker-compose
docker compose up -d
```

Поднимает:

- Postgres 16 (несколько БД: `identity_db`, `platform_db`, `domain_db`, `audit_db`)
- Redis 7
- NATS JetStream (3 ноды)
- Temporal server + UI
- SigNoz (OpenTelemetry backend + UI)
- MinIO (S3-compat)
- Meilisearch
- Zitadel (identity IdP)
- Mailhog (dev SMTP)

Порты фиксированные, документированы в `docker-compose/README.md`.

## Правила

- Секреты **не** хранятся здесь. Для локали — `.env.local.example`; для прода — Infisical.
- Манифесты не содержат хардкоженных DNS / IP — параметризация через Helm values или Terraform outputs.
- Каждое изменение инфры проходит через Argo CD (Фаза 6+).

## Статус

Скелет зафиксирован. Docker-compose — первый артефакт Фазы 0.
