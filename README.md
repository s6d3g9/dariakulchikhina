# Daria Design Studio — CRM/ERP для дизайн-студии интерьеров

Приватный кабинет для трёх ролей:

| Роль | Вход | Маршрут | Возможности |
|------|------|---------|-------------|
| **Дизайнер / Админ** | email + пароль | `/admin` | Полное управление проектами, клиентами, подрядчиками, галереей, документами |
| **Клиент** | slug проекта | `/client/:slug` | Просмотр страниц проекта, заполнение брифа, контактных данных, паспортных данных |
| **Подрядчик** | id + slug | `/contractor/:id` | Просмотр задач, загрузка фото, комментарии, редактирование профиля |

---

## Стек технологий

| Слой | Технология | Версия |
|------|-----------|--------|
| Фреймворк | Nuxt | 4.3.x |
| UI | Vue 3 Composition API + @nuxt/ui 3 | — |
| Стили | Tailwind CSS 4 + Glassmorphism custom CSS | — |
| Стейт | Pinia (подключён, не активен) | — |
| Валидация | Zod | 3.24.x |
| БД | PostgreSQL 16 (Docker) | — |
| ORM | Drizzle ORM | 0.41.x |
| Кэш | Redis 7 (Docker) | — |
| Аутентификация | HMAC-подписанные cookie-сессии | — |
| Деплой | PM2 + rsync + deploy-safe.sh | — |

---

## Быстрый запуск

```bash
# 1. Запустить PostgreSQL + Redis
docker compose up -d

# 2. Установить зависимости
pnpm install

# 3. Запустить dev-сервер
pnpm dev
```

Приложение доступно на `http://localhost:3000`.

### Команды БД

```bash
pnpm db:generate   # Сгенерировать миграции
pnpm db:migrate    # Применить миграции
pnpm db:push       # Синхронизировать схему (без миграций)
pnpm db:studio     # Drizzle Studio (GUI)
```

---

## Структура проекта

```
├── app/                          # Nuxt 4 app directory
│   ├── components/               # 60 Vue-компонентов
│   │   ├── Admin*.vue            # Компоненты админки (30+)
│   │   ├── Client*.vue           # Клиентские компоненты (15+)
│   │   ├── Gallery*.vue          # Компоненты галереи
│   │   ├── Material*.vue         # Компоненты свойств материалов
│   │   ├── UI*.vue               # Дизайн-система / тема
│   │   ├── App*.vue              # Переиспользуемые UI-примитивы
│   │   └── admin/                # Подкомпоненты навигации
│   ├── composables/              # 10 composables
│   ├── layouts/                  # 3 layout'a (default, admin, contractor)
│   ├── middleware/               # 3 middleware (admin, client, contractor)
│   ├── pages/                    # 19 страниц
│   ├── plugins/                  # 4 клиентских плагина
│   ├── assets/css/main.css       # Глобальные стили (2055 строк)
│   └── utils/                    # Клиентские утилиты
├── server/                       # Nitro backend
│   ├── api/                      # 95 API-маршрутов
│   ├── db/                       # Drizzle ORM (schema + connection)
│   ├── middleware/               # 4 серверных middleware (security, rate-limit, body-limit, CSRF)
│   ├── plugins/                  # 2 серверных плагина (CSP nonce, error sanitizer)
│   ├── utils/                    # 6 серверных утилит
│   └── data/                     # Справочные данные (suggestions.json)
├── shared/                       # Общий код (фронт + бэк)
│   ├── types/                    # 12 файлов типов и Zod-схем
│   ├── constants/                # 2 файла констант (pages, profile-fields)
│   └── utils/                    # 2 файла утилит (roadmap, work-status)
├── docs/                         # Документация
├── scripts/                      # Скрипты миграций и деплоя
└── public/                       # Статика (uploads, furniture-generator)
```

---

## База данных — 19 таблиц

Схема: `server/db/schema.ts`. Подключение: `server/db/index.ts` → `useDb()`.

