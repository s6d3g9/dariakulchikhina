# UI_INTERFACE — Документация интерфейса Daria Design Studio

> Версия: 1.0 · Дата: 2026-03-05  
> Основана на реальном коде проекта (Nuxt 4 / Vue 3).  
> Назначение: точное описание структуры UI, алгоритмов переходов и правил отображения элементов для AI-агентов и разработчиков.

---

## 1. Роли и точки входа

| Роль | Точка входа | Layout |
|------|------------|--------|
| Дизайнер (Admin) | `/admin/login` → `/admin` | `admin.vue` |
| Клиент | `/client/login` → `/client/[slug]` | `default.vue` |
| Подрядчик | `/contractor/login` → `/contractor/[id]` | `default.vue` |

Публичная главная страница: `/` — `index.vue`, layout `default.vue`.

---

## 2. Layout: Admin (`app/layouts/admin.vue`)

### 2.1. Структура шапки

```
┌─────────────────────────────────────────────────────────────────────┐
│ админ-панель    [поиск Ctrl+K]  [○ тема]  [сайт]  [выйти]          │
├─────────────────────────────────────────────────────────────────────┤
│ [проекты][▾]  [подрядчики][▾]  [клиенты][▾]  [галерея][▾]         │
│ [документы]  [дизайнеры][▾]  [страницы]  [шаблоны roadmap]        │
└─────────────────────────────────────────────────────────────────────┘
```

- **Бренд** (`admin-brand`) — текст "админ-панель", слева.
- **Кнопка поиска** — открывает `AdminSearch` (модальный оверлей). Горячая клавиша `Ctrl+K` / `⌘K`.
- **Кнопка темы** (`theme-dot`) — переключает `light ↔ dark` через `useThemeToggle()`.
- **Ссылка "сайт"** — `NuxtLink to="/"`.
- **Ссылка "выйти"** — вызывает `logout()`, удаляет сессию → редирект на `/admin/login`.

### 2.2. Таб-бар навигации

Каждый таб — `admin-chip-tab`: кликабельная ссылка (`NuxtLink`) + мини-чип (`…` или инициалы) с dropdown.

| Таб | URL | Dropdown |
|-----|-----|----------|
| проекты | `/admin` | Список последних проектов; клик → `navigateTo(/admin/projects/:slug)` |
| подрядчики | `/admin/contractors` | Список последних подрядчиков + возможность привязки/отвязки от проекта |
| клиенты | `/admin/clients` | Список клиентов + привязка к проекту |
| галерея | `/admin/gallery/:tab` (последний активный) | Подразделы галереи: interiors, furniture, materials, art, moodboards |
| документы | `/admin/documents` | — |
| дизайнеры | `/admin/designers` | Список дизайнеров → `navigateTo(/admin/designers?designerId=...)` |
| страницы | `/admin/pages` | — |
| шаблоны roadmap | `/admin/roadmap-templates` | — |

**Активный таб** определяется по `route.path.startsWith(...)` → добавляется класс `admin-tab--active`.

---

## 3. Алгоритмы переходов между страницами

### 3.1. Вход дизайнера

```
GET /admin/login
  └─ POST /api/auth/login (email + password)
       ├─ success → cookie сессии → navigateTo('/admin')
       └─ error   → показать inline-ошибку
```

### 3.2. Вход клиента

```
GET /client/login
  └─ POST /api/auth/client-login (slug проекта)
       ├─ success → cookie сессии → navigateTo('/client/:slug')
       └─ error   → показать inline-ошибку
```

### 3.3. Вход подрядчика

```
GET /contractor/login
  └─ POST /api/auth/contractor-login (id + slug)
       ├─ success → cookie сессии → navigateTo('/contractor/:id')
       └─ error   → показать inline-ошибку
```

### 3.4. Переход по проектам (Admin)

