# Аудит фронтенда — Полный отчёт

> Дата: авто-генерация  
> Область: `app/` — компоненты, страницы, лейауты, middleware, store, app.vue

---

## 1. Компоненты (`app/components/`)

### 1.1 Admin-компоненты

#### AdminClientProfile.vue (442 строки)
| Параметр | Значение |
|----------|---------|
| **Назначение** | Полный редактор профиля клиента: персональные данные, контакты, объект, проект, образ жизни |
| **Props** | `{ slug: string }` |
| **API** | `GET /api/projects/${slug}`, `PUT /api/projects/${slug}`, `POST /api/upload` |
| **Импорты** | 9 каталогов из `~~/shared/types/catalogs`, `AppDatePicker`, `AppAddressInput` |
| **CSS-префикс** | `acp-` |
| **Хелперы** | `getChips()`, `toggleChip()`, `uploadPhoto()`, `save()` |
| **Захардкожено** | `familyStatus`, `messenger`, `objectType`, `objectCondition`, `hasBalcony`, `parking`, `paymentMethod`, `referralSource` — массивы строк |
| **Проблемы** | Duplicate save pattern (`$fetch PUT /api/projects/${slug}`); savedAt: manual `padStart` formatting |

#### AdminConceptApproval.vue (367 строк)
| Параметр | Значение |
|----------|---------|
| **Назначение** | Согласование 3D-визуализаций: блокировка геометрии, переход в фазу «Рабочий проект» |
| **Props** | `{ slug: string }` |
| **API** | `GET /api/projects/${slug}`, `PUT /api/projects/${slug}`, `POST /api/upload` |
| **CSS-префикс** | `aca-` |
| **Захардкожено** | Статусы рендеров (in_work/sent/partial/revision/approved), `statusColor` map (gray/blue/yellow/red/green) |
| **Хелперы** | `statusColor`, `approvedCount`, `revisionCount`, `canTransition`, `isImage()`, `toggleGeometryLock()`, `moveToPhase2()` |

#### AdminContractorsProfile.vue (229 строк)
| Параметр | Значение |
|----------|---------|
| **Назначение** | Привязка/отвязка подрядчиков к проекту |
| **Props** | `{ slug: string }` |
| **API** | `GET /api/projects/${slug}/contractors`, `GET /api/contractors`, `POST /api/projects/${slug}/contractors`, `DELETE /api/projects/${slug}/contractors/${id}` |
| **CSS-префикс** | ⚠️ `acp-` — **коллизия с AdminClientProfile** |
| **Импорты** | `CONTRACTOR_WORK_TYPE_OPTIONS` |
| **Хелперы** | `workTypeLabel()`, `link()`, `unlink()`, `filteredAvailable` |

#### AdminFirstContact.vue (384 строки)
| Параметр | Значение |
|----------|---------|
| **Назначение** | Шаг 0.1 — первичный контакт/лид, интеграция с Яндекс-картами |
| **Props** | `{ slug: string }` |
| **API** | `GET /api/projects/${slug}`, `PUT /api/projects/${slug}` |
| **CSS-префикс** | `afc-` |
| **Захардкожено** | `lead_status` (5 статусов), `lead_source`, `objectType` (7 типов), `lead_object_condition`, `lead_meeting_place`, `messenger` (3 варианта) |
| **Хелперы** | `statusColor`, `initMap()`, `setPin()`, `searchAddress()`, `clearPin()`, `toggleStepDone()` |
| **Особенность** | Динамическая загрузка Yandex Maps API |

#### AdminGallery.vue (457 строк)
| Параметр | Значение |
|----------|---------|
| **Назначение** | CRUD-галерея изображений с тегами и модальным редактором |
| **Props** | `{ category: string; title: string }` |
| **API** | `GET /api/gallery?category=${category}`, `POST /api/gallery`, `PUT /api/gallery/${id}`, `DELETE /api/gallery/${id}`, `POST /api/upload` |
| **CSS-префикс** | `agal-` |
| **Особенность** | Использует `glass-*` классы дизайн-системы |

#### AdminMaterials.vue (275 строк)
| Параметр | Значение |
|----------|---------|
| **Назначение** | Редактор материалов с вкладками/группами/позициями |
| **Props** | `{ slug: string; page: string }` |
| **API** | `GET /api/projects/${slug}/page-content?page=${page}`, `PUT /api/projects/${slug}/page-content`, `POST /api/upload` |
| **CSS-префикс** | `am-` |
| **Импорты** | `AppAutocomplete` |
| **Хелперы** | `markDirty()`, CRUD для tabs/groups/items, `uploadTabImg()` |