| # | Таблица | Назначение |
|---|---------|-----------|
| 1 | `users` | Администраторы / дизайнеры |
| 2 | `projects` | Проекты (slug, title, status, pages[], profile{}) |
| 3 | `page_configs` | Глобальные настройки страниц |
| 4 | `page_content` | Содержимое страниц проекта (projectId + pageSlug → content{}) |
| 5 | `contractors` | Подрядчики (master / company + parentId для иерархии) |
| 6 | `project_contractors` | Связь проект ↔ подрядчик (M:N) |
| 7 | `work_status_items` | Задачи / работы (projectId, contractorId, status, workType) |
| 8 | `work_status_item_photos` | Фото к задачам |
| 9 | `work_status_item_comments` | Комментарии к задачам |
| 10 | `roadmap_stages` | Этапы дорожной карты (projectId, stageKey, status, sortOrder) |
| 11 | `uploads` | Загруженные файлы |
| 12 | `gallery_items` | Галерея (category, title, image, tags[], properties{}) |
| 13 | `clients` | Клиенты (name, phone, email, brief{}) |
| 14 | `documents` | Документы (проект ↔ тип → файл) |
| 15 | `contractor_documents` | Документы подрядчиков |
| 16 | `designers` | Дизайнеры (профиль, услуги, портфолио) |
| 17 | `designer_projects` | Проекты дизайнера (M:N дизайнер ↔ проект) |
| 18 | `designer_project_clients` | Клиенты проекта дизайнера |
| 19 | `designer_project_contractors` | Подрядчики проекта дизайнера |

---

## API — 95 маршрутов

### Аутентификация (`/api/auth/`)

| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/api/auth/login` | Вход admin/дизайнера (email + password, auto-create при первом входе) |
| POST | `/api/auth/logout` | Выход admin |
| GET | `/api/auth/me` | Текущая сессия (designer / client / contractor) |
| POST | `/api/auth/client-login` | Вход клиента (slug проекта) |
| POST | `/api/auth/client-id-logout` | Выход клиента |
| GET | `/api/auth/client-open` | Редирект (legacy) |
| POST | `/api/auth/contractor-login` | Вход подрядчика (id + slug) |
| POST | `/api/auth/contractor-logout` | Выход подрядчика |

### Проекты (`/api/projects/`)

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/projects` | Список с roadmap summary + task counts |
| POST | `/api/projects` | Создание (+ roadmap из шаблона) |
| GET/PUT/DELETE | `/api/projects/:slug` | CRUD проекта |
| PUT | `/api/projects/:slug/status` | Обновление статуса |
| PUT | `/api/projects/:slug/client-profile` | Обновление профиля клиента |
| GET/PUT | `/api/projects/:slug/page-content` | Контент страницы |
| GET/PUT | `/api/projects/:slug/page-answers` | Ответы на brief |
| GET/PUT | `/api/projects/:slug/roadmap` | Roadmap-этапы (full array upsert) |
| PATCH | `/api/projects/:slug/roadmap-stage` | Обновление одного этапа по stageKey |
| GET/PUT | `/api/projects/:slug/work-status` | Задачи проекта |
| GET/POST | `/api/projects/:slug/work-status/:itemId/comments` | Комментарии |
| GET | `/api/projects/:slug/work-status/:itemId/photos` | Фото задачи |
| GET/POST/DELETE | `/api/projects/:slug/contractors` | Подрядчики проекта |
| GET/POST/DELETE | `/api/projects/:slug/designers` | Дизайнеры проекта |

### Подрядчики (`/api/contractors/`)

| Метод | Путь | Описание |
|-------|------|----------|
| GET/POST | `/api/contractors` | Список / создание |
| GET/PUT/DELETE | `/api/contractors/:id` | CRUD |
| PUT | `/api/contractors/:id/self` | Самообновление (contractor) |
| GET | `/api/contractors/:id/projects` | Проекты подрядчика |
| GET | `/api/contractors/:id/staff` | Сотрудники компании |
| GET/POST | `/api/contractors/:id/work-items` | Задачи подрядчика |
| PUT | `/api/contractors/:id/work-items/:itemId` | Обновление задачи |
| GET/POST | `/api/contractors/:id/work-items/:itemId/comments` | Комментарии |
| GET/POST | `/api/contractors/:id/work-items/:itemId/photos` | Фото задачи |
| DELETE | `/api/contractors/:id/work-items/:itemId/photos/:photoId` | Удаление фото |
| GET/POST | `/api/contractors/:id/documents` | Документы подрядчика |
| DELETE | `/api/contractors/:id/documents/:docId` | Удаление документа |

### Клиенты (`/api/clients/`)

| Метод | Путь | Описание |
|-------|------|----------|
| GET/POST | `/api/clients` | Список / создание |
| PUT/DELETE | `/api/clients/:id` | Обновление / удаление |
| POST | `/api/clients/:id/link-project` | Привязка к проекту |
| POST | `/api/clients/:id/unlink-project` | Отвязка от проекта |
| GET/POST | `/api/clients/:id/documents` | Документы клиента |
| DELETE | `/api/clients/:id/documents/:docId` | Удаление документа |

