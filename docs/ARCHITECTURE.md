# Daria Design Studio — Архитектура системы

> Единый справочник по всем модулям, объектам, классам, типам, API, компонентам и соглашениям проекта.
> Версия: 3.0 · Дата: 2026-02-28

---

## Содержание

1. [Обзор системы](#1-обзор-системы)
2. [Слой данных — База данных](#2-слой-данных--база-данных)
3. [Слой типов — Shared Types & Constants](#3-слой-типов--shared-types--constants)
4. [Слой утилит — Shared Utils](#4-слой-утилит--shared-utils)
5. [Слой сервера — API маршруты](#5-слой-сервера--api-маршруты)
6. [Слой клиента — Компоненты](#6-слой-клиента--компоненты)
7. [Слой клиента — Страницы](#7-слой-клиента--страницы)
8. [Слой клиента — Layouts, Middleware, Store](#8-слой-клиента--layouts-middleware-store)
9. [Слой стилей — CSS-система](#9-слой-стилей--css-система)
10. [Карта статусов и жизненных циклов](#10-карта-статусов-и-жизненных-циклов)
11. [Реестр проблем и технический долг](#11-реестр-проблем-и-технический-долг)
12. [Соглашения и правила разработки](#12-соглашения-и-правила-разработки)

---

## 1. Обзор системы

### 1.1. Назначение
CRM/ERP для дизайн-студии интерьеров. Три роли:
- **Admin** (дизайнер) — полный доступ к панели управления
- **Client** (клиент) — личный кабинет проекта
- **Contractor** (подрядчик) — кабинет подрядчика с задачами

### 1.2. Технологический стек

| Слой | Технология |
|------|-----------|
| Фреймворк | Nuxt 4 (Vue 3 Composition API) |
| Стейт | Pinia (определён, но не активен) |
| Стили | Tailwind CSS + Glassmorphism-система + Scoped CSS |
| Валидация | Zod |
| БД | PostgreSQL |
| ORM | Drizzle ORM |
| Аутентификация | Cookie-based сессии (без HMAC) |
| Деплой | PM2 + rsync |

### 1.3. Статистика кодовой базы

| Метрика | Значение |
|---------|---------|
| Компоненты (`.vue`) | 30 |
| Страницы (`.vue`) | 20 |
| API-маршруты (`.ts`) | 67 |
| Layouts | 4 |
| Middleware | 4 |
| DB-таблицы | 13 |
| Shared Types | 9 файлов |
| Строк в компонентах | ~9 000 |
| Строк в страницах | ~4 700 |
| Строк CSS (global) | 545 |

---

## 2. Слой данных — База данных

### 2.1. Схема и таблицы

Определена в `server/db/schema.ts`. Подключение через `server/db/index.ts` (`useDb()`).

| # | Таблица | Назначение | Ключевые поля | Связи |
|---|---------|-----------|---------------|-------|
| 1 | `users` | Администраторы (дизайнеры) | `email`, `login`, `passwordHash` | → projects |
| 2 | `projects` | Проекты (ядро системы) | `slug` (URI), `title`, `status`, `pages[]`, `profile{}` | → users, → pageContent, → roadmapStages, → workStatusItems, → projectContractors, → uploads |
| 3 | `page_configs` | Настройки страниц (глобальные) | `slug`, `title`, `pageTitle`, `fontSize`, `sortOrder` | — |
| 4 | `page_content` | Содержимое страниц проекта | `projectId`, `pageSlug`, `content{}` | → projects |
| 5 | `contractors` | Подрядчики и мастера | `slug`, `name`, `workTypes[]`, `roleTypes[]`, `contractorType`, `parentId`, `pin` | → projectContractors, → workStatusItems |
| 6 | `project_contractors` | Связь проект ↔ подрядчик (M:N) | `projectId`, `contractorId` | → projects, → contractors |
| 7 | `work_status_items` | Задачи / работы | `projectId`, `contractorId`, `title`, `status`, `workType`, `roadmapStageId` | → projects, → contractors |
| 8 | `work_status_item_photos` | Фото к задачам | `itemId`, `url`, `caption` | → workStatusItems |
| 9 | `work_status_item_comments` | Комментарии к задачам | `itemId`, `authorType`, `authorName`, `text` | → workStatusItems |
| 10 | `roadmap_stages` | Этапы дорожной карты | `projectId`, `stageKey`, `title`, `status`, `sortOrder` | → projects |
| 11 | `uploads` | Файлы (реляция) | `projectId`, `filename`, `mimeType`, `sizeBytes` | → projects |
| 12 | `gallery_items` | Галерея объектов | `category`, `title`, `image`, `tags[]` | — |
| 13 | `clients` | Клиенты (отдельная сущность) | `name`, `phone`, `email`, `pin`, `brief{}` | — (связь через `projects.profile.client_id`) |

### 2.2. Диаграмма связей

```
users ─────────┐
               │ userId
               ▼
           projects ◀─── page_content (projectId + pageSlug)
           │  │  │
           │  │  └─── roadmap_stages (projectId)
           │  │
           │  └─── work_status_items (projectId, contractorId?)
           │       │  │
           │       │  └─── work_status_item_photos (itemId)
           │       │
           │       └─── work_status_item_comments (itemId)
           │
           └─── project_contractors (M:N) ──── contractors
                                                │
                                                └─── parentId (self-ref: компания → мастера)

clients ····· связь через projects.profile.client_id (без FK!)

gallery_items ····· самостоятельная, без FK
page_configs  ····· глобальная, без FK
uploads       ····· определена, НЕ используется
```

### 2.3. Типы статусов в БД

| Таблица | Поле | Канонические значения | Zod-валидация |
|---------|------|-----------------------|---------------|
| `projects` | `status` | `lead`, `concept`, `working_project`, `procurement`, `construction`, `commissioning`, `completed` | `PROJECT_STATUSES` z.enum |
| `roadmap_stages` | `status` | `pending`, `in_progress`, `done`, `skipped` | `StageStatus` z.enum |
| `work_status_items` | `status` | `pending`, `in_progress`, `done`, `skipped` | `WorkItemStatus` z.enum |
| `contractors` | `contractorType` | `master`, `company` | z.enum |

---

## 3. Слой типов — Shared Types & Constants

Расположение: `shared/types/`, `shared/constants/`, `shared/utils/`

### 3.1. Реестр файлов типов

| Файл | Экспорты | Назначение |
|------|---------|-----------|
| `auth.ts` | `LoginSchema`, `PinLoginSchema`, типы | Валидация логинов |
| `project.ts` | `ClientProfileSchema`, `ProjectSchema`, `CreateProjectSchema`, `UpdateProjectSchema` | Проект + профиль клиента (153 поля!) |
| `contractor.ts` | `ContractorSchema`, `CreateContractorSchema`, `UpdateContractorSchema` | Подрядчик |
| `roadmap.ts` | `StageStatus`, `RoadmapStageSchema` | Roadmap-этапы |
| `work_status.ts` | `WorkItemStatus`, `WorkStatusItemSchema` | Задачи / работы |
| `catalogs.ts` | 25+ массивов констант + `*_OPTIONS` | Каталоги справочников (828 строк) |
| `phase-steps.ts` | `PHASE_STEPS[]`, `PhaseDefinition`, `PhaseStep` | Детальное описание шагов по фазам (264 строки) |
| `roadmap-template.ts` | `RoadmapTemplateSchema`, `RoadmapTemplateStageSchema` | Zod-схема шаблонов |
| `roadmap-templates.ts` | `ROADMAP_TEMPLATES[]` | 10+ встроенных шаблонов (422 строки) |

### 3.2. Каталоги справочников (catalogs.ts)

Система «ключ → метка» через `asOptions()`:

| Каталог | Константа (массив) | Опции (объекты) | Кол-во элементов |
|---------|-------------------|-----------------|-------------------|
| Типы этапов roadmap | `ROADMAP_STAGE_TYPES` | `ROADMAP_STAGE_TYPE_OPTIONS` | 8 |
| Фазы проекта | `PROJECT_STATUSES` / `PROJECT_PHASES` | (массив с color, short, description) | 7 |
| Типы клиентов | `CLIENT_TYPES` | `CLIENT_TYPE_OPTIONS` | 5 |
| Типы материалов | `MATERIAL_TYPES` | `MATERIAL_TYPE_OPTIONS` | 13 |
| Типы подрядчиков | `CONTRACTOR_TYPES` | `CONTRACTOR_TYPE_OPTIONS` | 3 |
| Роли подрядчиков | `CONTRACTOR_ROLE_TYPES` | `CONTRACTOR_ROLE_TYPE_OPTIONS` | 37 |
| Виды работ | `CONTRACTOR_WORK_TYPES` | `CONTRACTOR_WORK_TYPE_OPTIONS` | 37 |
| Услуги дизайнера | `DESIGNER_SERVICE_TYPES` | `DESIGNER_SERVICE_TYPE_OPTIONS` | 12 |
| Типы оплаты | `PAYMENT_TYPES` | `PAYMENT_TYPE_OPTIONS` | 8 |
| Типы контрактов | `CONTRACT_TYPES` | `CONTRACT_TYPE_OPTIONS` | 5 |
| Типы объектов | `OBJECT_TYPES` | `OBJECT_TYPE_OPTIONS` | 6 |
| Приоритеты проектов | `PROJECT_PRIORITY_TYPES` | `PROJECT_PRIORITY_OPTIONS` | 4 |
| Сложность roadmap | `ROADMAP_COMPLEXITY_TYPES` | `ROADMAP_COMPLEXITY_OPTIONS` | 4 |
| Этапы видов работ | `WORK_TYPE_STAGES` | (Record по workType) | ~37 видов × 5-10 этапов |

### 3.3. Константы профиля (`shared/constants/profile-fields.ts`)

| Экспорт | Назначение |
|---------|-----------|
| `MESSENGER_OPTIONS` | WhatsApp, Telegram, Viber |
| `PREFERRED_CONTACT_OPTIONS` | Способы связи |
| `OBJECT_TYPE_OPTIONS` | Варианты объектов (на русском) |
| `BALCONY_OPTIONS`, `PARKING_OPTIONS` | Варианты балконов/парковки |
| `BRIEF_REMOTE_WORK_OPTIONS` | Удалёнка |
| `BRIEF_GUESTS_FREQ_OPTIONS` | Частота гостей |
| `BRIEF_STYLE_OPTIONS` | Стили интерьера |
| `BRIEF_COLOR_OPTIONS` | Цветовые палитры |
| `CLIENT_PROFILE_BASE_KEYS` | Базовые поля |
| `CLIENT_PROFILE_BRIEF_KEYS` | Поля брифинга |
| `CLIENT_PROFILE_EDITABLE_KEYS` | Все редактируемые поля |
| `BRIEF_COMPLETION_KEYS` | Обязательные поля |
| `createEmptyClientProfileDraft()` | Фабрика пустого профиля |

---

## 4. Слой утилит — Shared Utils

### 4.1. `shared/utils/roadmap.ts` — Единый источник истины для Roadmap

| Экспорт | Тип | Назначение |
|---------|-----|-----------|
| `CanonicalRoadmapStatus` | type | `'pending' \| 'in_progress' \| 'done' \| 'skipped'` |
| `normalizeRoadmapStatus(status)` | function | Любая строка → каноничный статус (40+ алиасов) |
| `normalizeRoadmapStages(stages)` | function | Массовая нормализация массива |
| `roadmapPhaseFromStageKey(key)` | function | `stageKey` → фаза проекта |
| `roadmapStatusLabel(status)` | function | Статус → русская метка (`'ожидание'`, `'в работе'`, `'готово'`, `'пропущено'`) |
| `roadmapStatusIcon(status)` | function | Статус → символ-иконка (`○`, `◉`, `✓`, `—`) |
| `roadmapStatusCssClass(status)` | function | Статус → CSS-класс (`rm-status--pending/progress/done/skipped`) |
| `roadmapDoneCount(stages)` | function | Подсчёт выполненных этапов |
| `deriveProjectPhaseFromRoadmap(stages)` | function | Вывод текущей фазы проекта из roadmap |

**Карта алиасов статусов** (40+ вариантов → 4 канонических):

```
done, approved, completed, complete, finished, готово, выполнено, завершено → 'done'
in_progress, in-work, inprogress, active, working, processing, revision, в работе → 'in_progress'
pending, wait, waiting, todo, open, ожидание, ожидает → 'pending'
skipped, skip, пропущено, пропуск → 'skipped'
```

**Карта привязки stageKey → фаза проекта**:

```
brief → lead
concept, planning → concept
design, engineering → working_project
estimate, procurement → procurement
implementation, supervision → construction
handover → commissioning
```

### 4.2. Серверные утилиты (`server/utils/`)

| Файл | Назначение |
|------|-----------|
| `auth.ts` | Сессии cookie (admin/client/contractor/clientId), `hashPassword()`, `verifyPassword()` |
| `body.ts` | `readNodeBody()`, `readValidatedNodeBody()` — обход бага h3 v2 RC |
| `roadmap-templates.ts` | CRUD пользовательских шаблонов (JSON-файл на диске) |
| `storage.ts` | `UPLOAD_DIR`, `ensureUploadDir()` |

---

## 5. Слой сервера — API маршруты

67 маршрутов, сгруппированных по 8 доменам.

### 5.1. AUTH — Аутентификация (10 маршрутов)

| Метод | Путь | Роль | Описание |
|-------|------|------|----------|
| POST | `/api/auth/login` | public | Вход администратора (login + password) |
| POST | `/api/auth/logout` | admin | Выход администратора |
| GET | `/api/auth/me` | any | Текущая сессия (admin/client/contractor) |
| POST | `/api/auth/client-login` | public | Вход клиента по slug проекта |
| POST | `/api/auth/client-logout` | client | Выход клиента |
| GET | `/api/auth/client-open` | public | Автовход по ссылке → редирект |
| POST | `/api/auth/client-id-login` | public | Вход клиента по clientId + PIN |
| POST | `/api/auth/client-id-logout` | client | Выход клиента (id-сессия) |
| POST | `/api/auth/contractor-login` | public | Вход подрядчика по id |
| POST | `/api/auth/contractor-logout` | contractor | Выход подрядчика |

### 5.2. PROJECTS — Проекты (21 маршрут)

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/projects` | Список проектов + roadmap summary + task counts |
| POST | `/api/projects` | Создание проекта (+ roadmap из шаблона) |
| GET | `/api/projects/:slug` | Проект по slug |
| PUT | `/api/projects/:slug` | Обновление проекта |
| DELETE | `/api/projects/:slug` | Удаление проекта |
| PUT | `/api/projects/:slug/status` | Обновление статуса |
| PUT | `/api/projects/:slug/client-profile` | Обновление профиля клиента |
| GET | `/api/projects/:slug/page-content` | Контент страницы |
| PUT | `/api/projects/:slug/page-content` | Upsert контента |
| GET | `/api/projects/:slug/page-answers` | Ответы на brief |
| PUT | `/api/projects/:slug/page-answers` | Сохранение ответов |
| GET | `/api/projects/:slug/roadmap` | Roadmap-этапы |
| PUT | `/api/projects/:slug/roadmap` | Upsert этапов |
| GET | `/api/projects/:slug/work-status` | Задачи проекта |
| PUT | `/api/projects/:slug/work-status` | Bulk upsert задач |
| GET | `/api/projects/:slug/work-status/:itemId/comments` | Комментарии |
| POST | `/api/projects/:slug/work-status/:itemId/comments` | Добавить комментарий |
| GET | `/api/projects/:slug/work-status/:itemId/photos` | Фото задачи |
| GET | `/api/projects/:slug/contractors` | Подрядчики проекта |
| POST | `/api/projects/:slug/contractors` | Привязка подрядчика |
| DELETE | `/api/projects/:slug/contractors/:contractorId` | Отвязка подрядчика |

### 5.3. CONTRACTORS — Подрядчики (16 маршрутов)

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/contractors` | Список подрядчиков + проекты |
| POST | `/api/contractors` | Создание |
| GET | `/api/contractors/:id` | Подрядчик по id |
| PUT | `/api/contractors/:id` | Обновление (admin) |
| DELETE | `/api/contractors/:id` | Удаление |
| PUT | `/api/contractors/:id/self` | Самообновление (contractor) |
| GET | `/api/contractors/:id/projects` | Проекты подрядчика |
| GET | `/api/contractors/:id/staff` | Сотрудники компании |
| GET | `/api/contractors/:id/work-items` | Задачи подрядчика |
| POST | `/api/contractors/:id/work-items` | Создание задачи |
| PUT | `/api/contractors/:id/work-items/:itemId` | Обновление задачи |
| GET | `/api/contractors/:id/work-items/:itemId/comments` | Комментарии |
| POST | `/api/contractors/:id/work-items/:itemId/comments` | Добавить комментарий |
| GET | `/api/contractors/:id/work-items/:itemId/photos` | Фото |
| POST | `/api/contractors/:id/work-items/:itemId/photos` | Загрузка фото |
| DELETE | `/api/contractors/:id/work-items/:itemId/photos/:photoId` | Удаление фото |

### 5.4. CLIENTS — Клиенты (6 маршрутов)

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/clients` | Список клиентов + проекты |
| POST | `/api/clients` | Создание клиента |
| PUT | `/api/clients/:id` | Обновление клиента |
| DELETE | `/api/clients/:id` | Удаление клиента |
| GET | `/api/clients/:id/brief` | Профиль + проект |
| POST | `/api/clients/:id/link-project` | Привязка к проекту |

### 5.5. PAGE-CONFIGS (2 маршрута)

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/page-configs` | Список конфигов страниц |
| PUT | `/api/page-configs` | Перезапись конфигов |

### 5.6. GALLERY (4 маршрута)

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/gallery` | Элементы по категории |
| POST | `/api/gallery` | Создание элемента |
| PUT | `/api/gallery/:id` | Обновление |
| DELETE | `/api/gallery/:id` | Удаление |

### 5.7. ROADMAP TEMPLATES (4 маршрута)

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/roadmap-templates` | Built-in + custom шаблоны |
| POST | `/api/roadmap-templates` | Создание custom |
| PUT | `/api/roadmap-templates/:key` | Обновление custom |
| DELETE | `/api/roadmap-templates/:key` | Удаление custom |

### 5.8. MISC (4 маршрута)

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/public/projects` | Публичный список проектов |
| POST | `/api/upload` | Загрузка файла |
| GET | `/api/suggestions` | Автодополнение из JSON |
| GET | `/api/suggest/address` | Yandex Maps autocomplete |

---

## 6. Слой клиента — Компоненты

30 компонентов, классифицированных по 5 категориям.

### 6.1. Классификация компонентов

#### Admin-компоненты (управление проектом)

| Компонент | Строк | CSS-префикс | Props | API-вызовы | Назначение |
|-----------|-------|-------------|-------|------------|-----------|
| `AdminClientProfile` | 442 | `acp-` | `slug` | `projects/:slug`, `projects/:slug/client-profile` | Профиль клиента (форма с 40+ полями) |
| `AdminContractorsProfile` | ~200 | `acp-` ⚠️ | `slug` | `projects/:slug/contractors` | Подрядчики проекта (привязка/отвязка) |
| `AdminFirstContact` | ~280 | `afc-` | `slug` | `projects/:slug/page-content` | Фаза 0.1: первичный контакт |
| `AdminSmartBrief` | ~350 | `asb-` | `slug` | `projects/:slug/page-content`, `page-answers` | Фаза 0.2: умный брифинг |
| `AdminSiteSurvey` | ~300 | `ass-` | `slug` | `projects/:slug/page-content` | Фаза 0.3: обмеры/аудит |
| `AdminToRContract` | ~300 | `atc-` | `slug` | `projects/:slug/page-content` | Фаза 0.4: ТЗ и договор |
| `AdminSpacePlanning` | ~280 | `asp-` | `slug` | `projects/:slug/page-content` | Фаза 1.1: планировки |
| `AdminMoodboard` | 319 | `amb-` | `slug` | `projects/:slug/page-content` | Фаза 1.2: мудборд |
| `AdminConceptApproval` | ~250 | `aca-` | `slug` | `projects/:slug/page-content` | Фаза 1.3: согласование |
| `AdminPhaseDetail` | ~350 | `apd-` | `slug`, `phaseKey` | `projects/:slug/page-content` | Детали фазы (универсальный) |
| `AdminProjectPhase` | ~200 | `app-` | `slug` | `projects/:slug`, `roadmap` | Stepper фаз проекта |
| `AdminRoadmap` | 418 | `arm-` | `slug` | `projects/:slug/roadmap` | Редактирование roadmap |
| `AdminWorkStatus` | 517 | `aws-` | `slug` | `work-status`, `contractors` | Задачи / статусы работ |
| `AdminMaterials` | ~180 | `am-` | `slug` | `projects/:slug/page-content` | Материалы проекта |
| `AdminTZ` | ~200 | `atz-` | `slug` | `projects/:slug/page-content` | Техническое задание |
| `AdminPageContent` | ~180 | `apc-` | `slug`, `page` | `projects/:slug/page-content` | Универсальный редактор страницы |
| `AdminGallery` | 457 | `agal-` | `title`, `category` | `gallery` | Универсальная галерея |

#### Client-компоненты (кабинет клиента)

| Компонент | Строк | CSS-префикс | Props | API-вызовы | Назначение |
|-----------|-------|-------------|-------|------------|-----------|
| `ClientPageContent` | ~300 | `content-` | `slug`, `page` | `page-content`, `page-answers` | Просмотр контента + ответы |
| `ClientSelfProfile` | ~350 | `sp-` | `slug` | `projects/:slug/client-profile` | Редактирование профиля клиентом |
| `ClientContactDetails` | ~200 | `cd-` | `slug` | — | Контактная информация |
| `ClientInitiation` | ~150 | `ci-` | `slug` | `projects/:slug` | Обзор фазы инициации |
| `ClientTimeline` | ~200 | `ct-` | `slug` | `projects/:slug/roadmap` | Временная шкала roadmap |
| `ClientRoadmap` | ~200 | `rm-` | `slug` | `projects/:slug/roadmap` | Дорожная карта |
| `ClientWorkStatus` | 102 | `ws-` ⚠️ | `slug` | `projects/:slug/work-status` | Статусы работ (клиент) |
| `ClientContractorsProfile` | ~180 | `ccp-` | `slug` | `projects/:slug/contractors` | Подрядчики (вид для клиента) |
| `ClientContracts` | ~150 | `cc-` | `slug` | `page-content` | Документы/договоры |
| `ClientDesignAlbum` | ~200 | `cda-` | `slug` | `page-content` | Альбом визуализаций |

#### UI-примитивы (переиспользуемые)

| Компонент | CSS-префикс | Назначение |
|-----------|-------------|-----------|
| `AppAutocomplete` | `ac-` | Автодополнение с debounce |
| `AppAddressInput` | `address-` | Ввод адреса (Yandex Maps) |
| `AppDatePicker` | `dp-` | Выбор даты |

### 6.2. Карта CSS-префиксов

⚠️ **Коллизии** отмечены:

| Префикс | Компонент(ы) | Конфликт? |
|---------|-------------|-----------|
| `acp-` | AdminClientProfile, AdminContractorsProfile | ⚠️ **ДА** |
| `ws-` | ClientWorkStatus (+AdminWorkStatus в некоторых местах) | ⚠️ **ДА** |
| `rm-` | ClientRoadmap (+глобальные rm-status--*) | ⚠️ **ДА** |
| `agal-` | AdminGallery | — |
| `amb-` | AdminMoodboard | — |
| `arm-` | AdminRoadmap | — |
| `aws-` | AdminWorkStatus | — |
| `afc-` | AdminFirstContact | — |
| `asb-` | AdminSmartBrief | — |
| `ass-` | AdminSiteSurvey | — |
| `atc-` | AdminToRContract | — |
| `asp-` | AdminSpacePlanning | — |
| `aca-` | AdminConceptApproval | — |
| `apd-` | AdminPhaseDetail | — |
| `app-` | AdminProjectPhase | — |
| `am-` | AdminMaterials | — |
| `atz-` | AdminTZ | — |
| `apc-` | AdminPageContent | — |
| `ct-` | ClientTimeline | — |
| `sp-` | ClientSelfProfile | — |
| `cd-` | ClientContactDetails | — |
| `ci-` | ClientInitiation | — |
| `ccp-` | ClientContractorsProfile | — |
| `cc-` | ClientContracts | — |
| `cda-` | ClientDesignAlbum | — |
| `content-` | ClientPageContent | — |
| `ac-` | AppAutocomplete | — |
| `dp-` | AppDatePicker | — |

### 6.3. Паттерны, повторяющиеся в компонентах

| Паттерн | Где встречается | Кандидат на composable? |
|---------|----------------|------------------------|
| `useFetch()` + `watch()` + `save()` | AdminClientProfile, AdminRoadmap, AdminWorkStatus, AdminMoodboard, все Admin*-фазные | `useAutosave(url, form)` |
| File upload (`FormData` + `$fetch('/api/upload')`) | AdminGallery, AdminMoodboard, AdminSiteSurvey, AdminDesignAlbum, contractor photos | `useFileUpload()` |
| `statusColor` / `statusLabel` compute | AdminWorkStatus, ClientWorkStatus, AdminRoadmap, AdminProjectPhase | **Сделано**: `shared/utils/roadmap.ts` (для roadmap) |
| `workTypeLabel()` — перевод тега работы | AdminWorkStatus, ClientWorkStatus, AdminContractorsProfile, contractor/[id] | `shared/utils/work-types.ts` (НЕ создан) |
| `savedAt` formatting (timestamp → HH:MM) | AdminClientProfile, AdminRoadmap, AdminMoodboard, AdminWorkStatus | `formatSavedAt()` composable |
| `phases[]` массив с label/key | cabinet.vue, client/[slug]/index.vue, AdminProjectPhase | **Сделано**: `PROJECT_PHASES` в catalogs |

---

## 7. Слой клиента — Страницы

20 страниц, сгруппированных по 4 разделам.

### 7.1. Admin-страницы

| Маршрут | Файл | Компоненты | Строк | Назначение |
|---------|------|-----------|-------|-----------|
| `/admin` | `admin/index.vue` | — (inline) | 529 | Дашборд проектов (список карточек) |
| `/admin/login` | `admin/login.vue` | — | ~100 | Форма входа |
| `/admin/projects/:slug` | `admin/projects/[slug].vue` | 17 Admin*-компонентов | 289 | Детали проекта (табы) |
| `/admin/contractors` | `admin/contractors/index.vue` | — (inline) | 676 | Список подрядчиков |
| `/admin/clients` | `admin/clients/index.vue` | — | ~400 | Список клиентов |
| `/admin/pages` | `admin/pages/index.vue` | — | ~200 | Настройка страниц |
| `/admin/gallery/interiors` | `admin/gallery/interiors.vue` | AdminGallery | ~10 | Галерея интерьеров |
| `/admin/gallery/furniture` | `admin/gallery/furniture.vue` | AdminGallery | ~10 | Галерея мебели |
| `/admin/gallery/materials` | `admin/gallery/materials.vue` | AdminGallery | ~10 | Галерея материалов |
| `/admin/gallery/art` | `admin/gallery/art.vue` | AdminGallery | ~10 | Галерея арт-объектов |
| `/admin/gallery/moodboards` | `admin/gallery/moodboards.vue` | AdminGallery | ~10 | Галерея мудбордов |
| `/admin/roadmap-templates` | `admin/roadmap-templates/index.vue` | — | ~300 | Шаблоны roadmap |

### 7.2. Client-страницы

| Маршрут | Файл | Компоненты | Назначение |
|---------|------|-----------|-----------|
| `/client/login` | `client/login.vue` | — | Вход клиента |
| `/client/brief-login` | `client/brief-login.vue` | — | Вход для брифинга |
| `/client/brief/:clientId` | `client/brief/[clientId].vue` | — | Страница брифинга |
| `/client/:slug` | `client/[slug]/index.vue` | ClientTimeline, диаграммы | Обзор проекта |
| `/client/:slug/:page` | `client/[slug]/[page].vue` | Client*-компоненты (по page slug) | Любая страница кабинета |

### 7.3. Contractor-страницы

| Маршрут | Файл | Строк | Назначение |
|---------|------|-------|-----------|
| `/contractor/login` | `contractor/login.vue` | ~100 | Вход подрядчика |
| `/contractor/:id` | `contractor/[id]/index.vue` | **1833** ⚠️ | Полный кабинет подрядчика (mega-файл) |

### 7.4. Публичная

| Маршрут | Файл | Назначение |
|---------|------|-----------|
| `/` | `index.vue` | Лендинг |

### 7.5. Карта: страница → компонент → slug

Страница `admin/projects/[slug].vue` использует систему табов. Маппинг `tab → component`:

```
overview        → AdminProjectPhase + обзор
profile_customer → AdminClientProfile
first_contact   → AdminFirstContact
self_profile    → AdminSmartBrief
site_survey     → AdminSiteSurvey
tor_contract    → AdminToRContract
space_planning  → AdminSpacePlanning
moodboard       → AdminMoodboard
concept_approval → AdminConceptApproval
phase_detail    → AdminPhaseDetail
materials       → AdminMaterials
tz              → AdminTZ
profile_contractors → AdminContractorsProfile
work_status     → AdminWorkStatus
project_roadmap → AdminRoadmap
design_timeline → ClientTimeline (встроен в admin!)
design_album    → AdminPageContent (как generic)
contracts       → AdminPageContent (как generic)
```

---

## 8. Слой клиента — Layouts, Middleware, Store

### 8.1. Layouts

| Layout | Файл | Используется | Элементы |
|--------|------|-------------|---------|
| `default` | `layouts/default.vue` | `/`, login-страницы | Header с логотипом + slot |
| `admin` | `layouts/admin.vue` | `/admin/**` | Header + навигация (табы) + slot |
| `cabinet` | `layouts/cabinet.vue` | `/client/:slug/**` | Header + sidebar + slot |
| `contractor` | `layouts/contractor.vue` | — ⚠️ **Не используется** | Определён, но contractor рендерит inline |

### 8.2. Sidebar навигация (cabinet.vue)

Захардкоженный массив `ALL_PAGES` (17 элементов):
```
phase_init, first_contact, self_profile, site_survey, tor_contract,
space_planning, moodboard, concept_approval, client_contacts,
design_timeline, design_album, contracts, materials, tz,
profile_contractors, work_status, project_roadmap
```

Фильтруется по `project.pages[]` + всегда видны `self_profile`, `client_contacts`.

### 8.3. Middleware

| Middleware | Файл | Состояние | Назначение |
|-----------|------|----------|-----------|
| `admin` | `middleware/admin.ts` | ✅ Активен | Проверяет admin-сессию, редиректит на `/admin/login` |
| `client` | `middleware/client.ts` | ⚠️ **ПУСТОЙ** | Должен проверять client-сессию — **не работает** |
| `contractor` | `middleware/contractor.ts` | ⚠️ **ПУСТОЙ** | Должен проверять contractor-сессию — **не работает** |

### 8.4. Store

| Store | Файл | Состояние |
|-------|------|----------|
| `useAuthStore` | `stores/auth.ts` | ⚠️ Определён, но **не используется** ни одним компонентом |

Содержит: `fetchMe()`, `clear()`, state: `admin`, `clientSlug`, `contractorId`, `loaded`.

---

## 9. Слой стилей — CSS-система

### 9.1. Архитектура стилей

```
app/assets/css/main.css       ← Глобальные стили (545 строк)
├── Tailwind CSS (@import)
├── Nuxt UI (@import)
├── CSS Variables (:root / html.dark)
│   ├── --glass-* (glassmorphism)
│   └── --rm-* (roadmap)
├── Glass utility classes
│   ├── .glass-page, .glass-surface, .glass-card
│   ├── .glass-chip, .glass-input
│   └── .glass-page::before (gradient overlay)
├── Navigation primitives
│   ├── .std-sidenav, .std-nav, .std-nav-item
│   └── .std-nav-group-label
├── Admin button styles
│   ├── .a-btn-save, .a-btn-sm
│   └── .a-modal-* (modal windows)
├── Roadmap utility classes
│   ├── .rm-status--pending/progress/done/skipped
│   └── (used by roadmap components)
└── Dark mode overrides (200+ строк!)
    ├── html.dark .glass-* overrides
    ├── html.dark [style*=...] selectors (brute force)
    └── Component-specific dark vars (per component)
```

### 9.2. CSS-переменные

#### Glassmorphism система
```css
--glass-bg            /* Фон стеклянных элементов */
--glass-border        /* Граница */
--glass-shadow        /* Тень */
--glass-text          /* Цвет текста */
--glass-page-bg       /* Фон страницы */
```

#### Roadmap система
```css
--rm-color-pending    /* #9ca3af — серый */
--rm-color-progress   /* #f59e0b — янтарный */
--rm-color-done       /* #16a34a — зелёный */
--rm-color-skipped    /* #d1d5db — светло-серый */
--rm-bg-pending       /* rgba(156,163,175, 0.10) */
--rm-bg-progress      /* rgba(245,158,11, 0.12) */
--rm-bg-done          /* rgba(22,163,74, 0.10) */
--rm-bg-skipped       /* rgba(209,213,219, 0.08) */
```

#### Компонентные переменные (scoped, внутри html.dark)
Каждый компонент определяет свои CSS-переменные в `html.dark .<prefix>`:
- `--acp-*` (AdminClientProfile: 12 переменных)
- `--c-*` (ClientPageContent: 8 переменных)
- `--r-*` (ClientRoadmap: 13 переменных)
- `--w-*` / `--b-*` (ClientWorkStatus: 14 переменных)
- `--card-*` / `--modal-*` (admin cards: 18 переменных)
- `--pg-*` (page-configs: 11 переменных)
- `--tab-*` (project tabs: 14 переменных)
- `--atz-*` (AdminTZ: 3 переменные)
- `--am-*` (AdminMaterials: 3 переменные)

### 9.3. Глобальные утилити-классы

| Класс | Назначение |
|-------|-----------|
| `.glass-page` | Обёртка страницы с gradient overlay |
| `.glass-surface` | Стеклянный фон с blur |
| `.glass-card` | Карточка: surface + border-radius |
| `.glass-chip` | Чип/тег |
| `.glass-input` | Поле ввода |
| `.std-sidenav` | Боковая навигация |
| `.std-nav` | Flex-контейнер навигации |
| `.std-nav-item` | Элемент навигации |
| `.std-nav-item--active` | Активный элемент |
| `.a-btn-save` | Кнопка «сохранить» |
| `.a-btn-sm` | Маленькая кнопка |
| `.rm-status--pending` | Roadmap: ожидание |
| `.rm-status--progress` | Roadmap: в работе |
| `.rm-status--done` | Roadmap: готово |
| `.rm-status--skipped` | Roadmap: пропущено |

---

## 10. Карта статусов и жизненных циклов

### 10.1. Жизненный цикл проекта

```
lead → concept → working_project → procurement → construction → commissioning → completed
 0       1            2                3              4              5              ✓
```

Каждая фаза содержит подшаги (определены в `PHASE_STEPS`):
- **lead** (4 шага): первичный контакт → бриф → обмеры → ТЗ/договор
- **concept** (3 шага): планировка → мудборд → 3D White Box
- **working_project** (5 шагов): рендеры → MEP → столярка → согласование УК → сборка документации
- **procurement** (4 шага): BoQ → тендер → Value Engineering → фиксация бюджета
- **construction** (4 шага): мобилизация → авторский надзор → change orders → актирование
- **commissioning** (4 шага): ПНР → дефектовка → возврат удержания → цифровая сдача

### 10.2. Жизненный цикл roadmap-этапа

```
pending → in_progress → done
                    ↘ skipped
```

### 10.3. Жизненный цикл задачи (work_status_item)

```
pending → in_progress → done
                    ↘ skipped
```

### 10.4. Как roadmap влияет на фазу проекта

Функция `deriveProjectPhaseFromRoadmap()`:
1. Сортирует этапы по `sortOrder`
2. Ищет первый `in_progress` → возвращает фазу по `stageKey` или индексу
3. Если нет in_progress — ищет первый `pending`
4. Если все `done`/`skipped` → `completed`
5. Иначе — фаза последнего завершённого

### 10.5. Стадии шаблонов roadmap

8 типов стадий: `brief`, `concept`, `planning`, `engineering`, `procurement`, `implementation`, `supervision`, `handover`

Маппинг стадий на фазы проекта:
```
brief           → lead
concept         → concept
planning        → concept
engineering     → working_project
procurement     → procurement
implementation  → construction
supervision     → construction
handover        → commissioning
```

---

## 11. Реестр проблем и технический долг

### 11.1. Критические (безопасность)

| # | Проблема | Где | Влияние |
|---|---------|-----|---------|
| SEC-1 | Cookie не подписаны (нет HMAC) | `server/utils/auth.ts` | Подделка admin-сессии тривиальна |
| SEC-2 | client-login без проверки PIN | `auth/client-login.post.ts` | Доступ к кабинету по slug |
| SEC-3 | contractor-login без проверки PIN | `auth/contractor-login.post.ts` | Доступ к кабинету по id |
| SEC-4 | Contractor endpoints без проверки сессии | 13 файлов в `contractors/:id/*` | Обновление чужих данных |
| SEC-5 | GET-эндпоинты без аутентификации | ~12 файлов | Утечка данных проектов |

### 11.2. Архитектурные

| # | Проблема | Где | Рекомендация |
|---|---------|-----|-------------|
| ARCH-1 | `contractor/[id]/index.vue` — 1833 строки | pages | Разбить на 5-7 компонентов |
| ARCH-2 | Store `auth.ts` не используется | stores | Интегрировать или удалить |
| ARCH-3 | Middleware client/contractor пустые | middleware | Реализовать проверку сессии |
| ARCH-4 | Layout `contractor.vue` не используется | layouts | Вынести inline layout из pages |
| ARCH-5 | Таблица `uploads` не используется | server/db | Интегрировать в upload.post.ts |
| ARCH-6 | `CORE_PAGES` захардкожен в 3 местах | server/api, layouts | Вынести в shared/constants |

### 11.3. Дублирование логики

| # | Что дублируется | Где встречается | Решение |
|---|----------------|----------------|---------|
| DUP-1 | `workTypeLabel()` — перевод видов работ | AdminWorkStatus, ClientWorkStatus, contractor/[id], AdminContractorsProfile | `shared/utils/work-types.ts` |
| DUP-2 | Паттерн save + savedAt formatting | 8+ компонентов | `useTimestamp()` composable |
| DUP-3 | File upload logic | AdminGallery, AdminMoodboard, AdminSiteSurvey, contractor | `useFileUpload()` composable |
| DUP-4 | `phases[]` массив | cabinet.vue, client/[slug]/index.vue | ✅ Частично решено: `PROJECT_PHASES` |
| DUP-5 | `statusColor` / badge compute | AdminWorkStatus, ClientWorkStatus, AdminRoadmap | ✅ Решено для roadmap; нужно для work_status |
| DUP-6 | `DEFAULT_ROADMAP` vs шаблоны | roadmap.get.ts vs roadmap-templates | Убрать DEFAULT_ROADMAP |
| DUP-7 | `ALL_PAGES` навигация | cabinet.vue, admin/[slug].vue | Вынести в shared/constants |

### 11.4. Несогласованности

| # | Проблема | Детали |
|---|---------|--------|
| INC-1 | CSS-коллизии | `acp-` (2 компонента), `ws-` (2), `rm-` (2) |
| INC-2 | Query parsing | gallery: `getQuery()`, остальные: ручной `URLSearchParams` |
| INC-3 | Body validation | Часть: zod `readValidatedNodeBody`, часть: raw `readNodeBody` |
| INC-4 | Dark mode strategy | Inline `html.dark` overrides в main.css vs scoped переменные |
| INC-5 | Gallery category update | `gallery/[id].put` не обновляет `category` — баг |
| INC-6 | authorName hardcoded | `comments.post.ts`: `'Дизайнер'` вместо имени из сессии |

### 11.5. Производительность

| # | Проблема | Где |
|---|---------|-----|
| PERF-1 | Client↔Project linkage через полный скан | clients.get, client-id-login.post, clients/:id/brief.get |
| PERF-2 | N+1 в roadmap.put / work-status.put | Цикл INSERT/UPDATE по одному |
| PERF-3 | Dark mode CSS: 200+ строк brute-force [style*=] | main.css |

---

## 12. Соглашения и правила разработки

### 12.1. Именование файлов

| Объект | Конвенция | Пример |
|--------|----------|--------|
| Компонент | PascalCase | `AdminWorkStatus.vue` |
| Страница | kebab-case | `admin/index.vue`, `[slug].vue` |
| API-маршрут | `kebab-case.method.ts` | `work-status.put.ts` |
| Shared type | snake_case / camelCase | `work_status.ts`, `catalogs.ts` |
| CSS-префикс | `module-` (2-4 символа + дефис) | `aws-`, `acp-` |

### 12.2. Правило CSS-префиксов

Каждый компонент использует **уникальный** CSS-префикс для scoped-стилей:

```
Admin{Module}     → a{первые буквы}
Client{Module}    → c{первые буквы}
App{Module}       → app/ac/dp (UI-примитивы)
```

### 12.3. Паттерн API-вызовов в компонентах

```typescript
// Загрузка
const { data, pending, refresh } = await useFetch(`/api/projects/${slug}/<endpoint>`)

// Сохранение
async function save() {
  saving.value = true
  try {
    await $fetch(`/api/projects/${slug}/<endpoint>`, {
      method: 'PUT',
      body: form.value
    })
    savedAt.value = new Date().toLocaleTimeString('ru')
  } finally {
    saving.value = false
  }
}
```

### 12.4. Паттерн статусов

**Всегда** использовать shared-хелперы из `shared/utils/roadmap.ts`:
- Не создавать локальные маппер-функции для roadmap-статусов
- CSS-классы: только `roadmapStatusCssClass()` → `rm-status--*`
- Метки: только `roadmapStatusLabel()` → русские названия
- Иконки: только `roadmapStatusIcon()` → символы

### 12.5. Паттерн валидации

```typescript
// Предпочтительно: Zod через readValidatedNodeBody
import { readValidatedNodeBody } from '~/server/utils/body'
const body = await readValidatedNodeBody(event, SomeSchema)

// Избегать: чистый readNodeBody без валидации
const body = await readNodeBody(event) // ❌ нет типовой безопасности
```

### 12.6. Паттерн тёмной темы

Используется `useThemeToggle()` composable:
```typescript
const { isDark, toggleTheme } = useThemeToggle()
```

CSS-переменные компонента определяются в `html.dark .<root-class>`:
```css
.my-component { --my-bg: #fff; --my-text: #1a1a1a; }
html.dark .my-component { --my-bg: #151517; --my-text: #f2f2f2; }
```

### 12.7. Чек-лист для нового компонента

- [ ] Уникальный CSS-префикс (проверить по карте в § 6.2)
- [ ] Props типизированы через `defineProps<{ ... }>()`
- [ ] API-вызовы через `useFetch()` / `$fetch()` (не axios)
- [ ] Статусы roadmap/work — через shared-хелперы
- [ ] Каталожные значения — через `shared/types/catalogs.ts`
- [ ] Dark mode переменные определены
- [ ] Scoped styles (`<style scoped>`)
- [ ] Компонент < 500 строк (иначе — декомпозировать)

### 12.8. Чек-лист для нового API-маршрута

- [ ] Проверка аутентификации в начале handler'а
- [ ] Валидация body через Zod-схему
- [ ] Query parsing через `getQuery(event)` (не ручной URLSearchParams)
- [ ] Использование shared-констант для enum-значений
- [ ] Нормализация статусов через `normalizeRoadmapStatus()` / `normalizeWorkStatus()`
- [ ] Batch-операции вместо циклов INSERT/UPDATE

---

> **Этот документ — живой справочник.** Обновляйте его при добавлении новых модулей, компонентов или API-маршрутов.