#### AdminMoodboard.vue (319 строк)
| Параметр | Значение |
|----------|---------|
| **Назначение** | Управление мудбордом: стилевые теги, референсные изображения, ссылки |
| **Props** | `{ slug: string }` |
| **API** | `GET /api/projects/${slug}`, `PUT /api/projects/${slug}`, `POST /api/upload` |
| **CSS-префикс** | `amb-` |
| **Захардкожено** | `STYLE_TAGS` (14 тегов), `IMAGE_CATS` (7 категорий), статусы (collecting/review/revision/approved), `statusColor` map |

#### AdminPageContent.vue (81 строка)
| Параметр | Значение |
|----------|---------|
| **Назначение** | Роутер-диспетчер: выбирает редактор (materials / TZ / raw JSON) |
| **Props** | `{ slug: string; page: string }` |
| **API** | `GET /api/projects/${slug}/page-content?page=${page}`, `PUT /api/projects/${slug}/page-content` |
| **CSS-префикс** | `apc-` |
| **Импорты** | `AdminMaterials`, `AdminTZ` |
| **Хелперы** | `contentType` computed |

#### AdminPhaseDetail.vue (358 строк)
| Параметр | Значение |
|----------|---------|
| **Назначение** | Деталь фазы проекта с навигационными ссылками |
| **Props** | `{ phaseKey: string \| null }` |
| **Emits** | `close`, `navigate` |
| **API** | Нет (чисто презентационный) |
| **CSS-префикс** | `pd-` |
| **Импорты** | `PHASE_STEPS` из `~~/shared/types/phase-steps`, `PROJECT_PHASES` |
| **Захардкожено** | `stepToSlug` маппинг (0.1→first_contact и т.д.), badge-цвета (gray/violet/blue/amber/orange/green/teal) |

#### AdminProjectPhase.vue (172 строки)
| Параметр | Значение |
|----------|---------|
| **Назначение** | Горизонтальный трек фаз проекта |
| **Props** | `{ slug: string; status: string; readOnly?: boolean }` |
| **Emits** | `update:status` |
| **API** | `GET /api/projects/${slug}/roadmap`, `PUT /api/projects/${slug}` |
| **CSS-префикс** | `phase-` |
| **Импорты** | `PROJECT_PHASES`, `deriveProjectPhaseFromRoadmap` |
| **Захардкожено** | Phase badge цвета (те же что в AdminPhaseDetail) |

#### AdminRoadmap.vue (418 строк)
| Параметр | Значение |
|----------|---------|
| **Назначение** | Редактор роадмапа с модальным выбором шаблона |
| **Props** | `{ slug: string }` |
| **API** | `GET /api/projects/${slug}/roadmap`, `PUT /api/projects/${slug}/roadmap`, `GET /api/roadmap-templates`, `GET /api/projects/${slug}/work-status` |
| **CSS-префикс** | `rm-` |
| **Захардкожено** | `scenarioOptions` (6 сценариев), roadmap statuses (pending/in_progress/done/skipped) |
| **Импорты** | `normalizeRoadmapStatus` |
| **Проблема** | Смешивает Tailwind-утилиты и scoped CSS |

#### AdminSiteSurvey.vue (383 строки)
| Параметр | Значение |
|----------|---------|
| **Назначение** | Обмеры/аудит объекта с MEP-чеклистом и загрузкой файлов |
| **Props** | `{ slug: string }` |
| **API** | `GET /api/projects/${slug}`, `PUT /api/projects/${slug}`, `POST /api/upload` |
| **CSS-префикс** | `ass-` |
| **Захардкожено** | `survey_status` (4 статуса), `mepChecks` (8 пунктов), `fileTypeLabel` map, `uploadAccept` map, `newFileType` (6 типов) |
| **Проблема** | ⚠️ Цвета статусов (`#4caf50`, `#2196f3`) отличаются от палитры остальных компонентов (`#5caa7f`, `#6b9fd4`) — Material Design vs. Custom |
| **Опечатка** | «ДопопционизИнформация» в шаблоне |