### Дизайнеры (`/api/designers/`)

| Метод | Путь | Описание |
|-------|------|----------|
| GET/POST | `/api/designers` | Список / создание |
| GET/PUT/DELETE | `/api/designers/:id` | CRUD |
| POST | `/api/designers/:id/create-project` | Создание проекта |
| POST | `/api/designers/:id/add-client` | Привязка клиента |
| POST | `/api/designers/:id/add-contractor` | Привязка подрядчика |
| POST | `/api/designers/:id/remove-link` | Отвязка |
| PUT | `/api/designers/:id/project` | Обновление проекта |
| GET/POST | `/api/designers/:id/documents` | Документы |
| DELETE | `/api/designers/:id/documents/:docId` | Удаление |

### Прочее

| Метод | Путь | Описание |
|-------|------|----------|
| GET/POST/PUT/DELETE | `/api/documents[/:id]` | CRUD документов |
| GET | `/api/documents/context` | Контекст для шаблонов |
| GET/POST | `/api/gallery` | Галерея — список / создание |
| PUT/DELETE | `/api/gallery/:id` | CRUD элементов |
| PATCH | `/api/gallery/reorder` | Перетасовка порядка |
| GET/PUT | `/api/page-configs` | Настройки страниц |
| GET/POST | `/api/roadmap-templates` | Шаблоны roadmap |
| PUT/DELETE | `/api/roadmap-templates/:key` | CRUD custom шаблонов |
| GET | `/api/public/projects` | Публичный список |
| POST | `/api/upload` | Загрузка файлов (admin only) |
| GET | `/api/suggestions` | Автодополнение из справочника |
| GET | `/api/suggest/address` | Прокси Yandex Maps suggest |

---

## Серверная безопасность

| Уровень | Файл | Механизм |
|---------|------|----------|
| Middleware | `00-security-headers.ts` | CSP, X-Frame-Options, HSTS, X-Content-Type-Options |
| Middleware | `01-rate-limit.ts` | In-memory sliding window (auth: 10/мин, upload: 30/мин, api: 200/мин) |
| Middleware | `02-body-size-limit.ts` | JSON 1 МБ, multipart 25 МБ |
| Middleware | `03-csrf.ts` | Double Submit Cookie |
| Plugin | `csp-nonce.ts` | Nonce для inline `<script>` |
| Plugin | `error-sanitizer.ts` | Скрытие stack trace и SQL-ошибок в production |
| Utils | `auth.ts` | HMAC-подписанные сессии (30 дней), bcrypt-хеширование паролей |
| Utils | `upload-validation.ts` | MIME, расширение, magic bytes, лимит 20 МБ |

---

## Фазы проекта

Каждый проект проходит 7 фаз с 20 подшагами:

| Фаза | Ключ | Подшаги |
|------|------|---------|
| 0 · Инициация | `lead` | 0.1 Первичный контакт → 0.2 Брифинг → 0.3 Обмеры → 0.4 ТЗ и договор |
| 1 · Концепция | `concept` | 1.1 Планировки → 1.2 Мудборд → 1.3 Согласование |
| 2 · Рабочий проект | `working_project` | 2.1 Рабочие чертежи → 2.2 Спецификации → 2.3 Инженерия → 2.4 Финальный альбом |
| 3 · Закупки | `procurement` | 3.1 Список закупок → 3.2 Поставщики → 3.3 Статус закупок |
| 4 · Строительство | `construction` | 4.1 План работ → 4.2 Журнал работ → 4.3 Фото объекта |
| 5 · Сдача | `commissioning` | 5.1 Дефектная ведомость → 5.2 Акт приёмки → 5.3 Подпись клиента |
| ✓ · Завершён | `completed` | — |

Статусы этапов roadmap: `pending` → `in_progress` → `done` | `skipped`

---

## Shared-модули (общий код фронт + бэк)

### Типы (`shared/types/`)

