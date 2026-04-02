# Структура интерфейса

## Scope

- Этот документ описывает прежде всего интерфейсы основной платформы в `app/**`.
- `messenger/web/**` — отдельный standalone продукт с собственным shell и M3/Vuetify контрактом.

## Роли и точки входа

| Контур | Canonical вход | Alias / legacy | Защищённые маршруты | Лейаут / middleware |
|-------------|----------------------|-------------|--------------------|--------------------|
| Дизайнер / admin | `/login?role=admin` | `/admin/login` | `/admin/**`, `/admin/projects/[slug]` | `admin.vue`, `admin.ts`, `admin-project-canonical.ts` |
| Клиент | `/login?role=client` | `/client/login`, `/project/login` | `/client/[slug]`, `/project/[slug]` | `default`, `client.ts` |
| Подрядчик | `/login?role=contractor` | `/contractor/login` | `/contractor/[id]` | `contractor.vue`, `contractor.ts` |
| Standalone chat | `/chat/login` | — | `/chat`, `/chat/register` | отдельный chat shell |

Главная страница `/` — landing с переходами в регистрацию и role-specific входы.

---

## Последовательность открытия

```
/ (index.vue)
├── /login?role=admin        → /admin/**
├── /login?role=client       → /client/[slug]
├── /login?role=contractor   → /contractor/[id]
├── /project/login           → redirect to /login?role=client
├── /admin/login             → redirect to /login?role=admin
└── /chat/login              → standalone chat shell
```

При каждом переходе на защищённый маршрут middleware делает `GET /api/auth/me`
и при ошибке или несовпадении роли редиректит обратно на role-specific login alias.

---

## Алгоритм навигации Admin — по кнопкам

### Utility-bar (фиксированная полоса, правый верхний угол)

```
┌─────────────────────────────────────────────────────────┐
│  [🔍]  [●/○]  [42]  [выйти]                            │ ← adm-util-bar
└─────────────────────────────────────────────────────────┘
```

| Кнопка          | Что происходит                                                                    |
|-----------------|-----------------------------------------------------------------------------------|
| 🔍 (поиск)      | `searchOpen = true` → открывается модал `AdminSearch` (оверлей поверх страницы)   |
| Ctrl+K          | То же — `AdminSearch` открывается / закрывается                                   |
| ●/○ (тема)      | `toggleTheme()` → переключает dark/light, сохраняется через `useThemeToggle`      |
| `42` (бейдж)    | Число из `GET /api/admin/notifications` — только индикатор, не кнопка             |
| выйти           | `POST /api/auth/logout` → `router.push('/admin/login')`                           |

---

### Sidebar — заголовок-переключатель (`AdminSidebarSwitcher`)

Заголовок раздела (например **«проекты»**) — это кнопка `esw-head`:

