# 02. Фазы миграции v5.3 → v6

Каждая фаза самодостаточна: если остановиться, система остаётся рабочей.

Контекст: у проекта **нет живых пользователей**. Поэтому фазы переосмыслены в сторону **spec-first redesign** — вместо strangler-миграции построить новый каркас рядом, описать доменную логику v5.3 как спеки, переложить в новые примитивы и card-types. Studio-монолит уезжает в `_archive/v5/` как reference.

## Фаза 0 — Foundation (2–3 недели)

**Цель**: монорепо-инфраструктура и каркас слоёв.

- `pnpm` workspaces + **Turborepo** (кэш + граф задач).
- `packages/contracts-platform` + `packages/contracts-domain` + `packages/contracts-governance` — пустые скелеты.
- `packages/design-tokens` — JSON + CSS vars, первый проход из v5.3.
- `packages/ui-react` (shadcn/ui + Radix + Tailwind) — пустой, с двумя показательными компонентами.
- `packages/events/` — JSON Schema + CloudEvents baseline.
- `platform/docker-compose/` — локальный стек: Postgres, Redis, NATS JetStream, Temporal, SigNoz, MinIO (S3), Meilisearch.
- ESLint-правила из [09-invariants.md](09-invariants.md) I1, I6 активируются сразу (пустые сервисы — но правила работают).
- OpenAPI-ген из Zod (`zod-to-openapi`) в CI.
- `services/observability/` — SigNoz конфиг + dashboards skeleton.

**Выход**: `pnpm install && pnpm docker:up && pnpm dev` поднимает полный локальный стек инфры без бизнес-кода.

## Фаза 1 — Platform core (4–6 недель)

**Цель**: поднять Layer 2 (Platform services) — identity, gateway, payments, wallet, events, notifications.

- `services/identity/` — Zitadel self-hosted в docker. JWT + JWKS. Scopes: `shell:*`, `domain:*`, `governance:*`.
- `services/gateway/` — Traefik. TLS, rate-limit, JWT introspect на входе.
- `services/events/` — NATS JetStream кластер (3 ноды dev, 3 prod). CloudEvents schema registry в `packages/events/`.
- `services/payments/` — PSP-агрегатор (Stripe / ЮKassa / CloudPayments). Первая версия — интерфейс + один PSP.
- `services/wallet/` — Go. Внутренние балансы (TigerBeetle позже, на старте — Postgres + double-entry). Интерфейс достаточный для подписок и покупок.
- `services/notifications/` — push/email/SMS/in-app. Адаптеры, не SaaS-лок.
- `services/secrets/` + `services/feature-flags/` — Infisical + GrowthBook.
- `services/credentials-vault/` — storage для сертификатов/лицензий/KYC-уровней. Интеграция с identity.

**Выход**: новый пользователь регистрируется через Zitadel, получает JWT, события логина публикуются в JetStream, SigNoz видит traces, payments принимает первый тестовый платёж.

## Фаза 2 — Domain primitives (6–8 недель)

**Цель**: Layer 3 — базовый набор примитивов для первой вертикали + творческой экономики.

Приоритетный набор:

- `services/pattern-engine/` — композиция Pattern-Card, форки, версии.
- `services/timeline-engine/` — Temporal worker. Абстракция steps / forks / approvals.
- `services/booking/` — slots, calendars, OCC.
- `services/inventory/` — каталоги.
- `services/authorship-registry/` — цифровое авторство + royalty split-policy.
- `services/ownership-registry/` — физические + цифровые активы, title-graph.
- `services/subscription-engine/` — подписки на сущности и шаблоны.
- `services/escrow-service/` — holding funds/assets.
- `services/reviews-ratings/` — рейтинги.
- `services/search/` — Meilisearch, универсальный поиск.
- `services/location/` — geo, маршруты, geofence.

Менее приоритетные, но в той же фазе:

- `services/feed/` — twitter-lite + stories.
- `services/media-pipeline/` — загрузка, транскод через Mux/Bunny на старте.
- `services/messenger/` — переносится из существующего `messenger/core` с минимальными правками контрактов.

