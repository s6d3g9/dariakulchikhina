# 07. Слоистая архитектура v6

6 слоёв, сверху вниз. Каждая вертикаль v6 реализуется **только** в слое 4 (type-plugins) и, опционально, слое 5 (UX). Слои 1–3 и 6 — переиспользуются всеми.

```
┌────────────────────────────────────────────────────────────────┐
│ 6. Governance                                                  │
│    policy-engine · moderation · disputes · audit-log           │
├────────────────────────────────────────────────────────────────┤
│ 5. Experience                                                  │
│    apps/shell (Next.js + Expo + Tauri) · panels · switcher     │
├────────────────────────────────────────────────────────────────┤
│ 4. Vertical Type-Packs (packages/card-types/*)                 │
│    car, real-estate, pet, course, flight, … (см. 06)           │
├────────────────────────────────────────────────────────────────┤
│ 3. Domain Primitives                                           │
│    pattern-engine · timeline-engine · booking · inventory ·    │
│    auction · escrow · financing · ownership · authorship ·     │
│    subscription · reviews · messenger · feed · media · recs    │
├────────────────────────────────────────────────────────────────┤
│ 2. Platform Services                                           │
│    identity (Zitadel) · credentials-vault · gateway (Traefik) ·│
│    payments · wallet · search · location · notifications ·     │
│    events (NATS JetStream) · observability (SigNoz)            │
├────────────────────────────────────────────────────────────────┤
│ 1. Infrastructure                                              │
│    Postgres · TigerBeetle · ScyllaDB · ClickHouse · Redis ·    │
│    S3-compat · Meilisearch/OpenSearch · Qdrant · k8s ·         │
│    Argo CD · Infisical · Cloudflare                            │
└────────────────────────────────────────────────────────────────┘
```

## Правила движения зависимостей

- **Строго сверху вниз**. Слой N может импортировать из N-1, N-2, …, 1. Никогда — из N+1.
- **Type-packs (слой 4) не импортируют друг друга**. Композиция — через pattern-engine (слой 3).
- **Panel-providers (слой 5) читают только контракты card-type (слой 4) и примитивы (слой 3)**. Shell не знает про вертикали.
- **Governance (слой 6) — сквозной**, но работает **через хуки**, а не через прямые импорты. Любой примитив или card-type публикует события → policy-engine / moderation / audit подписаны.

### Схема разрешённых зависимостей

```
L5 (apps/shell-*) ─────────────────┐
                                    ▼
L4 (card-types/*) ──── contracts ─► L3 (domain primitives)
                            │              │
                            ▼              ▼
                         L3 ──── contracts ─► L2 (platform)
                                                │
                                                ▼
                                             L1 (infra)

L6 (governance) ◄────── events subscription ── L3/L4 (passive)
```

### ESLint-enforcement

Следующие правила в `eslint.config.mjs` блокируют нарушения граничной логики:

```js
// Слой 4 не импортирует другой слой 4
{ 'no-restricted-imports': [
  'error',
  { patterns: [{ group: ['packages/card-types/*/!(index)'], message: 'cross card-type imports forbidden (I2)' }] }
]}

// Слой 4 не импортирует services/
{ pattern: 'services/**', target: 'packages/card-types/**', error: 'I6 violation' }

// Слой 5 не импортирует services/
{ pattern: 'services/**', target: 'apps/**', error: 'use SDK instead' }

// Слой 2/3 не импортирует L4/L5
{ pattern: ['packages/card-types/**', 'apps/**'], target: 'services/**', error: 'invert dependency' }
```

## Каталог сервисов (итоговый)

**Слой 2 — Platform (12 сервисов):**

| Сервис | Runtime | Назначение |
|---|---|---|
| `identity` | Zitadel (Go) | Auth, scopes, JWT, WS-тикеты |
| `credentials-vault` | TS | Лицензии, сертификаты, KYC-уровни |
| `gateway` | Traefik | Ingress, TLS, rate-limit, introspect |
| `payments` | TS | PSP-агрегатор (Stripe / ЮKassa / CloudPayments) |
| `wallet` | Go | Банк + крипта + внутренние балансы |
| `search` | TS | Meilisearch → OpenSearch |
| `location` | Go | Geo-поиск, маршруты, geofence |
| `notifications` | TS | Push / email / SMS / in-app |
| `events` | NATS JetStream | Durable event backbone |
| `observability` | SigNoz | Traces + logs + metrics |
| `secrets` | Infisical | Secrets management |
| `feature-flags` | GrowthBook | Runtime flags, A/B |

**Слой 3 — Domain Primitives (19 сервисов):**

| Сервис | Runtime | Назначение |
|---|---|---|
| `pattern-engine` | TS | Composition, fork, версии Pattern-Card |
| `timeline-engine` | TS + Temporal | Durable workflows шагов |
| `booking` | TS | Slots, calendars, OCC |
| `inventory` | TS | Каталоги товаров/мест |
| `auction-engine` | TS/Go | Bidding, anti-sniping |
| `escrow-service` | TS | Holding funds/assets |
| `financing-service` | TS | Loans, lease, mortgage, BNPL |
| `ownership-registry` | TS | Физические + цифровые активы, title-graph |
| `authorship-registry` | TS | Цифровое авторство + royalty policy |
| `subscription-engine` | TS | Подписки на сущности/шаблоны |
| `reviews-ratings` | TS | Рейтинги |
| `disputes` | TS | Арбитраж |
| `messenger` | TS (existing messenger/core) | 1:1, групп, threads |
| `feed` | TS | Twitter-lite / stories / reels |
| `media-pipeline` | Go + SaaS (Mux/Bunny) | Транскод, CDN, галереи |
| `recommendations` | Python | ML-ranking |
| `moderation-ml` | Python | NSFW/spam/harmful |
| `inspection-service` | TS | Survey / инспекция timeline-step-provider |
| `ai-assist` | Python | AI generate/explain для card-types (см. 23-ai-assistance) |

