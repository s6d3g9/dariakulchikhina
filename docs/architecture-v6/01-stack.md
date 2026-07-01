# 01. Целевой стек v6

Принцип выбора: **предсказуемая эксплуатация > модные технологии**. Каждый кандидат оценён по трём критериям — зрелость, операционная сложность, совместимость с текущей командой.

## Монорепо

| Слой | v5.3 | v6 | Почему |
|---|---|---|---|
| Менеджер | pnpm workspaces | pnpm + **Turborepo** | Кэш билдов, граф задач, remote cache |
| Графа пакетов | `shared/` + app-level | `packages/contracts-*`, `packages/ui`, `packages/sdk-*` | Версионирование по доменам |
| Структура | flat | `apps/`, `services/`, `packages/`, `platform/`, `infra/` | Разделение по назначению |

## Языки и рантаймы

Polyglot с жёсткими правилами где что:

| Где | Язык | Причина |
|---|---|---|
| `apps/*` (web-фронты, целевое) | TypeScript + **React (Next.js)** | Индустриальный стандарт, максимальный найм, экосистема для charting/video/AI |
| `apps/studio` (существующее) | TypeScript + **Nuxt/Vue** → React через strangler | Не переписывать big-bang; новые модули на React, старые Vue усыхают естественно |
| `services/studio`, `travel`, `dating`, `messenger` | TypeScript (Nitro/H3 или Fastify) | CRUD-тяжёлые домены, velocity важнее TPS |
| `platform/gateway`, `services/identity` (адаптер), `services/media-control-plane` | **Go** | Простая конкурентность, одно бинарное, низкая память |
| `services/exchange-matching`, `services/crypto-signer` | **Rust** | Latency, memory safety, финансовая критичность |
| `services/recommendations`, `services/moderation-ml` | Python | ML-экосистема (PyTorch/ONNX) |
| Мобильные клиенты | **React Native + Expo** | Один стек/язык с web (React), максимальный code-sharing через RN Web и `packages/ui-react`, огромный найм |
| Desktop (банк, админки) | **Tauri** + React | Rust-ядро, small footprint, тот же React UI |

## Identity и access

| Что | Выбор | Альтернатива | Почему не альтернатива |
|---|---|---|---|
| IdP | **Zitadel** (self-hosted) | Keycloak | Java/heavy, хуже multi-tenant |
| | | Ory Kratos+Hydra+Keto | Модульно, но собирать самим больно |
| | | Supertokens | Моложе, меньше возможностей |
| | | WorkOS | SaaS, vendor lock-in, деньги |
| Authorization | OPA (Rego) или Zitadel scopes | Casbin | Zitadel закрывает 80% |
| Secrets | **Infisical** (self-hosted) | HashiCorp Vault | Vault сложнее операционно |
| mTLS | Gateway-терминация | SPIFFE/SPIRE | Рано |

## Хранилища

Одна БД на домен. Никакого общего Postgres.

| Назначение | Движок | Примечание |
|---|---|---|
| OLTP общий (studio, travel, dating, identity, messenger) | **PostgreSQL 16** | 1 инстанс на сервис, логическая репликация для read-replicas |
| Ledger (банк, биржа внутренние балансы) | **TigerBeetle** | Формально верифицирован, double-entry из коробки, 1M TPS |
| Социальный граф, лента видео/лайков | **ScyllaDB** | Cassandra-совместимо, Rust-native, write-heavy |
| Аналитика, event-store проекции | **ClickHouse** | OLAP, дешёвое хранение, быстрые агрегации |
| Кэш, presence, rate-limit | **Redis 7** | Остаётся как есть |
| Медиа (фото, видео, документы) | **S3-совместимое** (MinIO on-prem / Wasabi / Backblaze B2) | Никогда не класть в Postgres |
| Search | **Meilisearch** для MVP → **OpenSearch** при масштабе | Postgres FTS на мелких доменах |
| Vectors (recs, semantic search) | **pgvector** → **Qdrant** | Начать в Postgres, вынести при росте |

## Коммуникация между сервисами