Governance (Layer 6) — параллельно в минимальном виде:

- `services/policy-engine/` — OPA/Rego, правила геoограничений и age-gates (пустые на старте).
- `services/audit-log/` — ClickHouse writer, подписан на все мутационные события.

**Выход**: можно построить Pattern-Card с timeline, забронировать слот, получить royalty за форк шаблона. Ни одной вертикали ещё нет.

## Фаза 3 — Shell + первая вертикаль (8–10 недель)

**Цель**: Layer 5 (experience) + Layer 4 (первый card-type).

- `apps/shell-web/` — Next.js. Persistent shell с 4 панелями, свайп-жесты, центральный switcher.
- `apps/shell-mobile/` — Expo (React Native). Тот же shell-core через `packages/shell-core`.
- `packages/shell-core/` + `packages/shell-panels/` + `packages/shell-switcher/` — примитивы UI shell'а.
- **Инверсия instance⇄type** — реализована в shell'е из первой же вертикали. Проверка что контракт `EntityProvider` работает.

Первый card-type — **`person-profile`** (минимальный, без которого shell бесполезен) + **`travel`-компaунд**:

- `packages/card-types/person-profile/` — instance + type view, 8 panel-providers.
- `packages/card-types/flight-ticket/` + `hotel-room/` + `taxi-ride/` + `apartment-stay/` + `car-rental-short/` + `restaurant-booking/` — минимум для travel-компаунда.
- `packages/card-types/trip-compound/` — композит: перелёт + трансфер + отель + ресторан. Демонстрирует pattern-engine + timeline-engine на реальном UX.

**Выход**: пользователь в shell'е собирает поездку, видит timeline-роадмап, все 4 панели корректно инвертируются при заходе в профиль оператора и при открытии карточки авиакомпании.

## Фаза 4 — Creator economy + pet / care (6–8 недель)

**Цель**: обкатать authorship/ownership/royalty на шаблонах и живых сущностях.

- `packages/card-types/photo-asset/`, `video-asset/`, `code-module/`, `course/`, `pattern-template/` — все с type-view (магазин шаблонов) и instance-view (моя коллекция).
- `services/financing-service/` — MVP (BNPL + подписочная модель).
- `packages/card-types/pet/`, `livestock/`, `plant-garden/` — живые сущности, проверка ownership на не-цифре.
- `packages/card-types/chronic-care-plan/`, `pregnancy-tracker/`, `fitness-plan/` — wellness, проверка timeline-engine на долгих процессах.
- `services/moderation-ml/` + `services/moderation-review/` — первая боевая нагрузка на модерации (фото/видео).
- Recursive royalty (I10) — end-to-end проверяется на fork→fork→fork шаблонов.

**Выход**: автор публикует шаблон, другой пользователь форкает, третий использует — royalty расщепляется рекурсивно и видно в wallet.

## Фаза 5 — Mobility + rental + purchase (8–12 недель)

**Цель**: массовое добавление card-types из §2.3–2.5 `06-card-types-matrix.md`.

- Порционно: transport → short rental → long rental → purchase. В каждой порции — пара card-types за спринт.
- `services/inspection-service/` — для used-car/boat-survey/real-estate.
- `services/auction-engine/` — для collectibles / used-car auctions.
- Интеграции: Amadeus/Travelpayouts, дилерские CRM, кадастровые API.
- Все новые card-types — только плагины, ноль новых сервисов (валидация I1).

**Выход**: пользователь может купить подержанную машину с inspection-шагом, арендовать яхту с проверкой IYT-сертификата, выставить свой инструмент на аукцион — всё через один shell.

## Фаза 6 — Инфра-зрелость (4–6 недель)

Параллельно с Фазой 5 (не блокирует её).

- Переезд с docker-compose на **managed k8s** (Hetzner или Yandex Cloud).
- **Argo CD** GitOps.
- **Terraform** провижининг.
- Cloudflare WAF/DDoS.
- Backup-политики на все БД.
- TigerBeetle вместо Postgres-double-entry в wallet (миграция балансов).
- Cross-region DR (решение: single-region + backup vs multi-region) — см. `04-open-questions.md`.

