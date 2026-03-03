# Daria Design Studio — Архитектура системы

> Единый справочник по всем модулям, объектам, типам, API, компонентам и соглашениям проекта.
> Версия: 4.0 · Дата: 2026-03-03

---

## Содержание

1. [Обзор системы](#1-обзор-системы)
2. [Слой данных — База данных](#2-слой-данных--база-данных)
3. [Слой типов — Shared Types & Constants](#3-слой-типов--shared-types--constants)
4. [Слой утилит — Shared & Server Utils](#4-слой-утилит--shared--server-utils)
5. [Слой сервера — API маршруты](#5-слой-сервера--api-маршруты)
6. [Слой сервера — Безопасность](#6-слой-сервера--безопасность)
7. [Слой клиента — Компоненты](#7-слой-клиента--компоненты)
8. [Слой клиента — Страницы](#8-слой-клиента--страницы)
9. [Слой клиента — Layouts, Middleware, Plugins](#9-слой-клиента--layouts-middleware-plugins)
10. [Слой клиента — Composables](#10-слой-клиента--composables)
11. [Слой стилей — CSS-система](#11-слой-стилей--css-система)
12. [Карта статусов и жизненных циклов](#12-карта-статусов-и-жизненных-циклов)
13. [Соглашения и правила разработки](#13-соглашения-и-правила-разработки)

---

## 1. Обзор системы

### 1.1. Назначение

CRM/ERP для дизайн-студии интерьеров. Три роли:
- **Admin / Дизайнер** — полный доступ к панели управления
- **Client** — личный кабинет проекта
- **Contractor** — кабинет подрядчика с задачами

### 1.2. Технологический стек

| Слой | Технология |
|------|-----------|
| Фреймворк | Nuxt 4 (Vue 3 Composition API) |
| Стейт | Pinia (подключён, не активен; composables через `useState`) |
| Стили | Tailwind CSS 4 + Glassmorphism-система + Scoped CSS |
| UI-библиотека | @nuxt/ui 3 |
| Валидация | Zod |
| БД | PostgreSQL 16 (Docker, порт 5433) |
| ORM | Drizzle ORM |
| Кэш | Redis 7 (Docker, порт 6380) |
| Аутентификация | HMAC-подписанные cookie-сессии (SHA-256, 30 дней) |
| Серверная безопасность | CSP, CSRF, rate-limit, body-size-limit, error-sanitizer |
| Деплой | PM2 + rsync + deploy-safe.sh (fallback-стратегия) |

### 1.3. Статистика кодовой базы

| Метрика | Значение |
|---------|---------|
| Компоненты (`.vue`) | 60 |
| Страницы (`.vue`) | 19 |
| API-маршруты (`.ts`) | 95 |
| Composables | 10 |
| Layouts | 3 |
| Middleware (клиент) | 3 |
| Middleware (сервер) | 4 |
| Плагины (клиент) | 4 |
| Плагины (сервер) | 2 |
| DB-таблицы | 19 |
| Shared types | 12 файлов |
| Shared constants | 2 файла |
| Shared utils | 2 файла |
| Строк в компонентах | ~23 400 |
| Строк в страницах | ~8 200 |
| Строк CSS (global) | 2 055 |

---

## 2. Слой данных — База данных

### 2.1. Схема и таблицы

Определена в `server/db/schema.ts`. Подключение: `server/db/index.ts` (`useDb()` — синглтон).

| # | Таблица | Назначение | Ключевые поля |
|---|---------|-----------|---------------|
| 1 | `users` | Администраторы / дизайнеры | `email` (unique), `passwordHash` |
| 2 | `projects` | Проекты (ядро системы) | `slug` (unique), `title`, `status`, `pages[]`, `profile{}` |
| 3 | `page_configs` | Настройки страниц (глобальные) | `slug` (unique), `title`, `fontSize`, `sortOrder` |
| 4 | `page_content` | Содержимое страниц проекта | `projectId`, `pageSlug`, `content{}` |
| 5 | `contractors` | Подрядчики | `slug`, `name`, `workTypes[]`, `roleTypes[]`, `contractorType`, `parentId` |
| 6 | `project_contractors` | Связь проект ↔ подрядчик (M:N) | `projectId`, `contractorId` |
| 7 | `work_status_items` | Задачи / работы | `projectId`, `contractorId`, `title`, `status`, `workType`, `roadmapStageId` |
| 8 | `work_status_item_photos` | Фото к задачам | `itemId`, `url`, `caption` |
| 9 | `work_status_item_comments` | Комментарии к задачам | `itemId`, `authorType`, `authorName`, `text` |
| 10 | `roadmap_stages` | Этапы дорожной карты | `projectId`, `stageKey`, `title`, `status`, `sortOrder` |
| 11 | `uploads` | Загруженные файлы | `projectId`, `filename`, `mimeType`, `sizeBytes` |
| 12 | `gallery_items` | Галерея | `category`, `title`, `image`, `tags[]`, `properties{}` |
| 13 | `clients` | Клиенты | `name`, `phone`, `email`, `brief{}` |
| 14 | `documents` | Документы | `projectId`, `type`, `title`, `fileUrl` |
| 15 | `contractor_documents` | Документы подрядчиков | `contractorId`, `category`, `fileUrl` |
| 16 | `designers` | Дизайнеры | `name`, `email`, `phone`, `specializations[]`, `services{}` |
| 17 | `designer_projects` | M:N дизайнер ↔ проект | `designerId`, `projectId` |
| 18 | `designer_project_clients` | Клиенты проекта дизайнера | `designerProjectId`, `clientId` |
| 19 | `designer_project_contractors` | Подрядчики проекта дизайнера | `designerProjectId`, `contractorId` |

### 2.2. Диаграмма связей

```
users ──────────┐
                │ userId
                ▼
            projects
            │  │  │  │
            │  │  │  └── page_content (projectId + pageSlug)
            │  │  │
            │  │  └── roadmap_stages (projectId)
            │  │
            │  └── work_status_items (projectId, contractorId?)
            │       ├── work_status_item_photos (itemId)
            │       └── work_status_item_comments (itemId)
            │
            └── project_contractors (M:N) ── contractors
                                             │
                                             └── parentId (self-ref: компания → мастера)
                                             └── contractor_documents

designers ── designer_projects ── designer_project_clients
                              └── designer_project_contractors

clients ····· связь через projects.profile.client_id (без FK)
documents ····· projectId (FK), designerId, contractorId (опционально)
gallery_items ····· независимая
page_configs ····· глобальная
uploads ····· projectId (FK)
```

### 2.3. Канонические статусы

| Таблица | Поле | Значения |
|---------|------|----------|
| `projects` | `status` | `lead`, `concept`, `working_project`, `procurement`, `construction`, `commissioning`, `completed` |
| `roadmap_stages` | `status` | `pending`, `in_progress`, `done`, `skipped` |
| `work_status_items` | `status` | `pending`, `planned`, `in_progress`, `done`, `paused`, `cancelled`, `skipped` |
| `contractors` | `contractorType` | `master`, `company` |

---

## 3. Слой типов — Shared Types & Constants

### 3.1. Типы (`shared/types/`)

| Файл | Экспорты | Строк |
|------|---------|-------|
| `auth.ts` | `LoginSchema` (Zod) | 7 |
| `project.ts` | `ClientProfileSchema` (153+ полей Zod), `ProjectSchema`, `CreateProjectSchema`, `UpdateProjectSchema` | ~189 |
| `contractor.ts` | `ContractorSchema`, `CreateContractorSchema`, `UpdateContractorSchema` | 58 |
| `roadmap.ts` | `StageStatus`, `RoadmapStageSchema` | 21 |
| `work_status.ts` | `WorkItemStatus`, `WorkStatusItemSchema` | 21 |
| `catalogs.ts` | 25+ массивов + `*_OPTIONS` + `WORK_TYPE_STAGES` (37 видов × 5-10 этапов) | 828 |
| `phase-steps.ts` | `PHASE_STEPS[]` — 7 фаз × 1-5 шагов (бизнес/IT/артефакты) | ~264 |
| `gallery.ts` | `GalleryItem`, `GalleryFilterState`, `GalleryViewMode`, `GallerySortField` | 82 |
| `material.ts` | 8 интерфейсов свойств, `MaterialProperties`, `MATERIAL_PROPERTY_GROUPS`, `MATERIAL_FIELD_LABELS`, `MATERIAL_PRESETS` | 359 |
| `designer.ts` | `DESIGNER_SERVICE_CATEGORIES`, `DESIGNER_SERVICE_TEMPLATES` (25), `DESIGNER_PACKAGE_TEMPLATES` (5), `DESIGNER_SUBSCRIPTION_TEMPLATES` (3), Zod-схемы | 578 |
| `roadmap-template.ts` | `RoadmapTemplateSchema`, `RoadmapTemplateStageSchema` | 35 |
| `roadmap-templates.ts` | `ROADMAP_TEMPLATES` — 24 встроенных шаблона | ~422 |

### 3.2. Каталоги справочников (`catalogs.ts`)

| Каталог | Константа | Кол-во |
|---------|----------|--------|
| Фазы проекта | `PROJECT_PHASES` / `PROJECT_STATUSES` | 7 |
| Типы этапов roadmap | `ROADMAP_STAGE_TYPES` | 8 |
| Типы клиентов | `CLIENT_TYPES` | 5 |
| Типы материалов | `MATERIAL_TYPES` | 13 |
| Типы подрядчиков | `CONTRACTOR_TYPES` | 3 |
| Роли подрядчиков | `CONTRACTOR_ROLE_TYPES` | 37 |
| Виды работ | `CONTRACTOR_WORK_TYPES` | 37 |
| Услуги дизайнера | `DESIGNER_SERVICE_TYPES` | 12 |
| Типы оплаты | `PAYMENT_TYPES` | 8 |
| Типы контрактов | `CONTRACT_TYPES` | 5 |
| Типы объектов | `OBJECT_TYPES` | 6 |
| Приоритеты | `PROJECT_PRIORITY_TYPES` | 4 |
| Сложность | `ROADMAP_COMPLEXITY_TYPES` | 4 |
| Этапы видов работ | `WORK_TYPE_STAGES` | 37 × 5-10 |

Все каталоги экспортируют `*_OPTIONS` через `asOptions()` — массив `{ value, label }`.

### 3.3. Константы (`shared/constants/`)

| Файл | Экспорты |
|------|---------|
| `pages.ts` | `PROJECT_PAGES` (33), `getClientPages()`, `getAdminPages()`, `getAdminNavGroups()`, `findPage()`, `PHASE_LABELS`, `CORE_PAGES` |
| `profile-fields.ts` | `MESSENGER_OPTIONS`, `PREFERRED_CONTACT_OPTIONS`, `OBJECT_TYPE_OPTIONS`, `BALCONY_OPTIONS`, `PARKING_OPTIONS`, `BRIEF_*_OPTIONS`, `CLIENT_PROFILE_*_KEYS`, `BRIEF_COMPLETION_KEYS`, `createEmptyClientProfileDraft()` |

---

## 4. Слой утилит — Shared & Server Utils

### 4.1. Shared утилиты (`shared/utils/`)

**`roadmap.ts`** — единый источник истины для Roadmap:

| Экспорт | Описание |
|---------|---------|
| `normalizeRoadmapStatus()` | Любая строка → каноничный статус (40+ алиасов → 4 канонических) |
| `normalizeRoadmapStages()` | Массовая нормализация |
| `roadmapStatusLabel()` | → русская метка (`ожидание`, `в работе`, `готово`, `пропущено`) |
| `roadmapStatusIcon()` | → символ (`○`, `◉`, `✓`, `—`) |
| `roadmapStatusCssClass()` | → CSS-класс (`rm-status--pending/progress/done/skipped`) |
| `deriveProjectPhaseFromRoadmap()` | Вывод текущей фазы проекта из состояния этапов |
| `roadmapDoneCount()` | Подсчёт выполненных этапов |

Карта алиасов: `done/approved/completed/finished/готово → 'done'`, `in_progress/active/working/в работе → 'in_progress'`, `pending/wait/todo/open → 'pending'`, `skipped/skip/пропущено → 'skipped'`

**`work-status.ts`** — утилиты для задач:

| Экспорт | Описание |
|---------|---------|
| `normalizeWorkStatus()` | 7 канонических статусов |
| `workStatusLabel/Icon/CssClass()` | Метки, иконки, CSS-классы |
| `workTypeLabel()` | Перевод тега вида работы |
| `workDoneCount()` / `workOverdueCount()` | Подсчёт |

### 4.2. Серверные утилиты (`server/utils/`)

| Файл | Назначение |
|------|-----------|
| `auth.ts` | HMAC-подписанные cookie-сессии (admin/client/contractor), `hashPassword()`, `verifyPassword()`, `requireAdmin()`, `requireAdminOrClient()`, `requireAdminOrContractor()` |
| `body.ts` | `readNodeBody()`, `readValidatedNodeBody()` — обход бага h3 v2 RC |
| `query.ts` | `safeGetQuery()` — обход бага h3 v2 с Invalid URL |
| `roadmap-templates.ts` | CRUD пользовательских шаблонов (JSON-файл на диске) |
| `storage.ts` | `getUploadDir()`, `ensureUploadDir()`, `getUploadUrl()` |
| `upload-validation.ts` | Валидация файлов: MIME, расширение, magic bytes, размер (20 МБ) |

---

## 5. Слой сервера — API маршруты

95 маршрутов, сгруппированных по 9 доменам.

### 5.1. AUTH — 8 маршрутов

| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/api/auth/login` | Вход admin (email + password, auto-create) |
| POST | `/api/auth/logout` | Выход admin |
| GET | `/api/auth/me` | Текущая сессия |
| POST | `/api/auth/client-login` | Вход клиента (slug) |
| POST | `/api/auth/client-id-logout` | Выход клиента |
| GET | `/api/auth/client-open` | Редирект (legacy) |
| POST | `/api/auth/contractor-login` | Вход подрядчика (id + slug) |
| POST | `/api/auth/contractor-logout` | Выход подрядчика |

### 5.2. PROJECTS — 22 маршрута

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/projects` | Список + roadmap summary + task counts |
| POST | `/api/projects` | Создание (+ roadmap из шаблона) |
| GET/PUT/DELETE | `/api/projects/:slug` | CRUD |
| PUT | `…/status` | Обновление статуса |
| PUT | `…/client-profile` | Обновление профиля клиента |
| GET/PUT | `…/page-content` | Контент страницы |
| GET/PUT | `…/page-answers` | Ответы на brief |
| GET/PUT | `…/roadmap` | Roadmap (full upsert) |
| PATCH | `…/roadmap-stage` | Обновление одного этапа по stageKey |
| GET/PUT | `…/work-status` | Задачи проекта |
| GET/POST | `…/work-status/:itemId/comments` | Комментарии |
| GET | `…/work-status/:itemId/photos` | Фото |
| GET/POST/DELETE | `…/contractors[/:contractorId]` | Подрядчики проекта |
| GET/POST/DELETE | `…/designers` | Дизайнеры проекта |

### 5.3. CONTRACTORS — 16 маршрутов

CRUD подрядчиков + self-update + projects + staff + work-items (CRUD + comments + photos) + documents.

### 5.4. CLIENTS — 9 маршрутов

CRUD клиентов + link/unlink-project + documents.

### 5.5. DESIGNERS — 12 маршрутов

CRUD дизайнеров + create-project + add-client/contractor + remove-link + documents.

### 5.6. DOCUMENTS — 5 маршрутов

CRUD документов + context (агрегация данных проекта для шаблонов).

### 5.7. GALLERY — 5 маршрутов

CRUD галереи + reorder.

### 5.8. ROADMAP TEMPLATES — 4 маршрута

CRUD шаблонов (built-in защищены от редактирования/удаления).

### 5.9. MISC — 4 маршрута

| Путь | Описание |
|------|----------|
| `GET /api/public/projects` | Публичный список |
| `POST /api/upload` | Загрузка файлов (admin only) |
| `GET /api/suggestions` | Автодополнение из справочника |
| `GET /api/suggest/address` | Прокси Yandex Maps suggest |

---

## 6. Слой сервера — Безопасность

### 6.1. Серверные Middleware (порядок выполнения)

| # | Файл | Механизм |
|---|------|----------|
| 00 | `security-headers.ts` | CSP, X-Frame-Options: DENY, HSTS, X-Content-Type-Options: nosniff |
| 01 | `rate-limit.ts` | Sliding window: auth 10/мин, upload 30/мин, API 200/мин |
| 02 | `body-size-limit.ts` | JSON ≤ 1 МБ, multipart ≤ 25 МБ |
| 03 | `csrf.ts` | Double Submit Cookie |

### 6.2. Серверные Плагины

| Файл | Назначение |
|------|-----------|
| `csp-nonce.ts` | Генерация nonce для inline-скриптов, обновление CSP-заголовка |
| `error-sanitizer.ts` | Скрытие stack trace и SQL-ошибок в production |

### 6.3. Аутентификация

- **Механизм**: HMAC-подписанные cookie (SHA-256)
- **Время жизни**: 30 дней
- **Cookie**: `daria_admin_session`, `daria_client_session`, `daria_contractor_session`
- **Пароли**: bcrypt (via `bcryptjs`)
- **Auto-create**: при первом входе admin создаётся автоматически

### 6.4. Загрузка файлов

- Валидация MIME-типа, расширения, magic bytes
- Лимит: 20 МБ на файл
- Whitelist форматов: jpg, png, webp, pdf, doc, docx, xls, xlsx и др.

---

## 7. Слой клиента — Компоненты

60 компонентов в `app/components/`.

### 7.1. Admin-компоненты фаз проекта (20 шт.)

Все следуют единому паттерну: `props: { slug }` → `useFetch(/api/projects/:slug)` → `save()` через `PUT /api/projects/:slug`.

| Компонент | CSS-префикс | Фаза |
|-----------|-------------|------|
| `AdminFirstContact` | `afc-` | 0.1 Первичный контакт |
| `AdminSmartBrief` | `asb-` | 0.2 Брифинг |
| `AdminSiteSurvey` | `ass-` | 0.3 Обмеры / аудит |
| `AdminToRContract` | `atc-` | 0.4 ТЗ и договор |
| `AdminSpacePlanning` | `asp-` | 1.1 Планировки |
| `AdminMoodboard` | `amb-` | 1.2 Мудборд |
| `AdminConceptApproval` | `aca-` | 1.3 Согласование |
| `AdminWorkingDrawings` | `awd-` | 2.1 Рабочие чертежи |
| `AdminSpecifications` | `aspec-` | 2.2 Спецификации |
| `AdminMepIntegration` | `amep-` | 2.3 Инженерия |
| `AdminDesignAlbumFinal` | `adaf-` | 2.4 Финальный альбом |
| `AdminProcurementList` | `apl-` | 3.1 Список закупок |
| `AdminSuppliers` | `asup-` | 3.2 Поставщики |
| `AdminProcurementStatus` | `aps-` | 3.3 Статус закупок |
| `AdminConstructionPlan` | `acp2-` | 4.1 План работ |
| `AdminWorkLog` | `awl-` | 4.2 Журнал работ |
| `AdminSitePhotos` | `asph-` | 4.3 Фото объекта |
| `AdminPunchList` | `apn-` | 5.1 Дефектная ведомость |
| `AdminCommissioningAct` | `acoa-` | 5.2 Акт приёмки |
| `AdminClientSignOff` | `acso-` | 5.3 Подпись клиента |

### 7.2. Admin-компоненты (сложные)

| Компонент | Назначение | API | Composables |
|-----------|-----------|-----|-------------|
| `AdminClientProfile` | Профиль клиента (40+ полей) | projects/:slug, clients | — |
| `AdminRoadmap` | Редактирование roadmap | roadmap, work-status, roadmap-templates | `useRoadmapBus()` |
| `AdminVerticalRoadmap` | Вертикальный roadmap с toggle | roadmap, roadmap-stage (PATCH) | `useRoadmapBus()` |
| `AdminPhaseDetail` | Детали фазы (из PHASE_STEPS) | — | — |
| `AdminWorkStatus` | Задачи проекта | work-status, contractors, roadmap | — |
| `AdminGallery` | Галерея (CRUD) | через `useGallery()` | `useGallery()` |
| `AdminMaterials` | Материалы | page-content | — |
| `AdminTZ` | Техническое задание | page-content | — |
| `AdminPageContent` | Универсальный редактор | page-content | — |
| `AdminContractorCabinet` | Кабинет подрядчика (admin view) | через `useContractorCabinet()` | `useContractorCabinet()` |
| `AdminContractorsProfile` | Подрядчики проекта | projects/:slug/contractors | — |
| `AdminDesignerCabinet` | Кабинет дизайнера | через `useDesignerCabinet()` | `useDesignerCabinet()` |
| `AdminDocumentEditor` | Редактор документов | documents/context, upload, documents | — |

### 7.3. Client-компоненты (15 шт.)

| Компонент | Назначение | API |
|-----------|-----------|-----|
| `ClientInitiation` | Обзор инициации | projects/:slug |
| `ClientSelfProfile` | Редактирование профиля | projects/:slug/client-profile |
| `ClientContactDetails` | Контактные данные | projects/:slug, client-profile |
| `ClientPassport` | Паспортные данные | projects/:slug, client-profile |
| `ClientBrief` | Бриф (обёртка) | — |
| `ClientTZ` | ТЗ (просмотр) | projects/:slug |
| `ClientContracts` | Документы | projects/:slug |
| `ClientDesignAlbum` | Альбом визуализаций | projects/:slug |
| `ClientRoadmap` | Дорожная карта | roadmap |
| `ClientTimeline` | Таймлайн | roadmap, contractors, projects/:slug |
| `ClientWorkProgress` | Ход работ | roadmap, work-status |
| `ClientWorkStatus` | Статусы задач | work-status |
| `ClientContractorsProfile` | Подрядчики (вид клиента) | contractors |
| `ClientPageContent` | Просмотр контента + ответы | page-content, page-answers |

### 7.4. Вспомогательные компоненты

| Компонент | Назначение |
|-----------|-----------|
| `GalleryFilterBar` | Фильтры галереи |
| `GalleryLightbox` | Лайтбокс просмотра |
| `GalleryMasonry` | Masonry-раскладка |
| `MaterialPropertyEditor` | Редактор свойств материалов |
| `MaterialPropertyPanel` | Панель свойств (просмотр) |
| `UIDesignPanel` | Панель дизайн-системы (токены, шрифты, цвета, анимации) |
| `UIThemePicker` | Пикер темы |
| `AppAddressInput` | Ввод адреса (Yandex Maps suggest) |
| `AppAutocomplete` | Автодополнение |
| `AppDatePicker` | Выбор даты |
| `admin/NavChipTab` | Навигационные чипы |

---

## 8. Слой клиента — Страницы

19 страниц в 4 разделах.

### 8.1. Admin-страницы

| Маршрут | Компоненты | Назначение |
|---------|-----------|-----------|
| `/admin` | inline | Дашборд проектов (создание, список карточек) |
| `/admin/login` | inline | Форма входа |
| `/admin/projects/:slug` | 30+ Admin/Client-компонентов (через `pageComponentMap`) | Детали проекта (система табов) |
| `/admin/clients` | `AppAddressInput` | Список клиентов + CRUD |
| `/admin/contractors` | `AdminContractorCabinet`, `AppAddressInput` | Список подрядчиков + CRUD |
| `/admin/designers` | `AdminDesignerCabinet` | Список дизайнеров + CRUD |
| `/admin/documents` | `AdminDocumentEditor` | Документы + шаблоны |
| `/admin/pages` | inline | Настройка страниц |
| `/admin/gallery/*` | `AdminGallery` | 5 категорий: furniture, materials, art, interiors, moodboards |
| `/admin/roadmap-templates` | inline | Шаблоны roadmap |

### 8.2. Client-страницы

| Маршрут | Назначение |
|---------|-----------|
| `/client/login` | Вход клиента (slug проекта) |
| `/client/:slug` | Кабинет клиента (sidebar + динамические компоненты по `getClientPages()`) |

### 8.3. Contractor-страницы

| Маршрут | Назначение |
|---------|-----------|
| `/contractor/login` | Вход подрядчика |
| `/contractor/:id` | Кабинет подрядчика (профиль, задачи, фото, документы, сотрудники) |

### 8.4. Публичная

| Маршрут | Назначение |
|---------|-----------|
| `/` | Лендинг (ссылки на входы) |

### 8.5. Маппинг `pageComponentMap` (admin/projects/[slug].vue)

```
work_status       → AdminWorkStatus
profile_customer  → AdminClientProfile
first_contact     → AdminFirstContact
self_profile      → AdminSmartBrief
brief             → AdminSmartBrief
site_survey       → AdminSiteSurvey
tor_contract      → AdminToRContract
space_planning    → AdminSpacePlanning
moodboard         → AdminMoodboard
concept_approval  → AdminConceptApproval
working_drawings  → AdminWorkingDrawings
specifications    → AdminSpecifications
mep_integration   → AdminMepIntegration
design_album_final → AdminDesignAlbumFinal
procurement_list  → AdminProcurementList
suppliers         → AdminSuppliers
procurement_status → AdminProcurementStatus
construction_plan → AdminConstructionPlan
work_log          → AdminWorkLog
site_photos       → AdminSitePhotos
punch_list        → AdminPunchList
commissioning_act → AdminCommissioningAct
client_sign_off   → AdminClientSignOff
(fallback)        → AdminPageContent
```

---

## 9. Слой клиента — Layouts, Middleware, Plugins

### 9.1. Layouts

| Layout | Файл | Используется | Описание |
|--------|------|-------------|---------|
| `default` | `layouts/default.vue` | `/`, login-страницы, `/client/**` | Минимальный: header с логотипом + slot |
| `admin` | `layouts/admin.vue` (888 строк) | `/admin/**` | Полная навигация + UIDesignPanel + sidebar + привязка клиентов/подрядчиков/дизайнеров |
| `contractor` | `layouts/contractor.vue` | `/contractor/**` | Header подрядчика с навигацией |

### 9.2. Middleware

| Middleware | Роли | Редирект | Примечание |
|-----------|------|---------|-----------|
| `admin.ts` | `designer` | `/admin/login` | Проверяет admin-сессию через `GET /api/auth/me` |
| `client.ts` | `client`, `designer`, `admin` | `/client/login` | + проверка slug проекта |
| `contractor.ts` | `contractor`, `designer`, `admin` | `/contractor/login` | Проверяет contractor-сессию |

### 9.3. Plugins (client-side)

| Плагин | Назначение |
|--------|-----------|
| `ui-theme.client.ts` | Восстановление темы и дизайн-токенов из localStorage |
| `dark-sync.client.ts` | Синхронизация `html.dark` ↔ `body.dark-theme` |
| `csrf.client.ts` | CSRF-токен из cookie → `x-csrf-token` header |
| `comp-inspector.client.ts` | Dev: `data-comp-name` / `data-comp-file` на DOM-элементы |

---

## 10. Слой клиента — Composables

| Composable | Назначение | Зависимости |
|------------|-----------|-------------|
| `useDesignSystem()` | Токены дизайн-системы: шрифты, кнопки, цвета, анимации, type scale | `FONT_OPTIONS`, `BTN_SIZE_MAP`, `EASING_OPTIONS`, `TYPE_SCALE_OPTIONS`, `DESIGN_PRESETS` |
| `useUITheme()` | Переключение тем с пресетами (`UI_THEMES`) | localStorage |
| `useThemeToggle()` | Тёмная / светлая тема | `html.dark` класс |
| `useRoadmapBus()` | Event bus для roadmap (`notifySaved()` → `onSaved()`) | `useState` |
| `useGallery()` | CRUD + reorder + фильтрация галереи | `/api/gallery` |
| `useContractorCabinet()` | Стейт кабинета подрядчика (профиль, задачи, staff, проекты, документы) | `/api/contractors/:id/*` |
| `useDesignerCabinet()` | Стейт кабинета дизайнера | `/api/designers/:id/*` |
| `useTimestamp()` | `savedAt` + `touch()` для метки сохранения | `Date` |
| `useStatusColor()` | Цвет статуса по значению поля формы | — |
| `useUpload()` | Загрузка файлов через `/api/upload` | `FormData` + `$fetch` |

---

## 11. Слой стилей — CSS-система

### 11.1. Архитектура

```
app/assets/css/main.css (2055 строк)
├── @import tailwindcss
├── @import @nuxt/ui
├── CSS Variables (:root / html.dark)
│   ├── --glass-* (glassmorphism)
│   ├── --rm-* (roadmap colors)
│   └── --ds-* (design system tokens)
├── Glass utility classes (.glass-page/surface/card/chip/input)
├── Navigation primitives (.std-sidenav/nav/nav-item)
├── Admin controls (.a-btn-save/sm, .a-modal-*)
├── Roadmap classes (.rm-status--*)
├── Entity layout (.ent-*)
└── Dark mode overrides (200+ строк)
```

### 11.2. Glassmorphism-переменные

```css
--glass-bg, --glass-border, --glass-shadow, --glass-text, --glass-page-bg
```

### 11.3. Roadmap-переменные

```css
--rm-color-pending: #9ca3af
--rm-color-progress: #f59e0b
--rm-color-done: #16a34a
--rm-color-skipped: #d1d5db
```

### 11.4. Дизайн-токены (управляются через `useDesignSystem()`)

```css
--ds-font-body, --ds-font-heading
--ds-btn-radius, --ds-btn-shadow, --ds-btn-size
--ds-accent, --ds-success, --ds-warning, --ds-danger
--ds-card-radius, --ds-surface-blur
```

### 11.5. Конвенция CSS-префиксов

Каждый компонент использует уникальный 2-4 символьный префикс + дефис для scoped-стилей:
- `Admin*` → `afc-`, `asb-`, `arm-`...
- `Client*` → `ct-`, `sp-`, `cd-`...
- `App*` → `ac-`, `dp-`...

---

## 12. Карта статусов и жизненных циклов

### 12.1. Жизненный цикл проекта

```
lead → concept → working_project → procurement → construction → commissioning → completed
 0       1            2                3              4              5              ✓
```

Фазы определены в `PROJECT_PHASES` (`shared/types/catalogs.ts`) и `PHASE_STEPS` (`shared/types/phase-steps.ts`).

### 12.2. Жизненный цикл roadmap-этапа

```
pending → in_progress → done
                    ↘ skipped
```

Нормализация: `normalizeRoadmapStatus()` принимает 40+ вариантов написания.

### 12.3. Жизненный цикл задачи

```
pending → planned → in_progress → done
                              ↘ paused
                              ↘ cancelled
                              ↘ skipped
```

### 12.4. Вывод фазы из roadmap

`deriveProjectPhaseFromRoadmap()`:
1. Ищет первый `in_progress` → фаза по `stageKey`
2. Нет `in_progress` → первый `pending`
3. Все `done`/`skipped` → `completed`
4. Fallback → фаза последнего завершённого

### 12.5. Маппинг stageKey → фаза проекта

```
brief → lead           concept/planning → concept
design/engineering → working_project
estimate/procurement → procurement
implementation/supervision → construction
handover → commissioning
```

---

## 13. Соглашения и правила разработки

### 13.1. Именование файлов

| Объект | Конвенция | Пример |
|--------|----------|--------|
| Компонент | PascalCase | `AdminWorkStatus.vue` |
| Страница | kebab-case | `[slug].vue` |
| API-маршрут | `kebab-case.method.ts` | `roadmap-stage.patch.ts` |
| Shared type | camelCase / snake_case | `phase-steps.ts` |
| CSS-префикс | 2-4 символа + дефис | `aws-`, `afc-` |

### 13.2. Паттерн API-вызовов

```typescript
// Загрузка
const { data, pending, refresh } = await useFetch(`/api/projects/${slug}/...`)

// Сохранение
async function save() {
  await $fetch(`/api/projects/${slug}/...`, { method: 'PUT', body: ... })
  markSaved()
}
```

### 13.3. Правила статусов

**Всегда** использовать shared-хелперы:
- Roadmap: `normalizeRoadmapStatus()`, `roadmapStatusLabel()`, `roadmapStatusCssClass()`
- Work status: `normalizeWorkStatus()`, `workStatusLabel()`, `workTypeLabel()`

### 13.4. Правила валидации

```typescript
// Предпочтительно: Zod через readValidatedNodeBody
const body = await readValidatedNodeBody(event, SomeZodSchema)

// Избегать: raw readNodeBody без типовой безопасности
```

### 13.5. Правило авторизации

- **Никогда** не внедрять PIN-авторизацию
- Все Изменения auth-flow согласовать с владельцем проекта

### 13.6. Чек-лист нового компонента

- [ ] Уникальный CSS-префикс
- [ ] `defineProps<{ ... }>()` с типизацией
- [ ] API через `useFetch()` / `$fetch()`
- [ ] Статусы через shared-хелперы
- [ ] Dark mode переменные
- [ ] `<style scoped>`
- [ ] ≤ 500 строк (иначе декомпозировать)

### 13.7. Чек-лист нового API-маршрута

- [ ] `requireAdmin(event)` / `requireAdminOrClient()` в начале
- [ ] Валидация body через Zod
- [ ] Нормализация статусов через shared-хелперы
- [ ] Batch-операции вместо циклов INSERT/UPDATE

---

> **Документ актуален на 2026-03-03.** Обновляйте при добавлении модулей, компонентов или API.