```
➊ Клик по заголовку раздела (`esw-head`)
    └─► open = !open

    open = false (обычно)          open = true
    ┌─────────────────────┐        ┌──────────────────────┐
    │ [проекты ›]         │  ───►  │ [проекты ›]          │
    │  [🔍 поиск...]      │        │  проекты       ←──── │ active
    │  [список проектов]  │        │  клиенты             │
    │                     │        │  дизайнеры           │
    │                     │        │  подрядчики          │
    │                     │        │  поставщики          │
    │                     │        │  галерея             │
    │                     │        │  документы           │
    └─────────────────────┘        │  настройки           │
                                   └──────────────────────┘

    Заголовок `esw-head` всегда отображает название текущей сущности:
    ┌──────────────────────────────┐
    │ [клиенты ›]                  │  ← при переходе в раздел «клиенты»
    │  [🔍 поиск...]               │  ← поиск всегда виден под заголовком
    │  [список клиентов / карточка]│
    └──────────────────────────────┘

    При переходе в кабинет (карточку) конкретной записи:
    ┌──────────────────────────────┐
    │ [клиенты ›]                  │  ← заголовок сущности сохраняется
    │  [🔍 поиск...]               │  ← поиск остаётся доступен
    │  [← назад к списку]         │
    │  [данные кабинета клиента]   │
    └──────────────────────────────┘

➋ Клик по пункту выпадающего списка (например «клиенты»)
    └─► NuxtLink :to="withCtx('/admin/clients')"
              │
              ├─► open = false (список схлопывается)
              ├─► заголовок `esw-head` обновляется на «клиенты»
              ├─► под заголовком рендерится поле поиска [🔍 поиск...]
              └─► sidebar перерисовывается с контентом нового раздела

➌ Sidebar после перехода — структура на каждом этапе:
    │
    ├─► Список сущностей (например /admin/clients):
    │       ┌──────────────────────────┐
    │       │ [клиенты ›]              │  ← заголовок-переключатель
    │       │  [🔍 поиск...]           │  ← фильтрация по имени / email
    │       │  Иванов И.И.        [→]  │
    │       │  Петрова А.С.       [→]  │
    │       │  Сидоров К.М.       [→]  │
    │       └──────────────────────────┘
    │       └─► Клик по записи → navigateTo('/admin/clients?clientId=<id>')
    │               └─► sidebar переключается в режим кабинета (см. ➍)
    │
    ├─► Кабинет конкретной записи (например ?clientId=42):
    │       ┌──────────────────────────┐
    │       │ [клиенты ›]              │  ← заголовок сущности сохраняется
    │       │  [🔍 поиск...]           │  ← поиск остаётся
    │       │  [← к списку]           │  ← кнопка возврата
    │       │  ────────────            │
    │       │  контакты                │
    │       │  проекты                 │
    │       │  документы               │
    │       └──────────────────────────┘
    │
    ├─► Документы (/admin/documents) — та же логика:
    │       ┌──────────────────────────┐
    │       │ [документы ›]            │  ← заголовок-переключатель
    │       │  [🔍 поиск...]           │  ← фильтрация по названию / типу
    │       │  Договор №12        [→]  │
    │       │  Акт приёмки        [→]  │
    │       │  Смета v2           [→]  │
    │       └──────────────────────────┘
    │       └─► Клик по записи → navigateTo('/admin/documents?documentId=<id>')
    │               └─► sidebar переключается в режим кабинета документа:
    │                   ┌──────────────────────────┐
    │                   │ [документы ›]            │
    │                   │  [🔍 поиск...]           │
    │                   │  [← к списку]           │
    │                   │  ────────────            │
    │                   │  реквизиты               │
    │                   │  версии                  │
    │                   │  связанные проекты       │
    │                   └──────────────────────────┘
    │
    └─► Галерея (/admin/gallery/*) — та же логика:
            ┌──────────────────────────┐
            │ [галерея ›]              │  ← заголовок-переключатель
            │  [🔍 поиск...]           │  ← фильтрация по тегу / названию
            │  интерьеры          [→]  │
            │  мебель             [→]  │
            │  материалы          [→]  │
            │  арт-объекты        [→]  │
            │  мудборды           [→]  │
            └──────────────────────────┘
            └─► Клик по вкладке → navigateTo('/admin/gallery/<slug>')
                    └─► sidebar обновляет содержимое выбранной вкладки:
                        ┌──────────────────────────┐
                        │ [галерея ›]              │
                        │  [🔍 поиск...]           │
                        │  [← ко вкладкам]         │
                        │  ────────────            │
                        │  [список элементов       │
                        │   выбранной категории]   │
                        └──────────────────────────┘

> **Общий принцип:** все разделы sidebar (проекты, клиенты, подрядчики,
> дизайнеры, поставщики, документы, галерея, настройки) используют
> единую логику отображения: заголовок-переключатель `esw-head` →
> поле поиска → список записей → при клике переход в кабинет/карточку
> с кнопкой «← к списку» для возврата.

            └─► Клик «← к списку» → navigateTo('/admin/clients')
                    └─► возврат к полному списку сущностей

➍ Поиск в sidebar — работает на всех этапах:
    │
    ├─► На списке сущностей: фильтрует записи в реальном времени (debounce 300ms)
    │       └─► searchQuery.value → computed filteredItems
    │
    └─► В кабинете записи: поиск переключает обратно на список с применённым фильтром
            └─► ввод текста → navigateTo('/admin/clients?q=<query>')
                    └─► sidebar показывает отфильтрованный список
    └─► NuxtLink :to="withCtx('/admin/clients')"
              │
              ├─► activeProjectSlug задан?
              │       ДА  → navigateTo('/admin/clients?projectSlug=<slug>')
              │       НЕТ → navigateTo('/admin/clients')
              │
              └─► open = false (список схлопывается)
                    └─► заголовок `esw-head` обновляется на «клиенты»
                         └─► sidebar перерисовывается с контентом нового раздела

➌ Переход завершён — новая страница загружена
    └─► Sidebar через <Teleport> рендерит свой контент:
         │
         ├─► /admin/project              → список проектов (карточки + поиск)
         ├─► /admin/clients      → список клиентов (+ кнопки связи, если есть activeProjectSlug)
         ├─► /admin/contractors  → список подрядчиков
         ├─► /admin/designers    → список дизайнеров
         ├─► /admin/sellers      → список поставщиков
         ├─► /admin/gallery/*    → кнопки вкладок галереи
         ├─► /admin/documents    → список документов
         └─► /admin/settings     → список настроек 

➍ Повторный клик по заголовку `esw-head` на любой странице
    └─► open = true → снова показывается полный список разделов
         └─► можно перейти в другой раздел (см. ➋)
```
                        └──────────────────────┘
