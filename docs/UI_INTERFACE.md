# Структура интерфейса — полная спецификация

> Источник: анализ кодовой базы (`app/`, `shared/`, `server/`).  
> Все пути, компоненты, slug-и и API-вызовы проверены по исходникам.

---

## 1. Роли и точки входа

| Роль        | URL входа            | Лейаут           | Middleware         | Проверка роли при `GET /api/auth/me`       |
|-------------|----------------------|------------------|--------------------|-------------------------------------------|
| Дизайнер    | `/admin/login`       | `default`        | `admin.ts`         | `role === 'designer'`                     |
| Клиент      | `/project/login`     | `default`        | `project.ts`       | `role === 'client' \| 'designer' \| 'admin'` |
| Подрядчик   | `/contractor/login`  | `default`        | `contractor.ts`    | `role === 'contractor' \| 'designer' \| 'admin'` |

**Лендинг** (`/`, `index.vue`) — три кнопки входа: клиент → `/project/login`, подрядчик → `/contractor/login`, дизайнер → `/admin/login`.

### Последовательность аутентификации

```
Пользователь → /login (по роли)
   │
   ├─► Ввод пароля → POST /api/auth/login (или /contractor-login, /project-login)
   │       └─► Успех: cookie сессия → redirect на кабинет
   │       └─► Ошибка: сообщение в форме
   │
   └─► При каждом переходе на защищённый маршрут:
           middleware → GET /api/auth/me
           └─► 401 или роль не совпадает → redirect на /login
```

---

## 2. Дизайн-система

### 2.1 Архитектура токенов

Вся визуальная часть приложения управляется CSS-переменными (custom properties).  
Источник: `app/composables/useDesignSystem.ts` → функция `applyToDOM()` записывает
100+ токенов на `document.documentElement.style`.

| Категория              | Примеры токенов                                                  |
|------------------------|------------------------------------------------------------------|
| **Типографика**        | `--ds-font-family`, `--ds-font-size`, `--ds-font-weight`, `--ds-heading-weight`, `--ds-letter-spacing`, `--ds-line-height` |
| **Типовая шкала**      | `--ds-type-scale` (модульный множитель 1.25), `--ds-text-xs`…`--ds-text-3xl` |
| **Цвета**              | `--ds-accent` (HSL), `--ds-success`, `--ds-error`, `--ds-warning` + light/dark варианты |
| **Фазы проекта**       | `--phase-violet`, `--phase-blue`, `--phase-amber`, `--phase-orange`, `--phase-green`, `--phase-teal` |
| **Glass morphism**     | `--glass-bg`, `--glass-text`, `--glass-border`, `--glass-blur`, `--glass-bg-alpha`, `--glass-saturation` |
| **Тени**               | `--ds-shadow`, `--ds-shadow-sm`, `--ds-shadow-lg` + отдельные `y/blur/spread/alpha` |
| **Скругления**         | `--card-radius`, `--input-radius`, `--chip-radius`, `--modal-radius`, `--btn-radius` |
| **Отступы**            | `--ds-spacing` (множитель), `--ds-spacing-unit` (базовый шаг 4px) |
| **Анимации**           | `--ds-anim-duration` (180ms), `--ds-anim-easing` (ease) |
| **Сетка**              | `--ds-container-width` (1140px), `--ds-sidebar-width` (260px), `--ds-grid-gap` (16px), `--ds-grid-columns` (12) |
| **Кнопки**             | `--btn-bg`, `--btn-color`, `--btn-border`, `--btn-radius`, `--btn-py`, `--btn-px`, `--btn-font-size`, `--btn-transform`, `--btn-tracking` |
| **Инпуты**             | `--input-font-size`, `--input-radius`, `--input-padding-h/v` |
| **Навигация**          | `--nav-item-padding-h/v` |
| **Dropdown/popup**     | `--dropdown-bg`, `--dropdown-border`, `--dropdown-shadow` |
| **Статус-пиллы**       | `--status-pill-radius` |
| **Архитектурные**      | `--ds-density`, `--ds-heading-case`, `--ds-section-style`, `--ds-nav-style`, `--ds-card-chrome`, `--ds-page-enter`, `--ds-link-anim`, `--ds-content-reveal` |

### 2.2 Glass morphism

Базовый визуальный паттерн — полупрозрачные «стеклянные» поверхности.

| CSS-класс         | Назначение                                           |
|--------------------|------------------------------------------------------|
| `.glass-surface`   | Крупные панели (sidebar, основной контент)           |
| `.glass-card`      | Карточки с `backdrop-filter: blur()`                |
| `.glass-chip`      | Маленькие метки / теги                              |
| `.glass-input`     | Поля ввода с прозрачным фоном                       |

Все получают `border-radius: var(--card-radius)` и стилизуются через `--glass-*` токены.  
В тёмном режиме (`html.dark`): инвертированные цвета, `--glass-bg → #000`, `--glass-text → #fff`.

### 2.3 Цветовые темы (5 штук)

Источник: `app/composables/useUITheme.ts`

| Тема         | `id`        | Цвет-образец | Описание              |
|--------------|-------------|:------------:|-----------------------|
| Облако       | `cloud`     | `#f4f4f2`    | Нейтральный, лёгкий  |
| Лён          | `linen`     | `#ede8de`    | Тёплый, бежевый      |
| Камень       | `stone`     | `#e8e5e0`    | Приглушённый, серый   |
| Туман        | `fog`       | `#eeeef0`    | Холодный, голубоватый |
| Пергамент    | `parchment` | `#f2ece1`    | Бумажный, тёплый      |

