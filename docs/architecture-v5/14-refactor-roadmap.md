# 14. Roadmap исполнения рефакторинга v5

Этот файл нужен не как еще один общий план, а как **рабочий журнал рефакторинга**, в который вносятся уже сделанные изменения, текущий статус и следующий безопасный шаг.

## Зачем нужен отдельный roadmap

Документы 09-13 описывают целевую архитектуру, матрицы переноса и волны. Но для реальной работы нужен отдельный документ, который отвечает на три вопроса:

1. Что уже реально сделано в коде, а не только описано в архитектуре.
2. Какой следующий шаг безопасен именно сейчас.
3. Как фиксировать прогресс так, чтобы не потерять связь между commit, файлами, валидацией и server fork.

## Выбранная модель ведения рефакторинга

Чисто послойный подход недостаточен:
- он хорошо задает стратегию;
- но плохо отслеживает конкретные файлы и реальные commit-ы.

Чисто пофайловый подход тоже слаб:
- он удобен для локальных правок;
- но быстро превращает рефакторинг в хаотичный список без архитектурного контроля.

### Поэтому здесь используется комбинированная схема

Уровень 1. Волна рефакторинга
- `Wave 0` — freeze, docs, аудит, fork.
- `Wave 1` — пустой каркас директорий.
- `Wave 2` — shared-first migration.
- `Wave 3+` — frontend shell, backend modules, messenger, cleanup.

Уровень 2. Слой внутри волны
- `infra/fork`
- `shared`
- `frontend`
- `backend`
- `messenger`

Уровень 3. File batch
- небольшая группа файлов, которую можно безопасно перенести и проверить одной сборкой;
- batch должен заканчиваться commit-ом и проверкой build/runtime.

Это лучший формат для этого проекта: стратегия остается послойной, а исполнение идет батчами по файлам.

## Правила ведения roadmap

Каждая новая запись должна содержать:
- дату;
- волну и слой;
- краткую цель батча;
- список реально измененных файлов;
- commit hash;
- что проверено;
- риски или долги, которые остались после батча.

## Формат записи

```md
### [done] YYYY-MM-DD — Wave N / layer
Цель: ...

Файлы:
- path/to/file
- path/to/file

Commit:
- abc1234 message

Проверка:
- pnpm build — ok
- server refactor runtime — ok

Долги:
- ...
```

## Текущее состояние программы рефакторинга

### [done] 2026-04-07 — Wave 0 / infra+docs
Цель: зафиксировать архитектуру v5 и создать отдельный refactor fork.

Файлы:
- docs/architecture-v5/01-infrastructure.md
- docs/architecture-v5/02-monorepo-structure.md
- docs/architecture-v5/03-backend-layer.md
- docs/architecture-v5/04-frontend-layer.md
- docs/architecture-v5/05-architectural-patterns.md
- docs/architecture-v5/06-shared-layer.md
- docs/architecture-v5/07-realtime-messenger.md
- docs/architecture-v5/08-scripts-and-maintenance.md
- docs/architecture-v5/09-target-repository-tree.md
- docs/architecture-v5/10-frontend-refactor-map.md
- docs/architecture-v5/11-backend-shared-refactor-map.md
- docs/architecture-v5/12-messenger-services-refactor-map.md
- docs/architecture-v5/13-refactor-waves.md
- docs/architecture-v5/REFACTORING_PLAN.md
- ecosystem.refactor.config.cjs
- messenger/ecosystem.refactor.config.cjs

Commit:
- 4708dfc docs(architecture): define refactor scaffold and fork configs
- f408dea docs(architecture): complete refactor blueprint set
- 408a786 fix(deploy): set refactor app cwd for pm2

Проверка:
- refactor branch создан и запушен в origin
- отдельный PM2 config создан
- refactor server clone поднят на порту 3018
- отдельная БД `daria_admin_refactor` создана

Долги:
- messenger refactor runtime пока только подготовлен конфигурационно

### [done] 2026-04-07 — Wave 2 / shared scaffold
Цель: создать новую структуру `shared/**` и первую совместимую раскладку target-path.