```
/admin  (список проектов)
  ├─ клик на строку в сайдбаре  →  выбор проекта (detail-карточка справа)
  └─ кнопка "открыть" / "управление"  →  navigateTo('/admin/projects/:slug')

/admin/projects/:slug  (workspace)
  ├─ кнопки в sidebar-навигации проекта  →  переключение activePage (ref)
  │    activePage изменяется → contentKey обновляется → компонент плавно меняется
  └─ кнопка "назад к проектам"  →  navigateTo('/admin')
```

### 3.5. Переход по страницам проекта (Admin workspace)

Файл: `app/pages/admin/projects/[slug].vue`

```
pageComponentMap: {
  work_status          → AdminWorkStatus
  profile_customer     → AdminClientProfile
  first_contact        → AdminFirstContact
  self_profile / brief → AdminSmartBrief
  site_survey          → AdminSiteSurvey
  tor_contract         → AdminToRContract
  space_planning       → AdminSpacePlanning
  moodboard            → AdminMoodboard
  concept_approval     → AdminConceptApproval
  working_drawings     → AdminWorkingDrawings
  specifications       → AdminSpecifications
  mep_integration      → AdminMepIntegration
  design_album_final   → AdminDesignAlbumFinal
  procurement_list     → AdminProcurementList
  suppliers            → AdminSuppliers
  procurement_status   → AdminProcurementStatus
  construction_plan    → AdminConstructionPlan
  work_log             → AdminWorkLog
  site_photos          → AdminSitePhotos
  punch_list           → AdminPunchList
  commissioning_act    → AdminCommissioningAct
  client_sign_off      → AdminClientSignOff
}
```

Переход: клик на пункт sidebar → `activePage = slug` → `activeComponent = pageComponentMap[activePage]` → `<Transition name="fade">` + `contentKey` для scroll-reset.

### 3.6. Режим просмотра подрядчика / клиента (query-параметры)

```
/admin/projects/:slug?view=contractor&cid=:id  →  contractorPreviewMode = true
/admin/projects/:slug?view=client              →  clientPreviewMode = true
```

### 3.7. Клиентская зона

```
/client/:slug  →  список доступных страниц (sidebar с иконками и названиями)
  └─ клик на страницу  →  navigateTo('/client/:slug/:page')
       └─ рендерится соответствующий Client-компонент
```

### 3.8. Зона подрядчика

```
/contractor/:id  →  профиль + вкладки (задачи, фото, документы, сотрудники, проекты)
  └─ переключение вкладок через activeTab (ref) без перехода по URL
```

---

## 4. Страницы и их компоненты

### 4.1. Публичная зона

| Маршрут | Компонент/Файл | Назначение |
|---------|----------------|-----------|
| `/` | `app/pages/index.vue` | Стартовая страница студии |
| `/admin/login` | `app/pages/admin/login.vue` | Форма входа дизайнера |
| `/client/login` | `app/pages/client/login.vue` | Форма входа клиента |
| `/contractor/login` | `app/pages/contractor/login.vue` | Форма входа подрядчика |

### 4.2. Зона Admin

| Маршрут | Файл | Ключевые компоненты |
|---------|------|---------------------|
| `/admin` | `admin/index.vue` | `AdminProjectStatusBar` |
| `/admin/projects/[slug]` | `admin/projects/[slug].vue` | `pageComponentMap` (23 компонента) |
| `/admin/clients` | `admin/clients/index.vue` | — |
| `/admin/contractors` | `admin/contractors/index.vue` | `AdminContractorCabinet` |
| `/admin/designers` | `admin/designers/index.vue` | `AdminDesignerCabinet` |
| `/admin/documents` | `admin/documents/index.vue` | `AdminDocumentEditor` |
| `/admin/pages` | `admin/pages/index.vue` | — |
| `/admin/gallery/:tab` | `admin/gallery/[tab].vue` | `AdminGallery`, `GalleryMasonry`, `GalleryLightbox` |
| `/admin/roadmap-templates` | `admin/roadmap-templates/index.vue` | — |

### 4.3. Клиентская зона

| Маршрут | Файл |
|---------|------|
| `/client/[slug]` | `client/[slug]/index.vue` |

