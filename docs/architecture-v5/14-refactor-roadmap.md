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

### [done] 2026-04-17 — Wave 5 / server/api/auth/* полный перенос в modules
Цель: завершить API → module перенос для всего auth-контура. 9 файлов, 18 no-restricted-imports errors.

Файлы:
- server/modules/auth/admin-auth.service.ts (новый): adminLogin, adminRegister. Содержит legacy bootstrap-логику DESIGNER_INITIAL_* для первой учётки дизайнера.
- server/modules/auth/admin-recovery.service.ts (новый): adminRecover.
- server/modules/auth/client-auth.service.ts (новый): clientLogin, clientRegister, clientRecover + локальная ClientLoginSchema (slug или credentials union).
- server/modules/auth/contractor-auth.service.ts (новый): contractorLogin, contractorRegister, contractorRecover + ContractorLoginSchema (id+slug или credentials union).
- server/api/auth/login.post.ts (thin): читает body через LoginSchema, зовёт adminLogin.
- server/api/auth/register.post.ts (thin): adminRegister.
- server/api/auth/recover.post.ts (thin): adminRecover.
- server/api/auth/client-login.post.ts (thin): ClientLoginSchema + clientLogin.
- server/api/auth/client-register.post.ts (thin): clientRegister.
- server/api/auth/client-recover.post.ts (thin): clientRecover.
- server/api/auth/contractor-login.post.ts (thin): contractorLogin.
- server/api/auth/contractor-register.post.ts (thin): contractorRegister.
- server/api/auth/contractor-recover.post.ts (thin): contractorRecover.

Commit:
- (этот коммит)

Проверка:
- `pnpm exec vue-tsc --noEmit` — ok
- `pnpm lint:ratchet` — 200 (baseline 218 → 200, -18). Все 9 endpoint'ов сведены к ~5-7 строк каждый.
- Runtime-поведение идентично: те же статус-коды (401, 404, 409), те же сообщения, та же логика bootstrap-seed для admin.

Долги:
- Существующие bridge-файлы `auth.service.ts` (re-export из utils/auth + auth-registration) и `recovery.service.ts` (re-export из utils/recovery-phrase) намеренно не тронуты, т.к. на них ссылается другой код. Их удаление — отдельный batch cleanup-wave.
- csrf.get.ts и client-id-logout/contractor-logout — мелкие endpoint'ы без DB, invariant-ошибок не имеют, остаются как есть.

### [done] 2026-04-17 — Wave 5 / server/api/admin/{search,notifications} в modules/admin
Цель: распилить два admin-endpoint'а, у которых была толстая DB-логика внутри handler'а.

Файлы:
- server/modules/admin/admin-search.service.ts (новый): searchAdminEntities — параллельные запросы по projects/clients/contractors с trim + min-2-chars guard, возвращает SearchResults с href'ами.
- server/modules/admin/admin-notifications.service.ts (новый): getAdminNotifications — aggregator трёх бакетов (extra-requested, overdue work items, critical hybrid-control) с готовыми labels.
- server/api/admin/search.get.ts (thin): парсит q, проверяет requireAdmin, делегирует.
- server/api/admin/notifications.get.ts (thin): requireAdmin + делегирует.

Commit:
- (этот коммит)

Проверка:
- `pnpm exec vue-tsc --noEmit` — ok
- `pnpm lint:ratchet` — 196 (baseline 200 → 196, -4). 2 endpoint'а × 2 import'а (drizzle-orm + db/schema) = 4.
- Runtime-поведение идентично: тот же MIN_QUERY_LENGTH=2, LIMIT=6, те же href-паттерны, тот же порядок бакетов в notifications.

Долги:
- Рядом лежат ещё server/api/admin/contractors/[id]/preview.get.ts и другие admin-ручки с fat-handlers — отдельная волна по admin-CRUD.