```

Клик по пункту списка → `NuxtLink :to` → переход + `open = false`.

**Маппинг пунктов списка → маршруты:**

| Пункт       | Переход              |
|-------------|----------------------|
| проекты     | `/admin/project/     |
| клиенты     | `/admin/clients`     |
| дизайнеры   | `/admin/designers`   |
| подрядчики  | `/admin/contractors` |
| поставщики  | `/admin/sellers`     |
| галерея     | `/admin/gallery`     |
| документы   | `/admin/documents`   |
| настройки   | `/admin/settings`    |
| админ.      | `/admin/admin`       |

> Если задан активный проект (`activeProjectSlug`), все переходы делаются через
> `withCtx(path)` — добавляется `?projectSlug=<slug>`, чтобы не терять контекст.

---

### Sidebar — навигация внутри раздела «Проекты»

```
➊ Открыт /admin (список проектов)
   └─► Sidebar: [поиск] + список кнопок проектов
       └─► Клик по проекту → router.push('/admin/projects/<slug>')

➋ Открыт /admin/projects/[slug]
   └─► Sidebar: заголовок "проекты" + фазы-группы + вкладки
       │
       ├─► Клик на название фазы (группы) → группа раскрывается (accordion)
       │
       └─► Клик на вкладку (например «1.2 мудборд»)
               └─► selectAdminPage('moodboard')
                       └─► activeComponent = AdminMoodboard
                               └─► <component :is="activeComponent" /> перерисовывается
```

Переход между вкладками проекта — **без смены URL**, только реактивная замена
компонента (`<Transition name="tab-fade" mode="out-in">`).

---

### Sidebar — навигация в разделе «Галерея»

```
➊ /admin/gallery → редирект на /admin/gallery/interiors (первая вкладка)

➋ Sidebar: кнопки [интерьеры | мебель | материалы | арт-объекты | мудборды]
   └─► Клик → router.push('/admin/gallery/<slug>')
               └─► Nuxt рендерит соответствующую страницу gallery/<slug>.vue
```

---

### Sidebar — навигация в разделе «Клиенты»

```
➊ /admin/clients — sidebar показывает список клиентов
   ├─► Клик на клиента → navigateTo('/admin/clients?clientId=<id>')
   │       └─► страница читает query.clientId → показывает inline-панель клиента
   │
   └─► Клик «показать всех» (если активен фильтр по проекту)
           └─► navigateTo('/admin/clients') — сброс фильтра
```

Аналогично работают `/admin/contractors`, `/admin/designers`, `/admin/sellers` —
через `?contractorId=`, `?designerId=`, `?sellerId=`.

---

### Sidebar — связывание участников с проектом (контекстный режим)

Если открыт проект (`activeProjectSlug` заполнен) и пользователь переходит в
раздел клиентов / подрядчиков / дизайнеров / поставщиков —
кнопки связи появляются рядом с каждой записью:

| Действие                     | API-вызов                                                       |
|------------------------------|-----------------------------------------------------------------|
| Привязать клиента             | `POST /api/clients/<id>/link-project`                          |
| Отвязать клиента              | `POST /api/clients/<id>/unlink-project`                        |
| Привязать подрядчика          | `POST /api/projects/<slug>/contractors`                        |
| Отвязать подрядчика           | `DELETE /api/projects/<slug>/contractors`                      |
| Привязать дизайнера           | `POST /api/projects/<slug>/designers`                          |
| Привязать поставщика          | `POST /api/projects/<slug>/sellers`                            |

