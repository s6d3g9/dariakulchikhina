# Полная инвентаризация проекта

> Nuxt 4 + Drizzle ORM + PostgreSQL 16. Дизайн-студия: кабинет admin / client / contractor.  
> **Обновлено: 2026-03-03** — отмечены исправленные проблемы (✅ fixed). Полный справочник → [ARCHITECTURE.md](ARCHITECTURE.md)

---

## 1. `app/components/` — Vue-компоненты

### Admin-компоненты

| Файл | Описание | CSS-префикс | Заметки |
|------|---------|-------------|---------|
| `AdminClientProfile.vue` | Многосекционная форма профиля клиента (личное/контакты/объект/проект/стиль жизни) + chip-селекторы из каталогов | `acp-` | ⚠ Hardcoded массивы `familyStatus`, `objectType`, `objectCondition`, `hasBalcony`, `parking`, `paymentMethod`, `referralSource` как инлайн-строки вместо shared-констант |
| `AdminConceptApproval.vue` | Согласование концепции: рендеры, одобрение, блокировка геометрии, переход в фазу `working_project` | `aca-` | ⚠ Locальная `statusColor` карта (hardcoded hex: gray/blue/yellow/red/green) |
| `AdminContractorsProfile.vue` | Привязка/отвязка подрядчиков к проекту | `acp-` | ⚠ **Коллизия CSS-префикса** с `AdminClientProfile`. Локальная `workTypeLabel()` — **дубликат** |
| `AdminFirstContact.vue` | Форма первичного контакта/лида с интеграцией Яндекс.Карт | `afc-` | ✅ Исправлено: заменена сломанная логика step-completion на `profile._stepsDone`. ⚠ Hardcoded инлайн `<option>` |
| `AdminGallery.vue` | CRUD галереи с glass-дизайном, фильтры по тегам | `agal-` | Активно использует glass design system |
| `AdminMaterials.vue` | Редактор материалов (JSON-структура с вкладками/группами) | `am-` | Glass classes |
| `AdminMoodboard.vue` | Мудборд: стилевые теги, картинки по категориям, ссылки | `amb-` | ⚠ Hardcoded `STYLE_TAGS`, `IMAGE_CATS` — можно вынести в shared |
| `AdminPageContent.vue` | Мета-роутер: делегирует в `AdminMaterials` (tabs) или `AdminTZ` (sections) по структуре контента | `apc-` | ⚠ Tailwind-утилиты смешаны со scoped CSS |
| `AdminPhaseDetail.vue` | Просмотр фазы проекта с навигацией по шагам | `pd-` | ✅ Исправлено: `stepToSlug` расширен с 7 до 20 записей (фазы 0-5) |
| `AdminProjectPhase.vue` | Горизонтальный трекер фаз (stepper) | `phase-` | Импортирует `PROJECT_PHASES` из shared catalogs |
| `AdminRoadmap.vue` | Редактор этапов роадмапа + выбор шаблона | `rm-` | ⚠ Hardcoded `scenarioOptions`; Tailwind + scoped CSS mix |
| `AdminSiteSurvey.vue` | Обмеры: MEP-чеклист, загрузка файлов по типам | `ass-` | ✅ Опечатка исправлена. ⚠ Hardcoded `mepChecks`, `fileTypeLabel`; зелёный цвет `#4caf50` ≠ другие (`#5caa7f`) |
| `AdminSmartBrief.vue` | Комплексная анкета-бриф с автотегами, требованиями по типу объекта | `asb-` | Импортирует `~/utils/brief-requirements`; ~500 строк — самый большой компонент |
| `AdminSpacePlanning.vue` | Планировки: загрузка файлов, статус одобрения | `asp-` | — |
| `AdminToRContract.vue` | ТЗ, договор, инвойс + переход фазы | `ator-` | ⚠ Статусные цвета (`#9e9e9e`, `#2196f3`, `#4caf50`, `#f44336`) — **другая палитра** чем у остальных |
| `AdminTZ.vue` | Редактор технического задания (секции/вопросы JSON) | `atz-` | Glass classes; зеркалит структуру `AdminMaterials` |
| `AdminWorkStatus.vue` | Управление задачами: детали, комментарии, фото, фильтры, бюджет | `ws-` | ⚠ Локальный `STATUS_LABELS`; 518+ строк |

### App Utility Components