**Слой 6 — Governance (4 сервиса):**

| Сервис | Назначение |
|---|---|
| `policy-engine` | Runtime geo/age/compliance: allow / distill / deny |
| `moderation-review` | Human-in-the-loop |
| `audit-log` | WORM, ClickHouse + cold storage |
| `trust-safety` | Device fingerprint, anti-fraud, anti-bot |

Всего **35 сервисов Layer-2/3/6** (12 platform + 19 domain + 4 governance), плюс Layer-5 (`apps/shell`, `apps/admin`, `apps/ops`) и Layer-4 (`packages/card-types/*`, десятки плагинов без собственного рантайма). Число растёт до ~38-40 к Phase 8-9 (banking / crypto specialized services).

## Инварианты слоёв

1. **Нет vertical-services.** Сервис либо horizontal-primitive, либо governance. Travel-service / dating-service / banking-service как отдельных рантаймов **не существует**.
2. **Нет shared БД.** Каждый примитив — своя БД. Кросс-доменные чтения — через API или event-replicated проекции в ClickHouse.
3. **Event-first.** Все мутации публикуют CloudEvents в NATS JetStream. Policy/audit/moderation/analytics подписаны.
4. **Contract-first.** Контракты между слоями — `packages/contracts-*` (Zod → OpenAPI). Слой нельзя импортировать в обход контракта.
5. **Runtime governance.** Geo/age/юрисдикция — не разветвление кода, а policy evaluation в рантайме.
6. **Identity-first.** Auth — первый сервис, который поднимается; все остальные валидируют JWT и scopes.
7. **OCC + soft-delete + cursor-pagination** — везде.
8. **Mobile/offline-first** во всех клиентах.
9. **No microfrontend framework** — shell один, панели — plugin-регистрация, не Module Federation на старте.
10. **Recursive revenue routing** — любая цепочка fork→fork→fork шаблонов раздаёт royalty автоматически через `authorship-registry`.

## Примеры cross-layer потоков

### Пример 1: User views a trip-compound (read path)

```
User clicks trip → apps/shell-web
  ↓ reads card-type
packages/card-types/trip-compound (L4)
  ↓ uses SDKs from contracts
packages/sdk-domain → HTTP GET /patterns/:id
  ↓ gateway
services/gateway (L2, Traefik) → validates JWT via identity
  ↓ routes to
services/pattern-engine (L3) → reads from pattern_db (Postgres, L1)
  ↓ emits app.daria.pattern.read.v1 (для analytics)
services/events (L2) → JetStream → services/audit-log (L6)
```

6 слоёв вовлечены. Layer-dependency strict сверху-вниз.

### Пример 2: User books a flight (write path with saga)

```
apps/shell-web → trigger booking
  ↓
packages/card-types/flight-ticket (L4)
  ↓ creates timeline
services/timeline-engine (L3)
  ├─ Step 1 (auto): services/booking.hold → OCC
  ├─ Step 2 (gate): services/policy-engine.evaluate (KYC) (L6)
  ├─ Step 3 (auto): services/payments.charge → PSP (L2)
  ├─ Step 4 (external): GDS booking → external API
  └─ emits events → services/wallet + audit-log + notifications
```

Одна user-action = 5+ services координированно через saga. Все пишут в свои БД. Никаких cross-DB JOIN.

### Пример 3: Template fork → recursive royalty distribution

```
User forks template → packages/card-types/pattern-template.fork()
  ↓
services/pattern-engine.fork (L3)
  ↓ publishes app.daria.pattern.forked.v1
services/authorship-registry (L3) — consumer
  ↓ computes lineage distribution
services/wallet (L2) — transfers across ancestors' accounts (ACID)
  ↓ emits royalty-distributed.v1 (financial-audit stream)
services/audit-log (L6) — WORM storage
  ↓
services/notifications — emits push to each recipient author
```

Cross-layer event-driven. Governance sees everything. См. `32-authorship-algorithms.md`.

## Когда новая сущность — сервис, а когда — card-type

Частый вопрос: «нужен ли нам новый сервис для feature X?». Правило:

| Признак | Card-type (Layer 4) | Primitive (Layer 2/3) | Governance (Layer 6) |
|---|---|---|---|
| Data-owned | No (uses primitives) | Yes (own DB) | No (consumes events) |
| Vertical-specific | Yes | No | No |
| Cross-vertical reusable | No | Yes | Yes |
| Has UI (panels) | Yes | No | No (admin-tool only) |
| Lifecycle | short/stateful within timeline | long-running domain | reactive |
| Scale unit | per-card-type (plugin) | per-service deployment | usually singleton |

Если feature — vertical-specific + UI + uses existing primitives → **card-type**.
Если feature — cross-vertical + own data + no UI → **primitive**.
Если feature — cross-cutting (policy, moderation, audit) → **governance**.

**Никогда**: создавать Layer 2 / 3 service с названием типа `travel-service`, `dating-service`, `banking-service`. Это нарушение I1.