После каждого вызова: `refreshProjectData()` + `refreshLinked*()`.

---

### Глобальный поиск `AdminSearch`

```
Открытие: кнопка 🔍 в util-bar  ИЛИ  Ctrl+K
           └─► searchOpen = true → <AdminSearch :open="true" />

Закрытие: @close   ИЛИ  Ctrl+K повторно  ИЛИ  клик вне модала
           └─► searchOpen = false
```

---

### Страница проекта — режим просмотра кабинета подрядчика (`?view=contractor&cid=`)

Никуда не уходим — подрядчик открывается прямо внутри страницы проекта:

```
Клик по подрядчику в layout dropdown (pickContractor)
   │
   ├─► activeProjectSlug задан?
   │       ДА  → navigateTo('/admin/projects/<slug>?view=contractor&cid=<id>')
   │               └─► contractorPreviewMode = true (route.query.view === 'contractor')
   │               └─► contractorPreviewId   = Number(route.query.cid)
   │               └─► <AdminContractorCabinet :contractor-id="contractorPreviewId" />
   │                       (рендерится вместо обычного контента проекта)
   │
   └─► НЕТ  → navigateTo('/admin/contractors#c-<id>')
```

Выход из режима: нет специальной кнопки — переход на другую вкладку проекта
или смена URL сбрасывает `view` из query.

---

### Страница проекта — режим клиентского превью (`?view=client`)

```
URL: /admin/projects/<slug>?view=client
   └─► clientPreviewMode = true (route.query.view === 'client')
   └─► Sidebar показывает страницы клиента (getClientPages())
   └─► Контент рендерится через clientActiveComponent + clientActiveComponentProps
       (компоненты Client*, а не Admin*)
   └─► selectAdminPage(slug) в этом режиме устанавливает clientActivePage, а не activePage
```

---

### Страница проекта — `AdminProjectOverview` и навигация по клику

`AdminProjectOverview` (slug: `overview`) отображается по умолчанию при открытии проекта.
Он эмитит `@navigate(slug)` — например по клику на кнопку фазы:

```
AdminProjectOverview
   └─► emit('navigate', 'moodboard')
           └─► selectAdminPage('moodboard')
                   └─► activePage.value = 'moodboard'
                           └─► activeComponent = AdminMoodboard
```

---

## Алгоритм навигации Client (кабинет клиента)

**URL:** `/project/[slug]` (редирект с `/client/[slug]` → 301)  
**Лейаут:** нет (встроен прямо в страницу)  
**Middleware:** `project.ts`

### Структура страницы

```
┌────────────────────────────────────────────────────────┐
│  cc-mobile-bar  [название проекта] [иконки-вкладки]    │ ← только мобайл
├──────────────┬─────────────────────────────────────────┤
│  cc-sidebar  │           cc-main                       │
│  название    │     <component :is="activeComponent" /> │
│  статус      │                                         │
│  [навигация] │                                         │
│  [выйти]     │                                         │
└──────────────┴─────────────────────────────────────────┘
```

### Кнопки и переходы

| Элемент                          | Действие                                                           |
|----------------------------------|--------------------------------------------------------------------|
| Кнопка вкладки в sidebar         | `setPage(slug)` → `activePage = slug` → смена компонента без URL  |
| Кнопка обзора (◈)                | `setPage('overview')` → `ClientOverview`                          |
| Мобильные иконки-кнопки (верх)   | Те же `setPage()` — дублируют sidebar                             |
| Кнопка «Выйти» в sidebar         | `POST /api/auth/logout` → `router.push('/project/login')`          |
| Ошибка 401 (сессия истекла)       | Показывается кнопка «Войти» → `NuxtLink to="/project/login"`       |
| Ошибка загрузки (другая)          | Кнопка «Повторить» (`refresh()`) + «Выйти» → `/project/login`     |

### Вкладки клиентского кабинета

Навигация (`navPages`) = `getClientPages()` из `shared/constants/pages.ts`.  
Активный компонент определяется по `activePage` — реактивная замена без URL.