| Файл | Экспорты |
|------|---------|
| `auth.ts` | `LoginSchema` (Zod) |
| `project.ts` | `ClientProfileSchema` (153+ поля), `ProjectSchema`, `CreateProjectSchema` |
| `contractor.ts` | `ContractorSchema`, `CreateContractorSchema`, `UpdateContractorSchema` |
| `roadmap.ts` | `StageStatus`, `RoadmapStageSchema` |
| `work_status.ts` | `WorkItemStatus`, `WorkStatusItemSchema` |
| `catalogs.ts` | 25+ справочников: `PROJECT_STATUSES`, `PROJECT_PHASES`, `CONTRACTOR_WORK_TYPES`, `WORK_TYPE_STAGES`... |
| `phase-steps.ts` | `PHASE_STEPS` — 7 фаз × 1–5 шагов с описаниями бизнес/IT/артефакты |
| `gallery.ts` | `GalleryItem`, `GalleryFilterState`, `GalleryViewMode` |
| `material.ts` | 8 интерфейсов свойств, `MATERIAL_PROPERTY_GROUPS`, `MATERIAL_PRESETS` |
| `designer.ts` | `DESIGNER_SERVICE_TEMPLATES` (25), `DESIGNER_PACKAGE_TEMPLATES` (5), Zod-схемы |
| `roadmap-template.ts` | `RoadmapTemplateSchema` |
| `roadmap-templates.ts` | `ROADMAP_TEMPLATES` — 24 встроенных шаблона |

### Утилиты (`shared/utils/`)

| Файл | Экспорты |
|------|---------|
| `roadmap.ts` | `normalizeRoadmapStatus()` (40+ алиасов → 4 канонических), `roadmapStatusLabel/Icon/CssClass()`, `deriveProjectPhaseFromRoadmap()` |
| `work-status.ts` | `normalizeWorkStatus()` (7 канонических), `workStatusLabel/Icon/CssClass()`, `workTypeLabel()` |

### Константы (`shared/constants/`)

| Файл | Экспорты |
|------|---------|
| `pages.ts` | `PROJECT_PAGES` (33 стр.), `getClientPages()`, `getAdminPages()`, `getAdminNavGroups()`, `PHASE_LABELS`, `CORE_PAGES` |
| `profile-fields.ts` | `MESSENGER_OPTIONS`, `OBJECT_TYPE_OPTIONS`, `BRIEF_*_OPTIONS`, `CLIENT_PROFILE_*_KEYS`, `createEmptyClientProfileDraft()` |

---

## Composables

| Composable | Назначение | Используется в |
|------------|-----------|---------------|
| `useDesignSystem()` | Управление дизайн-токенами (шрифты, кнопки, цвета, анимации) | UIDesignPanel, admin layout |
| `useUITheme()` | Переключение тем (с пресетами) | UIDesignPanel, UIThemePicker, плагины |
| `useThemeToggle()` | Переключение тёмной/светлой темы | app.vue, все layouts |
| `useRoadmapBus()` | Event bus для синхронизации roadmap-компонентов | AdminRoadmap, AdminVerticalRoadmap, admin pages |
| `useGallery()` | CRUD галереи + reorder + фильтрация | AdminGallery |
| `useContractorCabinet()` | Полный стейт кабинета подрядчика | AdminContractorCabinet |
| `useDesignerCabinet()` | Полный стейт кабинета дизайнера | AdminDesignerCabinet |
| `useTimestamp()` | Метка времени сохранения (savedAt / markSaved) | Все Admin*-фазные компоненты |
| `useStatusColor()` | Цвет статуса по полю формы | AdminFirstContact |
| `useUpload()` | Загрузка файлов через `/api/upload` | Различные компоненты |

---

## Layouts и Middleware

### Layouts

| Layout | Файл | Используется | Описание |
|--------|------|-------------|---------|
| `default` | `layouts/default.vue` | `/`, login-страницы, клиентские страницы | Минимальный: header + slot |
| `admin` | `layouts/admin.vue` | `/admin/**` | Полная навигация + UIDesignPanel + sidebar |
| `contractor` | `layouts/contractor.vue` | `/contractor/**` | Header подрядчика |

### Middleware

| Middleware | Файл | Проверяет | Редирект при ошибке |
|-----------|------|----------|-------------------|
| `admin` | `middleware/admin.ts` | role = `designer` | `/admin/login` |
| `client` | `middleware/client.ts` | role ∈ {`client`, `designer`, `admin`} + slug | `/client/login` |
| `contractor` | `middleware/contractor.ts` | role ∈ {`contractor`, `designer`, `admin`} | `/contractor/login` |

---

## Плагины (клиентские)

| Плагин | Назначение |
|--------|-----------|
| `ui-theme.client.ts` | Восстановление темы и дизайн-токенов из localStorage при загрузке |
| `dark-sync.client.ts` | Синхронизация `html.dark` ↔ `body.dark-theme` для дизайн-системы |
| `csrf.client.ts` | Добавление `x-csrf-token` заголовка из cookie ко всем `$fetch` запросам |
| `comp-inspector.client.ts` | Dev-режим: `data-comp-name` атрибуты к DOM для отладки |