Каждая тема содержит набор `vars` (light) и `darkVars` (dark) — переопределяет `--glass-*`, `--btn-*`, `--dropdown-*` для соответствующего настроения.

**Персистентность:**
- Тема: `localStorage['ui-theme']` → атрибут `data-theme` на `<html>`
- Токены дизайн-системы: `localStorage['design-tokens']`
- Плагин `ui-theme.client.ts` применяет сохранённые токены **до первого paint** (антимерцание)

### 2.4 Тёмный режим

| Механизм                             | Файл / Код                                    |
|---------------------------------------|-----------------------------------------------|
| Переключатель                         | `useThemeToggle()` → `toggleTheme()`          |
| Класс                                 | `html.dark` (+ `body.dark-theme` для sync)    |
| CSS                                   | `html.dark { --glass-bg: #000; --glass-text: #fff; … }` |
| Синхронизация (MutationObserver)      | `app/plugins/dark-sync.client.ts`             |
| Вычисляемые поверхности               | `--ds-dark-surface-bg`, `--ds-dark-page-bg` — через `color-mix()` с `--ds-dark-elevation` и `--ds-dark-saturation` |
| `color-scheme`                        | `meta[name="color-scheme"]` обновляется при переключении |

### 2.5 Статусы работ (Work Status)

Унифицированные CSS-токены для отображения статусов:

| Статус       | Класс                | Цвет-токен                  | Фон-токен                   |
|--------------|----------------------|-----------------------------|------------------------------|
| Ожидает      | `.ws-status--pending`   | `--ws-color-pending` (55% text) | `--ws-bg-pending` (8% text) |
| Запланирован | `.ws-status--planned`   | `--ds-accent`               | 12% accent                  |
| В работе     | `.ws-status--progress`  | `--ds-warning`              | 14% warning                 |
| Готово       | `.ws-status--done`      | `--ds-success`              | 11% success                 |
| Пауза        | `.ws-status--paused`    | accent + violet             | 10% accent                  |
| Отменён      | `.ws-status--cancelled` | `--ds-error`                | 12% error                   |
| Пропущен     | `.ws-status--skipped`   | 25% text                    | 5% text                     |

Точки-индикаторы: `[class*="-dot--gray"]`, `[class*="-dot--blue"]`, `[class*="-dot--green"]` и т.д.

---

## 3. Адаптивность (Responsive)

### 3.1 Брейкпоинты

| Точка      | Медиа-запрос           | Что адаптируется                                    |
|------------|------------------------|-----------------------------------------------------|
| **980px**  | `max-width: 980px`     | `cab-body` → vertical, `cab-sidebar` → horizontal scroll |
| **768px**  | `max-width: 768px`     | `ent-sidebar` → горизонтальная, sidebar → 100% ширины, `ent-page-skeleton` → column |
| **600px**  | `max-width: 600px`     | Адаптация контент-сеток                             |
| **480px**  | `max-width: 480px`     | `dash-stats` → 1 колонка, документы → вертикально   |
| **400px**  | `max-width: 400px`     | Минимальная ширина — упрощённый вид                 |

### 3.2 Адаптивные паттерны

| Паттерн                  | Desktop                           | Mobile (≤ 768–980px)                     |
|--------------------------|-----------------------------------|------------------------------------------|
| Sidebar + Main           | Горизонтальный split              | Вертикальный stack, sidebar → tab-strip  |
| `cab-nav`                | Вертикальный список               | Горизонтальный scroll (pill-кнопки)      |
| `ent-page-skeleton`      | Sidebar (210px) + Main            | Column, sidebar → row scroll             |
| Навигация `.std-nav`     | Вертикальный список               | Горизонтальные pills с scroll            |
| Модальные окна           | Фиксированная ширина              | Полноэкранные                            |

---

## 4. UI-состояния

### 4.1 Загрузка (Skeleton)

| Класс / Компонент       | Где применяется                         | Визуал                                    |
|--------------------------|----------------------------------------|-------------------------------------------|
| `.ent-page-skeleton`     | Полная страница при загрузке           | Sidebar (210px) + Main с линиями-скелетонами |
| `.ent-nav-skeleton`      | Элементы sidebar-навигации             | Прямоугольники 36px, пульсация            |
| `.ent-content-loading`   | Контентная область                     | 5 линий с `ent-pulse` (1.2s infinite)     |
| `.ent-skeleton-line`     | Отдельные строки                       | Разная ширина (55%-80%), stagger delay    |

Анимация: `@keyframes ent-pulse` — opacity 0.4 ↔ 0.15, цикл 1.2 с.

### 4.2 Пустое состояние

| Класс                | Визуал                                        |
|----------------------|-----------------------------------------------|
| `.ent-nav-empty`     | Центрированный текст, opacity 0.3, мелкий шрифт |
| `.cab-empty`         | Сообщение об отсутствии данных в кабинете      |

### 4.3 Переходы между вкладками

| Transition              | Вход                                     | Выход                                    |
|-------------------------|------------------------------------------|------------------------------------------|
| `tab-fade` (основной)  | opacity 0→1, translateY(8px→0), 220ms    | opacity 1→0, translateY(0→-4px), 140ms   |
| `esw-fade`              | Аналогичный для sidebar-переключателя    | —                                        |