**Выход**: прод в k8s, все сервисы через Argo, secrets из Infisical, RPO < 15 мин.

## Фаза 7 — Social (dating + video) (12–16 недель)

- ScyllaDB для social graph.
- `packages/card-types/person-profile/` расширяется dating-mode; matching-mode появляется как отдельный view-mode.
- `packages/card-types/video-asset/` — production-версия media-pipeline (Mux/Bunny → свой FFmpeg fleet при доказанном росте).
- Moderation — полная human-in-the-loop цепочка.
- Mobile (Expo) — обязательно и критично.

## Фаза 8 — Banking (12+ месяцев, отдельный трек)

- Изолированный k8s cluster в отдельном VPC.
- TigerBeetle — полный ledger.
- BaaS партнёр (Точка / Qiwi / другой), **не своя лицензия** на старте.
- KYC через Sumsub.
- `packages/card-types/bank-account/`, `credit-card/`, `transfer/`, `loan/`, `mortgage/` — плагины поверх wallet + financing + ownership.
- Отдельный security-ревью.

## Фаза 9 — Crypto (после banking)

- Rust matching-engine (`services/matching-engine/`).
- Fireblocks на старте, own HSM потом.
- `packages/card-types/crypto-wallet/`, `crypto-trade/`, `token-listing/`.
- Регуляторка per-юрисдикция через policy-engine.

## «Нетерпеливо хочется сейчас» — что делать

Фаза 0 начинается немедленно, её результаты полезны даже если v6 не случится:

1. Turborepo над существующим деревом.
2. `packages/contracts-*` выделены из `shared/`.
3. OpenAPI-генерация из Zod.
4. SigNoz + OpenTelemetry в main Nuxt и messenger.

Это ~3 PR, каждый самодостаточный.

## Formal phase-gates

Каждая фаза имеет **exit-criteria** — measurable checklist. Без зелёных пунктов phase not declared complete. Без completion — next phase not started.

### Phase 0 exit-criteria

**Infrastructure:**
- [ ] `pnpm-workspace.yaml` + `turbo.json` работают
- [ ] `pnpm dev:infra` поднимает полный docker-compose stack (10 services)
- [ ] `pnpm test` outputs success на пустом project
- [ ] Remote cache (Turborepo) работает (или self-hosted alternative)

**Packages:**
- [ ] `packages/contracts-platform/`, `contracts-domain/`, `contracts-governance/` созданы (пустые skeletons)
- [ ] `packages/design-tokens/` с extracted tokens из v5.3
- [ ] `packages/events/cloudevents-base.schema.json` defined
- [ ] `packages/ui-react/` с 2 показательными компонентами

**Observability:**
- [ ] SigNoz self-hosted работает
- [ ] Main Nuxt app отправляет traces
- [ ] Messenger отправляет traces
- [ ] Grafana-style dashboards created (Service Overview template)

**Tooling:**
- [ ] `pnpm create card-type` scaffolding работает
- [ ] `pnpm create service` scaffolding работает
- [ ] CI pipeline validates все PR

**Deliverables**: `apps/`, `packages/`, `services/`, `platform/` directories с READMEs. Docker-compose boot file.

**Team size**: 2-3 человека.

**Duration**: 2-3 weeks.

**Go/No-Go к Phase 1**: готов ли бюджет + команда на 4-6 weeks platform work? Есть ли триггер для v6 (вторая vertical в pipeline)?

### Phase 1 exit-criteria

**Identity:**
- [ ] Zitadel self-hosted в prod
- [ ] Registration + login flows working (passkey preferred)
- [ ] JWT issued, JWKS endpoint reachable
- [ ] WS-ticket flow working (tested с dummy WS consumer)
- [ ] `app.daria.identity.user-registered.v1` events публикуются