#### AdminSmartBrief.vue (501 строка) ⚠️ >500
| Параметр | Значение |
|----------|---------|
| **Назначение** | Детальный бриф по образу жизни с авто-тегированием |
| **Props** | `{ slug: string; clientMode?: boolean }` |
| **API** | `GET /api/projects/${slug}`, `PUT /api/projects/${slug}` ИЛИ `PUT /api/projects/${slug}/client-profile` (clientMode) |
| **CSS-префикс** | `asb-` |
| **Импорты** | `BRIEF_REQUIREMENTS`, `OBJECT_TYPE_LABELS`, `BRIEF_REMOTE_WORK_OPTIONS`, `BRIEF_GUESTS_FREQ_OPTIONS`, `BRIEF_STYLE_OPTIONS`, `BRIEF_COLOR_OPTIONS` |
| **Хелперы** | `filteredRequirements`, `autoTags`, `toggle()` |
| **Захардкожено** | 10 групп полей (~51 поле), inline-определения всех fieldDefs |

#### AdminSpacePlanning.vue (228 строк)
| Параметр | Значение |
|----------|---------|
| **Назначение** | Управление планировками с workflow согласования |
| **Props** | `{ slug: string }` |
| **API** | `GET /api/projects/${slug}`, `PUT /api/projects/${slug}`, `POST /api/upload` |
| **CSS-префикс** | `asp-` |
| **Захардкожено** | `sp_status` (4 статуса), statusColor map |