---

## Алгоритм навигации Contractor (кабинет подрядчика)

**URL:** `/contractor/[id]`  
**Лейаут:** `contractor.vue`

### Header (`contractor.vue`)

```
┌─────────────────────────────────────────────────────────────┐
│  кабинет подрядчика  [Имя]   [==прогресс==  42%] [темно] [Выйти] │
└─────────────────────────────────────────────────────────────┘
```

| Элемент                   | Действие                                                              |
|---------------------------|-----------------------------------------------------------------------|
| [темно / светло]          | `toggleTheme()` — переключение темы                                  |
| [Выйти]                   | `POST /api/auth/contractor-logout` → `router.push('/contractor/login')` |
| Прогресс-бар              | Отображение % заполненности профиля — не кнопка                      |

### Sidebar кабинета подрядчика (`/contractor/[id]/index.vue`)

Навигация — `section = ref('dashboard')`. Смена раздела: `@click="section = item.key"`.

| key              | Метка                 | Когда показывается          |
|------------------|-----------------------|-----------------------------|
| `dashboard`      | Обзор                 | Всегда (первый)             |
| `tasks`          | Мои задачи            | Всегда (бейдж: кол-во активных) |
| `staff`          | Бригада               | Только если `contractorType === 'company'` |
| `contacts`       | Контактные данные     | Всегда                      |
| `passport`       | Паспортные данные     | Всегда                      |
| `requisites`     | Реквизиты             | Всегда                      |
| `documents`      | Документы             | Бейдж: кол-во документов   |
| `specialization` | Специализации         | Всегда                      |
| `finances`       | Финансы               | Всегда                      |
| `portfolio`      | Портфолио             | Всегда                      |
| `settings`       | Настройки             | Всегда                      |

### Dashboard → быстрые действия

```
section = 'dashboard'
   └─► Кнопка «Заполнить →» (если profilePct < 100)
           └─► section = profileNextSection
               (первый незаполненный раздел из profileFields)

   └─► Кнопки быстрых действий (quickActions)
           └─► @click="section = item.key"  — прямой переход в нужный раздел
```

---

## Раздел Admin (дизайнер)

**Лейаут:** `app/layouts/admin.vue`  
**Структура лейаута:**

```
┌─────────────────────────────────────────────────────┐
│  adm-util-bar  [🔍 Ctrl+K] [тема] [уведомления] [выйти] │
├──────────────┬──────────────────────────────────────┤
│  ent-sidebar │            adm-main                  │
│  (Teleport   │         <slot /> страницы            │
│   portal)    │                                      │
└──────────────┴──────────────────────────────────────┘
```

Sidebar рендерится через `<Teleport to="#admin-sidebar-portal">` внутри каждой страницы.  
Глобальный поиск — компонент `AdminSearch`, открывается по Ctrl+K.

### Навигация Admin (верхние табы)

| Раздел       | URL                     | Sidebar-компонент       |
|--------------|-------------------------|-------------------------|
| Проекты      | `/admin` + `/admin/projects/[slug]` | `AdminSidebarSwitcher title="проекты"` — список проектов |
| Клиенты      | `/admin/clients`        | `AdminSidebarSwitcher title="клиенты"` — список клиентов |
| Подрядчики   | `/admin/contractors`    | `AdminSidebarSwitcher title="подрядчики"` |
| Дизайнеры    | `/admin/designers`      | `AdminSidebarSwitcher title="дизайнеры"` |
| Продавцы     | `/admin/sellers`        | `AdminSidebarSwitcher title="продавцы"` |
| Галерея      | `/admin/gallery/...`    | `AdminSidebarSwitcher title="галерея"` — 5 вкладок |
| Документы    | `/admin/documents`      | — |
| Страницы     | `/admin/pages`          | — |
| Настройки    | `/admin/settings`       | — |

### Страница проекта `/admin/projects/[slug]`

Контент переключается через `<component :is="activeComponent" />`.  
Активный компонент определяется по `slug` выбранной вкладки.

#### Фазы проекта и вкладки

**Фаза 0 — Инициация** (`lead`)