| Файл | Описание | CSS-префикс | Заметки |
|------|---------|-------------|---------|
| `AppAddressInput.vue` | Автокомплит адреса через `/api/suggest/address` (Dadata) | `aai-` | ⚠ **Global (unscoped) CSS** для dropdown. Использует `<Teleport to="body">` |
| `AppAutocomplete.vue` | Автокомплит из `/api/suggestions` (JSON) | `ac-` / `autocomplete-` | Glass classes |
| `AppDatePicker.vue` | Кастомный date-picker с русской локалью | `dp-` | ⚠ Hardcoded русские названия месяцев/дней. `<Teleport to="body">` |

### Client-компоненты

| Файл | Описание | CSS-префикс | Заметки |
|------|---------|-------------|---------|
| `ClientContactDetails.vue` | Форма редактирования контактных данных клиента | `ccd-` | ⚠ **Дублирует** список полей из `AdminClientProfile`; glass-card |
| `ClientContractorsProfile.vue` | Read-only список подрядчиков проекта для клиента | `cc-` | ⚠ Локальная `workTypeLabel()` — **дубликат** (уже 3-е определение!) |
| `ClientContracts.vue` | Read-only просмотр договоров/инвойсов | `cct-` | ⚠ Локальные `contractStatusMap`, `paymentStatusMap` — **дублируют** аналогичные из `AdminToRContract` |
| `ClientDesignAlbum.vue` | Галерея файлов с лайтбоксом и фильтрами по категориям | `cda-` | ⚠ Локальные `CAT_MAP`, `fileIcon()`, `fileExt()`; CSS custom props `--c-*` (неконсистентно с `--acp-*`, `--glass-*`) |
| `ClientInitiation.vue` | Фаза 0 — визард инициации проекта (4 шага, прогресс, артефакты, CTA) | `ci-` | Большой (~280 строк); CSS custom props `--c-*`; импортирует `BRIEF_COMPLETION_KEYS` |
| `ClientPageContent.vue` | Универсальный renderer для JSON-контента (tabs/sections) с выбором опций, комментариями, кол-вом | — | ~540 строк; debounced auto-save; ⚠ regex-детектор «количественных вопросов» |
| `ClientRoadmap.vue` | Read-only таймлайн роадмапа | `rm-` | ⚠ Локальные `statusLabel()`, `pointClass()`, `statusTextClass()` — **дублируют** shared `roadmapStatusLabel` и пр. |
| `ClientSelfProfile.vue` | Wizard-форма анкеты клиента (4 шага: контакты → объект → стиль → концепция) | `csp-` | Импортирует `shared/constants/profile-fields`; использует `createEmptyClientProfileDraft()` |
| `ClientTimeline.vue` | Таймлайн проекта + команда (подрядчики) | `ctl-` | ⚠ Локальный `WORK_TYPES` маппинг — **дубликат** (`workTypeLabel` — 4-е определение!). Импортирует shared roadmap utils |
| `ClientWorkStatus.vue` | Read-only отображение задач | `ws-` | ⚠ **Коллизия CSS-префикса** с `AdminWorkStatus`; локальные `statusLabel()`, `statusClass()` |

---

## 2. `app/pages/` — Страницы

### Корень
| Файл | Описание | Заметки |
|------|---------|---------|
| `index.vue` | Landing с тремя кнопками входа (admin/client/contractor) | ⚠ Чистый Tailwind (без scoped CSS) |