Easing: `cubic-bezier(.4, 0, .2, 1)` (Material Design standard).

### 4.4 Ошибки

Клиентский кабинет (`/project/[slug]/index.vue`):
- **401** — показывается кнопка «Войти» → `/project/login`
- **Другая ошибка** — кнопка «Повторить» (`refresh()`) + «Выйти»
- **Нет данных** — текст предупреждения

---

## 5. Admin — навигация дизайнера

### 5.1 Layout (лейаут)

**Файл:** `app/layouts/admin.vue`

```
┌──────────────────────────────────────────────────────────┐
│  adm-util-bar   [🔍 Ctrl+K]  [●/○]  [42]  [выйти]      │
├──────────────┬───────────────────────────────────────────┤
│  ent-sidebar │              adm-main                     │
│  (Teleport   │           <slot /> (страницы)             │
│   portal)    │                                           │
└──────────────┴───────────────────────────────────────────┘
```

Sidebar рендерится через `<Teleport to="#admin-sidebar-portal">` — **каждая страница** сама решает, что показывать в sidebar.

### 5.2 Utility-bar

| Кнопка / элемент        | Действие                                                           |
|--------------------------|---------------------------------------------------------------------|
| 🔍 (или `Ctrl+K`)       | `searchOpen = true` → модал `AdminSearch` поверх страницы          |
| ●/○ (тема)              | `toggleTheme()` — переключает dark / light                        |
| Число (бейдж)            | `GET /api/admin/notifications` — только индикатор, не кликабельно  |
| Выйти                    | `POST /api/auth/logout` → `router.push('/admin/login')`           |

### 5.3 Sidebar-переключатель (`AdminSidebarSwitcher`)

Заголовок раздела — кнопка `.esw-head`, по клику показывает выпадающий список всех разделов.

```
➊ Клик по заголовку
    └─► open = !open → показать / скрыть список

➋ Клик по пункту списка (например «клиенты»)
    └─► navigateTo(withCtx('/admin/clients'))
        ├─► activeProjectSlug? → добавить ?projectSlug=<slug>
        └─► open = false → список схлопывается → заголовок обновляется
```

**Маппинг пунктов → маршрутов:**

| Пункт         | Маршрут                |
|---------------|------------------------|
| проекты       | `/admin`               |
| клиенты       | `/admin/clients`       |
| дизайнеры     | `/admin/designers`     |
| подрядчики    | `/admin/contractors`   |
| поставщики    | `/admin/sellers`       |
| галерея       | `/admin/gallery`       |
| документы     | `/admin/documents`     |
| настройки     | `/admin/settings`      |

> При активном проекте (`activeProjectSlug`) все переходы через `withCtx()` — добавляется query-параметр `?projectSlug=`, чтобы не терять контекст.

### 5.4 Глобальный поиск (`AdminSearch`)

- Открытие: 🔍 в util-bar **или** `Ctrl+K`
- Закрытие: `@close` / повторный `Ctrl+K` / клик вне модала

### 5.5 Связывание участников с проектом

Когда `activeProjectSlug` задан и пользователь в разделе клиентов / подрядчиков / дизайнеров / поставщиков — в sidebar появляются кнопки link/unlink:

| Действие                  | API                                              |
|---------------------------|--------------------------------------------------|
| Привязать клиента          | `POST /api/clients/<id>/link-project`           |
| Отвязать клиента           | `POST /api/clients/<id>/unlink-project`         |
| Привязать подрядчика       | `POST /api/projects/<slug>/contractors`         |
| Отвязать подрядчика        | `DELETE /api/projects/<slug>/contractors`        |
| Привязать дизайнера        | `POST /api/projects/<slug>/designers`           |
| Привязать поставщика       | `POST /api/projects/<slug>/sellers`             |

После каждого — `refreshProjectData()` + `refreshLinked*()`.

---

## 6. Admin — разделы и подстраницы

### 6.1 Проекты (`/admin` → `/admin/projects/[slug]`)

**Список:** `/admin/index.vue` — sidebar с поиском + карточки проектов.  
**Клик по проекту** → `router.push('/admin/projects/<slug>')`.

**Страница проекта** (`/admin/projects/[slug].vue`):
- Sidebar: фазы-аккордеон + вкладки-chip внутри каждой фазы
- Контент: `<component :is="activeComponent" />` + `<Transition name="tab-fade">`
- Переход между вкладками — **без смены URL**, только реактивная замена компонента

#### Фазы и вкладки проекта

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

Дополнительно: **обзор** (`AdminProjectOverview`, slug: `overview`) — по умолчанию.  
`AdminProjectOverview` эмитит `@navigate(slug)` → `selectAdminPage(slug)` → переключение вкладки.

#### Режимы просмотра проекта

| Режим               | URL query                          | Контент                                         |
|----------------------|------------------------------------|--------------------------------------------------|
| Администратор        | (без query)                       | `activeComponent` из Admin*-компонентов          |
| Клиентский превью    | `?view=client`                    | `clientActiveComponent` из Client*-компонентов + sidebar с `getClientPages()` |
| Подрядчик-превью     | `?view=contractor&cid=<id>`       | `AdminContractorCabinet :contractor-id="cid"`    |

### 6.2 Клиенты (`/admin/clients`)

