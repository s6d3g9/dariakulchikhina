# 26. Shared Layer Audit

Аудит `shared/**` как слоя чистых контрактов после рефакторинга v5.
Дата: 2026-04-20. Ветка: `claude/workroom-wave11-shared-structure-audit`.

---

## 1. Инвентарь: `shared/constants/**`

| Файл | Строк | Ключевые экспорты |
|------|-------|-------------------|
| `system/websocket-events.ts` | 12 | `WEBSOCKET_EVENT_VALUES`, `WebsocketEvent` |
| `system/roles.ts` | 11 | `SYSTEM_ROLE_VALUES`, `SystemRole` |
| `system/status-colors.ts` | 15 | `SYSTEM_STATUS_COLORS`, `SystemStatusColorKey` |
| `design-modes.ts` | 101 | `DESIGN_MODES`, `DEFAULT_DESIGN_MODE`, `resolveDesignModeFromConceptSlug()`, `getUiThemeStorageKey()`, `normalizeDesignConceptSlug()` |
| `brief-sections.ts` | 349 | `BRIEF_SECTIONS`, `getBriefSections()`, `BriefSectionDef`, `BriefFieldDef` |
| `app-catalog.ts` | 352 | `APP_BLUEPRINTS`, `ADMIN_MENU_GROUPS`, `LAYOUT_BLOCK_PRESETS`, `toPayloadItems()`, `getLayoutTemplateById()` |
| `profile-fields.ts` | 91 | `CLIENT_PROFILE_BASE_KEYS`, `ClientProfileEditableKey`, `createEmptyClientProfileDraft()` |
| `design-panel-options.ts` | 517 | `btnStyles`, `btnSizes`, `archTransitionPresets`, `contentLayoutRecipes`, `BORDER_STYLE_OPTIONS` |
| `presets.ts` | 189 | `PROJECT_PRESETS`, `findPreset()`, `getPresetsByCategory()`, `presetLabel()` |
| `admin-navigation.ts` | 152 | `ADMIN_SECTION_ROUTES`, `getAdminSectionRoute()`, `getProjectRoute()` |
| `pages.ts` | 145 | `PROJECT_PAGES`, `getClientPages()`, `getAdminPages()`, `CORE_PAGES` |
| Реэкспорты-прокси (7 файлов в подпапках) | — | Делегируют к родительским файлам |

**Итого constants:** ~11 файлов с контентом, 1 852 строки, 7 прокси-реэкспортов.

---

## 2. Инвентарь: `shared/types/**`

| Файл | Строк | Ключевые экспорты |
|------|-------|-------------------|
| `auth.ts` | 51 | `LoginSchema`, `RegisterSchema`, `ClientRegisterSchema`, `ContractorRegisterSchema` |
| `catalogs.ts` | 1 062 | `PROJECT_STATUSES`, `ProjectStatus`, `CLIENT_TYPES`, `MATERIAL_TYPES`, `CONTRACTOR_TYPES`, `CONTRACTOR_WORK_TYPE_OPTIONS` |
| `designer.ts` | 550 | `DESIGNER_SERVICE_CATEGORIES`, `DesignerServiceTemplate`, `DESIGNER_SERVICE_TEMPLATES` |
| `project.ts` | 484 | `HybridControlPhase`, `HybridControlTask`, `HybridControlSprint`, `ProjectCallInsightIngest` |
| `communications.ts` | 224 | `E2eeEncryptedEnvelope`, `CommunicationRoomParticipant`, `ProjectCommunicationActor` |
| `app-catalog.ts` | 185 | `MenuBlockDef`, `AppBlueprintDef`, `LayoutBlockPresetDef`, `AppScope` |
| `contractor.ts` | 60 | `ContractorSchema`, `Contractor` |
| `material.ts` | 358 | `Material`, `MaterialPhysical`, `MaterialSupplierInfo`, `MaterialCertification` |
| `design-modules.ts` | 145 | `DesignModulesConfig`, `createDefaultDesignModules()`, `DesignModulesConfigSchema` |
| `element-alignment.ts` | 70 | `ElementAlignmentConfig`, `ElementAlignmentConfigSchema` |
| `element-visibility.ts` | 62 | `ElementVisibilityConfig`, `ElementVisibilityConfigSchema` |
| `design-mode.ts` | 20 | `DesignMode`, `DesignConceptSlug`, `DesignModeDescriptor` |
| `wipe2.ts` | 85 | `Wipe2Card`, `Wipe2Field`, `Wipe2Section`, `Wipe2EntityData` |
| `gallery.ts` | 78 | Gallery-related interfaces |
| `navigation.ts` | 84 | `NavigationNode`, `PayloadItem`, `FilterParams` |
| `phase-steps.ts` | 263 | `PhaseStep`, `PhaseDefinition`, `PHASE_STEPS` |
| `project-governance.ts` | 256 | `ProjectParticipantRoleKey`, `ProjectResponsibilityKey`, `ProjectScopeType` |
| `messenger-agent-stream.ts` | 76 | Agent-stream streaming types |
| `agent-chat/agent-chat.ts` | 46 | Agent chat payload types |
| `index.ts` | — | Реэкспортирует `messenger-agent-stream` |
| Реэкспорты-прокси (11 файлов в подпапках) | — | Делегируют к родительским файлам |

