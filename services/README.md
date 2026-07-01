# services/ — горизонтальные сервисы v6 (Layer 2 + 3 + 6)

Каждый сервис — **горизонтальный примитив**. Vertical-сервисов (`travel-service`, `dating-service`, `banking-service`) здесь не бывает — это прямое нарушение инварианта I1.

Вертикали живут в `packages/card-types/*`. Если кажется, что вертикали нужен свой сервис — это признак, что примитив пропущен в каталоге ниже.

## Текущий каталог (v5.3)

| Сервис | Статус | План v6 |
|---|---|---|
| `communications-service/` | Live | Остаётся, переименовывается как часть `services/messenger/` или отдельно |

## Планируемый каталог v6

См. [docs/architecture-v6/07-layered-architecture.md](../docs/architecture-v6/07-layered-architecture.md) для полного списка.

### Layer 2 — Platform (12 сервисов)

| Папка | Runtime | Фаза |
|---|---|---|
| `identity/` | Zitadel (Go) | 1 |
| `credentials-vault/` | TS | 1 |
| `gateway/` | Traefik config | 1 |
| `payments/` | TS | 1 |
| `wallet/` | Go | 1 |
| `search/` | TS | 2 |
| `location/` | Go | 2 |
| `notifications/` | TS | 1 |
| `events/` | NATS JetStream config | 0 |
| `observability/` | SigNoz config | 0 |
| `secrets/` | Infisical config | 1 |
| `feature-flags/` | GrowthBook config | 1 |

### Layer 3 — Domain Primitives (19 сервисов)

| Папка | Runtime | Фаза |
|---|---|---|
| `pattern-engine/` | TS | 2 |
| `timeline-engine/` | TS + Temporal | 2 |
| `booking/` | TS | 2 |
| `inventory/` | TS | 2 |
| `auction-engine/` | TS или Go | 5 |
| `escrow-service/` | TS | 2 |
| `financing-service/` | TS | 4 |
| `ownership-registry/` | TS | 2 |
| `authorship-registry/` | TS | 2 |
| `subscription-engine/` | TS | 2 |
| `reviews-ratings/` | TS | 2 |
| `disputes/` | TS | 5 |
| `messenger/` | TS (existing `messenger/core`) | 2 |
| `feed/` | TS | 2 |
| `media-pipeline/` | Go + Mux/Bunny | 2 |
| `recommendations/` | Python | 7 |
| `moderation-ml/` | Python | 4 |
| `inspection-service/` | TS | 5 |
| `ai-assist/` | Python | 3 |

### Layer 6 — Governance (4 сервиса)

| Папка | Runtime | Фаза |
|---|---|---|
| `policy-engine/` | TS + OPA | 2 |
| `moderation-review/` | TS | 4 |
| `audit-log/` | TS → ClickHouse | 2 |
| `trust-safety/` | TS | 7 |

## Правила

- Новый сервис появляется **только если** он — горизонтальный примитив или governance. Названия вроде `travel-*`, `dating-*` — запрещены.
- Сервис пишет только в **свою** БД. Кросс-доменные чтения — через API или event-replicated проекции в ClickHouse.
- Контракт сервиса — в `packages/contracts-<layer>/`. Изменение endpoint без обновления контракта — CI-fail.
- Каждый сервис публикует CloudEvents в NATS JetStream при мутации состояния.
- Каждый сервис валидирует JWT из Zitadel (кроме identity).

## Статус

Скелет зафиксирован. Реальные сервисы создаются пофазно — см. `docs/architecture-v6/02-phases.md`.