| Паттерн | Транспорт | Когда |
|---|---|---|
| Синхронный запрос | **HTTP + OpenAPI** | Фронт ↔ BFF, сервис ↔ сервис для запросов |
| Синхронный RPC (internal, low-latency) | **gRPC** | Только между Go/Rust сервисами биржи/банка |
| Event (durable) | **NATS JetStream** | Финансовые события, медиа-pipeline, аудит |
| Event (ephemeral) | **Redis Pub/Sub** | Presence, typing, live-updates мессенджера |
| WebSocket (клиенту) | Ticket-based (как в v5.3) | Остаётся |

Почему **NATS JetStream**, а не Kafka:
- Операционно дешевле (одно бинарное, нет ZK).
- Хватает до сотен тысяч сообщений/сек.
- Совместимый апгрейд на **Redpanda** (Kafka-wire) при росте.

Запрещённые паттерны:
- Прямой SQL-доступ к чужой БД.
- Кросс-доменные JOIN — только через API или event-replicated проекции.
- Общие транзакции между сервисами — только саги.

## Gateway и mesh

| Слой | Старт | При росте |
|---|---|---|
| Ingress/Gateway | **Traefik** | Остаётся |
| Service mesh | — | **Envoy/Istio** только когда > 20 сервисов и нужен mTLS между ними |
| WAF/DDoS | Cloudflare | Обязательно перед банком/биржей |

## Оркестрация и деплой

Путь эволюции — без прыжков:

1. **Сейчас (v5.3)**: PM2 + deploy-safe.sh + одна VPS.
2. **Фаза 1–2 (v6 ранний)**: **Dokploy** или **Docker Swarm** на 2–3 VPS. Blue/green через Traefik.
3. **Фаза 3+ (v6 зрелый)**: managed k8s (Hetzner/Yandex Cloud MK8s). GitOps через **Argo CD**.
4. **Банк/крипта**: свой отдельный кластер в изолированном VPC, свои правила доступа.

## CI/CD

| Что | Выбор |
|---|---|
| CI | GitHub Actions + Turborepo remote cache |
| Build reproducibility | Dockerfile per service, multi-stage, buildx |
| Release | SemVer per package, changesets |
| Secrets в CI | Infisical / GitHub Encrypted Secrets |
| Migrations | Drizzle (TS-сервисы), sqlc/goose (Go), sqlx migrate (Rust) |

## Observability

Стандарт — **OpenTelemetry** везде (traces, metrics, logs).

| Слой | Выбор | Причина |
|---|---|---|
| Backend | **SigNoz** (self-hosted) | Single binary заменяет Loki+Tempo+Mimir+Grafana |
| Alternative | Grafana stack | Если нужна гибкость Grafana-дашбордов |
| Error tracking | **Sentry** | Остаётся |
| Uptime | Uptime Kuma | Self-hosted, простой |
| Финансовый аудит-лог | Отдельный ClickHouse + WORM-хранилище | Регуляторика |

## Специальные домены

### Video pipeline
- **MVP**: SaaS — **Mux** или **Bunny Stream**. Быстро, дорого.
- **Scale**: свой pipeline — **FFmpeg workers** на Rust/Go, очередь через NATS, storage в S3, CDN через **Bunny CDN** или **Cloudflare Stream**.

### Banking rails
- **Russia**: НСПК/СБП через banking-as-a-service партнёра (своя лицензия — многие годы и миллионы).
- **International**: Stripe / Adyen.
- **KYC/AML**: Sumsub или Onfido (SaaS).

### Crypto custody
- **MVP/low-risk**: **Fireblocks** (SaaS, дорого, надёжно).
- **Scale/self-custody**: HSM (YubiHSM/CloudHSM) + собственный signing-service на Rust. Не делать, пока нет выделенной security-команды.

### ML / Recommendations
- Feature store — **Feast**.
- Inference — **ONNX Runtime** или **TorchServe**.
- A/B — **GrowthBook** (self-hosted).
- Появляется только после Фазы 4.

## Frontend стратегия

**Целевой стек**: React + React Native (Expo) + Tauri. Один язык (TypeScript), одна парадигма (React), максимальный code-sharing между web/mobile/desktop.