Паттерн **список → детали**:
- Sidebar: список клиентов (фильтр по `?projectSlug=` если задан)
- Клик по клиенту → `?clientId=<id>` → inline-панель справа
- Внутренние вкладки клиента: `getClientPages()` + `overview` + `self_profile`
- `entityDeselectSignal` — сброс выбранного клиента

### 6.3 Подрядчики (`/admin/contractors`)

Паттерн **список → детали** (аналогично клиентам):
- Sidebar: список подрядчиков → `?contractorId=<id>`
- 11 секций: dashboard, tasks, staff (только `company`), contacts, passport, requisites, documents, specialization, finances, portfolio, settings
- Иерархия: компании → мастера (`parentCompanyId`)

### 6.4 Дизайнеры (`/admin/designers`)

Sidebar: список дизайнеров → `?designerId=<id>`

| Секция       | Описание                        |
|--------------|---------------------------------|
| dashboard    | Обзор, быстрые действия        |
| services     | Предоставляемые услуги          |
| packages     | Пакеты услуг                    |
| subscriptions| Подписки                        |
| documents    | Документы дизайнера             |
| projects     | Привязанные проекты             |
| profile      | Профиль и фото                  |

### 6.5 Поставщики (`/admin/sellers`)

Sidebar: список поставщиков → `?sellerId=<id>`

| Секция       | Описание                        |
|--------------|---------------------------------|
| dashboard    | Обзор                           |
| profile      | Профиль и контакты              |
| requisites   | Реквизиты                       |
| terms        | Условия сотрудничества          |
| projects     | Привязанные проекты             |

### 6.6 Галерея (`/admin/gallery/[tab]`)

Sidebar: 5 кнопок-вкладок. Клик → `router.push('/admin/gallery/<tab>')`.

| Вкладка      | URL                           | Файл-страница          |
|--------------|-------------------------------|------------------------|
| интерьеры    | `/admin/gallery/interiors`    | `gallery/interiors.vue`|
| мебель       | `/admin/gallery/furniture`    | `gallery/furniture.vue`|
| материалы    | `/admin/gallery/materials`    | `gallery/materials.vue`|
| арт-объекты  | `/admin/gallery/art`          | `gallery/art.vue`      |
| мудборды     | `/admin/gallery/moodboards`   | `gallery/moodboards.vue`|

`/admin/gallery` (index) → redirect на `/admin/gallery/interiors`.

### 6.7 Документы (`/admin/documents`)

Двухпанельный layout: категории слева, список + редактор справа.

15 категорий:
`contracts`, `acts`, `invoices`, `specifications`, `estimates`, `briefs`,
`technical`, `legal`, `correspondence`, `reports`, `photos`, `plans`,
`certificates`, `warranties`, `other`

- `activeCategory` → фильтр по категории
- `activeDoc` → выбранный документ → `AdminDocumentEditor` inline

### 6.8 Страницы (`/admin/pages`)

CRUD для `page-configs` — inline-редактирование без sidebar-навигации.  
Работа непосредственно в таблице: создание, редактирование, удаление.

### 6.9 Настройки (`/admin/settings`)

4 секции (таб-переключение):

| Секция | Описание                                |
|--------|-----------------------------------------|
| users  | Управление пользователями               |
| roles  | Роли и права доступа                    |
| danger | Опасные операции (сброс данных и т.п.)  |
| log    | Журнал действий                         |

---

## 7. Client — кабинет клиента

**URL:** `/project/[slug]` (есть redirect `/client/[slug]` → 301)  
**Middleware:** `project.ts`

### 7.1 Структура страницы

```
┌──────────────────────────────────────────────────────────┐
│  cc-mobile-bar  [название проекта] [иконки-вкладки]      │ ← только mobile
├──────────────┬───────────────────────────────────────────┤
│  cc-sidebar  │                cc-main                    │
│  название    │     <component :is="activeComponent" />   │
│  статус      │                                           │
│  [навигация] │                                           │
│  [выйти]     │                                           │
└──────────────┴───────────────────────────────────────────┘
```

### 7.2 Навигация

Вкладки (`navPages`) = `getClientPages()` из `shared/constants/pages.ts`.  
Переход: `setPage(slug)` → реактивная замена компонента (без смены URL).

| Элемент                        | Действие                                                     |
|--------------------------------|--------------------------------------------------------------|
| Кнопка в sidebar               | `setPage(slug)` → `activePage = slug` → смена компонента    |
| Обзор (◈)                      | `setPage('overview')` → `ClientOverview`                    |
| Мобильные иконки (верхняя полоса)| Дублируют sidebar → `setPage(slug)`                        |
| Выйти                          | `POST /api/auth/logout` → `/project/login`                  |

### 7.3 Вкладки клиентского кабинета

| slug               | Заголовок             | Компонент                  |
|--------------------|-----------------------|----------------------------|
| `overview`         | обзор                 | `ClientOverview`           |
| `work_progress`    | ход работ             | `ClientWorkProgress`       |
| `design_timeline`  | таймлайн              | `ClientTimeline`           |
| `design_album`     | альбом                | `ClientDesignAlbum`        |
| `materials`        | материалы             | `ClientMaterials`          |
| `contracts`        | документы             | `ClientContracts`          |
| `client_contacts`  | контактные данные     | `ClientContactDetails`     |
| `client_brief`     | бриф                  | `ClientBrief`              |
| `client_passport`  | паспортные данные     | `ClientPassport`           |
| `client_tz`        | техническое задание   | `ClientTZ`                 |
| `extra_services`   | доп. услуги           | `ClientExtraServices`      |
| `self_profile`     | профиль               | `ClientSelfProfile`        |