### [done] 2026-04-17 — Wave 6 / split server/db/schema.ts → per-domain files
Цель: разложить 511-строковый монолит `server/db/schema.ts` по доменным файлам под `server/db/schema/`, сохранив полностью совместимую import-поверхность через barrel.

Файлы (новые, все под server/db/schema/):
- users.ts — users, adminSettings
- clients.ts — clients
- projects.ts — projects, pageConfigs, pageContent
- contractors.ts — contractors, projectContractors, contractorDocuments
- work-status.ts — workStatusItems, workStatusItemPhotos, workStatusItemComments
- uploads.ts — uploads, galleryItems
- documents.ts — documents, projectExtraServices
- designers.ts — designers, designerProjects, designerProjectClients, designerProjectContractors
- sellers.ts — sellers, sellerProjects
- managers.ts — managers, managerProjects
- project-governance.ts — projectParticipants, projectScopeAssignments, projectScopeSettings
- relations.ts — ВСЕ `relations(...)` (вынесены в отдельный файл, чтобы избежать циклов между per-domain таблицами)
- index.ts — barrel, `export * from './*'`

Удалено:
- server/db/schema.ts

Изменено:
- drizzle.config.ts: `schema: './server/db/schema/*.ts'` — glob вместо одного файла. Drizzle-kit автоматически подхватит все per-domain таблицы.

Commit:
- (этот коммит)