### `admin/`
| Файл | Описание | Layout/MW | Заметки |
|------|---------|-----------|---------|
| `index.vue` | Список проектов + создание (wizard 2 шага) + роадмап-preview | admin/admin | Импортирует `roadmapStatusLabel` и пр. из shared; ~530 строк |
| `login.vue` | Форма логина (login/password) | default | Tailwind + glass classes |
| `projects/[slug].vue` | Дашборд проекта: sidenav + рендер компонента по `activePage` | admin/admin | ⚠ Hardcoded `allPageSlugsRaw` и `navGroups` — дублируют аналогичные данные в `cabinet.vue` |
| `clients/index.vue` | CRM-карточки клиентов + привязка к проекту + modal CRUD | admin/admin | ~390 строк; glass design |
| `contractors/index.vue` | Список подрядчиков (компании + мастера иерархия) + modal CRUD | admin/admin | ~677 строк; ⚠ Много inline `style=`; hardcoded messenger options `["telegram","whatsapp","viber"]` (lowercase) vs `["Telegram","WhatsApp","Viber"]` в profile-fields (capitalized) |
| `gallery/interiors.vue` | Прокси → `<AdminGallery category="interiors">` | admin/admin | 7 строк |
| `gallery/furniture.vue` | Прокси → `<AdminGallery category="furniture">` | admin/admin | Аналогично |
| `gallery/materials.vue` | Прокси → `<AdminGallery category="materials">` | admin/admin | Аналогично |
| `gallery/art.vue` | Прокси → `<AdminGallery category="art">` | admin/admin | Аналогично |
| `gallery/moodboards.vue` | Прокси → `<AdminGallery category="moodboards">` | admin/admin | Аналогично |
| `pages/index.vue` | CRUD для page configs (slug, title, fontSize) | admin/admin | ⚠ Дублирует CSS custom props, которые не нужны (одинаковые значения root и `.pg-card`) |
| `roadmap-templates/index.vue` | CRUD для шаблонов роадмапа | admin/admin | Импортирует catalogs; ~286 строк |

### `client/`
| Файл | Описание | Layout/MW | Заметки |
|------|---------|-----------|---------|
| `login.vue` | Выбор проекта (список из `/api/public/projects`) | default | Tailwind + glass |
| `brief-login.vue` | Вход по ID + PIN | default | Glass design |
| `brief/[clientId].vue` | Legacy-редирект → `self_profile` или `brief-login` | default/client-brief | ~40 строк |
| `[slug]/index.vue` | Дашборд клиентского кабинета: фазы, инфо-блоки, менеджер | cabinet/client | Импортирует shared roadmap utils |
| `[slug]/[page].vue` | Мета-роутер: по page slug рендерит соответствующий Client-компонент | cabinet/client | ~35 строк; для `self_profile` и `brief` рендерит `AdminSmartBrief` с `clientMode` |

### `contractor/`
| Файл | Описание | Layout/MW | Заметки |
|------|---------|-----------|---------|
| `login.vue` | Вход по ID подрядчика | default | Tailwind + glass |
| `[id]/index.vue` | Полный кабинет подрядчика: dashboard/задачи/профиль/документы/мастера | — (свой layout в шаблоне) | **1834 строки** — объединяет 5+ разделов в одном файле; ⚠ нарушает SRP; встроенный layout |

---

## 3. `app/layouts/`

| Файл | Описание | Заметки |
|------|---------|---------|
| `admin.vue` | Шапка «админ-панель» + табы (проекты/подрядчики/клиенты/5 галерей) + slot | ⚠ Hardcoded tabs; тема через `useThemeToggle()` |
| `cabinet.vue` | Клиентский кабинет: header + sidebar, sticky nav, footer DK | ⚠ Hardcoded `ALL_PAGES` и `phases` массивы — **дублируют** `admin/projects/[slug].vue` |
| `contractor.vue` | Минимальный layout: шапка + slot | Использует `<UButton>` из NuxtUI — единственный компонент во всём проекте |
| `default.vue` | Базовый layout с заголовком и theme-dot | — |

---

## 4. `app/middleware/`

| Файл | Описание | Заметки |
|------|---------|---------|
| `admin.ts` | Проверяет `/api/auth/me` → `role === 'designer'`, иначе → `/admin/login` | Рабочий |
| `client.ts` | **Пустой** — `defineNuxtRouteMiddleware(() => {})` | ⚠ Auth выключена |
| `client-brief.ts` | **Пустой** | ⚠ Auth выключена |
| `contractor.ts` | **Пустой** (с комментарием «temporarily disabled») | ⚠ Auth выключена |

---

## 5. `app/stores/`

| Файл | Описание | Заметки |
|------|---------|---------|
| `auth.ts` | Pinia-стор: `admin`, `clientSlug`, `contractorId`. Action `fetchMe()` из `/api/auth/me` | ⚠ **Не используется** ни одним компонентом; все auth-проверки идут через middleware или прямой `$fetch` |

---

## 6. `app/composables/`, `app/utils/`, `app/plugins/`

