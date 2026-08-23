# Architecture Decision Records (ADR)

Формальные записи **крупных** архитектурных решений v6. Каждый ADR объясняет: контекст, альтернативы, выбранное решение, последствия, когда пересматривать.

ADR — не «документация». Это **историческая памятка**, почему мы сделали тот или иной выбор, когда-то.

## Когда нужен ADR

ADR обязателен, если решение:

- Трогает слой 1–3 (infrastructure / platform / domain-primitives).
- Влияет на > 3 команды.
- Стоит > €5k/мес в infra-budget.
- Отменяет существующий инвариант.
- Выбирает между несколькими серьёзными альтернативами.
- Создаёт lock-in с vendor на > 1 год.

Для локальных решений в рамках card-type или service — ADR не нужен (достаточно PR-description).

## Когда НЕ нужен ADR

- Обновление существующего инвариантa (просто правка `09-invariants.md`).
- Bugfix или performance-improvement без архитектурного impact'а.
- Смена зависимости в рамках одного пакета.
- UI-решения внутри card-type.

## Формат

Файл: `NNNN-<slug>.md` (четыре цифры, kebab-case slug).

Структура:

```markdown
# ADR-NNNN: <заголовок>

- **Статус**: Proposed | Accepted | Superseded by ADR-MMMM | Deprecated
- **Дата**: YYYY-MM-DD
- **Решение**: <короткая формулировка>
- **Ответственный**: <команда / person>

## Контекст
Что происходит, какая проблема, какие constraints.

## Альтернативы
Список рассмотренных вариантов с плюсами/минусами.

## Решение
Что выбрано и почему.

## Последствия
Положительные и отрицательные следствия.

## Revisit
Когда и при каких условиях вернуться к этому решению.
```

## Процесс

1. Автор открывает PR с новым ADR в статусе `Proposed`.
2. Architecture Office + релевантные команды ревьюят.
| [0013](0013-qwen-review-routing.md) | Qwen 3.8 Max как независимый review-provider | Accepted |
3. Slack / meeting для обсуждения.
4. Статус меняется на `Accepted` или `Rejected`.
5. Merge.
6. Если позднее ADR-NNNN отменяется — новый ADR-MMMM ссылается на него, статус NNNN → `Superseded by ADR-MMMM`.

## Индекс

| № | Заголовок | Статус |
|---|---|---|
| [0001](0001-turborepo-vs-nx.md) | Turborepo vs Nx для монорепо v6 | Accepted |
| [0002](0002-temporal-vs-custom-saga.md) | Temporal vs custom saga-orchestrator | Accepted |
| [0003](0003-pgvector-vs-qdrant.md) | pgvector vs Qdrant для semantic search | Accepted |
| [0004](0004-meilisearch-vs-opensearch.md) | Meilisearch vs OpenSearch для lexical search | Accepted |
| [0005](0005-clickhouse-cloud-vs-self-host.md) | ClickHouse Cloud vs self-host | Accepted |
| [0006](0006-mtls-mesh-timing.md) | mTLS internal mesh timing | Accepted |
| [0007](0007-expo-vs-native.md) | Expo (RN) vs native iOS/Android | Accepted |
| [0008](0008-k8s-provider.md) | Managed k8s provider (Hetzner + Yandex dual) | Accepted |
| [0009](0009-kms-choice.md) | KMS / secrets (Infisical + cloud-KMS) | Accepted |
| [0010](0010-zod-openapi-pipeline.md) | Contract-first via Zod → OpenAPI | Accepted |
| [0011](0011-policy-aware-claim-graph.md) | Policy-aware Claim Graph и projection kernel | Proposed |
| [0012](0012-nl-only-development-runtime.md) | NL-only среда Development Intelligence | Accepted |

## Связь с другими docs

- ADR фиксирует **конкретные выборы**.
- `docs/architecture-v6/` фиксирует **целевую архитектуру**.
- `docs/adr/` — как мы к ней пришли.
- При конфликте: свежий ADR > старый doc. Doc обновляется после Accept'а ADR.