| slug              | Заголовок             | Компонент              |
|-------------------|-----------------------|------------------------|
| `first_contact`   | 0.1 первичный контакт | `AdminFirstContact`    |
| `self_profile`    | 0.2 брифинг           | `AdminSmartBrief`      |
| `site_survey`     | 0.3 обмеры / аудит    | `AdminSiteSurvey`      |
| `tor_contract`    | 0.4 ТЗ и договор      | `AdminToRContract`     |
| `extra_services`  | 0.5 доп. услуги       | `AdminExtraServices`   |

**Фаза 1 — Эскиз** (`concept`)

| slug                | Заголовок           | Компонент               |
|---------------------|---------------------|-------------------------|
| `space_planning`    | 1.1 планировки      | `AdminSpacePlanning`    |
| `moodboard`         | 1.2 мудборд         | `AdminMoodboard`        |
| `concept_approval`  | 1.3 согласование    | `AdminConceptApproval`  |

**Фаза 2 — Рабочий проект** (`working_project`)

| slug                  | Заголовок             | Компонент                  |
|-----------------------|-----------------------|----------------------------|
| `working_drawings`    | 2.1 рабочие чертежи   | `AdminWorkingDrawings`     |
| `specifications`      | 2.2 спецификации      | `AdminSpecifications`      |
| `mep_integration`     | 2.3 инженерия         | `AdminMepIntegration`      |
| `design_album_final`  | 2.4 финальный альбом  | `AdminDesignAlbumFinal`    |

**Фаза 3 — Комплектация** (`procurement`)

| slug                  | Заголовок           | Компонент                  |
|-----------------------|---------------------|----------------------------|
| `procurement_list`    | 3.1 список закупок  | `AdminProcurementList`     |
| `suppliers`           | 3.2 поставщики      | `AdminSuppliers`           |
| `procurement_status`  | 3.3 статус закупок  | `AdminProcurementStatus`   |

**Фаза 4 — Строительство** (`construction`)

| slug                | Заголовок           | Компонент                |
|---------------------|---------------------|--------------------------|
| `construction_plan` | 4.1 план работ      | `AdminConstructionPlan`  |
| `work_status`       | 4.2 ход работ       | `AdminWorkStatus`        |
| `work_log`          | 4.3 журнал работ    | `AdminWorkLog`           |
| `site_photos`       | 4.4 фото объекта    | `AdminSitePhotos`        |

**Фаза 5 — Сдача** (`commissioning`)

| slug                | Заголовок               | Компонент               |
|---------------------|-------------------------|-------------------------|
| `punch_list`        | 5.1 дефектная ведомость | `AdminPunchList`        |
| `commissioning_act` | 5.2 акт приёмки         | `AdminCommissioningAct` |
| `client_sign_off`   | 5.3 подпись клиента     | `AdminClientSignOff`    |

Дополнительно на странице проекта отдельный таб — **обзор** (`AdminProjectOverview`, slug: `overview`).  
Клиентский профиль — **preview** (`AdminClientProfile`), открывается через `clientActiveComponent`.

### Галерея `/admin/gallery/[tab]`

| Вкладка    | URL                          | Компонент (страница)      |
|------------|------------------------------|---------------------------|
| интерьеры  | `/admin/gallery/interiors`   | `gallery/interiors.vue`   |
| мебель     | `/admin/gallery/furniture`   | `gallery/furniture.vue`   |
| материалы  | `/admin/gallery/materials`   | `gallery/materials.vue`   |
| арт-объекты| `/admin/gallery/art`         | `gallery/art.vue`         |
| мудборды   | `/admin/gallery/moodboards`  | `gallery/moodboards.vue`  |

---

## Раздел Client (клиент)

**URL:** `/client/[slug]`  
**Лейаут:** `app/layouts/default.vue`

Клиент видит только страницы с `clientVisible !== false` из `PROJECT_PAGES`.

| slug               | Заголовок             | Компонент                  |
|--------------------|-----------------------|----------------------------|
| `work_progress`    | ход работ             | `ClientWorkProgress`       |
| `design_timeline`  | таймлайн              | `ClientTimeline`           |
| `design_album`     | альбом                | `ClientDesignAlbum`        |
| `materials`        | материалы             | `ClientMaterials`*         |
| `contracts`        | документы             | `ClientContracts`          |
| `client_contacts`  | контактные данные     | `ClientContactDetails`     |
| `client_brief`     | бриф                  | `ClientBrief`              |
| `client_passport`  | паспортные данные     | `ClientPassport`           |
| `client_tz`        | техническое задание   | `ClientTZ`                 |
| `extra_services`   | доп. услуги           | `ClientExtraServices`      |

