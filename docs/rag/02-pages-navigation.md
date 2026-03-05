# RAG-02: Страницы и навигация

## Маршруты приложения

```
/                           → index.vue (layout: default)
/admin/login                → admin/login.vue
/admin                      → admin/index.vue (layout: admin)
/admin/projects/[slug]      → admin/projects/[slug].vue
/admin/clients              → admin/clients/index.vue
/admin/contractors          → admin/contractors/index.vue
/admin/designers            → admin/designers/index.vue
/admin/documents            → admin/documents/index.vue
/admin/pages                → admin/pages/index.vue
/admin/gallery/[tab]        → admin/gallery/[tab].vue
/admin/roadmap-templates    → admin/roadmap-templates/index.vue
/client/login               → client/login.vue
/client/[slug]              → client/[slug]/index.vue (layout: default)
/contractor/login           → contractor/login.vue
/contractor/[id]            → contractor/[id]/index.vue (layout: default)
```

## Admin Layout: навигация шапки

```
Верхняя строка:
  [бренд "админ-панель"]  [поиск Ctrl+K]  [○ тема]  [сайт /]  [выйти]

Таб-бар (второй ряд):
  [проекты][▾]  [подрядчики][▾]  [клиенты][▾]  [галерея][▾]
  [документы]   [дизайнеры][▾]   [страницы]     [шаблоны roadmap]
```

Каждый таб — `NuxtLink` + dropdown-чип с быстрым доступом к последним записям.

## Переходы: Admin

| Откуда | Действие | Куда |
|--------|----------|------|
| Любая страница | Таб "проекты" | `/admin` |
| `/admin` | Клик строки → кнопка "открыть" | `/admin/projects/:slug` |
| `/admin/projects/:slug` | Пункт sidebar | Смена компонента (без URL-перехода) |
| Dropdown подрядчиков | Клик имени | `/admin/projects/:slug?view=contractor&cid=:id` |
| Dropdown клиентов | Клик имени | `/admin/clients?clientId=:id` |
| Dropdown галереи | Клик раздела | `/admin/gallery/:tab` |
| Кнопка "выйти" | Клик | POST /api/auth/logout → `/admin/login` |

## Workspace проекта: sidebar-страницы

Файл: `app/pages/admin/projects/[slug].vue`

Страницы проекта определяются динамически из `project.pages[]`.  
Каждая страница имеет `slug` → маппинг на компонент через `pageComponentMap`.

| slug | Компонент |
|------|-----------|
| `work_status` | `AdminWorkStatus` |
| `profile_customer` | `AdminClientProfile` |
| `first_contact` | `AdminFirstContact` |
| `self_profile` / `brief` | `AdminSmartBrief` |
| `site_survey` | `AdminSiteSurvey` |
| `tor_contract` | `AdminToRContract` |
| `space_planning` | `AdminSpacePlanning` |
| `moodboard` | `AdminMoodboard` |
| `concept_approval` | `AdminConceptApproval` |
| `working_drawings` | `AdminWorkingDrawings` |
| `specifications` | `AdminSpecifications` |
| `mep_integration` | `AdminMepIntegration` |
| `design_album_final` | `AdminDesignAlbumFinal` |
| `procurement_list` | `AdminProcurementList` |
| `suppliers` | `AdminSuppliers` |
| `procurement_status` | `AdminProcurementStatus` |
| `construction_plan` | `AdminConstructionPlan` |
| `work_log` | `AdminWorkLog` |
| `site_photos` | `AdminSitePhotos` |
| `punch_list` | `AdminPunchList` |
| `commissioning_act` | `AdminCommissioningAct` |
| `client_sign_off` | `AdminClientSignOff` |

Неизвестный slug → fallback компонент `AdminPageContent`.

## Middleware защиты

```
admin.ts      → нет сессии → redirect /admin/login
client.ts     → нет сессии или slug → redirect /client/login
contractor.ts → нет сессии → redirect /contractor/login
```

## Галерея: подразделы (GALLERY_TABS)

| slug | Название |
|------|---------|
| `interiors` | Интерьеры |
| `furniture` | Мебель |
| `materials` | Материалы |
| `art` | Арт-объекты |
| `moodboards` | Мудборды |

## Query-параметры workspace

| Параметр | Значение | Эффект |
|---------|---------|--------|
| `?view=contractor&cid=:id` | contractorPreviewMode | Показывает кабинет подрядчика |
| `?view=client` | clientPreviewMode | Показывает клиентский вид |
