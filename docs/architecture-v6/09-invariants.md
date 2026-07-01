# 09. Архитектурные инварианты v6

Правила, нарушение которых = merge-blocker. ESLint-правила + CI-проверки должны их кодифицировать по мере появления кода.

## I1. Horizontal-only services

Сервис в `services/*` — либо **Platform (Layer 2)**, либо **Domain Primitive (Layer 3)**, либо **Governance (Layer 6)**. Никаких `travel-service`, `dating-service`, `banking-service`.

> Вертикаль реализуется как `packages/card-types/<name>/`, а не как runtime.

## I2. Type-plugin registries

Каждый card-type зарегистрирован в `packages/card-types/_registry.ts`. Shell и панели ищут card-types **только** через реестр. Прямой импорт `packages/card-types/car/` из `apps/shell-*` запрещён.

## I3. Dual-view contract

Каждый `packages/card-types/<name>/` **обязан** экспортировать:

```ts
export default defineCardType({
  kind: 'car',
  instance: { view, top, left, right, bottom },
  type:     { view, top, left, right, bottom },
  modes?:   [...],
})
```

Отсутствие `instance.view` или `type.view` — CI-failure. Инверсия должна работать для всего.

## I4. Event-first

Любая доменная мутация публикует CloudEvent в NATS JetStream (durable stream). Прямой cross-service вызов ради триггера side-effect запрещён, если side-effect асинхронный.

Исключение: synchronous request/response для чтения — HTTP разрешён.

## I5. Contract-first

Межсервисные API описываются в `packages/contracts-*` (Zod → OpenAPI). CI-gate: если сервис меняет публичный endpoint, не обновив контракт — фэйл.

## I6. No cross-service DB access

Сервис пишет **только** в свою БД. Запрос к чужим данным — через API или event-replicated read-model в ClickHouse.

ESLint-правило: import drizzle/pg из чужого `services/*` или из `apps/*` — error.

## I7. Identity-first

Все сервисы валидируют JWT из Zitadel через JWKS. Никаких HMAC-cookie (кроме переходного периода Фаза 1). WS auth — только через ticket flow.

## I8. Runtime governance

Geo-ограничения, age-gates, compliance — **не разветвление кода**, а вызов `policy-engine.evaluate(user, action, context) → allow | distill | deny`. Шейпинг контента делает policy-engine, не feature-flag.

## I9. OCC + soft-delete + cursor-pagination

Каждая mutable-таблица имеет `version` + `deleted_at`. Пагинация — только cursor-based. Offset запрещён.

## I10. Recursive revenue routing

Монетизация fork-graph шаблонов — через `authorship-registry`. Любой card-type, создающий доход (покупка, подписка, usage), **обязан** пройти через `split-policy` registry. Прямое зачисление одному кошельку запрещено, если шаблон имеет цепочку fork'ов.

## I11. Mobile/offline-first

Shell (`apps/shell-mobile`) и панели работают с локальным кэшем (SQLite/MMKV) и синхронизируются через event-log. Сетевая недоступность — штатное состояние, не ошибка.

## I12. No microfrontend framework (MVP)

На старте — один shell, плагины панелей регистрируются статически. Module Federation / Web Components допускаются **только** если две вертикали требуют встраивания друг в друга + доказанный use-case. До тех пор — статическая регистрация.

## I13. Single design-token source

`packages/design-tokens` — единственный источник. `ui-react`, `ui-native`, `ui-vue` — консьюмеры. Хардкоженные цвета/отступы в компонентах — ESLint-warning.

## I14. One-language-per-layer (внутри runtime-границ)

- Web UI — TS + React.
- Mobile — TS + React Native.
- Desktop — TS + React + Rust-ядро Tauri.
- Domain-heavy CRUD сервисы — TS.
- Latency/safety-critical — Go или Rust по таблице в `01-stack.md`.
- ML — Python.

Не смешивать языки внутри одного сервиса.

## I15. Entity-provider обязателен

Новая сущность (человек, актив, курс, игра) регистрируется через `EntityProvider` (см. `05-shell-entity-model.md` §8). Это включает `resolveInstance`, `resolveType`, `linkInstanceToType`, panel-contracts. Без этого сущность не может быть фокусом shell'а.

## I16. No hidden side-effects в timeline-step

Шаги `timeline-engine` — чистые, идемпотентные, retry-safe. Побочные эффекты — через compensating actions (sagas). Блокирующий human-step — это тоже шаг, а не внешний флаг.