Обзор проекта — `ClientOverview` (overview, всегда первое).  
Профиль клиента — `ClientSelfProfile`.

---

## Раздел Contractor (подрядчик)

**URL:** `/contractor/[id]`  
**Лейаут:** `app/layouts/contractor.vue`  
**Компонент:** `AdminContractorCabinet` (переиспользуется из admin)

---

## Файлы по зонам

```
app/
├── pages/
│   ├── index.vue                      ← лендинг (/)
│   ├── admin/
│   │   ├── login.vue                  ← вход дизайнера
│   │   ├── index.vue                  ← список проектов
│   │   ├── projects/[slug].vue        ← страница проекта
│   │   ├── clients/index.vue          ← клиенты
│   │   ├── contractors/index.vue      ← подрядчики
│   │   ├── designers/index.vue        ← дизайнеры
│   │   ├── sellers/index.vue          ← продавцы
│   │   ├── gallery/[interiors|furniture|materials|art|moodboards].vue
│   │   ├── documents/index.vue        ← документы
│   │   ├── pages/index.vue            ← контент страниц сайта
│   │   └── settings/index.vue        ← настройки
│   ├── client/
│   │   ├── login.vue
│   │   └── [slug]/index.vue
│   ├── contractor/
│   │   ├── login.vue
│   │   └── [id]/index.vue
│   ├── project/
│   │   ├── login.vue
│   │   └── [slug]/index.vue
│   ├── document/
│   │   ├── index.vue                 ← список документов
│   │   └── [id]/index.vue            ← просмотр документа
│   ├── seller/
│   │   ├── login.vue
│   │   └── [id]/index.vue            ← кабинет продавца
│   ├── gallery/
│   │   ├── index.vue                 ← главная галереи
│   │   ├── interiors.vue             ← интерьеры
│   │   ├── furniture.vue             ← мебель
│   │   ├── materials.vue             ← материалы
│   │   ├── art.vue                   ← арт-объекты
│   │   └── moodboards.vue            ← мудборды
│   ├── admin/
│   │   ├── login.vue                 ← alias → /login?role=admin
│   │   └── index.vue                 ← панель администратора
│   ├── chat/                         ← встроенный standalone chat shell
│   ├── client/                       ← клиентский кабинет
│   ├── contractor/                   ← кабинет подрядчика
│   ├── project/                      ← alias client/project-view
│   ├── login.vue                     ← unified auth по role query
│   ├── register.vue                  ← unified register
│   └── recover.vue                   ← unified recovery
├── layouts/
│   ├── admin.vue       ← sidebar + util-bar + search
│   ├── contractor.vue  ← упрощённый лейаут подрядчика
│   └── default.vue     ← клиентский / login-страницы
├── middleware/
│   ├── admin-project-canonical.ts ← canonical project view
│   ├── admin.ts        ← role === 'admin' | 'designer'
│   ├── client.ts       ← role === 'client' | 'designer' | 'admin'
│   ├── contractor.ts   ← role === 'contractor' | 'designer' | 'admin'
└── components/
    ├── Admin*.vue      ← компоненты для роли дизайнера
    ├── Client*.vue     ← компоненты для роли клиента
    ├── Gallery*.vue    ← lightbox, masonry, фильтры
    ├── UI*.vue         ← дизайн-система (тема, панель)
    └── App*.vue        ← общие UI-компоненты (input, datepicker)
```

---

## Навигационные константы

Источник истины — `shared/constants/pages.ts`:

- `PROJECT_PAGES` — полный массив всех вкладок проекта с `slug`, `title`, `phase`, `clientVisible`, `adminVisible`
- `getAdminPages()` — фильтр по `adminVisible !== false`
- `getClientPages()` — фильтр по `clientVisible !== false`
- `getAdminNavGroups()` — сгруппированы по фазам для sidebar
- `PHASE_LABELS` — человекочитаемые названия фаз
- `CORE_PAGES` — набор вкладок, создаваемых при новом проекте