| Слой | Выбор | Когда |
|---|---|---|
| Web (целевое) | **Next.js** (React + SSR) | Все новые вертикали: travel, dating, video, banking, crypto |
| Web (существующее) | Nuxt/Vue | Studio — остаётся, мигрирует через strangler (см. ниже) |
| Mobile | **Expo (React Native)** | Банкинг, крипта, дейтинг, видео — обязательно. Travel/studio — опционально |
| Desktop | **Tauri + React** | Банк-клиент, admin-консоли. Rust-ядро |
| Микрофронты | **Module Federation** | Только если надо встраивать виджет одной вертикали в другую |

### Почему React, а не Vue/Flutter/Angular

- **React**: MIT, крупнейшее комьюнити (~230k stars), максимальный найм, лучшая экосистема для charting/trading UI/video/AI. Риск «технология умрёт» ~0.
- **Vue** (что уже есть): хорош, но на горизонте мультиплатформы становится островом — 1 Vue-приложение среди 5 React. Дублирование `ui-vue`+`ui-react` навсегда.
- **Flutter**: BSD (тоже бесплатно), но Flutter Web слаб (плохой SEO, canvas), Google-зависимость + layoffs 2024 = ненулевой риск отмены, Dart разделяет команду. Rejected.
- **Angular**: Google сам не использует для новых продуктов; экосистема отстаёт; не фит для потребительской мультиплатформы. Rejected.

### Миграция Vue → React (strangler pattern)

1. Любой **новый** модуль studio пишется в `apps/studio-react/` (Next.js).
2. Traefik маршрутизирует по путям: `/admin/<new-module>` → React, остальное → Nuxt/Vue.
3. Общие identity, API, design-tokens. Общая БД через HTTP, а не прямой импорт.
4. Существующие Vue-модули переписываются, **только когда** бизнес и так меняет их по фичам. Никакого freeze.
5. Через 12–24 месяца Vue-часть усыхает до нуля естественно.

### Общие пакеты

- `packages/design-tokens` — JSON + CSS variables, единый источник (одинаково для Vue, React, RN).
- `packages/ui-react` — компонентный kit (shadcn-like, на Radix + Tailwind).
- `packages/ui-vue` — существующий, **в режиме обслуживания** (fixes only, новое не добавляется).
- `packages/ui-native` — React Native components (можно пере-экспортить `ui-react` через RN Web для простых случаев).
- `packages/sdk-<domain>` — генерится из OpenAPI, работает одинаково в web и RN.

### Флаг перехода на Flutter (escape hatch)

Только один сценарий: если на Фазе 7 (банк) окажется, что mobile-UX-требования выходят за возможности React Native (60/120 fps анимации, pixel-perfect UI между iOS/Android критичен как бренд-дифференциатор). Тогда — переписать **только** mobile-банк на Flutter, web остаётся на React. Не планировать заранее, решать фактами.

## Что **не** меняется из v5.3

- DDD-lite внутри сервисов.
- FSD внутри фронтов.
- OCC + soft-delete.
- Cursor pagination.
- Ticket-based WS.
- ESLint-инварианты (обновляются под новые границы).
- Git auto-sync и deploy-safe (для studio-рантайма до миграции).

## Версии runtime и dependencies (lock per-Phase 0)

```
Node.js 20 LTS (Phase 0-6) → 22 LTS (Phase 7+)
TypeScript 5.4+
pnpm 9.x, Turborepo 2.x
Nitro (BE) 2.x (H3), Next.js (FE) 15.x (App Router)
Expo SDK 51+, Tauri 2.x
Zod 3.23+ (contracts), Drizzle 0.41+, ioredis 5.x, NATS 2.x, Temporal SDK 1.x

Go 1.22+ (sqlc, chi/fiber, zerolog, opentelemetry-go)
Rust stable (Phase 9+: Axum, sqlx, tokio, serde)
Python 3.11+ (FastAPI, pydantic v2, onnxruntime, sentence-transformers)
```

## Database selection rationale