### 4.4. Зона подрядчика

| Маршрут | Файл |
|---------|------|
| `/contractor/[id]` | `contractor/[id]/index.vue` |

---

## 5. Компоненты интерфейса — каталог

### 5.1. Административные компоненты (Admin)

| Компонент | Назначение |
|-----------|-----------|
| `AdminClientProfile` | Профиль клиента проекта |
| `AdminClientSignOff` | Акт приёмки клиентом |
| `AdminCommissioningAct` | Акт ввода в эксплуатацию |
| `AdminConceptApproval` | Утверждение концепции |
| `AdminConstructionPlan` | План строительных работ |
| `AdminContractorCabinet` | Кабинет подрядчика (в admin-контексте) |
| `AdminContractorsProfile` | Профиль подрядчика |
| `AdminDesignAlbumFinal` | Финальный альбом дизайна |
| `AdminDesignerCabinet` | Кабинет дизайнера |
| `AdminDocumentEditor` | Редактор документов |
| `AdminFirstContact` | Первый контакт с клиентом |
| `AdminGallery` | Управление галереей |
| `AdminMaterials` | Материалы проекта |
| `AdminMepIntegration` | Интеграция MEP (инженерные системы) |
| `AdminMoodboard` | Мудборд |
| `AdminPageContent` | Содержимое страницы (fallback) |
| `AdminPhaseDetail` | Детали этапа |
| `AdminProcurementList` | Список закупок |
| `AdminProcurementStatus` | Статус закупок |
| `AdminProjectOverview` | Обзор проекта |
| `AdminProjectStatusBar` | Статус-бар внизу (глобальный) |
| `AdminPunchList` | Список замечаний |
| `AdminRoadmap` | Дорожная карта |
| `AdminSearch` | Глобальный поиск (модал) |
| `AdminSitePhotos` | Фото с объекта |
| `AdminSiteSurvey` | Замеры объекта |
| `AdminSmartBrief` | Умный бриф |
| `AdminSpacePlanning` | Планировка пространства |
| `AdminSpecifications` | Спецификации |
| `AdminSuppliers` | Поставщики |
| `AdminTZ` | Техническое задание |
| `AdminWorkingDrawings` | Рабочие чертежи |
| `AdminWorkLog` | Журнал работ |
| `AdminWorkStatus` | Статус работ |

### 5.2. Клиентские компоненты

| Компонент | Назначение |
|-----------|-----------|
| `ClientBrief` | Бриф клиента |
| `ClientDesignAlbum` | Альбом дизайна (клиент) |

### 5.3. Общие/UI компоненты

| Компонент | Назначение |
|-----------|-----------|
| `AppAddressInput` | Ввод адреса с автодополнением (Yandex Maps) |
| `AppDatePicker` | Выбор даты |
| `GalleryLightbox` | Лайтбокс галереи |
| `GalleryMasonry` | Масонри-сетка галереи |
| `MaterialPropertyEditor` | Редактор свойств материала |
| `UIDesignPanel` | Панель дизайн-системы (только в admin layout) |

---

## 6. UIDesignPanel — Редактор дизайна

Компонент `app/components/UIDesignPanel.vue`. Встроен в `admin.vue` layout.

### 6.1. Структура панели

```
dp-topbar  (верхняя полоска, всегда видима в admin)
  ├─ [дизайн ≡]   — открыть/закрыть панель
  ├─ [css ⌖]      — CSS-инспектор (inspectMode)
  ├─ [компоненты <>] — компонентный инспектор
  ├─ [← undo]     — отменить изменение токена
  └─ [→ redo]     — повторить

dp-panel  (горизонтальный дроп-даун)
  ├─ Вкладки: темы | цвета | типографика | кнопки | пространство | анимация | экспорт
  ├─ [сохранить] — сохраняет токены в localStorage
  ├─ [сбросить]  — сбрасывает до дефолта
  └─ [предпросмотр темы] — предустановленные рецепты (presets)
```

### 6.2. Вкладки панели