### 7.4 Обработка ошибок

| Ситуация            | UI                                                            |
|---------------------|---------------------------------------------------------------|
| 401 (сессия истекла)| Кнопка «Войти» → `/project/login`                            |
| Ошибка загрузки     | «Повторить» (`refresh()`) + «Выйти» → `/project/login`       |
| Нет данных          | Текст предупреждения                                          |

---

## 8. Contractor — кабинет подрядчика

**URL:** `/contractor/[id]`  
**Лейаут:** `app/layouts/contractor.vue`

### 8.1 Header

```
┌──────────────────────────────────────────────────────────────────┐
│  кабинет подрядчика  [Имя]   [==прогресс==  42%]  [◐]  [Выйти] │
└──────────────────────────────────────────────────────────────────┘
```

| Элемент              | Действие                                                      |
|----------------------|---------------------------------------------------------------|
| Прогресс-бар          | `profilePct` — % заполненности, только индикатор              |
| [◐] (тема)           | `toggleTheme()` — dark / light                                |
| Выйти                 | `POST /api/auth/contractor-logout` → `/contractor/login`      |

### 8.2 Sidebar-навигация

`section = ref('dashboard')` → клик `@click="section = key"` → реактивная замена контента (без URL).

| key              | Метка                 | Условие показа                 |
|------------------|-----------------------|--------------------------------|
| `dashboard`      | Обзор                 | Всегда (по умолчанию)         |
| `tasks`          | Мои задачи            | Всегда (бейдж: активные)      |
| `staff`          | Бригада               | Только `contractorType === 'company'` |
| `contacts`       | Контактные данные     | Всегда                        |
| `passport`       | Паспортные данные     | Всегда                        |
| `requisites`     | Реквизиты             | Всегда                        |
| `documents`      | Документы             | Бейдж: количество             |
| `specialization` | Специализации         | Всегда                        |
| `finances`       | Финансы               | Всегда                        |
| `portfolio`      | Портфолио             | Всегда                        |
| `settings`       | Настройки             | Всегда                        |

### 8.3 Dashboard — быстрые действия

```
section = 'dashboard'
   ├─► «Заполнить →» (если profilePct < 100)
   │       └─► section = profileNextSection (первый незаполненный)
   │
   └─► quickActions
           └─► @click="section = item.key" — прямой переход
```

---

## 9. Навигационные константы

**Источник:** `shared/constants/pages.ts`

| Экспорт                | Назначение                                                    |
|------------------------|---------------------------------------------------------------|
| `PROJECT_PAGES`        | Массив всех вкладок проекта: `{ slug, title, phase, clientVisible, adminVisible }` |
| `getAdminPages()`      | Фильтр: `adminVisible !== false`                             |
| `getClientPages()`     | Фильтр: `clientVisible !== false`                            |
| `getAdminNavGroups()`  | Группировка по фазам для sidebar                              |
| `PHASE_LABELS`         | `{ lead: 'Инициация', concept: 'Эскиз', … }`                |
| `CORE_PAGES`           | Набор вкладок, создаваемых при старте нового проекта          |

---

## 10. Файловая структура (верифицированная)

```
app/
├── pages/
│   ├── index.vue                            ← лендинг (/)
│   ├── admin/
│   │   ├── login.vue                        ← вход дизайнера
│   │   ├── index.vue                        ← список проектов
│   │   ├── projects/[slug].vue              ← страница проекта (22+ вкладок)
│   │   ├── clients/index.vue                ← клиенты (список→детали)
│   │   ├── contractors/index.vue            ← подрядчики (список→детали)
│   │   ├── designers/index.vue              ← дизайнеры (список→детали)
│   │   ├── sellers/index.vue                ← поставщики (список→детали)
│   │   ├── gallery/
│   │   │   ├── index.vue                    ← redirect → interiors
│   │   │   ├── interiors.vue
│   │   │   ├── furniture.vue
│   │   │   ├── materials.vue
│   │   │   ├── art.vue
│   │   │   └── moodboards.vue
│   │   ├── documents/index.vue              ← документы (15 категорий)
│   │   ├── pages/index.vue                  ← контент-страницы (CRUD)
│   │   └── settings/index.vue               ← настройки (4 секции)
│   ├── client/
│   │   ├── login.vue
│   │   └── [slug]/index.vue                 ← redirect → /project/[slug]
│   ├── project/
│   │   ├── login.vue
│   │   └── [slug]/index.vue                 ← кабинет клиента
│   └── contractor/
│       ├── login.vue
│       └── [id]/index.vue                   ← кабинет подрядчика
├── layouts/
│   ├── admin.vue                            ← sidebar + util-bar + search
│   ├── contractor.vue                       ← header + прогресс + тема
│   └── default.vue                          ← логин-страницы
├── middleware/
│   ├── admin.ts                             ← role === 'designer'
│   ├── client.ts                            ← role === 'client' | 'designer' | 'admin'
│   ├── contractor.ts                        ← role === 'contractor' | 'designer' | 'admin'
│   └── project.ts                           ← авторизация для клиентского кабинета
├── composables/
│   ├── useDesignSystem.ts                   ← 100+ CSS-токенов, applyToDOM()
│   ├── useUITheme.ts                        ← 5 тем (cloud/linen/stone/fog/parchment)
│   └── useThemeToggle.ts                    ← dark/light переключатель
├── plugins/
│   ├── dark-sync.client.ts                  ← MutationObserver: html.dark ↔ body.dark-theme
│   └── ui-theme.client.ts                   ← точечное применение токенов до первого paint
├── assets/css/
│   └── main.css                             ← 6400+ строк: glass-*, ws-status, skeleton, cab-*, адаптив
└── components/
    ├── Admin*.vue                           ← 40+ компонентов для дизайнера
    ├── Client*.vue                          ← компоненты клиентского кабинета
    ├── Gallery*.vue                         ← lightbox, masonry, фильтры галереи
    ├── UI*.vue                              ← дизайн-панель, тема
    └── App*.vue                             ← общие UI-элементы (input, datepicker, address)
```