| Файл | Описание | Заметки |
|------|---------|---------|
| `composables/useThemeToggle.ts` | Dark/light тема через `useColorMode()` + body class sync | Используется всеми layouts |
| `utils/brief-requirements.ts` | `BRIEF_REQUIREMENTS` — объект по типам объекта (apartment/penthouse/house/...) + `OBJECT_TYPE_LABELS` | Используется только `AdminSmartBrief` |
| `plugins/dark-sync.client.ts` | (Не прочитан, но инициализирует тему на клиенте) | — |

---

## 7. `server/api/` — API Routes (65 файлов)

### `auth/` (10 маршрутов)
- `login.post` — Логин admin (bcrypt)
- `logout.post` — Выход admin
- `me.get` — Проверка сессии (admin/client/contractor)
- `client-login.post` — Логин клиента по PIN + projectSlug
- `client-id-login.post` — Логин клиента по ID + PIN
- `client-logout.post` — Выход клиента
- `client-open.get` — Открыть клиентский кабинет (устанавливает cookie по slug)
- `contractor-login.post` — Логин подрядчика по ID
- `contractor-logout.post` — Выход подрядчика
- `client-id-logout.post` — (если есть)

### `projects/` (16 маршрутов)
- CRUD: `index.get`, `index.post`, `[slug].get`, `[slug].put`, `[slug].delete`
- `[slug]/client-profile.put` — Обновление профиля (admin и client)
- `[slug]/contractors.get|post`, `[slug]/contractors/[contractorId].delete`
- `[slug]/page-content.get|put`, `[slug]/page-answers.get|put`
- `[slug]/roadmap.get|put`
- `[slug]/status.put`
- `[slug]/work-status.get|put` + `[slug]/work-status/[itemId]/comments.get|post` + `[slug]/work-status/[itemId]/photos.get`

### `clients/` (6 маршрутов)
- CRUD: `index.get`, `index.post`, `[id].put`, `[id].delete`
- `[id]/brief.get` — Brief для redirect
- `[id]/link-project.post`

### `contractors/` (13 маршрутов)
- CRUD: `index.get`, `index.post`, `[id].get`, `[id].put`, `[id].delete`
- `[id]/self.put` — Обновление подрядчиком своего профиля
- `[id]/projects.get`, `[id]/staff.get`
- `[id]/work-items.get|post`, `[id]/work-items/[itemId].put`
- `[id]/work-items/[itemId]/comments.get|post`
- `[id]/work-items/[itemId]/photos.get|post`
- `[id]/work-items/[itemId]/photos/[photoId].delete`

### `gallery/` (4 маршрута)
- CRUD: `index.get`, `index.post`, `[id].put`, `[id].delete`

### `page-configs/` (2 маршрута)
- `index.get`, `index.put`

### `roadmap-templates/` (4 маршрута)
- `index.get`, `index.post`, `[key].put`, `[key].delete`

### `public/` (1 маршрут)
- `projects.get` — Публичный список проектов

### Прочее (3 маршрута)
- `suggestions.get` — JSON-подсказки
- `suggest/address.get` — Dadata proxy
- `upload.post` — Загрузка файлов

---

## 8. `server/db/`

| Файл | Описание | Заметки |
|------|---------|---------|
| `schema.ts` | Drizzle-схема: 12 таблиц (`users`, `projects`, `pageConfigs`, `pageContent`, `contractors`, `projectContractors`, `workStatusItems`, `workStatusItemPhotos`, `workStatusItemComments`, `roadmapStages`, `uploads`, `galleryItems`, `clients`) + relations | `profile` в `projects` — JSONB blob для всего профиля клиента |
| `index.ts` | Singleton `useDb()` — подключение через `postgres` + drizzle | — |
| `migrations/` | Папка с миграциями Drizzle | — |

---

## 9. `server/utils/`

| Файл | Описание | Заметки |
|------|---------|---------|
| `auth.ts` | Cookie-сессии (admin/client/contractor/clientId) + bcrypt helpers | ⚠ Низкоуровневые cookie-хелперы в обход h3 из-за бага h3 v2 RC |
| `body.ts` | `readNodeBody()` / `readValidatedNodeBody()` — чтение тела запроса минуя h3 из-за бага | Zod-валидация |
| `roadmap-templates.ts` | CRUD кастомных шаблонов роадмапа (JSON-файл на диске) | Читает/пишет `server/data/roadmap-templates.custom.json` |
| `storage.ts` | `getUploadDir()`, `ensureUploadDir()`, `getUploadUrl()` | Файлы в `public/uploads/` |

---

