# packages/card-types/ — вертикали как плагины (Layer 4)

Каждая папка — один card-type. Это **единственное место**, где живёт вертикальная логика v6. Горизонтальных сервисов в `services/*` добавлять ради вертикали нельзя (инвариант I1).

## Контракт card-type

Каждый пакет обязан экспортировать `CardTypeDefinition`:

```ts
import { defineCardType } from '@daria/shell-panels'

export default defineCardType({
  kind: 'car',                    // уникальный идентификатор
  primitives: [                   // какие сервисы требуются
    'booking',
    'ownership-registry',
    'credentials-vault',
    'payments',
    'escrow-service',
  ],
  instance: {
    view:   () => import('./instance.view'),
    top:    () => import('./panels/top.instance'),
    left:   () => import('./panels/left.instance'),
    right:  () => import('./panels/right.instance'),
    bottom: () => import('./panels/bottom.instance'),
  },
  type: {
    view:   () => import('./type.view'),
    top:    () => import('./panels/top.type'),
    left:   () => import('./panels/left.type'),
    right:  () => import('./panels/right.type'),
    bottom: () => import('./panels/bottom.type'),
  },
  modes: ['consumer', 'provider'],
  link: {
    instanceToType: async (instanceId) => { /* VIN → model */ },
  },
})
```

Отсутствие любой из панелей instance/type — CI-failure (см. инвариант I3).

## Реестр

`_registry.ts` — единственное место импорта card-types. Shell не знает о `packages/card-types/car/`, он знает только `registry.lookup('car')`.

```ts
// packages/card-types/_registry.ts
import personProfile from './person-profile'
import car from './car'
import realEstate from './real-estate'
// ...

export const cardTypeRegistry = {
  'person-profile': personProfile,
  'car': car,
  'real-estate': realEstate,
  // ...
}
```

## Добавление нового card-type

1. Скопировать `_template/` → `<new-name>/`.
2. Реализовать `instance.view` + `type.view` + 8 panel-providers.
3. Описать `primitives: [...]` — какие сервисы нужны.
4. Зарегистрировать в `_registry.ts`.
5. Добавить строку в `docs/architecture-v6/06-card-types-matrix.md`.

Если для нового card-type нужен примитив, которого ещё нет в `services/*` — **это признак, что примитив горизонтальный**, а не vertical. Добавить его в `services/*`, не внутрь card-type.

## Каталог (плановый)

Полный список — в `docs/architecture-v6/06-card-types-matrix.md`. На старте Фазы 3 реализуются минимум 6 card-types для travel-компаунда:

- `person-profile`
- `flight-ticket`
- `hotel-room`
- `taxi-ride`
- `apartment-stay`
- `trip-compound`

Остальные добавляются порционно в Фазах 4–5.