---

## 11. Правила самоподобия элементов (Design Consistency Rules)

> **Для ИИ-агентов:** все элементы интерфейса построены на ограниченном наборе
> повторяющихся примитивов. Любой новый компонент **обязан** использовать
> существующие классы и токены — **не создавать собственные стили**.

### 11.1 Принцип: один примитив — одно правило

Каждый визуальный элемент в приложении — это экземпляр одного из ~10 базовых примитивов.
Одинаковый примитив **всегда** выглядит одинаково, независимо от страницы или роли.

| Примитив              | CSS-класс(ы)                        | Где встречается                                  |
|-----------------------|-------------------------------------|--------------------------------------------------|
| **Поверхность**       | `.glass-surface`, `.glass-card`     | Sidebar, карточки проектов/клиентов/подрядчиков, dashboard-блоки, form-секции |
| **Чип / тег**         | `.glass-chip`                       | Навигационные табы, статусные метки, категории документов, фильтры галереи |
| **Поле ввода**        | `.glass-input`                      | Все текстовые поля во всех кабинетах и формах    |
| **Inline-поле**       | `.glass-input.glass-input--inline`  | Ячейки таблиц, компактные строки                 |
| **Основная кнопка**   | `.a-btn-save`                       | Сохранить, подтвердить, отправить — везде        |
| **Малая кнопка**      | `.a-btn-sm`                         | Добавить, удалить, отменить — везде              |
| **Опасная кнопка**    | `.a-btn-sm.a-btn-danger`            | Удаление, сброс — везде                          |
| **AI-кнопка**         | `.a-btn-ai`                         | Генерация ИИ — везде                             |
| **Элемент навигации** | `.ent-nav-item` / `.cab-nav-item` / `.std-nav-item` | Sidebar во всех кабинетах |
| **Заголовок секции**  | `.cab-section-title`                | Над каждым блоком формы, над списками             |
| **Секция формы**      | `.u-form-section`                   | Каждый логический блок с полями                  |
| **Поле формы**        | `.u-field` + `.u-field__label`      | Обёртка label + input                            |
| **Пустое состояние**  | `.u-empty` / `.cab-empty` / `.ent-nav-empty` | Любой пустой список или область       |
| **Загрузка**          | `.ent-page-skeleton` / `.ent-content-loading` / `.cab-loading` | Любая загрузка |
| **Статус**            | `.ws-status--{pending\|planned\|progress\|done\|paused\|cancelled\|skipped}` | Любой индикатор статуса |
| **Dropdown**          | `.glass-dropdown`                   | Все выпадающие меню и popover-поверхности         |

### 11.2 Иерархия layout: sidebar + main (фрактальный паттерн)

Все кабинеты / разделы используют **идентичный** двухколоночный layout:

```
┌──────────────────┬──────────────────────────────────────┐
│  Sidebar (навиг.) │         Main (контент)              │
│  [поиск]          │                                     │
│  [пункт 1]        │  <section / component>              │
│  [пункт 2]  ←act  │                                     │
│  [пункт 3]        │                                     │
└──────────────────┴──────────────────────────────────────┘
```

Этот паттерн **повторяется на каждом уровне**:

| Уровень                      | Sidebar-класс    | Main-класс  | Навигация-класс     |
|------------------------------|------------------|-------------|---------------------|
| Admin layout (глобальный)    | `.ent-sidebar`   | `.adm-main` | `.ent-nav-item`     |
| Проект (вкладки)             | `.ent-sidebar`   | `.ent-main` | `.ent-nav-item` (chips) |
| Кабинет подрядчика           | `.cab-sidebar`   | `.cab-main` | `.cab-nav-item`     |
| Кабинет дизайнера            | `.cab-sidebar`   | `.cab-main` | `.cab-nav-item`     |
| Кабинет поставщика           | `.cab-sidebar`   | `.cab-main` | `.cab-nav-item`     |
| Кабинет клиента              | `.cc-sidebar`    | `.cc-main`  | sidebar-кнопки      |
| Документы (категории+список) | левая панель     | правая панель | фильтр-кнопки     |
| Настройки (табы+контент)     | tab-strip        | контент     | tab-кнопки          |

**Правило:** если создаёшь новый раздел — используй `cab-body > cab-sidebar + cab-main`
или `ent-layout > ent-sidebar + ent-main`. Не изобретай новый layout.

### 11.3 Навигационный элемент — единый шаблон

Все навигационные элементы следуют одному шаблону:

```
.{prefix}-nav-item {
  display: flex;
  align-items: center;
  gap: 8–12px;
  background: transparent;
  color: var(--glass-text);
  opacity: .5;                    /* неактивный — приглушённый */
  font-size: .78–.85rem;
  text-transform: uppercase;
  letter-spacing: .04–.05em;
  cursor: pointer;
  transition: opacity .2s ease;
}
.{prefix}-nav-item:hover  { opacity: .92; }
.{prefix}-nav-item.active { opacity: 1; font-weight: 500–600; }
```

| Реализация        | Prefix     | Отличие от шаблона                        |
|--------------------|------------|-------------------------------------------|
| Admin sidebar      | `ent-`     | `border-bottom: none`, фон при active     |
| Cabinet sidebar    | `cab-`     | `border-bottom: 1px solid`, без фона      |
| Std sidenav        | `std-`     | `border-radius: var(--card-radius)`, фон  |

**Правило:** при добавлении нового навигационного списка — расширяй один из
существующих prefix-классов, **не создавай** новый набор стилей.

### 11.4 Кнопки — 4 типа, без исключений

| Назначение                | Класс           | Фон               | Цвет текста         | Border             |
|---------------------------|-----------------|--------------------|---------------------|--------------------|
| Основное действие         | `.a-btn-save`   | `--glass-text`     | `--glass-page-bg`   | `--glass-text`     |
| Второстепенное действие   | `.a-btn-sm`     | transparent        | `--glass-text`      | `--glass-border`   |
| Опасное действие          | `.a-btn-sm .a-btn-danger` | transparent | `--ds-error`     | error 24%          |
| AI действие               | `.a-btn-ai`     | `--glass-text`     | `--glass-page-bg`   | `--glass-text`     |

Все кнопки:
- `text-transform: uppercase`
- `letter-spacing: 0.1em`
- `font-family: inherit`
- `border-radius: 0` (управляется `--btn-radius` через тему)
- Hover-анимация через `data-btn-hover` атрибут на `<html>` (lift / scale / glow / fill / sheen)

**Правило:** новая кнопка = один из 4 классов. Если визуал не подходит —
добавь modifier (`.a-btn-sm--outline`), **не создавай новый класс**.

### 11.5 Поверхности — 4 уровня

```
       glass-page-bg          ← фон страницы (самый дальний)
          │
       glass-surface           ← крупные панели (sidebar, main, sections)
          │
       glass-card              ← карточки внутри surface
          │
       glass-dropdown          ← popup / dropdown (самый ближний)
```

Все поверхности используют:
- `background: var(--glass-bg)` (с вариациями alpha)
- `border: 1px solid var(--glass-border)`
- `border-radius: var(--card-radius)`
- `backdrop-filter: blur(var(--glass-blur))`

В тёмном режиме цвета инвертируются автоматически через `html.dark` переопределения.

**Правило:** любой новый контейнер должен использовать один из 4 классов поверхности.

### 11.6 Форма — жёсткий конструктор

```html
<div class="u-form-section">              ← glass-карточка с padding
  <h3>Заголовок блока</h3>                ← .u-form-section h3
  <div class="u-grid-2">                  ← 2-колоночная сетка (u-grid-2 | u-grid-3)
    <div class="u-field">                 ← обёртка поля
      <label class="u-field__label">Имя</label>
      <input class="glass-input" />       ← всегда glass-input
    </div>
    <div class="u-field">
      <label class="u-field__label">Email</label>
      <input class="glass-input" />
    </div>
    <div class="u-field u-field--full">   ← на всю ширину
      <label class="u-field__label">Описание</label>
      <textarea class="glass-input"></textarea>
    </div>
  </div>
  <div class="u-form-foot">              ← строка действий
    <button class="a-btn-save">Сохранить</button>
  </div>
</div>
```

**Правило:** каждая форма — это `u-form-section` > `u-grid-*` > `u-field` > `glass-input`.
Не создавай scoped-стили для отдельных форм.

### 11.7 Заголовки — единая типографика

| Элемент                       | Класс / CSS                        | Размер / Стиль                                   |
|-------------------------------|-------------------------------------|--------------------------------------------------|
| Заголовок секции (кабинет)    | `.cab-section-title`               | `--ds-text-xs`, uppercase, ls .08em, opacity .48 |
| Заголовок sidebar             | `.ent-sidebar-title`               | .72rem, uppercase, ls .06em, opacity .4          |
| Заголовок секции (форма)      | `.u-form-section h3`               | .9rem, bold, uppercase, ls .06em, opacity .65    |
| Заголовок entity-строки       | `.ent-entity-hd-name`              | .72rem, uppercase, ls .18em, opacity .75         |
| Действие в entity-строке      | `.ent-entity-hd-action`            | .65rem, uppercase, ls .14em, opacity .35         |

**Общие правила всех заголовков:**
- `text-transform: uppercase`
- `letter-spacing: ≥ .06em`
- `color: var(--glass-text)` с `opacity` для иерархии
- `font-family: inherit` (каскад от `--ds-font-family`)

### 11.8 Состояния — обязательный набор для каждого компонента

Каждый компонент **обязан** реализовать 3 состояния:

| Состояние  | Что показывать                                          | Класс / Паттерн                          |
|------------|---------------------------------------------------------|------------------------------------------|
| **Loading** | Скелетон: пульсирующие линии или плашки                | `.ent-page-skeleton` / `.ent-content-loading` / `.cab-loading` |
| **Empty**   | Текст «нет данных» с иконкой                           | `.u-empty` / `.cab-empty` / `.ent-nav-empty` |
| **Error**   | Сообщение + кнопка «повторить»                         | `.cab-inline-error` + `.a-btn-sm`        |

**Правило:** `v-if="pending"` → skeleton, `v-else-if="error"` → error-блок,
`v-else-if="!data.length"` → empty. Никогда не оставляй пустой экран.

### 11.9 Адаптивность — единые контракты

| Breakpoint | Что происходит с sidebar + main                                  |
|------------|-------------------------------------------------------------------|
| **> 980px**  | `flex-direction: row` — sidebar слева, main справа             |
| **≤ 980px**  | `flex-direction: column` — sidebar → горизонтальный tab-strip  |
| **≤ 768px**  | sidebar → `width: 100%`, навигация → pill-кнопки с scroll      |
| **≤ 480px**  | Сетки → 1 колонка, компактные отступы                          |

**Правило:** cab-body / ent-layout уже содержат @media-правила. Не добавляй
свои media queries для layout — только для внутреннего контента компонента.

### 11.10 Цвета — только через токены

```
ЗАПРЕЩЕНО:                        ПРАВИЛЬНО:
color: #333;                      color: var(--glass-text);
background: white;                background: var(--glass-bg);
background: rgba(0,0,0,.1);      background: color-mix(in srgb, var(--glass-text) 10%, transparent);
border: 1px solid #ddd;           border: 1px solid var(--glass-border);
color: red;                       color: var(--ds-error);
color: green;                     color: var(--ds-success);
```

**Правило:** все цвета берутся из `--glass-*`, `--ds-*`, `--btn-*`, `--ws-*` токенов.
Захардкоженный цвет = баг. Единственное исключение — SVG-иконки с `currentColor`.

### 11.11 Анимации — только через токены

```css
/* ПРАВИЛЬНО — длительность и easing из дизайн-системы */
transition: opacity var(--ds-anim-duration) var(--ds-anim-easing);

/* Для переключения вкладок — готовый Transition */
<Transition name="tab-fade" mode="out-in">
  <component :is="activeComponent" :key="activePage" />
</Transition>
```

| Токен                  | Значение по умолчанию | Назначение                          |
|------------------------|-----------------------|-------------------------------------|
| `--ds-anim-duration`   | `180ms`               | Все микроанимации                   |
| `--ds-anim-easing`     | `ease`                | Кривая ускорения                    |
| `--ds-transition`      | `180ms ease`          | Сокращённая запись                  |

Все кнопки, ссылки, инпуты, selects наследуют `transition-duration` и
`transition-timing-function` из токенов (глобальное правило в `main.css`, строка 16).

### 11.12 Сводная таблица: что использовать для каждой задачи

| Задача                        | Используй                                                    | НЕ делай                                   |
|-------------------------------|--------------------------------------------------------------|--------------------------------------------|
| Новая страница-кабинет        | `cab-body > cab-sidebar + cab-main`                          | Собственный flex-layout                    |
| Новая страница-список         | `ent-layout > ent-sidebar + ent-main`                        | Собственный grid                           |
| Карточка                      | `.glass-card`                                                | `div` с inline background/border           |
| Поле ввода                    | `.glass-input` (+ модификатор `--inline`, `--sm`, `--xs`)   | `<input>` без класса                       |
| Кнопка действия               | `.a-btn-save` / `.a-btn-sm` / `.a-btn-ai`                   | `<button>` с inline-стилями               |
| Навигация в sidebar           | `.cab-nav > .cab-nav-item` или `.ent-nav-item`               | Кастомный список кнопок                    |
| Заголовок блока               | `.cab-section-title` / `.u-form-section h3`                  | Произвольный `<h3>` со scoped стилями      |
| Форма с полями                | `.u-form-section > .u-grid-2 > .u-field > .glass-input`     | `<div>` + `<input>` без обёрток            |
| Пустое состояние              | `.u-empty` / `.cab-empty`                                    | Текст без стилизации                       |
| Загрузка                      | `.ent-content-loading > .ent-skeleton-line` × 5              | Spinner / произвольный loader              |
| Статус                        | `.ws-status--{state}`                                        | Захардкоженный цветной badge               |
| Dropdown / popup              | `.glass-dropdown`                                            | `position: absolute` + inline               |
| Переход между вкладками       | `<Transition name="tab-fade">`                               | Без transition / кастомная анимация        |
| Тёмный режим                  | Автоматически через `--glass-*` токены                       | `.dark` scoped переопределения             |
| Цвет                          | `var(--glass-text)`, `var(--ds-accent)`, `var(--ds-error)`…  | Hex / rgb / hsl литералы                   |
| Скругление                    | `var(--card-radius)`, `var(--chip-radius)`, `var(--input-radius)` | `border-radius: 8px` литерал          |
| Тень                          | `var(--ds-shadow)`, `var(--ds-shadow-sm)`                    | `box-shadow: 0 2px 4px rgba(…)`           |
| Шрифт                         | `font-family: inherit` (каскад от `--ds-font-family`)       | `font-family: 'Inter', sans-serif`         |
| Размер текста                 | `var(--ds-text-xs)` … `var(--ds-text-3xl)`                   | `font-size: 14px` литерал                  |