## I17. Audit-log is append-only

`audit-log` пишет в WORM-хранилище (ClickHouse + cold S3 с object-lock). Удаление/изменение событий аудита — физически невозможно. Включая все финансовые и governance-решения.

## I18. Governance — через хуки, не через импорт

Policy / moderation / audit подписываются на события, а не вшиваются в код примитивов. Card-type и примитив не знают, какие политики к ним применяются — они только публикуют события и ждут решение от policy-engine.

## I19. Фрактальный UX (self-similar grammar)

Shell, CardView, PanelView, Section, Item, Field — **единая грамматика** на всех уровнях (см. `17-fractal-ux.md`). Card-type нельзя вводить:

- Свой layout-компонент вместо CardView / PanelView.
- Свой жест вне списка из 6 канонических (swipe / tap / long-press / pinch / inversion).
- Свой переключатель помимо `⇄ (View)` и `Mode`.
- Свой цвет вне семантических токенов `design-tokens`.
- Свой порядок секций в CardView.

CI-проверка `packages/testing/fractal-harness` прогоняет сценарные тесты на всех card-types и сравнивает структурные snapshot'ы. Любое отступление = CI-fail.

## I20. Один layout-код для всех вертикалей

`packages/ui-react` экспортирует **закрытый** набор layout-компонентов (Shell, CardView, PanelView, Section, Item, Field, InversionButton, ModeToggle, SearchBar, SearchResults). Card-type **использует** их, не **определяет**. Если чего-то не хватает — добавить в `ui-react`, а не в card-type.

## I21. Timeline обязателен для любого card-type

Каждая сущность имеет timeline, даже если он тривиальный (`created → active → archived`). Отсутствие timeline-секции в CardView — CI-fail (см. `10-timeline-engine.md` + `17-fractal-ux.md` §5).

## I22. Inversion обязательна

