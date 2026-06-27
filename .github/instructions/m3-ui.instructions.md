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
- Для menu, picker, popover и composer-anchored panel использовать только функциональный текст: поиск, список, статус, действие.
- Не дублировать смысл уже нажатой кнопки заголовками и пояснениями вида `Проект / Проект`, `Поиск / Поиск`, `Список проектов...`, если пользователь и так находится внутри соответствующего меню.
- Если экран уже открыт кнопкой меню, дополнительный explanatory-текст внутри панели запрещён по умолчанию; допустимы только короткие ошибки, пустые состояния и loading-строки.
- Для picker-сценариев поиск и список держать в одном окне: поиск фильтрует уже видимый список, а не скрывает весь выбор до ввода запроса.
- Для project-actions shell первая кнопка слева в composer dock остаётся закреплённой entry/back control: первый tap открывает меню, следующий tap внутри вложенного состояния возвращает на уровень назад, а только на корневом уровне закрывает меню.
- Для admin-сессии project-actions shell начинается не с проекта, а с иерархии `роль → список участников роли → мини-кабинет`; список ролей и список участников открываются в expansion-панели над dock от одной entry/back control.
- В admin-сессии не дублировать эту иерархию persistent chips рядом с entry/back control; нижняя база не должна конкурировать с верхним пошаговым сценарием.
- Внутри admin mini-кабинета первым control сверху идёт chooser закреплённых проектов участника; если проектов нет, показывать плюс и переводить в выбор проекта, а не рендерить текстовую заглушку.
- В не-admin сценариях сразу после entry/back control идёт проектный уровень: пустой выбор проекта трактуется как режим `Все проекты`, а не как отсутствие данных.
- В режиме `Все проекты` overview-кнопки обязаны показывать агрегированные данные по всем доступным проектам; после выбора конкретного проекта panel переключается на локальный проектный контур.
- Subject/entity списки внутри project-actions должны быть сужены до текущей роли чата, если для неё есть релевантный контур в каталоге.

## Запрещено

- ❌ использовать main-app brutalist/glass primitives как базовый UI слой messenger
- ❌ возвращать `VBottomNavigation` вместо текущего custom nav shell
- ❌ раскрашивать экраны разовыми HEX/rgba прямо в компоненте, если это role-based M3 поверхность
- ❌ ломать safe-area, keyboard-resize и dock hierarchy ради декоративного layout-эксперимента
- ❌ добавлять в menu/picker/panel повторяющиеся шапки, описательные абзацы и helper-copy, которые пересказывают очевидное действие уже нажатой кнопки
