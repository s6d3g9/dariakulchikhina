# UI_DESIGN_MODES — режимы дизайна и карта миграции

Документ фиксирует, как в репозитории параллельно развиваются два направления интерфейса.

## Активные режимы

1. brutalist — основной режим
2. liquid-glass — вторичный Apple-style режим

## Правило выбора

- Для новых экранов, новых layout и новых сущностей по умолчанию использовать brutalist.
- Для локальных правок существующих glass-экранов без задачи на редизайн допустим liquid-glass.
- В спорных случаях и при смешанной задаче приоритет всегда у brutalist.
- Один экран должен иметь один главный режим. Смешивать brutalist и liquid-glass в одном и том же UI без специальной цели нельзя.

## Техническая опора в коде

В проекте уже есть базовая поддержка нескольких визуальных концептов через глобальный атрибут `html[data-concept="..."]` в [app/assets/css/main.css](app/assets/css/main.css).

Практическая привязка режимов:

- brutalist → `data-concept="minale"` как основной production mapping и `data-concept="brutal"` как совместимый override-слой
- liquid-glass → `data-concept="glass"` и существующие `.glass-*` примитивы

Это означает, что переход на brutalist можно делать поэтапно: сначала через режим и токены, затем через перестройку архитектуры конкретных экранов.

## Текущее состояние интерфейса

Сейчас кодовая база в основном находится в glass-режиме, даже там, где уже есть зачатки brutalist-темы.

### Явно legacy-heavy зоны

- [app/layouts/admin.vue](app/layouts/admin.vue) — верхний header c search, notifications и внешними action-link, что конфликтует с brutalist-правилом про отсутствие top-nav.
- [app/pages/admin/clients/index.vue](app/pages/admin/clients/index.vue) — модалки через Teleport, кнопки сохранения, документы с `target="_blank"`, cabinet-навигация с иконками.
- [app/pages/admin/projects/[slug].vue](app/pages/admin/projects/[slug].vue) — mobile horizontal nav bar, tab-like navigation, save button в форме проекта, preview-режимы с legacy-паттернами.
- [app/pages/contractor/[id]/index.vue](app/pages/contractor/[id]/index.vue) — glass dashboard, быстрые карточки, inline modal-like task window, иконографика.
- [app/pages/admin/index.vue](app/pages/admin/index.vue) — wizard/modal-pattern и submit-flow создания проекта.
- [app/pages/admin/contractors/index.vue](app/pages/admin/contractors/index.vue), [app/pages/admin/designers/index.vue](app/pages/admin/designers/index.vue), [app/pages/admin/sellers/index.vue](app/pages/admin/sellers/index.vue), [app/pages/admin/managers/index.vue](app/pages/admin/managers/index.vue), [app/pages/admin/documents/index.vue](app/pages/admin/documents/index.vue) — та же glass-модель: modal editing, save buttons, cards.
- [app/components/AdminDocumentsSection.vue](app/components/AdminDocumentsSection.vue), [app/components/AdminClientProfile.vue](app/components/AdminClientProfile.vue), [app/components/AdminPageContent.vue](app/components/AdminPageContent.vue) — прямой submit/save UX вместо auto-save-first.

### Уже есть полезные опоры для brutalist

- [app/assets/css/main.css](app/assets/css/main.css) — уже содержит блок `html[data-concept="brutal"]`.
- `ent-layout`, `ent-sidebar`, `ent-main`, `cab-body`, `cab-sidebar`, `cab-main` уже дают основу для strict left/right split.
- [app/composables/useDesignSystem.ts](app/composables/useDesignSystem.ts) — токены уже допускают zero-radius, zero-shadow и строгую типографику.
- Глобальный admin navigation flow через [app/components/AdminNestedNav.vue](app/components/AdminNestedNav.vue) и [app/composables/useAdminNav.ts](app/composables/useAdminNav.ts) можно использовать как базу для fractal sidebar logic.

## Приоритет миграции

### Волна 1 — shell и навигация

Цель: привести skeleton приложения к brutalist Fractal SPA, не переписывая сразу все формы.

1. [app/layouts/admin.vue](app/layouts/admin.vue)
2. [app/components/AdminNestedNav.vue](app/components/AdminNestedNav.vue)
3. [app/assets/css/main.css](app/assets/css/main.css)

Что менять:

- убрать top-nav мышление из admin shell
- закрепить smart header внутри sidebar
- убрать overlay-поиск и popup-механику из первичного UX
- усилить независимый scroll sidebar/main

### Волна 2 — проектный экран как эталон brutalist

Цель: сделать [app/pages/admin/projects/[slug].vue](app/pages/admin/projects/[slug].vue) главным референсом нового режима.

Что менять:

- убрать mobile horizontal nav
- сделать hero-first правую часть
- привести phase/task navigation к vertical process pipeline
- заменить manual save на auto-save там, где это реально допустимо по данным

### Волна 3 — entity registries

Цель: перевести однотипные сущности на одинаковый brutalist registry pattern.

Первый набор:

1. [app/pages/admin/clients/index.vue](app/pages/admin/clients/index.vue)
2. [app/pages/admin/contractors/index.vue](app/pages/admin/contractors/index.vue)
3. [app/pages/admin/designers/index.vue](app/pages/admin/designers/index.vue)
4. [app/pages/admin/sellers/index.vue](app/pages/admin/sellers/index.vue)

Что менять:

- отказаться от modal CRUD
- перенести действия в sidebar/context-flow
- привести detail-screen к hero + 2x8 grid
- синхронизировать общие секции между сущностями

### Волна 4 — кабинеты и вторичные разделы

1. [app/pages/contractor/[id]/index.vue](app/pages/contractor/[id]/index.vue)
2. [app/components/AdminSellerCabinet.vue](app/components/AdminSellerCabinet.vue)
3. документы, галерея, менеджеры, редактируемые content-sections

## Операционное правило для задач

При каждой UI-задаче нужно явно определить одно из трех состояний:

1. `brutalist-new` — новый экран или новый layout, делаем только brutalist
2. `legacy-maintenance` — чинится существующий экран без редизайна
3. `migration` — существующий экран переводится из liquid-glass в brutalist

Если состояние не указано, считать задачу `brutalist-new`.

## Практический минимум для новых экранов

Новый экран считается соответствующим default-режиму только если:

- нет horizontal tabs и top navbar
- нет modal/dialog/drawer UX
- sidebar navigation-only
- right side hero-first
- форма без manual save button
- интерактивные элементы 44px+
- mobile работает как layer toggle

## Что пока можно не ломать сразу

- существующие glass-классы как технический слой
- legacy-формы с save-кнопками в экранах, которые еще не вошли в миграцию
- старые theme presets в `useDesignSystem`, если они не мешают default brutalist flow

Главная цель ближайших изменений — не удалить liquid-glass, а перевести по умолчанию все новое развитие интерфейса в brutalist.