#### AdminToRContract.vue (347 строк)
| Параметр | Значение |
|----------|---------|
| **Назначение** | ТЗ и договор с отслеживанием оплат и переходом фазы |
| **Props** | `{ slug: string }` |
| **API** | `GET /api/projects/${slug}`, `PUT /api/projects/${slug}`, `POST /api/upload` |
| **CSS-префикс** | `ator-` |
| **Захардкожено** | `contractStatuses` с HEX-цветами (#9e9e9e, #2196f3, #4caf50, #f44336), `paymentStatuses` |

#### AdminTZ.vue (267 строк)
| Параметр | Значение |
|----------|---------|
| **Назначение** | Редактор технического задания с секциями и вопросами |
| **Props** | `{ slug: string; page: string }` |
| **API** | `GET /api/projects/${slug}/page-content?page=${page}`, `PUT /api/projects/${slug}/page-content`, `POST /api/upload` |
| **CSS-префикс** | `atz-` |
| **Импорты** | `AppAutocomplete` |
| **Проблема** | `markDirty()` — пустая функция (no-op) |

#### AdminWorkStatus.vue (517 строк) ⚠️ >500
| Параметр | Значение |
|----------|---------|
| **Назначение** | Управление задачами/статусами работ с фото, комментариями |
| **Props** | `{ slug: string }` |
| **API** | `GET /api/projects/${slug}/work-status`, `PUT /api/projects/${slug}/work-status`, `GET /api/projects/${slug}/contractors`, `GET /api/projects/${slug}/roadmap`, `GET .../photos`, `GET .../comments`, `POST .../comments` |
| **CSS-префикс** | `ws-` |
| **Захардкожено** | `STATUS_LABELS` map (6 статусов), task status options |
| **Импорты** | `CONTRACTOR_WORK_TYPE_OPTIONS` |
| **Хелперы** | `isOverdue()`, `statCounts`, `filteredItems`, `totalBudget` (Intl.NumberFormat), `fmtTime()` |

---

### 1.2 App-компоненты (универсальные)

#### AppAddressInput.vue (160 строк)
| Параметр | Значение |
|----------|---------|
| **Назначение** | Autocomplete адреса через Dadata-подобный сервис |
| **Props** | `{ modelValue: string; placeholder?: string; inputClass?: string \| Record \| string[] }` |
| **API** | `GET /api/suggest/address?q=${q}` |
| **CSS-префикс** | `aai-` |
| **Особенность** | Teleport для dropdown; глобальные (не scoped) стили для выпадающего списка |

#### AppAutocomplete.vue (194 строки)
| Параметр | Значение |
|----------|---------|
| **Назначение** | Автокомплит для каталожных позиций |
| **Props** | `{ modelValue: string; placeholder?: string; inputClass?: string; categories?: string }` |
| **API** | `GET /api/suggestions?category=${cat}` (полная загрузка, фильтрация клиент-сайд) |
| **CSS-префикс** | `ac-` / `autocomplete-` (⚠️ два разных префикса) |
| **Особенность** | Использует `glass-*` классы |

#### AppDatePicker.vue (299 строк)
| Параметр | Значение |
|----------|---------|
| **Назначение** | Custom-календарь с popup |
| **Props** | `{ modelValue: string; placeholder?: string; inputClass?: string; modelType?: 'dmy' \| 'iso' }` |
| **API** | Нет |
| **CSS-префикс** | `dp-` |
| **Захардкожено** | Русские названия месяцев, дней недели; фон popup `#1a1a2e` |

---

### 1.3 Client-компоненты

#### ClientContactDetails.vue (192 строки)
| Параметр | Значение |
|----------|---------|
| **Назначение** | Редактор контактных данных клиента |
| **Props** | `{ slug: string }` |
| **API** | `GET /api/projects/${slug}`, `PUT /api/projects/${slug}/client-profile` |
| **CSS-префикс** | `ccd-` |
| **Импорты** | `AppAddressInput` |
| **Особенность** | savedAt через `padStart` (как AdminClientProfile) |

#### ClientContractorsProfile.vue (93 строки)
| Параметр | Значение |
|----------|---------|
| **Назначение** | Read-only карточки подрядчиков проекта |
| **Props** | `{ slug: string }` |
| **API** | `GET /api/projects/${slug}/contractors` |
| **CSS-префикс** | `cc-` |
| **Импорты** | `CONTRACTOR_WORK_TYPE_OPTIONS` |

#### ClientContracts.vue (205 строк)
| Параметр | Значение |
|----------|---------|
| **Назначение** | Read-only просмотр договора, счёта, ТЗ |
| **Props** | `{ slug: string }` |
| **API** | `GET /api/projects/${slug}` |
| **CSS-префикс** | `cct-` |
| **Захардкожено** | `contractStatusMap` (draft/sent/signed/rejected), `paymentStatusMap` (pending/partial/paid) — с цветами (gray/blue/green/yellow/red) |
| **Хелперы** | `fmtDate()` |

#### ClientDesignAlbum.vue (280 строк)
| Параметр | Значение |
|----------|---------|
| **Назначение** | Галерея альбома с категориями и лайтбоксом |
| **Props** | `{ slug: string }` |
| **API** | `GET /api/projects/${slug}` |
| **CSS-префикс** | `cda-` |
| **Захардкожено** | `CAT_MAP` (7 категорий), расширения изображений (jpg, jpeg, png, webp, gif, avif, svg), fileIcon map |
| **Хелперы** | `isImage()`, `fileExt()`, `fileIcon()`, lightbox с клавиатурной навигацией |

#### ClientInitiation.vue (373 строки)
| Параметр | Значение |
|----------|---------|
| **Назначение** | Визуальный таймлайн фазы 0 (Инициация) с 4 шагами |
| **Props** | `{ slug: string }` |
| **API** | `GET /api/projects/${slug}` |
| **CSS-префикс** | `ci-` |
| **Импорты** | `BRIEF_COMPLETION_KEYS` из `~~/shared/constants/profile-fields` |
| **Захардкожено** | 4 шага данных (first_contact, briefing, survey, tor_contract), описания, бизнес/системные тексты, артефакты |

#### ClientPageContent.vue (540 строк) ⚠️ >500
| Параметр | Значение |
|----------|---------|
| **Назначение** | Клиентский просмотрщик контента страниц (materials, TZ, fallback) с выбором опций и комментариями |
| **Props** | `{ slug: string; page: string }` |
| **API** | `GET /api/projects/${slug}/page-content?page=${page}`, `GET /api/projects/${slug}/page-answers?page=${page}`, `PUT /api/projects/${slug}/page-answers` |
| **CSS-префикс** | `content-` / inline `--c-*` CSS vars |
| **Хелперы** | `isQuantitativeQuestion()` (regex-based detection), debounced auto-save (450ms), `resolveImageSrc()` |
| **Особенность** | Самый большой компонент; regex для определения amount-вопросов |

#### ClientRoadmap.vue (123 строки)
| Параметр | Значение |
|----------|---------|
| **Назначение** | Read-only вертикальный таймлайн роадмапа |
| **Props** | `{ slug: string }` |
| **API** | `GET /api/projects/${slug}/roadmap` |
| **CSS-префикс** | `rm-` (⚠️ коллизия с AdminRoadmap) |
| **Захардкожено** | `statusLabel` map (pending/in_progress/done/skipped) → русские текстовки; `pointClass`, `statusTextClass` maps |
| **Особенность** | Использует `glass-*` и `backdrop-filter` |

#### ClientSelfProfile.vue (459 строк)
| Параметр | Значение |
|----------|---------|
| **Назначение** | Пошаговый мастер заполнения клиентской анкеты (4 шага + финал) |
| **Props** | `{ slug: string }` |
| **API** | `GET /api/projects/${slug}`, `PUT /api/projects/${slug}/client-profile` |
| **CSS-префикс** | `csp-` |
| **Импорты** | 10 опций из `~~/shared/constants/profile-fields`, `createEmptyClientProfileDraft()`, `AppAddressInput` |
| **Хелперы** | `goTo()`, `prev()`, `nextAndSave()`, `finish()`, `saveData()` |
| **Особенность** | Используется как альтернатива AdminSmartBrief с `clientMode=true`. Оба пути доступны. |

#### ClientTimeline.vue (274 строки)
| Параметр | Значение |
|----------|---------|
| **Назначение** | Таймлайн этапов + команда проекта (подрядчики) |
| **Props** | `{ slug: string }` |
| **API** | `GET /api/projects/${slug}/roadmap`, `GET /api/projects/${slug}/contractors`, `GET /api/projects/${slug}` |
| **CSS-префикс** | `ctl-` |
| **Импорты** | `PROJECT_PHASES`, `deriveProjectPhaseFromRoadmap`, `normalizeRoadmapStages`, `roadmapStatusLabel`, `roadmapStatusIcon`, `roadmapStatusCssClass` |
| **Захардкожено** | `WORK_TYPES` map (18 типов работ) — ⚠️ дублирует `CONTRACTOR_WORK_TYPE_OPTIONS` из catalogs |
| **Хелперы** | `workTypeLabel()`, `fmtDate()`, `noun()` (склонение) |
| **Особенность** | Прямые ссылки WhatsApp/Telegram по номеру/нику |

#### ClientWorkStatus.vue (102 строки)
| Параметр | Значение |
|----------|---------|
| **Назначение** | Read-only список задач с бейджами статусов |
| **Props** | `{ slug: string }` |
| **API** | `GET /api/projects/${slug}/work-status` |
| **CSS-префикс** | `ws-` (⚠️ коллизия с AdminWorkStatus) |
| **Захардкожено** | `statusLabel` map (6 статусов), `statusClass` map |

---

## 2. Страницы (`app/pages/`)

### 2.1 Root

#### pages/index.vue (22 строки)
- **Layout**: default (Tailwind-классы)
- **Назначение**: Лендинг с 3 кнопками входа (дизайнер / клиент / подрядчик)
- **Компоненты**: NuxtLink
- **API**: нет

### 2.2 Admin

#### pages/admin/index.vue (529 строк)
- **Layout**: admin, **Middleware**: admin
- **Назначение**: Список проектов с поиском, создание (wizard 2 шага), роадмап-пуллы
- **Компоненты**: NuxtLink
- **API**: `GET /api/projects`, `POST /api/projects`, `DELETE /api/projects/${slug}`, `GET /api/roadmap-templates`
- **Импорты**: `ROADMAP_TEMPLATES`, `PROJECT_PHASES`, roadmap utils
- **Захардкожено**: `CORE_PAGE_LABELS` (6 базовых страниц проекта)

#### pages/admin/projects/[slug].vue (289 строк)
- **Layout**: admin, **Middleware**: admin
- **Назначение**: Детальная страница проекта: sidebar навигация + подключение компонентов
- **Компоненты**: `AdminProjectPhase`, `AdminRoadmap`, `AdminWorkStatus`, `AdminClientProfile`, `AdminContractorsProfile`, `AdminFirstContact`, `AdminSmartBrief`, `AdminSiteSurvey`, `AdminToRContract`, `AdminSpacePlanning`, `AdminMoodboard`, `AdminConceptApproval`, `AdminPageContent`
- **API**: `GET /api/projects/${slug}`, `PUT /api/projects/${slug}`
- **Захардкожено**: `allPageSlugsRaw` (20+ страниц), `navGroups` (6 фаз)

#### pages/admin/clients/index.vue (389 строк)
- **Layout**: admin, **Middleware**: admin
- **Назначение**: CRUD клиентов, привязка к проектам, отображение ID+PIN
- **Компоненты**: `AppAddressInput`
- **API**: `GET /api/clients`, `POST /api/clients`, `PUT /api/clients/${id}`, `DELETE /api/clients/${id}`, `POST /api/clients/${id}/link-project`, `GET /api/projects`

#### pages/admin/contractors/index.vue (676 строк)
- **Layout**: admin, **Middleware**: admin
- **Назначение**: Управление подрядчиками (company ↔ master иерархия), реквизиты, привязка к проектам
- **Компоненты**: `AppAddressInput`, NuxtLink
- **API**: `GET /api/contractors`, `POST /api/contractors`, `PUT /api/contractors/${id}`, `DELETE /api/contractors/${id}`, `GET /api/projects`, `GET /api/contractors/${id}/projects`, `POST /api/projects/${slug}/contractors`, `DELETE /api/projects/${slug}/contractors/${id}`

#### pages/admin/pages/index.vue (188 строк)
- **Layout**: admin, **Middleware**: admin
- **Назначение**: CRUD конфигурации страниц (slug, заголовок, шрифт)
- **API**: `GET /api/page-configs`, `PUT /api/page-configs`

#### pages/admin/roadmap-templates/index.vue (285 строк)
- **Layout**: admin, **Middleware**: admin
- **Назначение**: CRUD шаблонов роадмапа (клон, сценарии, этапы)
- **API**: `GET /api/roadmap-templates`, `POST /api/roadmap-templates`, `PUT /api/roadmap-templates/${key}`, `DELETE /api/roadmap-templates/${key}`
- **Импорты**: `CLIENT_TYPE_OPTIONS`, `OBJECT_TYPE_OPTIONS`, `ROADMAP_COMPLEXITY_OPTIONS`, `ROADMAP_STAGE_TYPE_OPTIONS`

#### pages/admin/login.vue (51 строка)
- **Layout**: default
- **Назначение**: Форма входа для дизайнера
- **API**: `POST /api/auth/login`

#### pages/admin/gallery/*.vue (5 файлов, каждый ~6 строк)
- Тонкие обёртки над `AdminGallery`:
  - `interiors.vue` → `<AdminGallery category="interiors" />`
  - `furniture.vue` → `<AdminGallery category="furniture" />`
  - `materials.vue` → `<AdminGallery category="materials" />`
  - `art.vue` → `<AdminGallery category="art" />`
  - `moodboards.vue` → `<AdminGallery category="moodboards" />`

### 2.3 Client

#### pages/client/login.vue
- **Layout**: default
- **Назначение**: Выбор проекта для входа (список всех доступных)
- **API**: `GET /api/public/projects`

#### pages/client/brief-login.vue
- **Layout**: default
- **Назначение**: Вход по ID + PIN-код
- **API**: `POST /api/auth/client-id-login`

#### pages/client/brief/[clientId].vue
- **Layout**: default, **Middleware**: client-brief
- **Назначение**: Legacy-редирект: загружает проект клиента → редирект в `/client/${slug}/self_profile`
- **API**: `GET /api/clients/${clientId}/brief`

#### pages/client/[slug]/index.vue (155 строк)
- **Layout**: cabinet, **Middleware**: client
- **Назначение**: Dashboard клиента: фаза проекта, инфо, менеджер
- **Компоненты**: –
- **API**: `GET /api/projects/${slug}`, `GET /api/projects/${slug}/roadmap`
- **Импорты**: `deriveProjectPhaseFromRoadmap`, `PROJECT_PHASES`

#### pages/client/[slug]/[page].vue (32 строки)
- **Layout**: cabinet, **Middleware**: client
- **Назначение**: Роутер клиентских подстраниц
- **Компоненты**: `ClientInitiation`, `AdminSmartBrief` (clientMode), `ClientContactDetails`, `ClientTimeline`, `ClientDesignAlbum`, `ClientContracts`, `ClientRoadmap`, `ClientWorkStatus`, `ClientContractorsProfile`, `ClientPageContent`

### 2.4 Contractor

#### pages/contractor/login.vue
- **Layout**: default
- **Назначение**: Вход по ID подрядчика
- **API**: `POST /api/auth/contractor-login`

#### pages/contractor/[id]/index.vue (1834 строки) ⚠️ САМЫЙ БОЛЬШОЙ ФАЙЛ
- **Layout**: default (собственный layout внутри)
- **Назначение**: Полный кабинет подрядчика: dashboard, задачи (CRUD), профиль, бригада
- **Секции**: dashboard, tasks, profile, staff
- **API**: `GET /api/contractors/${id}`, `GET /api/contractors/${id}/work-items`, `GET /api/contractors/${id}/staff`, `GET /api/contractors/${id}/projects`, `PUT /api/contractors/${id}/work-items/${itemId}`, `POST /api/contractors/${id}/work-items`, `POST /api/contractors/${id}/work-items/${id}/photos`, `DELETE .../photos/${id}`, `GET .../comments`, `POST .../comments`, `PUT /api/contractors/${id}/self`, `POST /api/auth/contractor-logout`, `GET /api/auth/me`
- **Импорты**: `CONTRACTOR_ROLE_TYPE_OPTIONS`, `CONTRACTOR_WORK_TYPE_OPTIONS`, `WORK_TYPE_STAGES`
- **Захардкожено**: `STATUSES` (6), `ROLE_GROUPS` (6 групп), `WORK_GROUPS` (6 групп)
- **Особенности**: localStorage для чеклистов этапов; собственный header/sidebar/footer (не использует layout contractor.vue!); lightbox, модальное окно для новой задачи

---

## 3. Лейауты (`app/layouts/`)

| Файл | Строк | Назначение | Ключевые элементы |
|------|-------|-----------|-------------------|
| **admin.vue** | 150 | Админ-панель: header + tabs навигация | 8 вкладок (проекты, подрядчики, клиенты, 5 галерей), logout, theme toggle |
| **cabinet.vue** | 304 | Кабинет клиента: header + sidebar + content | `ALL_PAGES` (17 пунктов), phase badge, logout, динамическая загрузка проекта |
| **contractor.vue** | 82 | Кабинет подрядчика | ⚠️ Не используется! `contractor/[id]/index.vue` имеет собственный layout |
| **default.vue** | 69 | Минимальный: header (DK) + theme toggle | Используется для login-страниц |

---

## 4. Middleware (`app/middleware/`)

| Файл | Строк | Логика |
|------|-------|--------|
| **admin.ts** | 8 | Проверяет `role === 'designer'` через `GET /api/auth/me`, редирект на `/admin/login` |
| **client.ts** | 1 | ⚠️ Пустой (noop) — auth отключён |
| **contractor.ts** | 1 | ⚠️ Пустой (noop) — комментарий «auth temporarily disabled» |
| **client-brief.ts** | 1 | ⚠️ Пустой (noop) |

---

## 5. Store (`app/stores/auth.ts`)

- **Pinia store** `useAuthStore`
- **State**: `admin`, `adminName`, `clientSlug`, `contractorId`, `loaded`
- **Actions**: `fetchMe()` → `GET /api/auth/me`, `clear()`
- ⚠️ **Не используется** ни одним компонентом/страницей! Все компоненты делают `useFetch('/api/auth/me')` напрямую.

---

## 6. App.vue

- Обёртка `<UApp>` → `<NuxtLayout>` → `<NuxtPage>`
- Вызывает `useThemeToggle().initTheme()` в `onMounted`

---

## 7. Сквозной анализ

### 7.1 ⚠️ Коллизии CSS-префиксов

| Префикс | Компоненты |
|---------|-----------|
| `acp-` | AdminClientProfile, **AdminContractorsProfile** |
| `rm-` | AdminRoadmap, **ClientRoadmap** |
| `ws-` | AdminWorkStatus, **ClientWorkStatus** |

### 7.2 ⚠️ Дублирование кода

#### Паттерн save()
Почти идентичный код в ~10 Admin-компонентах:
```ts
await $fetch(`/api/projects/${slug}`, { method: 'PUT', body: { profile: { ...project.value?.profile, ...form } } })
```
→ **Рекомендация**: вынести в composable `useProjectProfile(slug)`.

#### Паттерн upload
Загрузка файлов (`FormData → $fetch('/api/upload')`) повторяется в ~8 компонентах.
→ **Рекомендация**: composable `useFileUpload()`.

#### Паттерн savedAt
Два подхода к форматированию времени сохранения:
1. `new Date().toLocaleTimeString('ru', ...)` — AdminConceptApproval, AdminMoodboard
2. `padStart(2, '0')` вручную — AdminClientProfile, AdminFirstContact, ClientContactDetails
→ **Рекомендация**: единый utils `formatSavedTime()`.

#### statusColor maps
Маппинги «статус → цвет» дублируются в ~8 компонентах с разными значениями.
→ **Рекомендация**: централизовать в `shared/constants/status-colors.ts`.

#### workTypeLabel
`WORK_TYPES` хардкодится заново в ClientTimeline (18 позиций), хотя `CONTRACTOR_WORK_TYPE_OPTIONS` уже есть в catalogs.

### 7.3 ⚠️ Несогласованные цвета статусов

| Компонент | Палитра |
|-----------|---------|
| AdminSiteSurvey, AdminToRContract | Material Design (#4caf50, #2196f3, #f44336) |
| AdminClientProfile, AdminConceptApproval, AdminMoodboard | Custom (#5caa7f, #6b9fd4, #d46b6b) |
| AdminPhaseDetail, AdminProjectPhase, admin/index | Tailwind-inspired (rgba tokens) |
| ClientContracts | CSS-классы (gray/blue/green/yellow/red) |

### 7.4 ⚠️ Компоненты > 500 строк

| Файл | Строк | Рекомендация |
|------|-------|-------------|
| ClientPageContent.vue | 540 | Выделить TZ-viewer и Materials-viewer в подкомпоненты |
| AdminWorkStatus.vue | 517 | Выделить detail-panel (photos/comments) в подкомпонент |
| AdminSmartBrief.vue | 501 | Выделить fieldDefs в конфигурационный файл |
| contractor/[id]/index.vue | **1834** | Критично! Разбить на: Dashboard, TaskList, Profile, StaffList компоненты |

### 7.5 ⚠️ Неиспользуемые файлы

| Файл | Проблема |
|------|----------|
| `app/layouts/contractor.vue` | Не используется — `contractor/[id]/index.vue` определяет layout: 'default' и рендерит свой header/sidebar |
| `app/stores/auth.ts` | Ни один компонент не импортирует `useAuthStore` |
| `app/components/admin/` | Пустая директория |
| `app/components/client/` | Пустая директория |
| `app/components/ui/` | Пустая директория |

### 7.6 ⚠️ Отключённая авторизация

3 из 4 middleware — noop (пустые). Клиентский и подрядческий кабинеты открыты без авторизации. Только admin-middleware проверяет `role === 'designer'`.

### 7.7 Захардкоженные значения — сводка

| Категория | Где повторяется |
|-----------|-----------------|
| Статусы задач (pending/planned/in_progress/done/paused/cancelled) | AdminWorkStatus, ClientWorkStatus, contractor/[id] |
| Статусы роадмапа (pending/in_progress/done/skipped) | AdminRoadmap, ClientRoadmap, ClientTimeline, admin/index |
| Типы объектов (apartment/penthouse/house/...) | AdminFirstContact, AdminClientProfile, ClientSelfProfile |
| Мессенджеры (telegram/whatsapp/viber) | AdminFirstContact, AdminClientProfile, ClientSelfProfile, admin/clients, admin/contractors, contractor/[id] |
| Контрактные статусы (draft/sent/signed/rejected) | AdminToRContract, ClientContracts, ClientInitiation |
| Типы работ | ClientTimeline (inline), catalogs (shared) |

### 7.8 Дизайн-система

Проект использует **3 параллельные CSS-стратегии**:
1. **glass-* классы** (custom design system: `glass-card`, `glass-surface`, `glass-chip`, `glass-input`, `glass-page`) — Client-компоненты, layouts
2. **BEM с уникальными префиксами** (scoped) — Admin-компоненты
3. **Tailwind utility classes** — login-страницы, pages/index.vue, частично admin/index

### 7.9 API-эндпоинты — сводка

Всего используется **~45 уникальных endpoints**:

**Auth**: `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`, `/api/auth/client-open`, `/api/auth/client-id-login`, `/api/auth/client-logout`, `/api/auth/contractor-login`, `/api/auth/contractor-logout`

**Projects**: `/api/projects`, `/api/projects/${slug}`, `/api/projects/${slug}/roadmap`, `/api/projects/${slug}/work-status`, `/api/projects/${slug}/contractors`, `/api/projects/${slug}/page-content`, `/api/projects/${slug}/page-answers`, `/api/projects/${slug}/client-profile`

**Contractors**: `/api/contractors`, `/api/contractors/${id}`, `/api/contractors/${id}/self`, `/api/contractors/${id}/projects`, `/api/contractors/${id}/work-items`, `/api/contractors/${id}/work-items/${itemId}`, `/api/contractors/${id}/work-items/${itemId}/photos`, `/api/contractors/${id}/work-items/${itemId}/comments`, `/api/contractors/${id}/staff`

**Clients**: `/api/clients`, `/api/clients/${id}`, `/api/clients/${id}/link-project`, `/api/clients/${id}/brief`

**Gallery**: `/api/gallery`

**Other**: `/api/upload`, `/api/suggestions`, `/api/suggest/address`, `/api/page-configs`, `/api/roadmap-templates`, `/api/public/projects`