## 10. `shared/types/`

| Файл | Описание | Заметки |
|------|---------|---------|
| `catalogs.ts` | **Центральный** файл каталогов: `PROJECT_PHASES`, `CONTRACTOR_WORK_TYPES`, `OBJECT_TYPES`, `CLIENT_TYPES`, `PAYMENT_TYPES`, `CONTRACT_TYPES` и пр. + option-фабрика `asOptions()` | ~828 строк |
| `phase-steps.ts` | Подробные описания бизнес-процессов фаз проекта (BPMN v3.0) | ~264 строки; используется в `AdminPhaseDetail` |
| `roadmap.ts` | Zod-схема `RoadmapStageSchema` | — |
| `roadmap-template.ts` | Zod-схема `RoadmapTemplateSchema` + `CreateRoadmapTemplateSchema` | — |
| `roadmap-templates.ts` | 5+ builtin шаблонов роадмапа (apartment/house/office/retail) | ~422 строки |
| `project.ts` | `ClientProfileSchema` — Zod-схема 100+ полей профиля | ~189 строк |
| `contractor.ts` | `ContractorSchema`, `CreateContractorSchema`, `UpdateContractorSchema` | Zod |
| `work_status.ts` | `WorkStatusItemSchema` | Zod |
| `auth.ts` | `LoginSchema`, `PinLoginSchema` | Zod |

---

## 11. `shared/utils/`, `shared/constants/`

| Файл | Описание | Заметки |
|------|---------|---------|
| `utils/roadmap.ts` | `normalizeRoadmapStatus()`, `roadmapStatusLabel()`, `roadmapStatusIcon()`, `roadmapStatusCssClass()`, `deriveProjectPhaseFromRoadmap()`, `roadmapDoneCount()` | Единый источник truth для статусов роадмапа |
| `constants/profile-fields.ts` | Типизированные option-массивы для брифа: `MESSENGER_OPTIONS`, `OBJECT_TYPE_OPTIONS`, `BALCONY_OPTIONS`, `BRIEF_STYLE_OPTIONS` и пр. + `createEmptyClientProfileDraft()` | Используется `ClientSelfProfile` и `AdminSmartBrief` |

---

## 12. `app/assets/css/main.css`

- Импортирует `tailwindcss` + `@nuxt/ui`
- Определяет CSS-переменные glass design system (`--glass-bg`, `--glass-border`, `--glass-text`, `--glass-page-bg`)
- Определяет unified roadmap tokens (`--rm-color-pending`, `--rm-color-done`, и пр.) + глобальные классы `.rm-status--*`
- Dark mode через `html.dark`
- Глобальные примитивы `.glass-page`, `.glass-surface`, `.glass-card`, `.glass-chip`, `.glass-input`
- Стандартизованный sidebar `.std-sidenav`, `.std-nav-item`, `.std-nav-item--active`
- ~545 строк

---

## Сводка найденных несоответствий

### 🔴 Критические

| # | Проблема | Где |
|---|---------|-----|
| 1 | **CSS-префикс `acp-` используется дважды** | `AdminClientProfile` и `AdminContractorsProfile` |
| 2 | **CSS-префикс `ws-` используется дважды** | `AdminWorkStatus` и `ClientWorkStatus` |
| 3 | **`workTypeLabel()` определена 4 раза** | `AdminContractorsProfile`, `ClientContractorsProfile`, `ClientTimeline`, `contractor/[id]/index.vue` — все с разным набором ключей |
| 4 | **Middleware client/contractor отключены** | `client.ts`, `client-brief.ts`, `contractor.ts` — пустые заглушки; любой пользователь может видеть все данные |
| 5 | **Auth store не используется** | `stores/auth.ts` создан но ни разу не импортируется |

### 🟡 Дублирование логики

| # | Проблема | Где |
|---|---------|-----|
| 6 | **Статусные карты дублируются** | `contractStatusMap` / `paymentStatusMap` в `ClientContracts` и `AdminToRContract`; `statusLabel()` в `ClientRoadmap`, `ClientWorkStatus` дублируют shared `roadmapStatusLabel()` |
| 7 | **Списки страниц/навигации hardcoded в 3 местах** | `admin/projects/[slug].vue` (`allPageSlugsRaw` + `navGroups`), `cabinet.vue` (`ALL_PAGES`), `AdminPhaseDetail` (`stepToSlug`) |
| 8 | **`STYLE_TAGS` и `IMAGE_CATS`** | Hardcoded в `AdminMoodboard` — можно вынести в shared |
| 9 | **`mepChecks`, `fileTypeLabel`** | Hardcoded в `AdminSiteSurvey` — можно вынести |
| 10 | **`scenarioOptions`** | Hardcoded в `AdminRoadmap` |