| Вкладка | Что редактирует |
|---------|----------------|
| темы | Переключение готовых тем (Cloud, Linen, Stone, Noir, Garden, Copper) |
| цвета | Акцент, успех, ошибка, предупреждение (HSL), glass-переменные |
| типографика | Шрифт, размер, отступы, засечки/без засечек |
| кнопки | Радиус, transform, тень, размер |
| пространство | Отступы, радиус карточек, плотность |
| анимация | Анимация появления страниц и контента |
| экспорт | JSON-экспорт/импорт токенов, CSS custom properties |

---

## 7. Правила отображения элементов

### 7.1. Самоподобие элементов (Design Token Principle)

Все элементы используют единые CSS-переменные (`--glass-*`, `--btn-*`, `--ds-*`). Изменение токена в `UIDesignPanel` изменяет всю систему согласованно.

```
Контейнеры:  glass-card, glass-surface, glass-page
Кнопки:      a-btn, a-btn-sm, std-btn
Инпуты:      glass-input
Навигация:   std-nav, std-sidenav, admin-tab, glass-chip
```

### 7.2. Стейты элементов

| Стейт | CSS-класс или условие |
|-------|-----------------------|
| Активный таб | `--active` suffix (e.g. `admin-tab--active`) |
| Активный пункт nav | `ent-nav-item--active` / `std-nav-item--active` |
| Загрузка | `pending` ref → скелетон или spinner |
| Ошибка | `error` / `ds-error` / inline-сообщение |
| Тёмная тема | `html.dark` → `darkVars` из UITheme |

### 7.3. Переходы и анимации

| Анимация | Где используется |
|----------|-----------------|
| `fade` | Смена страниц в workspace (Transition name="fade") |
| `dp-slide` | Открытие UIDesignPanel |
| `arch*` | Архитектурные токены (pageEnter, contentReveal, textReveal) |

### 7.4. Адаптивность

- `768px` — мобильный breakpoint: tabbar переходит в горизонтальный scroll, sidebar становится горизонтальным.
- `992px` — промежуточный: некоторые колонки схлопываются.

---

## 8. Middleware и защита переходов

| Middleware | Файл | Логика |
|-----------|------|--------|
| `admin` | `app/middleware/admin.ts` | Нет сессии → redirect `/admin/login` |
| `client` | `app/middleware/client.ts` | Нет сессии / slug → redirect `/client/login` |
| `contractor` | `app/middleware/contractor.ts` | Нет сессии → redirect `/contractor/login` |

Сессии хранятся в HMAC-подписанных cookie (SHA-256, TTL 30 дней).

---

## 9. Глобальное состояние

Composables (через `useState` Nuxt — без Pinia):

| Composable | Назначение |
|-----------|-----------|
| `useThemeToggle` | `isDark`, `toggleTheme()` |
| `useDesignSystem` | Дизайн-токены, undo/redo, export/import |
| `useUITheme` | 6 готовых тем с CSS vars и token-overrides |
| `useProjectContext` | Текущий активный проект (slug, title) |
| `useWorkStatus` | Статусы задач проекта |
| `useRoadmap` | Дорожная карта |

---

## 10. Связи: кнопки → переходы

| Кнопка / элемент | Действие |
|-----------------|----------|
| Таб "проекты" | `navigateTo('/admin')` |
| Мини-чип проекта | Открыть dropdown → `navigateTo('/admin/projects/:slug')` |
| Кнопка "открыть" в детали проекта | `NuxtLink to="/admin/projects/:slug"` |
| Пункт sidebar workspace | `activePage = slug` (без навигации по URL) |
| Кнопка "выйти" | `POST /api/auth/logout` → `navigateTo('/admin/login')` |
| Ссылка "сайт" | `NuxtLink to="/"` |
| Кнопка поиска | `searchOpen = true` (оверлей `AdminSearch`) |
| Кнопка темы | `toggleTheme()` |
| `AdminSearch` результат | `navigateTo(result.url)` + `searchOpen = false` |
