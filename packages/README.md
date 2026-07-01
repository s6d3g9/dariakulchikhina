# packages/ — shared-пакеты и type-plugins (Layer 4 + shared)

Всё, что переиспользуется между `apps/*` и `services/*`. Ноль рантайма — пакеты это библиотеки.

## Структура

### Контракты (pure types + Zod + OpenAPI)

| Путь | Содержимое |
|---|---|
| `contracts-platform/` | Zod схемы Layer 2 (identity, wallet, payments, …) |
| `contracts-domain/` | Zod схемы Layer 3 (pattern-engine, booking, authorship, …) |
| `contracts-governance/` | Zod схемы Layer 6 (policy, moderation, audit) |
| `events/` | CloudEvents JSON Schema registry |

### Shell и UI

| Путь | Содержимое |
|---|---|
| `shell-core/` | Persistent-shell: 4 панели + swipe + switcher |
| `shell-panels/` | Контракты panel-provider'ов |
| `shell-switcher/` | Центральный модуль-switcher |
| `design-tokens/` | JSON + CSS vars, единый источник |
| `ui-react/` | shadcn/ui + Radix + Tailwind (основа) |
| `ui-native/` | React Native компоненты + RN Web адаптер |
| `ui-vue/` | **MAINTENANCE ONLY** — legacy Studio |

### SDKs (generated)

| Путь | Что |
|---|---|
| `sdk-platform/` | HTTP-клиент из `contracts-platform` OpenAPI |
| `sdk-domain/` | HTTP-клиент из `contracts-domain` OpenAPI |
| `sdk-governance/` | HTTP-клиент из `contracts-governance` OpenAPI |

### Card-types (Layer 4)

Вертикали как плагины. См. [docs/architecture-v6/06-card-types-matrix.md](../docs/architecture-v6/06-card-types-matrix.md).

```
card-types/
  _registry.ts           # глобальный реестр card-types
  _template/             # шаблон нового card-type
  person-profile/
  car/
  real-estate/
  pet/
  course/
  flight-ticket/
  ...
```

### Utilities

| Путь | Что |
|---|---|
| `utils/` | Чистые утилы (date, money, id) |
| `testing/` | Test helpers, fixtures, vitest config |

## Правила

- Пакеты не импортируют `apps/**` и `services/**`. Только другие пакеты.
- `contracts-*` — **pure types**, ноль рантайм-зависимостей.
- Каждый `card-types/<name>/` обязан экспортировать `instance.view` + `type.view` + 8 panel-providers (см. инвариант I3).
- `card-types/<name>/` **не** импортирует другие `card-types/*`. Композиция — через `pattern-engine` в рантайме.

## Статус

Скелет зафиксирован. Реальные пакеты создаются в Фазах 0–1.