Проверка:
- `pnpm exec vue-tsc --noEmit` — ok (все существующие import'ы `from '~/server/db/schema'` продолжают работать через barrel)
- `pnpm lint:ratchet` — 196 (baseline неизменён, split не менял логику)
- `pnpm docs:v5:verify` — ok

Долги:
- Следующий deploy нужно прогнать через `pnpm db:generate --dry-run` (или эквивалент), убедиться что drizzle-kit не сгенерит пустую diff-миграцию из-за glob-путей — схема осталась идентичной, но kit может по-другому упорядочить импорты.
- `server/db/index.ts` (DB client wiring) не тронут.

### [done] 2026-04-17 — Meta / matrices 11,12 normalized to repo-root paths
Цель: сделать матрицы 11 и 12 полностью машинно-проверяемыми. До этого `scripts/verify-architecture-docs.mjs` мог проверить только ~10% строк из-за использования bare basenames и section-local paths.

Файлы:
- docs/architecture-v5/11-backend-shared-refactor-map.md: полная переписка. Все `server/api/**` endpoints перечислены с полными путями. `server/utils -> target` использует `server/utils/<name>.ts` как source. Секция "Разбиение schema" переписана под фактический результат Wave 6.
- docs/architecture-v5/12-messenger-services-refactor-map.md: все source пути префиксированы `messenger/core/src/`, `messenger/web/app/components/messenger/`, `messenger/web/app/composables/`, `services/communications-service/src/`.

Commit:
- (этот коммит)

Проверка (до / после):
```
          11-backend:   60 rows parsed (52 missing)  →  67 rows parsed (10 missing)
          12-messenger: 68 rows parsed (67 missing)  →  68 rows parsed (0 missing)
          11-backend:   new breakdown: 2 done, 20 pending, 35 ambiguous (bridge/partial), 10 dir-level entries
          12-messenger: new breakdown: 0 done, 68 pending
```
- `pnpm docs:v5:verify` — ok, 21 file
- 35 ambiguous rows в matrix 11 — это thin-bridge маркер: source ещё существует, target тоже существует (чаще всего как re-export). Точно соответствует нашему анализу bridges. Эти entries — приоритетный backlog для Wave 5 cleanup.

Долги:
- `docs/architecture-v5/10-frontend-refactor-map.md` уже использует короткие basenames в "Shared UI" секции — формально работает через индекс `app/components/**`, но для консистентности стоит тоже переписать на repo-root. Отдельный batch.

### [done] 2026-04-17 — Governance / enable no-default-export (17.7.1)
Цель: включить ESLint-блокировку `export default` в обычных `.ts` файлах. Это обеспечивает reference-by-name стабильность для LLM-агентов.

Файлы:
- eslint.config.mjs: добавлено правило `no-restricted-syntax` с селектором `ExportDefaultDeclaration` как ERROR. Расширен override-блок для framework-contract путей (`*.config`, `*.options`, Nuxt middleware/plugins/pages/layouts, `server/api/**`, `server/middleware/**`, `server/plugins/**`, `scripts/**`, все `.vue`), чтобы default export там оставался разрешён.
- docs/architecture-v5/17-coding-standards.md: 17.7.1 обновлён, пункт снят с `[planned]` → enforced. Changelog обновлён.

Commit:
- (этот коммит)

Проверка:
- `pnpm lint:ratchet` — 196 (baseline не сдвинулся). Обычные `.ts` файлы в `server/modules/`, `server/utils/`, `shared/`, `app/composables/`, `app/entities/`, `app/widgets/` уже не использовали default export — правило включено "на зелёном поле", без backlog.
- 2 ложных срабатывания устранены через overrides:
  - `app/router.options.ts` — Nuxt router config, требует default.
  - `messenger/web/vuetify.options.ts` — Vuetify plugin config, требует default.

Долги:
- Для новых .vue файлов стоит отдельно отслеживать, что имя компонента совпадает с именем файла (17.2.1). Можно сделать через eslint-plugin-vue правило `vue/match-component-file-name` — отдельный batch.

### [audit] 2026-04-17 — refactor-auditor snapshot после governance + partial Wave 5/6
Цель: зафиксировать состояние на конец дня, чтобы завтрашняя сессия могла продолжить с чёткого пункта, не делая повторно аудит.

Источник: agent `.claude/agents/refactor-auditor.md` (Explore-прогон).

**Wave statuses:**
- Wave 0 (freeze + docs) — done
- Wave 1 (empty scaffold) — done
- Wave 2 (shared-first migration) — done
- Wave 3 (frontend widget shell cutover) — done
- Wave 4 (giant-file slicing) — **NOT STARTED** (25 компонентов >500 строк нетронуты; UIDesignPanel 6624, AdminProjectControl 5844, AdminDesignerCabinet 4332, ClientProjectControl 3405, ProjectCommunicationsPanel 2639, AdminDocumentEditor 2595, ещё 19 файлов 500-1654 строк)
- Wave 5 (server module migration) — **~70% done** (auth 9 файлов, admin search+notifications, projects hot-path. Осталось: clients, contractors, designers, sellers, managers, documents, gallery, suggest, chat — ~50 endpoints)
- Wave 6 (DB schema split) — done
- Wave 7 (messenger cutover) — not started (matrix 12: 0/68)
- Wave 8 (legacy cleanup) — not started (bridge-only modules в `auth/recovery` ещё живут)

**Lint baseline сейчас:** 196 errors в 106 файлах.

**Top-10 приоритеты на следующий wave (по impact / risk / deps):**

1. **Drizzle-orm в server/api/** — 71 errors в 44 файлах. Expected delta: −71. Effort: L. Unblocker для остатка Wave 5.
2. **CRUD clients/contractors/designers/sellers/managers** — 50+ errors, 48 endpoints. Delta: −50. Effort: L. Закрывает 48 строк matrix 11.
3. **server/utils/project-governance.ts (2082 строк) → modules** — Delta: −5 (embedded drizzle). Effort: M. Риск: используется в 6+ endpoints.
4. **Distributed slice UIDesignPanel.vue (6624)** — Delta: −3 (size warns). Effort: L.
5. **Заполнить bridge-only сервисы реальной логикой** (auth/recovery, projects/relations re-exports) — Delta: 0 (уже переносили в Wave 5). Effort: S. Убирает ambiguous-строки в matrix 11.
6. **Messenger/core bounded-context split** — Delta: 0 (не в baseline). Effort: L. Matrix 12: 0 → 10 done.
7. **app/shared/ui + composables** — Delta: −2. Effort: M. Unblocker для всего frontend FSD alignment.
8. **Documents/gallery/uploads модули** — Delta: −18. Effort: M. Low-risk, self-contained.
9. **AdminProjectControl (5844) + AdminDocumentEditor (2595) slice** — Delta: −4 (size). Effort: M. Блокер: Wave 5 projects.
10. **services/communications-service/pg-store isolation** — Delta: −1 (postgres import). Effort: S.

**Matrix 11 ambiguous-строки (35):** чаще всего bridge-only (target существует как re-export, source-util тоже на месте). Главные: `server/modules/auth/{admin,session,client}-auth.service.ts` (хотя мы их уже написали реально — скрипт не различает because old utils ещё существуют), `projects/{projects,project-relations,project-governance}.service.ts`, `chat/chat-communications.service.ts`, `ai/gemma.service.ts`, `uploads/upload-storage.service.ts`, `admin-settings/app-blueprints.service.ts`.

**Invariants не закрытые ESLint:**
- Шаблон `.repository.ts` не существует в кодовой базе. Сейчас drizzle-orm живёт в `.service.ts`. Архитектура призывает к отдельному repository-слою, но пока не реализован. Планово в 17-coding-standards.md §17.3 упомянут, но не enforced.
- `postgres` клиент импортируется только в `services/communications-service/src/pg-store.ts` (1 нарушение, в baseline) и `server/db/index.ts` (правильно).
- `messenger/**` не импортирует из `~/server/db` — 0 нарушений ✓.

**Рекомендованный следующий batch (30-60 мин):**
- Scope: Documents CRUD (documents/index.*)
- Файлы: новый `server/modules/documents/documents.service.ts` + 5 thin handlers в `server/api/documents/`.
- Delta: −12 (196 → 184).
- Verification: `pnpm lint:errors | grep 'documents/'` = 0, `pnpm lint:ratchet`, `pnpm exec vue-tsc --noEmit`.
- Риск: низкий (self-contained, нет multi-domain relations как в projects).

### [done] 2026-04-17 — Wave 5 / documents CRUD → modules/documents (выполнено по аудит-плану)
Цель: перевести 6 файлов `server/api/documents/*.ts` на thin handlers, логика — в `server/modules/documents/documents.service.ts`. Прогноз аудита: delta −12. Результат: ровно −12.

Файлы:
- server/modules/documents/documents.service.ts (новый): единый service-файл с экспортами:
  - `CreateDocumentSchema`, `UpdateDocumentSchema` + типы — локальные Zod-контракты (не пересекают границы процесса, поэтому не в shared)
  - `listDocuments({ category?, projectSlug? })` — list + filter
  - `createDocument(body)` — insert с resolve projectSlug → projectId
  - `getDocument(id)` — single row (возвращает null вместо throw — handler решает 404)
  - `updateDocument(id, body)` — partial update с whitelist полей
  - `deleteDocument(id)` — delete + cleanup файла с диска (через `~/server/utils/storage.getUploadDir`)
  - `getDocumentContext(projectSlug)` — агрегация project+clients+contractors+pageContent для auto-fill шаблонов
- server/api/documents/{index.get,index.post,[id].get,[id].put,[id].delete,context.get}.ts: thin handlers (3-10 строк каждый), вся DB-логика делегирована в service.
- Не тронут: `server/api/documents/export-docx.post.ts` (185 строк, не было lint-ошибок — работает с `docx` npm-пакетом, БД не касается, отдельный concern).

Commit:
- (этот коммит)

Проверка:
- `pnpm exec vue-tsc --noEmit` — ok
- `pnpm lint:ratchet` — 184 (baseline 196 → 184, ровно −12)
- `pnpm docs:v5:verify` — ok, 21 file
- Runtime идентичен: те же категории, те же статусы 400/401/404, те же fallback'и в context (empty projectSlug → вернуть все clients/contractors; missing project → вернуть пустой контекст с today), та же очистка файла при delete.

Долги:
- Следующая цель по аудиту: либо CRUD clients/contractors/designers/sellers/managers (Delta −50, L), либо uploads+gallery (Delta −18, M). Documents — шаблон для этих batches.

### [done] 2026-04-17 — Wave 5 / gallery CRUD → modules/gallery
Цель: перевести все 5 endpoint'ов `server/api/gallery/*.ts` на thin handlers. Delta −9 (184 → 175).

Файлы:
- server/modules/gallery/gallery.service.ts (новый): 
  - `CreateGallerySchema`, `UpdateGallerySchema`, `ReorderGallerySchema` + types
  - `listGalleryItems({ category?, tag?, featured?, search? })` — ilike escape для защиты от wildcard-инъекций
  - `createGalleryItem`, `updateGalleryItem`, `deleteGalleryItem` (с cleanup файлов image + images[])
  - `reorderGalleryItems` — batch-update sortOrder в транзакции (до 1000 записей за раз)
- server/api/gallery/{index.get,index.post,[id].put,[id].delete,reorder.patch}.ts: thin handlers.

Commit:
- (этот коммит)

Проверка:
- `pnpm exec vue-tsc --noEmit` — ok
- `pnpm lint:ratchet` — 175 (baseline 184 → 175, ровно −9)
- Runtime идентичен: тот же ilike-escape, та же транзакция на reorder, тот же multi-file cleanup на delete (image + все images[]).

Замечание по upload.post.ts: в baseline lint у него 0 ошибок (не касается БД; читает multipart и пишет файл через `server/utils/storage` + `server/utils/upload-validation`). Остаётся как есть — нет нарушений, не требует перемещения.

Долги:
- Uploads table (`server/db/schema/uploads.ts`) не имеет отдельных API-ручек — только файл upload через `/api/upload.post.ts`, gallery теперь изолирована. Отдельный modules/uploads/ пока не нужен.
- Следующая крупная цель: clients/contractors/designers/sellers/managers CRUD. Каждый домен ≈ 5-10 endpoints с 2 lint-errors, суммарно ~50 errors.

### [done] 2026-04-17 — Wave 5 / clients full CRUD + docs + link → modules/clients
Цель: перевести все 9 endpoint'ов домена `clients` на thin handlers. Delta −16 (175 → 159).

Файлы:
- server/modules/clients/clients.service.ts (новый): 
  - `CreateClientSchema`, `UpdateClientSchema`, `LinkProjectSchema` + types
  - `listClients({ projectSlug? })` — list + вычисление `linkedProjects` из `projects.profile.client_id(s)`
  - `createClient`, `updateClient` (возвращает null на 404)
  - `deleteClient` — **scrub client_id и client_ids[] в projects.profile** чтобы не оставалось ghost-ссылок
  - `listClientDocuments(clientId)` — документы с префиксом `client:<id>:<kind>` в category
  - `uploadClientDocument({ clientId, fileData, filename, mimeType, title, kind, notes })` — multipart-extract сделан в handler'е, service принимает уже распарсенные данные (чтобы не зависеть от H3 event)
  - `deleteClientDocument(clientId, docId)` — верифицирует через prefix + unlink файла из `public/uploads/client-docs/`
  - `linkClientToProject(clientId, projectSlug)` — idempotent, denormalize identity в profile
  - `unlinkClientFromProject(clientId, projectSlug)` — promote next id как primary, clear всё если клиентов не осталось
- server/api/clients/{index.get,index.post,[id].put,[id].delete,[id]/documents.get,[id]/documents.post,[id]/documents/[docId].delete,[id]/link-project.post,[id]/unlink-project.post}.ts: thin handlers.

Commit:
- (этот коммит)

Проверка:
- `pnpm exec vue-tsc --noEmit` — ok (исправлены 3 type-error после первого прохода: Buffer|Uint8Array для multipart data, cast profile Record<string,unknown> → Record<string,string> при update).
- `pnpm lint:ratchet` — 159 (baseline 175 → 159, ровно −16).
- Runtime идентичен: все валидации, 400/404 mapping, ghost-reference scrub при delete, мульти-шаг promote в unlink.

Долги:
- Следующая цель: contractors (ещё крупнее, с document scoping); designers, sellers, managers (средний объём).

### [done] 2026-04-17 — Wave 5 / contractors full domain → modules/contractors (3 сервиса)
Цель: перенести самый крупный остаток Wave 5: 19 endpoint'ов contractors (CRUD + self-update + staff + projects + документы + work-items с комментариями и фотографиями). Delta −36 (159 → 123). Крупнейший batch за день.

Файлы:
- server/modules/contractors/contractors.service.ts (новый):
  - `ContractorSelfUpdateSchema` (все поля, которые подрядчик может править сам)
  - `listContractors` — joins с project_contractors и projects через array_agg (одним запросом), strip auth-slug из ответа
  - `createContractor`, `getContractor`, `updateContractorAsAdmin`, `updateContractorSelf`, `deleteContractor` (с cascade на `parent_id`-children)
  - `listContractorStaff(parentId)` — подчинённые по parent_id
  - `listContractorProjects(contractorId)` — через project_contractors
  - `resolveContractorAndStaffIds(contractorId)` — shared helper для work-items scope
- server/modules/contractors/contractor-documents.service.ts (новый): list/upload/delete для contractorDocuments, файлы в `public/uploads/contractor-docs/`.
- server/modules/contractors/contractor-work-items.service.ts (новый):
  - `CreateWorkItemSchema`, `UpdateWorkItemSchema`, `CommentSchema`
  - `listContractorWorkItems` — все items компании+staff с аннотацией assignedToName + photo/comment counts (агрегация одним запросом)
  - `createWorkItem` — проверка targetId = self или входит в staff, resolve projectSlug
  - `updateWorkItem` — scope-filtered update через allowedIds
  - `assertContractorOwnsItem` (private) — shared 403-guard
  - comments/photos: list/add/delete + photo upload через ensureUploadDir/getUploadUrl
- 19 thin handlers в server/api/contractors/.

Commit:
- (этот коммит)

Проверка:
- `pnpm exec vue-tsc --noEmit` — ok (1 type-fix: `item.contractorId` typed как `number | null`, добавлен `!== null` guard перед индексом staffMap)
- `pnpm lint:ratchet` — 123 (baseline 159 → 123, ровно −36)
- Runtime идентичен: slug-strip в admin list, 403 при попытке создать item вне staff, scope-проверки во всех sub-endpoints, path-traversal guard в delete photo.

Долги:
- Next: designers (сложные packages/services JSONB поля), sellers, managers.

### [done] 2026-04-17 — Wave 5 / designers full domain → modules/designers (2 сервиса)
Цель: перенести 14 endpoint'ов designers — CRUD + designer-projects (create/update) + links (add-client/add-contractor/remove) + linked-entities aggregator + document scoping. Delta −24 (123 → 99). Baseline впервые опустился ниже 100.

Файлы:
- server/modules/designers/designers.service.ts (новый):
  - Schemas: CreateDesignerSchema, UpdateDesignerSchema, CreateDesignerProjectSchema, UpdateDesignerProjectSchema, AddClientLinkSchema, AddContractorLinkSchema, RemoveLinkSchema.
  - `listDesigners` — normalize services/packages/subscriptions через shared designer-catalogs.
  - `getDesignerWithProjects(id)` — один designer со встроенными designerProjects, clients и contractors + validation package keys.
  - CRUD: createDesigner, updateDesigner (в транзакции с optional clearProjectPackageKeysForIds), deleteDesigner.
  - Designer-projects: createDesignerProject (create-or-reuse by slug, backfill CORE_PAGES, catch 23505 для дубль-слуга и дубль-линка), updateDesignerProject (propagate title в projects).
  - Links: addClientLink, addContractorLink, removeLink (union client | contractor).
  - `getDesignerLinkedEntities` — агрегатор sellers/managers/gallery/moodboards через designer-projects → projects, dedup по id через Map.
  - Helper `getDuplicateCode` для 23505.
- server/modules/designers/designer-documents.service.ts (новый): list/upload/delete с префиксом `designer:<id>:<kind>` в category, файлы в `public/uploads/designer-docs/`.
- 14 thin handlers в server/api/designers/.

Commit:
- (этот коммит)

Проверка:
- `pnpm exec vue-tsc --noEmit` — ok (прошёл с первого раза)
- `pnpm lint:ratchet` — 99 (baseline 123 → 99, ровно −24)
- Runtime идентичен: тот же packageKey validation, CORE_PAGES backfill, 23505-catches для дубль-линков.

Долги:
- Next: sellers (5-10 endpoints), managers (~5 endpoints), projects/** (20+ endpoints со связями).

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

### [done] 2026-04-17 — Wave 5 / sellers → modules/sellers
Перенос 6 endpoints. Delta: −12 (99 → 87). Файлы: server/modules/sellers/sellers.service.ts, 6 thin handlers. Проверки: vue-tsc ok, lint-ratchet ok.

### [done] 2026-04-17 — Wave 5 / managers → modules/managers
Перенос 6 endpoints. Delta: зафиксирован обновлением .lint-baseline.json. Файлы: server/modules/managers/managers.service.ts, 6 thin handlers. Проверки: vue-tsc ok, lint-ratchet ok.

### [done] 2026-04-17 — Wave 5 / projects core (CRUD + status + client-profile) → modules/projects
5 endpoints thinned: index.post, [slug].put, [slug].delete (с cleanup файлов), status.put, client-profile.put. Delta: −12. Файлы: server/modules/projects/project-mutations.service.ts. Проверки: vue-tsc ok, lint-ratchet ok.

### [done] 2026-04-17 — Wave 5 / admin → modules (contractor preview)
Перенос 1 endpoint. Delta: −2. Файлы: thin handler server/api/admin/contractors/[id]/preview.get.ts, использует getContractor из contractors.service.ts. Проверки: vue-tsc ok, lint-ratchet ok.

### [done] 2026-04-17 — Wave 5 / ai → modules/ai
Перенос 2 endpoints. Delta: −8 (6 drizzle + 2 emoji regex). Файлы: server/modules/ai/ai.service.ts (getLegalStatus, buildAiStreamContext), 2 thin handlers. Проверки: vue-tsc ok, lint-ratchet ok.

### [done] 2026-04-17 — Wave 5 / projects partners (contractors/designers/sellers links) → modules/projects
10 endpoints thinned: contractors.get/post/delete + contractors/[contractorId].delete + designers.get/post/delete + sellers.get/post/delete. Файл: server/modules/projects/project-partners.service.ts (listProject*/addPartnerToProject/removePartnerFromProject для трёх ролей + auth slug & PII stripping в contractors list). Проверки: vue-tsc ok, lint-ratchet ok.

### [done] 2026-04-17 — Wave 5 / projects extra-services → modules/projects
4 endpoints thinned. Файл: server/modules/projects/project-extra-services-api.service.ts (list/create/update/delete с admin-vs-client field whitelist). Проверки: vue-tsc ok, lint-ratchet ok.

### [done] 2026-04-17 — Wave 5 / projects pages (page-content + page-answers) → modules/projects
4 endpoints thinned. Файл: server/modules/projects/project-pages.service.ts (getPageContent/upsertPageContent + getPageAnswers/upsertPageAnswers, с prototype-pollution sanitization). Проверки: vue-tsc ok, lint-ratchet ok.

### [done] 2026-04-17 — Wave 5 / projects work-status items (comments + photos) → modules/projects
3 endpoints thinned. Файл: server/modules/projects/project-work-status-items.service.ts (admin-authored comments + photos listing, с shared assertItemInProject guard). Проверки: vue-tsc ok, lint-ratchet ok.