**Итого types:** ~19 файлов с контентом, 4 359 строк, 11 прокси-реэкспортов.

---

## 3. Инвентарь: `shared/utils/**`

| Файл | Строк | Ключевые экспорты |
|------|-------|-------------------|
| `project-control.ts` | 1 054 | `ensureHybridControl()`, `buildHybridControlSummary()`, `buildHybridCoordinationBrief()`, `calculatePhaseProgress()`, `detectHybridHealthStatus()`, `evaluateCheckpointStatus()` + 30+ функций |
| `project-governance.ts` | 259 | Label-maps, `getProjectScopeEditableSettingKeys()`, `filterProjectScopeSettingsForEditor()` |
| `communications-e2ee.ts` | 394 | `generateCommunicationIdentityKeyPair()`, `encryptCommunicationPayload()`, `decryptCommunicationPayload()` (Web Crypto API) |
| `project-control-timeline.ts` | 360 | Расчёт дат, milestone-генераторы для фаз и спринтов |
| `work-status.ts` | 120 | `normalizeWorkStatus()`, `workStatusLabel()`, `workStatusIcon()`, `workStatusCssClass()` |
| `designer-catalogs.ts` | 192 | Утилиты для каталогов материалов дизайнера |
| `status-maps.ts` | 33 | Маппинг статус → цвет / лейбл |
| Реэкспорты-прокси (6 файлов в подпапках) | — | Делегируют к родительским файлам |

**Итого utils:** 7 файлов с контентом, 2 412 строк, 6 прокси-реэкспортов.

---

## 4. За пределами scope (не аудируется)

`shared/ui/autosave/autosave-state.ts` (22 строки) — UI-утилиты состояния автосохранения.
Не входит в аудируемые поддеревья (`constants/`, `types/`, `utils/`), вынесен отдельно.

---

## 5. Нарушения инвариантов (runtime-импорты)

Поиск по шаблонам: `drizzle-orm`, `postgres`, `pg`, `ioredis`, `redis`, `h3`, `nuxt`, `nitro`.

**Результат: 0 нарушений.**

`shared/**` полностью изолирован от любых runtime-зависимостей. Использует только:
- TypeScript нативные типы
- Zod (isomorphic — работает в любом runtime)
- Web Crypto API в `utils/communications-e2ee.ts` (доступен в браузере, Node.js ≥ 15, Deno)

Слой соответствует инварианту: **shared — только чистые контракты**.

---

## 6. Дубликаты и смешение ответственности

### 6.1 `DesignMode` — два источника истины

| Местонахождение | Что экспортирует |
|-----------------|------------------|
| `shared/types/design-mode.ts` | `DesignMode`, `DesignConceptSlug`, `DesignModeDescriptor` (чистые типы) |
| `shared/constants/design-modes.ts` | `DESIGN_MODES`, `DESIGN_MODE_DESCRIPTORS`, плюс функции `resolveDesignModeFromConceptSlug()`, `normalizeDesignConceptSlug()`, `getUiThemeStorageKey()` |

Сами типы и константы разделены корректно. Проблема: функции в `constants/design-modes.ts` — это утилиты, а не константы. По соглашению `constants/**` содержит только статические значения.

### 6.2 Утилиты в `constants/`

Несколько файлов в `constants/` экспортируют функции, нарушая семантику папки:

| Файл | Функции-нарушители |
|------|--------------------|
| `constants/design-modes.ts` | `resolveDesignModeFromConceptSlug()`, `normalizeDesignConceptSlug()`, `getUiThemeStorageKey()`, `isDesignConceptSlug()` |
| `constants/app-catalog.ts` | `toPayloadItems()`, `getLayoutTemplateById()` |
| `constants/profile-fields.ts` | `createEmptyClientProfileDraft()` |
| `constants/pages.ts` | `getClientPages()`, `getAdminPages()`, `findPage()`, `getAdminNavGroups()` |
| `constants/presets.ts` | `findPreset()`, `getPresetsByCategory()`, `presetLabel()`, `presetIcon()` |
| `constants/admin-navigation.ts` | `getAdminSectionRoute()`, `getAdminCategoryRoute()`, `getProjectRoute()`, `getRegistryItemId()` |
| `constants/brief-sections.ts` | `getBriefSections()` |

