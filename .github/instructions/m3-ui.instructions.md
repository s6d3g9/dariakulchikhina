---
applyTo: "messenger/web/**"
---

# Messenger Web — Material 3 / Vuetify rules

Этот файл относится к `messenger/web/**`, а не к основной платформе в `app/**`.

## Реальный стек

- Nuxt 4 client-only shell (`ssr: false`)
- Vuetify 4
- MDI icons
- mobile-first M3 interface

## Базовые правила

- Использовать существующие `Messenger*` components как shared UI primitives.
- Для layout/shell опираться на текущие `MessengerAppShell`, `MessengerChatSection`, `MessengerChatsSection`, `MessengerContactsSection`, `MessengerAgentsSection`, `MessengerSettingsSection`.
- Не переносить сюда main-app `Glass*`, `ent-*`, `cab-*` примитивы.
- Не превращать messenger UI в Tailwind-heavy свободную верстку, если задачу уже покрывает текущий Vuetify + shared component слой.

## Vuetify / component guidance

Предпочитать существующие паттерны:

- `VMain` для верхнего app shell
- `VIcon` с `mdi-*`
- `VBtn`, `VTextField`, `VTextarea`, `VSwitch`, `VList`, `VSheet` там, где это уже соответствует текущему коду
- `MessengerProgressCircular` / `MessengerProgressLinear` для progress/loading affordance
- `MessengerDockField` / `MessengerChatComposerDock` для нижнего dock input/search слоя

Важно:

- bottom nav в messenger кастомная; не возвращать `VBottomNavigation` как дефолтный паттерн
- call overlay, media sheet и detached-call states уже встроены в shell contract

## M3 surface system

Использовать role-based surface palette, а не случайные цвета:

- `surface`
- `surface-container`
- `surface-container-high`
- `surface-container-highest`
- `primary-container`
- `secondary-container`
- `on-surface`
- `on-surface-variant`

Правила:

- акцент и selection должны идти через semantic roles;
- новые цветовые значения добавлять через общие messenger theme/style слои, а не через разовые inline HEX;
- темная и светлая тема должны сохранять читаемость message bubbles, dock, nav и call overlays.

## Motion и interaction

- Анимации должны поддерживать shell transitions, media sheet, call overlay и dock states, а не спорить с ними.
- Не использовать тяжелые shadow/scale эффекты как замену state layers.
- Keyboard-aware поведение и safe-area insets важнее декоративной анимации.

## Контент и тексты

- Интерфейс держать функциональным: названия, статусы, действия, минимум декоративных пояснений.
- Не добавлять marketing copy, onboarding essays и лишние subtitle-блоки, если это не часть явного UX flow.

## Запрещено

- ❌ использовать main-app brutalist/glass primitives как базовый UI слой messenger
- ❌ возвращать `VBottomNavigation` вместо текущего custom nav shell
- ❌ раскрашивать экраны разовыми HEX/rgba прямо в компоненте, если это role-based M3 поверхность
- ❌ ломать safe-area, keyboard-resize и dock hierarchy ради декоративного layout-эксперимента