---

## CSS-система

Glassmorphism + Tailwind CSS 4 + Scoped CSS.

### Глобальные классы (`app/assets/css/main.css`)

| Класс | Назначение |
|-------|-----------|
| `.glass-page` | Обёртка страницы с gradient overlay |
| `.glass-surface` | Стеклянный фон с blur |
| `.glass-card` | Карточка: surface + border-radius |
| `.glass-chip` | Чип / тег |
| `.glass-input` | Поле ввода |
| `.std-sidenav` | Боковая навигация |
| `.rm-status--pending/progress/done/skipped` | Цветовые классы roadmap |

### CSS-переменные

```
--glass-bg, --glass-border, --glass-shadow, --glass-text
--rm-color-pending, --rm-color-progress, --rm-color-done, --rm-color-skipped
--ds-* (дизайн-токены: --ds-font-body, --ds-btn-radius, --ds-accent...)
```

Каждый компонент имеет уникальный CSS-префикс (`afc-`, `asb-`, `arm-`...) для scoped-стилей.

---

## Безопасный деплой

Скрипт `scripts/deploy-safe.sh` реализует стратегию с fallback:

1. **Preflight** — проверка утилит, SSH, серверных инструментов
2. **Sync** — rsync исходников на сервер
3. **Build** — `pnpm install + pnpm build` на сервере
4. **Fallback** — если серверная сборка падает → локальная сборка + rsync `.output`
5. **Restart** — `pm2 restart`
6. **Health check** — curl с 20-секундным таймаутом

### Команды деплоя

```bash
pnpm deploy:safe:prod           # Полный деплой на прод
pnpm deploy:safe:prod:fast      # Без preflight-проверок
pnpm deploy:safe:prod:dry-run   # Без restart и health check
pnpm deploy:safe:prod:preflight # Только проверки окружения
```

### Метрики деплоя

```bash
pnpm deploy:metrics             # Последние 20 записей
pnpm deploy:metrics:follow      # Онлайн-просмотр
```

Метрики хранятся в `logs/deploy-metrics.log`.

---

## Статистика кодовой базы

| Метрика | Значение |
|---------|---------|
| Компоненты | 60 |
| Страницы | 19 |
| API-маршруты | 95 |
| Composables | 10 |
| Layouts | 3 |
| Middleware (клиентские) | 3 |
| Серверные middleware | 4 |
| Таблицы БД | 19 |
| Shared types | 12 файлов |
| Строк в компонентах | ~23 400 |
| Строк в страницах | ~8 200 |
| Строк CSS (глобальный) | 2 055 |

---

## Архитектурная документация

1. [Архитектура программного стека](docs/architecture/01-tech-stack.md)
2. [Архитектура взаимодействия компонентов](docs/architecture/02-components-interaction.md)
3. [Структура сайта и маршрутов](docs/architecture/03-site-structure.md)
4. [Архитектура хранения данных](docs/architecture/04-data-architecture.md)
5. [Правила синхронизации Roadmap](docs/roadmap-sync-rules.md)
6. [BPMN: Workflow премиальной квартиры](docs/bpmn/apartment-premium-workflow.md)

## UI-документация и RAG-файлы

| Файл | Назначение |
|------|-----------|
| [UI_INTERFACE.md](docs/UI_INTERFACE.md) | Полная документация интерфейса: структура, алгоритмы переходов, компоненты, правила отображения |
| [UI_COMPACT.md](docs/UI_COMPACT.md) | Краткая выжимка для быстрой справки разработчиков и AI-агентов |
| [UI_STYLES.md](docs/UI_STYLES.md) | Дизайн-токены, CSS-переменные, темы, UIDesignPanel |
| [rag/01-system-overview.md](docs/rag/01-system-overview.md) | RAG: обзор системы, стек, БД |
| [rag/02-pages-navigation.md](docs/rag/02-pages-navigation.md) | RAG: маршруты, навигация, переходы |
| [rag/03-components.md](docs/rag/03-components.md) | RAG: каталог всех компонентов Vue |
| [rag/04-design-tokens.md](docs/rag/04-design-tokens.md) | RAG: дизайн-токены, CSS custom properties, темы |
| [rag/05-api-data.md](docs/rag/05-api-data.md) | RAG: все API-эндпоинты и структуры данных |

---

## Правило по авторизации

- **Никогда** не внедрять PIN-авторизацию как способ входа
- Все изменения в auth-flow — только согласованные способы
- При неоднозначности — согласовать с владельцем проекта
