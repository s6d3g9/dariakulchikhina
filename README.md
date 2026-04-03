# Daria Design Studio — CRM/ERP для дизайн-студии интерьеров

Репозиторий содержит несколько продуктовых контуров: основную Nuxt-платформу, встроенный project/chat контур, standalone messenger и отдельный communications relay service.

Основная платформа обслуживает три роли:

| Роль | Канонический вход | Защищённый маршрут | Возможности |
|------|-------------------|--------------------|-------------|
| **Дизайнер / Админ** | `/login?role=admin` (`/admin/login` как alias) | `/admin` | Полное управление проектами, клиентами, подрядчиками, галереей, документами |
| **Клиент** | `/login?role=client` (`/client/login`, `/project/login` как alias) | `/client/:slug`, `/project/:slug` | Просмотр страниц проекта, заполнение брифа, контактных данных, паспортных данных |
| **Подрядчик** | `/login?role=contractor` (`/contractor/login` как alias) | `/contractor/:id` | Просмотр задач, загрузка фото, комментарии, редактирование профиля |

Отдельные контуры репозитория:

- `messenger/web` + `messenger/core` — самостоятельный messenger-продукт.
- `services/communications-service` — relay/signaling сервис для communications.

---

## Стек технологий

| Слой | Технология | Версия |
|------|-----------|--------|
| Фреймворк | Nuxt | 4.3.x |
| UI | Vue 3 Composition API + @nuxt/ui 3 | — |
| Стили | Tailwind CSS 4 + Glassmorphism custom CSS | — |
| Стейт | Main app: composables + `useState()`; Pinia подключён как reference/опция | — |
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
├── app/                          # Основная Nuxt 4 платформа
│   ├── components/               # Компоненты admin / client / UI / chat
│   ├── composables/              # Main app state через composables + useState()
│   ├── layouts/                  # admin, contractor, default
│   ├── middleware/               # admin, client, contractor, admin-project-canonical
│   ├── pages/                    # admin / client / contractor / project / chat + auth
│   ├── plugins/                  # Клиентские плагины
│   ├── assets/css/main.css       # Глобальные стили основной платформы
│   └── utils/                    # Клиентские утилиты
├── server/                       # Nitro backend основной платформы
│   ├── api/                      # H3 endpoint-ы
│   ├── db/                       # Drizzle schema, index, migrations
│   ├── middleware/               # security / body / csrf / rate-limit
│   ├── plugins/                  # Nitro plugins
│   ├── utils/                    # auth, body, query, relay, storage, AI helpers
│   └── data/                     # Справочные данные
├── shared/                       # Общие типы, константы и утилиты
├── messenger/                    # Standalone messenger
│   ├── web/                      # Nuxt 4 client-only shell (M3/Vuetify)
│   ├── core/                     # Fastify/WebSocket backend
│   └── ecosystem*.config.cjs     # Runtime / export configs
├── services/
│   └── communications-service/   # Relay / signaling service
├── docs/                         # Документация
├── scripts/                      # Скрипты миграций, deploy, export, seed
└── public/                       # Статика (uploads, generators)
```

---

## База данных — текущая схема main app

Схема: `server/db/schema.ts`. Подключение: `server/db/index.ts` → `useDb()`.

| Домен | Таблицы |
|---|---|
| System / Access | `users`, `admin_settings` |
| Project Core | `projects`, `page_configs`, `page_content`, `clients` |
| Execution | `work_status_items`, `work_status_item_photos`, `work_status_item_comments` |
| Files / Docs | `uploads`, `documents`, `gallery_items`, `project_extra_services` |
| Contractors | `contractors`, `project_contractors`, `contractor_documents` |
| Designers | `designers`, `designer_projects`, `designer_project_clients`, `designer_project_contractors` |
| Sellers | `sellers`, `seller_projects` |
| Managers | `managers`, `manager_projects` |

Отдельной таблицы `roadmap_stages` в текущей схеме нет: фазовый каркас и project-control логика собираются из shared contracts, project данных и orchestration-слоя.

---

## API — основные контуры

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
| GET | `/api/projects` | Список проектов + task counts |
| POST | `/api/projects` | Создание проекта + bootstrap страниц и preset profile |
| GET/PUT/DELETE | `/api/projects/:slug` | CRUD проекта |
| PUT | `/api/projects/:slug/status` | Обновление статуса |
| PUT | `/api/projects/:slug/client-profile` | Обновление профиля клиента |
| GET/PUT | `/api/projects/:slug/page-content` | Контент страницы |
| GET/PUT | `/api/projects/:slug/page-answers` | Ответы на brief |
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

Фазовая и step-логика задаётся через `shared/types/catalogs.ts`, `shared/types/phase-steps.ts` и `shared/constants/pages.ts`, а не через отдельную roadmap-таблицу.

---

## Shared-модули (общий код фронт + бэк)

### Типы (`shared/types/`)

| Файл | Экспорты |
|------|---------|
| `auth.ts` | auth-related shared schemas |
| `project.ts` | `HybridControlSchema`, `ProjectSchema`, `CreateProjectSchema`, `UpdateProjectSchema`, project-control типы |
| `contractor.ts` | `ContractorSchema`, `CreateContractorSchema`, `UpdateContractorSchema` |
| `communications.ts` | room/message/signal/E2EE schemas и bootstrap contracts |
| `catalogs.ts` | 25+ справочников: `PROJECT_STATUSES`, `PROJECT_PHASES`, `CONTRACTOR_WORK_TYPES`, `WORK_TYPE_STAGES`... |
| `phase-steps.ts` | `PHASE_STEPS` — 7 фаз × 1–5 шагов с описаниями бизнес/IT/артефакты |
| `navigation.ts` | `NavigationNode` и recursive navigation schema |
| `gallery.ts` | `GalleryItem`, `GalleryFilterState`, `GalleryViewMode` |
| `material.ts` | 8 интерфейсов свойств, `MATERIAL_PROPERTY_GROUPS`, `MATERIAL_PRESETS` |
| `designer.ts` | `DESIGNER_SERVICE_TEMPLATES` (25), `DESIGNER_PACKAGE_TEMPLATES` (5), Zod-схемы |
| `design-mode.ts`, `design-modules.ts` | design mode / modules contracts |

### Утилиты (`shared/utils/`)

| Файл | Экспорты |
|------|---------|
| `work-status.ts` | `normalizeWorkStatus()` (7 канонических), `workStatusLabel/Icon/CssClass()`, `workTypeLabel()` |
| `status-maps.ts` | shared карты статусов договоров и оплат |
| `project-control.ts` | bootstrap и orchestration helper-ы project control |
| `project-control-timeline.ts` | timeline/date/scale helper-ы hybrid control |

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
| `useAdminNav()` | Структура и группы навигации admin shell | admin layout |
| `useGallery()` | CRUD галереи + reorder + фильтрация | AdminGallery |
| `useAdminProjectRelations()` | Связи проекта с клиентами/подрядчиками/дизайнерами | admin project shell |
| `useContractorCabinet()` | Полный стейт кабинета подрядчика | AdminContractorCabinet |
| `useDesignerCabinet()` | Полный стейт кабинета дизайнера | AdminDesignerCabinet |
| `useTimestamp()` | Метка времени сохранения (savedAt / markSaved) | Все Admin*-фазные компоненты |
| `useStatusColor()` | Цвет статуса по полю формы | AdminFirstContact |
| `useProjectCommunicationsBootstrap()` | Bootstrap project communications room и actor context | project control / communications |
| `useStandaloneCommunicationsBootstrap()` | Bootstrap встроенного standalone chat контура | chat shell |

---

## Layouts и Middleware

### Layouts

| Layout | Файл | Используется | Описание |
|--------|------|-------------|---------|
| `default` | `layouts/default.vue` | `/`, `/login`, `/register`, `/recover`, alias login-страницы, client/project flow | Базовый public/auth layout |
| `admin` | `layouts/admin.vue` | `/admin/**` | Полная навигация + UIDesignPanel + sidebar |
| `contractor` | `layouts/contractor.vue` | `/contractor/**` | Header подрядчика |

### Middleware

| Middleware | Файл | Проверяет | Редирект при ошибке |
|-----------|------|----------|-------------------|
| `admin` | `middleware/admin.ts` | role ∈ {`admin`, `designer`} | `/admin/login` |
| `client` | `middleware/client.ts` | role ∈ {`client`, `designer`, `admin`} + проверка `projectSlug` для client-session | `/client/login` |
| `contractor` | `middleware/contractor.ts` | role ∈ {`contractor`, `designer`, `admin`} + self-guard по `contractorId` | `/contractor/login` |

Role-specific login pages остаются alias-маршрутами и редиректят в единый auth-flow `/login?role=...`.

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
| `.ws-status--pending/planned/progress/done/paused/cancelled/skipped` | Цветовые классы статусов работ |

### CSS-переменные

```
--glass-bg, --glass-border, --glass-shadow, --glass-text
--ws-color-*, --ws-bg-*
--ds-* (дизайн-токены: --ds-font-body, --ds-btn-radius, --ds-accent...)
```

Каждый компонент имеет уникальный CSS-префикс (`afc-`, `asb-`, `arm-`...) для scoped-стилей.

---

## Безопасный деплой

Скрипт `scripts/deploy-safe.sh` реализует стратегию с fallback:

1. **Preflight** — проверка утилит, SSH, серверных инструментов
2. **Sync** — git sync `origin/main` на сервер
3. **Build** — `pnpm install + pnpm build` на сервере
4. **Fallback** — если серверная сборка падает → локальная сборка + rsync `.output`
5. **Restart** — `pm2 restart`
6. **Health check** — curl с 20-секундным таймаутом

Перед деплоем скрипт автоматически:

1. Сохраняет изменения в git (`add/commit/push` в `main`)
2. Делает локальный snapshot в `builds/pre-deploy` (`.bundle` + `.meta`)
3. Ротирует служебные ветки деплоя: `deploy/latest` (текущая версия деплоя) и `deploy/previous` (версия до последнего деплоя)

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

### Ветки деплоя и откат

Проверка текущих SHA для веток деплоя:

```bash
git fetch origin
git log --oneline -1 origin/deploy/latest
git log --oneline -1 origin/deploy/previous
```

Быстрый откат `main` к версии до последнего деплоя:

```bash
git checkout main
git fetch origin
git reset --hard origin/deploy/previous
git push --force-with-lease origin main
pnpm deploy:safe:prod
```

Восстановление из локального snapshot:

```bash
pnpm run snapshot:list
pnpm run snapshot:restore:last
```

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
5. [Правила синхронизации фаз и project control](docs/roadmap-sync-rules.md)
6. [BPMN: Workflow премиальной квартиры](docs/bpmn/apartment-premium-workflow.md)

---

## Правило по авторизации

- **Никогда** не внедрять PIN-авторизацию как способ входа
- Все изменения в auth-flow — только согласованные способы
- При неоднозначности — согласовать с владельцем проекта