**Platform core:**
- [ ] `services/gateway` (Traefik) с TLS + rate-limiting
- [ ] `services/events` (NATS JetStream, 3-node) + schema registry populated
- [ ] `services/payments` с одним PSP (Stripe or ЮKassa) работает end-to-end
- [ ] `services/wallet` принимает charges + balances
- [ ] `services/notifications` отправляет через 2 channels (email + push)
- [ ] `services/secrets` (Infisical) + `services/feature-flags` (GrowthBook) deployed
- [ ] `services/credentials-vault` для KYC uploads

**Acid-tests passing:**
- [ ] T20 — minor-account activation flow
- [ ] Basic authentication tests

**Deliverables**: 12 Layer 2 services running. First test user can register + login + receive notification.

**Team size**: 5-8 чел.

**Duration**: 4-6 weeks.

**Go/No-Go к Phase 2**: все identity events flowing, платёжка работает для sandbox, observability catches all traces.

### Phase 2 exit-criteria

**Domain primitives:**
- [ ] `services/pattern-engine` — Pattern-Card CRUD, fork, materialize
- [ ] `services/timeline-engine` (Temporal) — 5 step kinds executable
- [ ] `services/booking` — hold lifecycle, OCC
- [ ] `services/inventory` — catalogs + items
- [ ] `services/authorship-registry` — template publishing + distribution algorithm
- [ ] `services/ownership-registry` — assets + transfers
- [ ] `services/subscription-engine` — trial → active → cancel lifecycle
- [ ] `services/escrow-service` — hold funds
- [ ] `services/reviews-ratings` — verified reviews
- [ ] `services/search` (Meilisearch) — indexing + query
- [ ] `services/location` — POI + routing
- [ ] `services/feed` — post CRUD
- [ ] `services/media-pipeline` — upload + CDN access
- [ ] `services/messenger` — conversations (migrated from v5.3 messenger/core)

**Governance:**
- [ ] `services/policy-engine` — evaluate endpoint returning allow/distill/deny
- [ ] `services/audit-log` — consumer collecting events to ClickHouse

**Acid-tests passing:**
- [ ] T3 — recursive royalty end-to-end
- [ ] T11 — failed saga compensation
- [ ] T19 — event schema non-breaking change

**Deliverables**: Все Layer 2+3 services functional (skeleton-quality). Events flowing через JetStream. Audit-log writing.

**Team size**: 8-10 чел.

**Duration**: 6-8 weeks.

**Go/No-Go к Phase 3**: Pattern-Card cycle (create → fork → materialize → complete) работает; royalty пасс passing.

### Phase 3 exit-criteria

**Shell:**
- [ ] `apps/shell-web` (Next.js) — persistent shell с 4 панелями + switcher + search
- [ ] `apps/shell-mobile` (Expo) — same shell
- [ ] Fractal-harness готов с `person-profile` как baseline

**First vertical (Travel):**
- [ ] `packages/card-types/person-profile/` — эталон
- [ ] `packages/card-types/flight-ticket/`, `hotel-room/`, `taxi-ride/`, `apartment-stay/`
- [ ] `packages/card-types/trip-compound/` — composite с timeline
- [ ] Amadeus / Travelpayouts integration working

**Acid-tests passing:**
- [ ] T4 — profile-switch без unmount shell
- [ ] T7 — inversion machine ⇄ model
- [ ] T10 — fractal-harness structural equality
- [ ] T12 — mobile cold-start offline < 2s
- [ ] T13 — смена языка на лету
- [ ] T14 — RTL layout
- [ ] T16 — TZ-correct timeline

**Deliverables**: Live end-to-end — пользователь регистрируется, открывает shell, собирает trip-compound, timeline запускается, notifications приходят. Invertion работает.

**Team size**: 10-15 чел (squad-based).

**Duration**: 8-10 weeks.

**Go/No-Go к Phase 4**: travel-retention week-4 > 15%, fractal-harness green для всех card-types, нет vertical-specific сервисов.

### Phase 4 exit-criteria

