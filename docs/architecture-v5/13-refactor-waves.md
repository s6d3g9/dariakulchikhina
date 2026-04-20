# 13. Волны рефакторинга: порядок выполнения

Главный принцип: сначала создаем новую структуру и совместимость, затем переносим файлы, и только в конце удаляем legacy-слой.

## Wave 0. Freeze и инвентаризация
- фиксируем текущие URL, API и entrypoint-ы
- обновляем docs/architecture-v5
- собираем точный список app/components, app/composables, server/api, server/utils, shared, messenger/core и messenger/web

Результат: актуальный source of truth для старта последующих волн.

## Wave 1. Создание пустого каркаса
- создаем app/core, app/shared/ui, app/entities, app/features, app/widgets
- создаем server/modules и server/db/schema
- создаем новые директории в shared/constants, shared/types, shared/utils
- создаем bounded contexts в messenger/core/src и messenger/web/app

Правило: ни один старый файл пока не удаляется.

## Wave 2. Shared-first migration
Сначала выносим общие контракты:
- shared/constants/admin-navigation.ts
- shared/constants/app-catalog.ts
- shared/constants/pages.ts
- shared/constants/profile-fields.ts
- shared/types/navigation.ts
- shared/types/project.ts
- shared/types/communications.ts
- shared/types/design-modules.ts
- shared/utils/work-status.ts
- shared/utils/project-control.ts
- shared/utils/project-control-timeline.ts

Definition of done:
- старые импорты еще живут через re-export
- новые импорты уже ссылаются на target-каталоги
- нет циклических зависимостей

## Wave 3. Frontend shell migration
### Shared primitives
- Glass-компоненты
- AppAddressInput/AppAutocomplete/AppDatePicker
- CabAutosaveStatus/CabSectionHeader
- useThemeToggle/useTimestamp/useStatusColor/useContentViewport

### Навигация и shell
- AdminNestedNav.vue
- useAdminNav.ts
- AdminEntity* shell-компоненты
- AdminEntityCreateCard.vue
- AdminPageContent.vue
- ClientPageContent.vue

### Design system
- useDesignSystem.ts
- useDesignModules.ts
- useAppBlueprintCatalog.ts
- useAppBlueprintRuntime.ts
- UIDesignPanel.vue
- UIDesignModulesMatrix.vue
- UIDesignVisibilityRules.vue
- Wipe2Renderer.vue

## Wave 4. Frontend domain migration
- раскладываем все фазовые Admin-компоненты по widgets/phases/**
- переносим весь Client-кабинет в widgets/client-cabinet/**
- переносим кабинеты и проектные workspace-блоки в widgets/cabinets и widgets/project-cabinet
- режем giant-file contractor/[id]/index.vue на shell и секции
- выносим формы авторизации из pages/** в features/auth/{admin,client,contractor}/ui/*Form.vue (см. 10)

## Wave 5. Server module migration
Порядок:
1. auth
2. projects
3. clients/contractors/designers/sellers/managers
4. documents/gallery/uploads/suggest
5. chat/communications/agent-registry/ai

Правило для каждого endpoint:
- Zod/readValidatedBody/safeGetQuery остаются в server/api
- логика уходит в server/modules/<domain>/*.service.ts
- endpoint превращается в thin-controller

## Wave 6. DB schema split
Порядок:
1. users/projects/clients/contractors
2. documents/uploads/gallery-items/work-status-items
3. relations and link tables
4. relations.ts

## Wave 7. Messenger and services cutover
- режем messenger/core/src на bounded contexts
- режем messenger/web/app по FSD
- раскладываем communications-service по auth/store
- сверяем контракты с shared/**

## Wave 8. Legacy cleanup
Только на этом этапе удаляем:
- старые дубликаты из app/components и app/composables
- legacy-обертки в server/utils
- временные re-export в shared/**

## Красные линии
1. Нельзя одновременно переписывать URL, UI-архитектуру и серверные контракты.
2. Нельзя первым шагом трогать contractor/[id]/index.vue без готового shell-каркаса.
3. Нельзя выносить типы в app или server, если они реально shared.
4. Нельзя переносить messenger-логику обратно в основное Nuxt-приложение.
5. Нельзя делать массовый rename без промежуточного совместимого слоя.

## Практический старт
1. shared/**
2. app/shared/ui/** и app/shared/composables/**
3. app/entities/admin-navigation/**
4. app/entities/design-system/**
5. app/features/page-content/**
6. server/modules/auth/**
7. server/modules/projects/**
8. только потом крупные widgets/**

Этот порядок минимизирует регрессии и позволяет идти итеративно.

## Current Status vs Target (2026-04-20)

- Status source: `15-target-alignment-audit.md` и `14-refactor-roadmap.md`.
- Волны 0–7 завершены структурно: frontend (Wave 3–4), backend modules (Wave 5), db schema split (Wave 6), messenger cutover (Wave 7).
- Wave 8 (legacy cleanup) продолжается инкрементально: удаление остаточных bridge-зависимостей и domain-logic из `server/utils/**`.
- Правило выполнения: каждая следующая волна подтверждается batch-записями в roadmap с проверкой и residual-risk.