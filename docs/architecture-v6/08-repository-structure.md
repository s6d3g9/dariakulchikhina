# 08. Структура репозитория v6

Монорепо, pnpm workspaces + Turborepo. Принцип: **слои из `07-layered-architecture.md` видны в дереве**.

```
apps/
  shell-web/                  # Next.js — основной shell (web)
  shell-mobile/               # Expo (React Native) — shell (iOS/Android)
  shell-desktop/              # Tauri + React — shell (desktop, банк/ops)
  admin/                      # админка студий и ops
  landing/                    # публичный сайт (маркетинг)

services/                     # Layer 2 + 3 + 6 — горизонтальные сервисы
  # Layer 2 — Platform
  identity/                   # Zitadel wrapper (Go)
  credentials-vault/          # TS
  gateway/                    # Traefik config
  payments/                   # TS
  wallet/                     # Go
  search/                     # TS
  location/                   # Go
  notifications/              # TS
  events/                     # NATS JetStream config + schemas
  observability/              # SigNoz compose + dashboards
  secrets/                    # Infisical config
  feature-flags/              # GrowthBook config

  # Layer 3 — Domain Primitives
  pattern-engine/             # TS
  timeline-engine/            # TS + Temporal worker
  booking/                    # TS
  inventory/                  # TS
  auction-engine/             # TS или Go
  escrow-service/             # TS
  financing-service/          # TS
  ownership-registry/         # TS
  authorship-registry/        # TS
  subscription-engine/        # TS
  reviews-ratings/            # TS
  disputes/                   # TS
  messenger/                  # existing messenger/core — переезжает сюда
  feed/                       # TS
  media-pipeline/             # Go + SaaS-адаптер
  recommendations/            # Python (FastAPI)
  moderation-ml/              # Python
  inspection-service/         # TS

  # Layer 6 — Governance
  policy-engine/              # TS (OPA / Rego под капотом)
  moderation-review/          # TS
  audit-log/                  # TS → ClickHouse writer
  trust-safety/               # TS

packages/                     # Layer 4 + contracts + UI + shared
  # Contracts (generated + hand-written)
  contracts-platform/         # Zod + OpenAPI для Layer 2
  contracts-domain/           # Zod + OpenAPI для Layer 3
  contracts-governance/       # Zod + OpenAPI для Layer 6
  events/                     # CloudEvents schemas + JSON Schema registry

  # Card-types (Layer 4) — по одному на каждую строку из 06-card-types-matrix
  card-types/
    person-profile/
    company-profile/
    community/
    car/                      # car-purchase-new/used + car-rental-short + car-subscription
    motorbike/
    real-estate/
    pet/
    course/
    flight-ticket/
    train-ticket/
    bus-ticket/
    ferry-cruise/
    chartered-flight/
    chartered-boat/
    bike-rental/
    kick-scooter-rental/
    boat/                     # rental + purchase + club
    jetski-pwc/
    kayak-sup/
    rv-camper/
    camping-gear/
    ski-snowboard/
    diving-gear/
    photo-video-gear/
    instrument/
    construction-equipment/
    event-equipment/
    clothing-rental/
    tool-rental/
    apartment-stay/           # short-let + long-let
    hotel-room/
    hostel-bed/
    house-villa/
    office-coworking/
    office-long-lease/
    warehouse-storage/
    parking-spot/
    timeshare-slot/
    land-plot/
    auction-listing/
    collectibles/
    photo-asset/
    video-asset/
    music-track/
    code-module/
    game-mini-app/
    pattern-template/
    livestock/
    plant-garden/
    pregnancy-tracker/
    chronic-care-plan/
    fitness-plan/
    medical-appointment/
    home-cleaning/
    repair-request/
    food-delivery/
    grocery-delivery/
    laundry-service/
    job-posting/
    freelance-gig/
    contract-deal/
    event-ticket/
    festival-pass/
    sports-match-ticket/
    # ... добавление новой категории = новая папка + регистрация в card-type-registry

  # Shell primitives
  shell-core/                 # persistent-shell (panels slot machinery, swipe gestures)
  shell-panels/               # panel-provider contracts, panel-switcher
  shell-switcher/             # модуль-switcher в центральной области

  # UI
  design-tokens/              # JSON + CSS variables
  ui-react/                   # shadcn/ui + Radix + Tailwind — web (основа)
  ui-native/                  # RN components + RN Web адаптер
  ui-vue/                     # MAINTENANCE ONLY — studio legacy, не расширять

  # Dev experience
  i18n/                       # packages/i18n — translation runtime + helpers
  i18n-messages/              # language bundles (en, ru, tr, ar, fa, hi, ...)

  # SDKs (generated)
  sdk-platform/
  sdk-domain/
  sdk-governance/

  # Shared utils
  utils/
  testing/
    fractal-harness/            # структурные snapshot-тесты I19
    contract-harness/            # Zod/OpenAPI контракт-тесты I23
    fixtures/

platform/                     # Инфра-конфиги под слой 1
  docker-compose/             # local dev stack
  k8s/                        # manifests + Argo CD apps
  terraform/                  # provisioning (Hetzner / Yandex Cloud)
  law-profiles/               # YAML per region (см. 13-governance-policy.md)
  policies/                   # Rego / YAML policy rules (см. 13)
  notification-templates/     # MJML/текст шаблоны per-channel per-lang
  gateway/                    # Traefik config + dynamic rules

infra/
  signoz/                     # observability stack config
  temporal/                   # Temporal server config
  nats/                       # JetStream cluster config

scripts/                      # deploy, codegen, refactor-tooling
docs/
  architecture-v6/            # этот документ
  domain/                     # спеки доменной логики (из v5.3)
  api/                        # generated OpenAPI

_archive/
  v5/                         # старый app/ + server/ + shared/ + messenger/ после миграции
  cityfarm/                   # out-of-scope
```