### 🟡 Несогласованные значения

| # | Проблема | Где |
|---|---------|-----|
| 11 | **Разные hex-цвета для одних статусов** | `AdminSiteSurvey` (`#4caf50`), `AdminToRContract` (`#4caf50`, `#2196f3`), `AdminConceptApproval` (именованные), `ClientInitiation` (`#5caa7f`), `main.css` (`--rm-color-done: #16a34a`) |
| 12 | **Messenger options в разном регистре** | `contractors/index.vue`: `"telegram"`, `"whatsapp"`, `"viber"` vs `profile-fields.ts`: `"Telegram"`, `"WhatsApp"`, `"Viber"` |
| 13 | **Object type options различаются** | `AdminFirstContact` inline `<option>` vs `AdminClientProfile` arrays vs `shared/constants/profile-fields.ts` |
| 14 | **CSS custom property naming** | Админ-компоненты: `--acp-*`, `--am-*`; клиент-компоненты: `--c-*`; glass system: `--glass-*`; roadmap: `--rm-*` — четыре разных конвенции |

### 🟡 Стилевые несоответствия

| # | Проблема | Где |
|---|---------|-----|
| 15 | **Tailwind vs scoped CSS** | `index.vue`, `admin/login.vue`, `client/login.vue`, `contractor/login.vue` — чистый Tailwind; `AdminPageContent` — mix; остальные — scoped CSS |
| 16 | **Glass design system используется частично** | `AdminGallery`, `AdminMaterials`, `AdminTZ` — glass classes; `AdminFirstContact`, `AdminConceptApproval` — свои кастомные стили |
| 17 | **Inline styles** | `admin/index.vue`, `admin/contractors/index.vue`, `admin/pages/index.vue` — много `style="..."` вместо CSS-классов |
| 18 | **Unscoped CSS** | `AppAddressInput.vue` — глобальные стили dropdown |

### 🟡 Архитектурные

| # | Проблема | Где |
|---|---------|-----|
| 19 | **Гигантский файл** | `contractor/[id]/index.vue` — 1834 строки; включает 5 разделов + встроенный layout; нарушает SRP |
| 20 | **Паттерн save-on-blur дублируется** | Практически идентичный `save()` + `watch(form, save, { deep: true })` в каждом Admin-компоненте |
| 21 | **`as any` приведения** | Повсеместно в admin-компонентах (особенно `AdminClientProfile`) |
| 22 | **Пустые поддиректории** | `app/components/admin/`, `app/components/client/`, `app/components/ui/` — пустые |
| 23 | **Опечатка** | «ДопопционизИнформация» в `AdminSiteSurvey.vue` |
| 24 | **h3 v2 workaround** | `server/utils/auth.ts` и `server/utils/body.ts` содержат обходные решения для бага h3 v2 RC — при обновлении h3 можно будет убрать |

---

## Рекомендации по рефакторингу (приоритет)

1. **Вынести `workTypeLabel()`** → `shared/utils/labels.ts` (используется в 4+ местах)
2. **Вынести статусные карты** (contract/payment/roadmap status) → `shared/utils/status-maps.ts`
3. **Создать единую палитру статусных цветов** → CSS custom properties в `main.css`, убрать hardcoded hex из компонентов
4. **Исправить CSS-коллизии**: `acp-` → `acnp-` для `AdminContractorsProfile`; `ws-` → `cws-` для `ClientWorkStatus`
5. **Включить middleware auth** для client/contractor
6. **Разбить `contractor/[id]/index.vue`** на подкомпоненты (Dashboard, Tasks, Profile, Documents, Staff)
7. **Нормализовать messenger options** — единый регистр в `profile-fields.ts`, использовать везде
8. **Вынести `ALL_PAGES`/`navGroups`** → `shared/constants/navigation.ts`
9. **Удалить неиспользуемый `auth.ts` store** или интегрировать его
10. **Удалить пустые директории** `components/admin/`, `components/client/`, `components/ui/`