Файлы:
- shared/constants/navigation/admin-navigation.ts
- shared/constants/navigation/app-catalog.ts
- shared/constants/navigation/pages.ts
- shared/constants/design-system/brief-sections.ts
- shared/constants/design-system/design-modes.ts
- shared/constants/design-system/presets.ts
- shared/constants/profile/profile-fields.ts
- shared/constants/system/roles.ts
- shared/constants/system/status-colors.ts
- shared/constants/system/websocket-events.ts
- shared/types/navigation/navigation.ts
- shared/types/navigation/app-catalog.ts
- shared/types/project/project.ts
- shared/types/project/phase-steps.ts
- shared/types/project/catalogs.ts
- shared/types/communications/communications.ts
- shared/types/design-system/design-mode.ts
- shared/types/design-system/design-modules.ts
- shared/types/design-system/element-alignment.ts
- shared/types/design-system/element-visibility.ts
- shared/types/design-system/wipe2.ts
- shared/utils/communications/communications-e2ee.ts
- shared/utils/designer/designer-catalogs.ts
- shared/utils/project/project-control.ts
- shared/utils/project/project-control-timeline.ts
- shared/utils/project/work-status.ts
- shared/utils/ui/status-maps.ts
- app/composables/useAdminNav.ts
- app/composables/useAdminData.ts

Commit:
- 48e10f0 refactor(shared): scaffold target shared paths

Проверка:
- точечная проверка ошибок по shared и admin navigation прошла

Долги:
- commit `48e10f0` смешанный по составу;
- в него попали и pre-existing изменения, поэтому этот этап архитектурно полезен, но git-исторически неидеален

### [done] 2026-04-07 — Wave 2 / bridge modules + safe cutover
Цель: перевести следующий безопасный батч на v5-paths и создать реальные bridge-модули в `app/entities` и `server/modules`.

Файлы:
- app/entities/admin-navigation/model/useAdminNav.ts
- app/entities/agents/model/useAgentRegistry.ts
- app/entities/agents/model/useAgentSettings.ts
- app/entities/app-blueprint/model/useAppBlueprintCatalog.ts
- app/entities/app-blueprint/model/useAppBlueprintRuntime.ts
- app/entities/communications/model/useProjectCommunicationsBootstrap.ts
- app/entities/communications/model/useStandaloneCommunicationsBootstrap.ts
- app/entities/contractors/model/useContractorCabinet.ts
- app/entities/design-system/model/useDesignModules.ts
- app/entities/design-system/model/useDesignSystem.ts
- app/entities/design-system/model/useEditMode.ts
- app/entities/design-system/model/useElementAlignment.ts
- app/entities/design-system/model/useElementVisibility.ts
- app/entities/design-system/model/useUITheme.ts
- app/entities/design-system/model/useWipe2.ts
- app/entities/designers/model/useDesignerCabinet.ts
- app/entities/gallery/model/useGallery.ts
- server/modules/auth/auth.service.ts
- server/modules/auth/recovery.service.ts
- server/modules/chat/chat-communications.service.ts
- server/modules/communications/communications-bootstrap.service.ts
- server/modules/projects/projects.service.ts
- server/modules/projects/project-relations.service.ts
- server/modules/projects/project-governance.service.ts
- server/modules/uploads/upload-storage.service.ts
- server/modules/uploads/upload-validation.service.ts
- server/modules/ai/gemma.service.ts
- server/modules/ai/rag.service.ts
- shared/types/auth/auth.ts
- shared/types/contractor/contractor.ts
- shared/types/designer/designer.ts
- shared/types/gallery/gallery.ts
- shared/types/gallery/material.ts
- shared/types/project/project-governance.ts
- shared/utils/project/project-governance.ts
- app/composables/useStandaloneCommunicationsBootstrap.ts
- app/composables/useProjectCommunicationsBootstrap.ts
- app/composables/useGallery.ts
- app/composables/useDesignerCabinet.ts
- app/layouts/contractor.vue
- app/pages/admin/clients/index.vue
- app/pages/client/[slug]/index.vue
- server/utils/communications.ts
- server/utils/standalone-chat-communications.ts
- server/api/projects/index.post.ts
- server/api/projects/[slug].put.ts
- server/api/contractors/index.post.ts
- docs/architecture-v5/11-backend-shared-refactor-map.md