## Правила размещения

1. **Новая вертикаль** → новая папка в `packages/card-types/<name>/` + регистрация в `packages/card-types/_registry.ts`. Ни в `services/`, ни в `apps/` не лезем.
2. **Новый примитив** → новая папка в `services/<name>/` только если логика не подходит существующему. Плюс контракты в `packages/contracts-domain/`.
3. **Новый канал клиента** → новое `apps/shell-<channel>/`, но shell-core переиспользуется.
4. **Новый фичефлаг** → `services/feature-flags/`, не хардкод.
5. **Никогда** — `apps/<vertical>/` или `services/<vertical>-*`. Нарушение инварианта 1.

## Границы импортов (ESLint-правила)

- `apps/**` ← `packages/shell-*`, `packages/card-types/*`, `packages/ui-*`, `packages/sdk-*`, `packages/design-tokens`. **Не импортирует** `services/**`.
- `services/**` ← `packages/contracts-*`, `packages/events`, `packages/utils`. **Не импортирует** `apps/**` или `packages/card-types/**`.
- `packages/card-types/*` ← `packages/contracts-domain`, `packages/sdk-domain`, `packages/shell-panels` (только contracts). **Не импортирует** другие `packages/card-types/*`.
- `packages/shell-*` ← `packages/ui-react`, `packages/design-tokens`, `packages/sdk-*`. **Не импортирует** `packages/card-types/*` (только через реестр).
- `packages/contracts-*` — чистый pure-типовой слой. Ничего рантаймного.

## Миграция v5.3 → v6 структуры

См. `02-phases.md`. Короткий маршрут:

1. **Фаза 0**: существующие `shared/` → `packages/contracts-*`, pnpm+Turborepo включаются над текущим деревом.
2. **Фаза 2**: `app/` + `server/` переезжают в `_archive/v5/` как monolithic studio. Параллельно поднимается `apps/shell-web/` + пустые `services/*` скелеты.
3. **Фаза 3+**: доменная логика v5.3 переписывается модулями в новые `services/*` + `packages/card-types/*`, studio-монолит усыхает.
