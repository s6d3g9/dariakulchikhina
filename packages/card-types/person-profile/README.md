# packages/card-types/person-profile

Первый и эталонный card-type v6. Используется как reference для fractal-harness — любой новый card-type структурно сверяется с этим.

## Что моделирует

Человека. Самая универсальная сущность платформы: любой user имеет person-profile. Provider (фрилансер, компания) — то же самое, с mode=`provider`. Публичная персона (артист, учитель) — тот же card-type, богатый type-view.

## Два вида

### Instance-view (профиль конкретного человека)

- HEADER: avatar, имя, верификации (badges), ⇄, ModeToggle
- TIMELINE: активности на платформе (последние events, milestones)
- SUMMARY: роли, локация, языки, доступность
- ACTIONS:
  - На своём профиле: edit, share, settings
  - На чужом: message, follow, subscribe, tip, block / report
- SECTIONS:
  - Shop (что человек продаёт — templates, subscriptions, services)
  - Templates (опубликованные)
  - Reviews / rating
  - Communities
  - Shared Pattern-Cards (где есть common entity-thread)
- FOOTER: joined-date, version

### Type-view (роль / публичная личность)

- HEADER: role-title, brand-skin (если есть), ⇄
- TIMELINE: релиз-лента публичной роли (новые курсы, выступления, контент)
- SUMMARY: краткое описание роли, категория, язык
- ACTIONS: subscribe to role, browse shop, contact rep
- SECTIONS:
  - Shop категории
  - Коллеги / со-авторы
  - Коммьюнити
  - Официальные каналы + fan-created

## 8 panel-providers

### Instance

| Panel | Content |
|---|---|
| `top.instance` | Stories / галерея пользователя |
| `left.instance` | Его shop (templates + subscriptions) |
| `right.instance` | Чаты с ним (entity-thread kind=dm если это другой) |
| `bottom.instance` | Его twitter-like feed |

### Type

| Panel | Content |
|---|---|
| `top.type` | Официальные + fan-content каналы |
| `left.type` | Magazine shop роли / мерч / курсы |
| `right.type` | Communities этой роли |
| `bottom.type` | Обсуждение роли, новости |

## Примитивы

```
primitives: [
  'booking',
  'reviews',
  'messenger',
]
```

## Schema contract

- `schema.data.json` — canonical JSON fixture для fractal-harness.
- `schemas.ts` — тот же контракт как typed TS-константа `personProfileSchema`.
- `index.ts` — `CardTypeDefinition`, где `view/top/left/right/bottom` лениво возвращают `{ schema, slot, view }`.

## Timeline

```ts
export default defineTimeline({
  kind: 'person-profile',
  steps: [
    { id: 'registered',  kind: 'auto', title: 'Registered' },
    { id: 'verified',    kind: 'gate', title: 'Email verified',
                         gate: { require: 'user.emailVerified' } },
    { id: 'onboarded',   kind: 'human', title: 'Onboarding complete' },
    { id: 'active',      kind: 'auto',  title: 'Active' },
  ],
  completion: { on: 'account-closed' },
})
```

Person-profile timeline тривиален, но существует — инвариант I21.

## Entity provider

```ts
export const entityProvider: EntityProvider<'person-profile'> = {
  kind: 'person-profile',
  async resolveInstance(id) { return api.users.get(id) },
  async resolveType(roleId) { return api.roles.get(roleId) },  // optional
  async linkInstanceToType(id) { return api.users.primaryRole(id) },
}
```

## Status

Schema-driven baseline. Проверяется через `packages/testing/fractal-harness/harness.mjs`.

## Почему именно person-profile первый

- Без него shell не показывает пользователя в любых right-panel (messenger, profile-switch).
- Без него нет «я» в switcher.
- Без него нет других card-types с owner-полем.
- Минимальный набор primitives.
- Максимальная ценность для демонстрации инверсии и panel-resolver'а.