- **Postgres 16** per-service: ACID + rich SQL + pgvector + PostGIS. Start small (1 vCPU / 2GB / 50GB), scale read-replicas.
- **TigerBeetle** (Phase 6+): formally-verified ledger, 1M TPS, 3-node Raft. Альтернативы rejected (Postgres too slow, custom too risky).
- **ScyllaDB** (Phase 7+): Cassandra-compatible Rust runtime для social graph write-heavy. Rejected: DynamoDB (lock-in), Cassandra JVM (heavy).
- **ClickHouse**: columnar OLAP для audit WORM + SigNoz + analytics. Rejected: Snowflake (lock-in), Druid (ops-heavier).
- **Meilisearch → OpenSearch** (ADR-0004): простой MVP → enterprise scale.
- **pgvector → Qdrant** (ADR-0003): ≤ 10M vectors Postgres, потом Qdrant.
- **Redis 7**: cache/presence/rate-limits only. Never source of truth.
- **S3-compat**: MinIO Phase 0-5 → Wasabi/Backblaze Phase 6+. Object-lock mandatory для audit cold tier.

## Resource budget baseline (Phase 3)

| Service | Replicas | CPU req/lim | Mem req/lim |
|---|---|---|---|
| identity (Zitadel) | 2 | 0.5/1 | 512M/1G |
| gateway (Traefik) | 3 | 0.25/0.5 | 256M/512M |
| pattern-engine | 2 | 0.5/1 | 512M/1G |
| timeline-engine (+Temporal) | 2 | 0.5/1 | 512M/1G |
| booking | 2 | 0.5/1 | 512M/1G |
| wallet | 2 | 0.5/1 | 1G/2G |
| payments | 2 | 0.25/0.5 | 256M/512M |
| notifications | 2 | 0.25/0.5 | 256M/512M |
| authorship-registry | 2 | 0.5/1 | 512M/1G |
| search (Meilisearch) | 1 | 1/2 | 2G/4G |
| media-pipeline | 2 | 0.5/1 | 1G/2G |
| messenger | 3 | 0.25/0.5 | 512M/1G |
| feed | 2 | 0.5/1 | 512M/1G |
| audit-log | 2 | 0.25/0.5 | 512M/1G |
| policy-engine | 3 | 0.25/0.5 | 256M/512M |
| events (NATS) | 3 | 0.5/1 | 1G/2G |
| temporal-server | 1 | 1/2 | 2G/4G |
| postgres (per-service cluster) | 1+1 | 1/2 | 2G/4G |

**Total Phase 3 baseline**: ~20 vCPU + 40GB RAM + 500GB storage. Scaling via HPA on CPU и custom-metrics.

## Deployment artifacts per-service

Каждый сервис producing в CI:

1. Container image (multi-arch amd64 + arm64, cosign-signed).
2. SBOM (Software Bill of Materials).
3. OpenAPI spec (TS-services с public APIs).
4. Helm chart в `platform/k8s/<service>/`.
5. Argo CD application manifest.
6. SigNoz dashboard JSON (from template).
7. Runbooks для expected alerts.

Everything CI-produced, signed, reproducible.

## External SaaS — locked choices

Changes require ADR:

| SaaS | Purpose | Phase |
|---|---|---|
| Mux / Bunny Stream | Video transcoding | 4-7 |
| Sumsub | KYC RU/global | 4+ |
| Onfido | KYC Western fallback | 5+ |
| Stripe / ЮKassa / CloudPayments | Payments PSPs per-region | 1+ |
| Fireblocks | Crypto custody | 9 |
| Cloudflare | CDN / WAF / DDoS | 2+ |
| SigNoz | Observability (ADR-0005 self-host vs cloud) | 1+ |
| Infisical | Secrets | 1+ |
| GrowthBook | Feature flags | 1+ |

## Dependency-management discipline

- **Single version** shared deps через `pnpm.overrides` в root package.json.
- **Per-service** может иметь subset (Go/Rust services — свои deps).
- **pnpm audit** blocks high-severity vulns.
- **Renovate / Dependabot** — auto-PRs для minor/patch.
- **Major upgrades** — quarterly planned (не ad-hoc).