**Creator economy:**
- [ ] `packages/card-types/photo-asset/`, `video-asset/`, `music-track/`, `code-module/`
- [ ] `packages/card-types/pattern-template/` с marketplace
- [ ] `packages/card-types/course/` с cohort community
- [ ] Recursive royalty end-to-end (T3 с 3+ уровнями lineage)
- [ ] Subscription-as-NFT с resale
- [ ] `services/moderation-ml` активен для uploads
- [ ] `services/disputes` handles first real dispute cases

**Care / wellness:**
- [ ] `packages/card-types/pet/`, `livestock/`, `plant-garden/`
- [ ] `packages/card-types/pregnancy-tracker/`, `chronic-care-plan/`
- [ ] Medical data отдельный encryption scope verified

**Acid-tests passing:**
- [ ] T9 — fork → publish-as-template → subscribe
- [ ] T15 — multi-currency transaction
- [ ] T17 — subscription full lifecycle
- [ ] T18 — permissions share-flow

**Deliverables**: 5+ creators активны, 100+ templates опубликованы, live royalty potok visible.

**Team size**: 12-15 чел.

**Duration**: 6-8 weeks.

**Go/No-Go к Phase 5**: creator retention > 30% Day-30, recursive royalty не выявил bugs.

### Phase 5 exit-criteria

**Mobility / rental / purchase:**
- [ ] 20+ new card-types из mobility + rental + purchase групп
- [ ] `services/inspection-service`, `services/auction-engine`, `services/financing-service`
- [ ] External integrations: dealer CRM / кадастр / судовой реестр

**Acid-tests passing:**
- [ ] T1 — новая вертикаль за 1 день (proof)
- [ ] T8 — добавление horizontal primitive

**Deliverables**: Полный mobility stack работает, purchase с inspection flow.

**Team size**: 15-20 чел.

**Duration**: 8-12 weeks.

**Go/No-Go к Phase 6**: unit economics on track, sufficient capital для k8s migration.

### Phase 6 exit-criteria

**Infra maturity:**
- [ ] Managed k8s (Hetzner или Yandex) running production workloads
- [ ] Argo CD GitOps для всех services
- [ ] Terraform полностью описывает инфру
- [ ] Cross-region backup verified (restore-test passed)
- [ ] TigerBeetle миграция для `services/wallet` complete
- [ ] Cloudflare WAF / DDoS protection

**Acid-tests passing:**
- [ ] T2 — смена юрисдикции через YAML без деплоя
- [ ] T6 — policy distill в feed
- [ ] Full DR-drill completed (quarterly)

**Deliverables**: Production runs on k8s, secrets из Infisical, observability full, backup-test passes.

**Team size**: 20-25 чел.

**Duration**: 4-6 weeks (parallel с Phase 5).

**Go/No-Go к Phase 7**: platform ready для high-traffic verticals (dating + video).

### Phase 7+ exit-criteria

See respective sections in 02-phases above. Phase 7 (Social), Phase 8 (Banking), Phase 9 (Crypto) — более сложные с longer durations и более строгими compliance exit-criteria. Detail specs создаются ближе к Phase-start.

## Phase dependency graph

```
Phase 0 ──┬── Phase 1 ──── Phase 2 ──── Phase 3 ──┬── Phase 4
          │                                         │
          │                                         └── Phase 5 ──── Phase 6 ──── Phase 7 ──── Phase 8 ──── Phase 9
          │                                                                            
          └── Phase 0 can continue independently (dev-exp improvements)
```

- Phase 4 и 5 can run в параллель (разные squads).
- Phase 6 (infra) — параллельно с Phase 5 (не блокирует).
- Phase 7 требует Phase 6 done (scale needed).
- Phase 8 — отдельный track после Phase 7.
- Phase 9 — отдельный track после Phase 8.

## Phase delay / skip policy

- **Delay allowed** если acid-test fails — fix first.
- **Skip allowed** только с ADR — например, если banking не в roadmap → Phase 8 просто не начинается.
- **Order not changeable** — нельзя делать Phase 3 before Phase 2 done (platform primitives required).
- **Features within phase** — могут re-ordered, но phase-exit criteria обязательны для advance.