`instance.view` и `type.view` реализованы оба для любого card-type. Если type-view «ничем не отличается» — это сигнал, что модель сущности недоработана: либо у неё нет внешнего общественного измерения (тогда type-view показывает каталог похожих + сообщество kind'а), либо card-type надо пересобрать.

## I23. Dual-layer tests

Каждый card-type покрыт двумя уровнями тестов:

1. **Contract tests** (Zod/OpenAPI валидация данных от сервисов).
2. **Fractal harness** (структурные UI-snapshot'ы на instance/type × 4 панели × 2 mode).

Без обоих — merge заблокирован.

---

Каждый инвариант должен получить ESLint-правило или CI-check до конца Фазы 2. Без этого инварианты — декларация, а не гарантия.

## Сводка (быстрый референс)

| # | Правило | Проверяется |
|---|---|---|
| I1 | Horizontal-only services | ESLint + каталог |
| I2 | Type-plugin registry only | ESLint |
| I3 | Dual-view contract | CI |
| I4 | Event-first на мутации | Grep + code-review |
| I5 | Contract-first API | CI (OpenAPI drift) |
| I6 | No cross-service DB | ESLint |
| I7 | Identity-first, JWT | Runtime gateway |
| I8 | Runtime governance only | Grep hardcoded country |
| I9 | OCC + soft-delete + cursor | Schema linter |
| I10 | Recursive royalty | End-to-end тест |
| I11 | Mobile/offline-first | UX-аудит |
| I12 | No microfrontend (MVP) | Code-review |
| I13 | Single design-tokens source | ESLint |
| I14 | One-language-per-layer | Code-review |
| I15 | EntityProvider обязателен | CI |
| I16 | Idempotent timeline-steps | Tests |
| I17 | Append-only audit-log | Infra (WORM) |
| I18 | Governance через хуки | Code-review |
| I19 | Фрактальная грамматика | fractal-harness |
| I20 | Один layout-код | ESLint |
| I21 | Timeline обязателен | CI |
| I22 | Inversion обязательна | CI |
| I23 | Dual-layer tests | CI |

## Enforcement mechanisms — концретно

Каждый инвариант имеет **технический** механизм проверки. Ниже — формальные правила как configured:

### ESLint rules (`eslint.config.mjs`)

```js
// I1: horizontal-only services
'no-restricted-imports': ['error', {
  patterns: [
    { group: ['services/*travel*', 'services/*dating*', 'services/*banking*'],
      message: 'I1: vertical-services forbidden. Use card-types/<vertical>/' }
  ]
}],

// I2: card-types через реестр
'no-restricted-imports': ['error', {
  patterns: [
    { group: ['packages/card-types/*/!(index)'],
      message: 'I2: import via registry, not direct paths' },
    { group: ['packages/card-types/*/index'],
      message: 'Should use resolveCardType(kind) from _registry' }
  ]
}],

// I6: no cross-service DB
'no-restricted-imports': ['error', {
  patterns: [
    { group: ['drizzle-orm', 'postgres'], 
      excludeMarkers: ['./db/*'],
      message: 'I6: DB access only через свой сервис; cross-service — через API' }
  ]
}],

// I13: design-tokens единый источник
'no-restricted-syntax': ['error', {
  selector: 'Literal[value=/^#[0-9a-fA-F]{3,8}$/]',
  message: 'I13: use design-tokens semantic colors, not hex'
}],

// I20: закрытый layout-set в card-types
'no-restricted-syntax': ['error', {
  selector: 'ExportDefaultDeclaration[declaration.type="ArrowFunctionExpression"]',
  message: 'I20: card-type should use CardView, not custom layout'
}]
```

### CI checks (`.github/workflows/*`)

```yaml
# I3: dual-view contract
name: card-type-dual-view-check
- run: |
    for kind in packages/card-types/*/; do
      if ! test -f "$kind/instance.view.ts" || ! test -f "$kind/type.view.ts"; then
        echo "I3 violation: $kind missing views"; exit 1
      fi
    done

# I5: OpenAPI drift detection
name: contract-drift-check
- run: |
    pnpm generate:openapi
    git diff --exit-code openapi.json || {
      echo "I5 violation: API changed but contract not regenerated"; exit 1
    }

# I15: EntityProvider обязателен
name: entity-provider-check
- run: |
    for kind in packages/card-types/*/; do
      if ! grep -q 'EntityProvider' "$kind/entity-provider.ts"; then
        echo "I15 violation: $kind missing EntityProvider"; exit 1
      fi
    done

# I19: fractal-harness
name: fractal-snapshot
- run: pnpm test:fractal

# I21: timeline обязателен
name: timeline-check
- run: |
    for kind in packages/card-types/*/; do
      if ! test -f "$kind/timeline.ts"; then
        echo "I21 violation: $kind missing timeline.ts"; exit 1
      fi
    done

# I23: dual-layer tests
name: tests-coverage
- run: |
    for kind in packages/card-types/*/; do
      if ! test -f "$kind/tests/fractal.snapshot.test.ts" || \
         ! test -f "$kind/tests/contract.test.ts"; then
        echo "I23 violation: $kind missing required tests"; exit 1
      fi
    done
```

### Runtime checks

```ts
// I7: gateway validates JWT
// services/gateway config enforces this — все endpoints except public require JWT

// I8: policy-engine called для всех gated actions
// Grep в services: if / else branches на region.code — forbidden
// pre-commit hook:
pnpm grep -rn "country === 'RU'\|country === 'US'" services/ && exit 1

// I16: timeline steps идемпотентны
// Temporal workflow — replay-safe by construction
// Handler code — обязателен idempotency-key check

// I17: audit-log WORM
// Infra level: S3 object-lock configured. Write failures → DLQ never delete.
// Application: audit-log-write-failure runbook triggers SEV-1

// I18: governance через events
// Direct imports services/policy-engine из services/* — ESLint error
// Communication только через events (JetStream consume)
```

### Doc-level checks

```bash
# I10: recursive royalty — end-to-end acid-test T3
pnpm test:acid -- T3

# I11: mobile-offline — acid-test T12
pnpm test:acid -- T12

# I22: inversion test — проверка в fractal-harness
pnpm test:fractal -- --check-inversion
```

## Violation handling procedure

Когда инвариант нарушается:

1. **CI-blocked** — merge невозможен. Автор исправляет.
2. **If emergency** — explicit ADR-waiver с expiry (max 30 дней).
3. **Waiver-tracker** — еженедельный review в arch-meeting.
4. **Expired waiver** → tech-debt ticket high-priority.

## Principle: инвариант > срок

**Никогда** не нарушаем инвариант ради дедлайна. Альтернативы:
- Вырезать feature-scope.
- Request ADR-waiver с planning fix.
- Redesign.

Нарушения инвариантов под давлением — источник architectural decay. Эффект ускоряется нелинейно.