Это не критические нарушения инвариантов безопасности, но создают неоднозначность в читаемости и tree-shaking.

### 6.3 Overlap: `shared/types/catalogs.ts` и `shared/types/designer.ts`

`catalogs.ts` содержит `DESIGNER_SERVICE_CATEGORIES` (enum) рядом с `CONTRACTOR_TYPES`, `MATERIAL_TYPES`. `designer.ts` содержит `DESIGNER_SERVICE_CATEGORIES` + полные `DesignerServiceTemplate`. Необходима проверка на возможный дубль.

### 6.4 `phase-steps.ts` в types/ содержит данные

`shared/types/phase-steps.ts` экспортирует `PHASE_STEPS` — объект с данными фаз (~263 строки). Данные в `types/` нарушают семантику папки (типы vs значения). Эти данные следует перенести в `constants/`.

---

## 7. Граф потребителей

Grep по `~/shared/`, `from '~/shared/` в `app/`, `server/`, `messenger/`, `services/`:

| Слой | Файлов-потребителей |
|------|---------------------|
| `server/modules/**` | ~14 |
| `server/api/**` | ~33 |
| `server/db/schema/**` | 1 |
| `app/entities/**` | 1 |
| `messenger/**` | не обнаружено прямых импортов из `shared/types` или `shared/constants` |
| `services/**` | не обнаружено прямых импортов (используют только `communications.ts` через `services/communications-service/`) |

Основной потребитель — серверный слой (`server/modules/` + `server/api/`). Фронтенд (`app/`) потребляет значительно меньше, что ожидаемо: большинство типов — доменные серверные контракты.

---

## 8. Рекомендации по консолидации (TASK-предложения)

### TASK-A: Вынести утилиты из `constants/` в `utils/`
**Файлы:** `constants/design-modes.ts`, `constants/app-catalog.ts`, `constants/profile-fields.ts`, `constants/pages.ts`, `constants/presets.ts`, `constants/admin-navigation.ts`, `constants/brief-sections.ts`.
**Действие:** Переместить функции (`getX`, `findX`, `resolveX`, `createX`) в соответствующие файлы `utils/` (создать при необходимости), обновить импорты.
**Риск:** Средний — широко используемые функции навигации и проектных пресетов.

### TASK-B: Перенести `PHASE_STEPS` из `types/` в `constants/`
**Файл:** `shared/types/phase-steps.ts`.
**Действие:** Переместить константный объект `PHASE_STEPS` в `constants/`, оставить в `types/` только `PhaseStep`, `PhaseDefinition`. Обновить импорты.
**Риск:** Низкий — изолированный файл с узким кругом потребителей.

### TASK-C: Разбить `shared/types/catalogs.ts` (1 062 строки)
**Файл:** `shared/types/catalogs.ts`.
**Действие:** Выделить `PROJECT_STATUSES`/`ProjectStatus` → `types/project/statuses.ts`; `MATERIAL_TYPES` → `types/gallery/material-types.ts`; `CONTRACTOR_TYPES`/`CONTRACTOR_WORK_TYPE_OPTIONS` → `types/contractor/contractor-types.ts`. Сохранить реэкспорт в `catalogs.ts` для обратной совместимости.
**Риск:** Средний — требуется осторожное обновление ~40 импортов в `server/`.

### TASK-D: Разбить `shared/utils/project-control.ts` (1 054 строки)
**Файл:** `shared/utils/project-control.ts`.
**Действие:** Выделить в подмодули по доменным границам: `project-control-phases.ts`, `project-control-checkpoints.ts`, `project-control-sprints.ts`. Сохранить `project-control.ts` как barrel.
**Риск:** Низкий — чисто организационная операция, публичный API не меняется.

### TASK-E: Проверить и устранить дубль `DESIGNER_SERVICE_CATEGORIES`
**Файлы:** `shared/types/catalogs.ts` vs `shared/types/designer.ts`.
**Действие:** Проверить, экспортируются ли одинаковые значения из обоих файлов; если да — оставить одно место истины и добавить реэкспорт. Обновить потребителей.
**Риск:** Низкий.