Commit:
- 3944ce7 refactor(v5): add bridge modules and shared cutover

Проверка:
- `pnpm build` — ok
- server refactor runtime обновлен до 3944ce7 — ok
- `http://152.53.176.165:3018/login?role=admin` — ok

Долги:
- это еще bridge-stage, а не конечный перенос бизнес-логики
- `server/modules/**` пока в основном re-export поверх legacy utils
- `app/entities/**` пока в основном re-export поверх legacy composables

### [done] 2026-04-16 — Wave 3 / frontend widgets shell cutover
Цель: перевести admin-страницы на widget-shell слой без изменения публичных маршрутов.

Файлы:
- app/pages/admin/designers/index.vue
- app/pages/admin/contractors/index.vue
- app/pages/admin/gallery/index.vue
- app/pages/admin/gallery/art.vue
- app/pages/admin/gallery/furniture.vue
- app/pages/admin/gallery/interiors.vue
- app/pages/admin/gallery/materials.vue
- app/pages/admin/gallery/moodboards.vue
- app/pages/admin/projects/[slug].vue
- app/widgets/**

Commit:
- eccf94d refactor(crm): migrate admin pages to v5 widget shells

Проверка:
- `pnpm exec nuxi typecheck` — ok

Долги:
- часть `app/components/**` все еще используется как внутренний implementation layer под widget-обертками

### [done] 2026-04-16 — Wave 5 / backend projects service cutover
Цель: сделать projects/work-status endpoints thin-controller и вынести hot-path в сервисный слой.

Файлы:
- server/api/projects/index.get.ts
- server/api/projects/[slug].get.ts
- server/api/projects/[slug]/work-status.get.ts
- server/api/projects/[slug]/work-status.put.ts
- server/utils/projects.ts
- server/utils/project-work-status.ts
- server/modules/projects/project-work-status.service.ts
- server/utils/project-governance.ts

Commit:
- 6afc029 refactor(server): route projects hot paths through v5 services

Проверка:
- `pnpm exec nuxi typecheck` — ok

Долги:
- не все домены `server/api/**` еще полностью переведены на чистый service-only слой

### [done] 2026-04-16 — Meta / docs sync
Цель: зафиксировать финальные хвосты и аудит server-контуров в operational-документах.

Файлы:
- docs/architecture-v5/refactor-tail-report.md
- docs/architecture-v5/server-audit-report.md

Commit:
- 254fff5 docs(v5): add refactor tail and server audit reports

Проверка:
- отчеты добавлены в репозиторий и согласованы с INDEX

Долги:
- поддерживать их синхронно после каждого следующего batch

### [done] 2026-04-17 — Governance / lint invariants + coding standards
Цель: превратить архитектурные правила v5 в исполняемые контракты и закрепить per-file ratchet, чтобы дальнейший рефакторинг не накапливал новый долг.

Файлы:
- eslint.config.mjs (новый): FSD/DDD/runtime-isolation/shared-purity как no-restricted-imports error-rules; size/complexity budgets как warn.
- scripts/lint-ratchet.mjs (новый) + .lint-baseline.json: per-file baseline (220 → 218 после demo batch ниже).
- scripts/verify-architecture-docs.mjs (усилён): INDEX completeness + matrix reality check.
- docs/architecture-v5/17-coding-standards.md (новый): наименования, размер файлов, LLM-friendly структура, DTO versioning.
- .githooks/pre-commit: docs:v5:verify + lint:ratchet.
- CLAUDE.md: раздел ESLint invariants, commit checklist с lint:errors.

Commit:
- edc80fc chore(lint): add ESLint 9 with v5 architectural invariants
- 8b3eeaf chore(lint): add per-file lint ratchet to pre-commit
- b63b919 chore(verify-docs): add INDEX completeness + matrix reality checks
- c62829b docs(architecture-v5): add 17-coding-standards (size, names, LLM rules)

Проверка:
- `pnpm lint:errors` — 218 errors (все архитектурные, основной класс — drizzle-orm в server/api/**)
- `pnpm docs:v5:verify` — 21 file, matrix reality: 10/48 frontend 15 done / 32 pending, 11/60 backend 0 done / 8 with targets, 12/68 messenger 1 pending (остальные — section-local paths вне машинной проверки)
- `pnpm exec vue-tsc --noEmit` — ok

Долги:
- матрицы 11 и 12 переписать на repo-root-relative paths, чтобы рaeling-check охватил все 128 строк.
- поле DTO versioning (17.6) и правило no-default-export (17.7.1) помечены [planned], требуют CI-проверки.
- bridge-only modules (`server/modules/{auth,projects,chat}/*.service.ts`) выявлены как re-export без логики — не входит в этот batch, запланировано Wave 5 real-content.

### [done] 2026-04-17 — Wave 5 / server/api/auth/me.get.ts → session.service.ts (demo batch)
Цель: первый настоящий API → module перенос (не bridge), чтобы продемонстрировать шаблон и снять 2 lint error'а с baseline.

Файлы:
- server/modules/auth/session.service.ts (новый): `resolveSession(event)` + private `resolveAdminUser`, обращения к Drizzle ведутся только здесь.
- server/api/auth/me.get.ts: сведён к 5 строкам — thin handler вызывает `resolveSession`.

Commit:
- (этот коммит)

Проверка:
- `pnpm exec vue-tsc --noEmit` — ok
- `pnpm lint:ratchet` — 218 (baseline обновлён). Раньше me.get.ts имел 2 no-restricted-imports error'а (drizzle-orm + ~/server/db/schema), теперь 0.
- Runtime: поведение идентично — тот же набор ролей, та же fallback-логика DESIGNER_INITIAL_EMAIL, та же инвалидация stale contractor session.

Долги:
- Остальные auth-эндпоинты (login.post, register.post, recover.post, logout.post, client/contractor варианты) должны быть перенесены аналогично, 18+ error'ов уйдут за один wave.
- Помечен как шаблон для refactor-wave-executor агента.

## Что считается завершением полного рефакторинга

Рефакторинг считается завершенным только когда выполнены все условия:
- legacy imports на старые shared-path почти исчезли;
- `app/entities`, `app/features`, `app/widgets` используются как основные пути, а не как bridge;
- `server/api/**` стали thin-controller;
- логика реально живет в `server/modules/**`, а не в `server/utils/**`;
- крупные монолиты `app/components/**` разрезаны на target-слои;
- `server/db/schema.ts` разложен на модульные schema-файлы;
- messenger контур так же приведен к target-структуре;
- можно удалить временные bridge/re-export слои.

## Следующий рекомендуемый шаг

### [next] Wave 4-6 / final structure alignment
Цель: довести фактическую структуру до полного соответствия target-tree из 09-12.

Приоритет:
1. заполнить `app/shared/**` и `app/features/**` как основные точки входа (с минимизацией bridge-слоя)
2. завершить migration `server/api/** -> server/modules/**` для оставшихся доменов
3. закрыть DB-schema target alignment (`server/db/schema/**`, `relations.ts`) без поломки runtime

## Отдельный технический долг

### [risk] Mixed commit cleanup
Commit `48e10f0` нужно позднее либо:
- логически задокументировать как смешанный этап;
- либо вычистить через отдельную git-операцию в refactor fork.

Пока это не блокирует развитие v5, но ухудшает читаемость истории рефакторинга.

## Current Status vs Target (2026-04-16)

- Относительно `09-target-repository-tree.md`: базовый каркас в основном создан, но остаются незавершенные зоны в `app/shared/**`, `app/features/**`, частично в messenger web FSD.
- Относительно `10-frontend-refactor-map.md`: выполнен widget-shell cutover ключевых CRM admin-страниц, продолжается вынос из legacy `app/components/**`.
- Относительно `11-backend-shared-refactor-map.md`: закрыт projects/work-status hot-path batch; полный service-only перенос остальных доменов еще в процессе.
- Относительно `12-messenger-services-refactor-map.md`: контуры изолированы, детальная bounded-context/FSD alignment требует отдельной волны.
- Следующий milestone: финальный structure-alignment batch по приоритетам из секции `[next]`.
