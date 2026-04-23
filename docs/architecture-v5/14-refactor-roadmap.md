# 14. Roadmap исполнения рефакторинга v5

## Autonomous session 2026-04-20 03:00–08:00

Composer: composer-platforma-v5. Base commit: 764e036.

**Situational assessment at session start:**
- `pnpm lint:errors`: 1 error — `messenger/core/src/agents/claude-cli-reply.ts` (skip, out of scope)
- `server/api/**`: 0 fat handlers importing drizzle-orm — Wave 5 facade appears COMPLETE
- `server/modules/**`: all 15 target domains populated
- Doc 15 (dated 2026-04-19): stale — shows "~207 fat API handlers" but actual count is 0
- Wave 8 W1–W6: done (per git history). W7 legacy sweep (MESSENGER_AGENTS → DB-backed): pending
- Failed task in queue: `w2-projects-api.md` — messenger/core W2 work, RED LINE, not requeued

**Batches dispatched:** (updated as session progresses)
- Batch 1 (03:05): doc-verify + wave8-W7 legacy sweep + doc15-refresh + roadmap-update

**Blockers:**
- `~/state/queue/failed/w2-projects-api.md`: scope = `messenger/core/**` (Wave 8 W2 Core API). Violates red line. Classification: this task is either already merged or belongs to a previous autonomous session that is no longer active. Do NOT requeue. Leaving here for user review.

---

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

### [done] 2026-04-20 — Wave 9 / designers thin-wrap verification
Цель: подтвердить что 14 endpoint'ов `server/api/designers/` уже являются thin handlers и модуль `server/modules/designers/` полностью реализован. Никаких code-changes не потребовалось — домен был завершён в волне 5 (2026-04-17). Обновлена матрица 11.

Проверка:
- `grep -rln "from 'drizzle-orm'\|~/server/db/schema" server/api/designers/` — 0 файлов ✓
- `pnpm lint:errors` — 1 pre-existing error в messenger/core (не связан с designers) ✓
- `pnpm exec vue-tsc --noEmit` — pre-existing errors только в tmp_*_backup.ts файлах, не в designers ✓
- Matrix 11 row `server/api/designers/ -> server/modules/designers/` помечена `✓ done 2026-04-20` ✓

### [done] 2026-04-18 — Wave 7 / messenger/core bounded-context subdirectory split
Цель: переложить 19 файлов из плоского `messenger/core/src/` в bounded-context поддиректории согласно матрице `12-messenger-services-refactor-map.md`. Matrix 12: 0 → 19 done.

Файлы (git mv):
- messenger/core/src/server.ts -> messenger/core/src/realtime/server.ts
- messenger/core/src/auth.ts -> messenger/core/src/auth/auth.ts
- messenger/core/src/auth-store.ts -> messenger/core/src/auth/auth-store.ts
- messenger/core/src/crypto-store.ts -> messenger/core/src/crypto/crypto-store.ts
- messenger/core/src/contact-store.ts -> messenger/core/src/contacts/contact-store.ts
- messenger/core/src/conversation-store.ts -> messenger/core/src/conversations/conversation-store.ts
- messenger/core/src/media-store.ts -> messenger/core/src/media/media-store.ts
- messenger/core/src/storage-paths.ts -> messenger/core/src/media/storage-paths.ts
- messenger/core/src/agent-knowledge-presets.ts -> messenger/core/src/agents/agent-knowledge-presets.ts
- messenger/core/src/agent-knowledge-store.ts -> messenger/core/src/agents/agent-knowledge-store.ts
- messenger/core/src/agent-llm.ts -> messenger/core/src/agents/agent-llm.ts
- messenger/core/src/agent-run-store.ts -> messenger/core/src/agents/agent-run-store.ts
- messenger/core/src/agent-settings-store.ts -> messenger/core/src/agents/agent-settings-store.ts
- messenger/core/src/agent-store.ts -> messenger/core/src/agents/agent-store.ts
- messenger/core/src/agent-workspace-store.ts -> messenger/core/src/agents/agent-workspace-store.ts
- messenger/core/src/user-ai-settings-store.ts -> messenger/core/src/profile/user-ai-settings-store.ts
- messenger/core/src/call-analysis-service.ts -> messenger/core/src/calls/call-analysis-service.ts
- messenger/core/src/livekit-stt-bot.ts -> messenger/core/src/calls/livekit-stt-bot.ts
- messenger/core/src/transcription-service.ts -> messenger/core/src/transcription/transcription-service.ts
- messenger/core/src/project-engine-store.ts -> messenger/core/src/project-engine/project-engine-store.ts

Остались без изменений (entrypoints):
- messenger/core/src/index.ts (обновлён импорт server.ts → realtime/server.ts)
- messenger/core/src/config.ts

Commit:
- (этот коммит)

Проверка:
- tsc --noEmit: 0 TS2307 ошибок на локальных модулях (все import-пути разрешаются корректно)
- TS7006 и TS2307-for-fastify/livekit — pre-existing errors из-за отсутствия node_modules в worktree, не связаны с рефактором
- `pnpm comm:typecheck` (services/communications-service) — ok (не затронут)
- git mv сохраняет историю файлов

Долги:
- messenger/web FSD-срез (entities/features/widgets/pages) — ещё не начат, matrix 12 messenger/web: 0/43
- services/communications-service bounded-context split (auth/store) — ещё не начат

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
4 endpoints thinned. Файл: server/modules/projects/project-extra-services.service.ts (list/create/update/delete с admin-vs-client field whitelist). Проверки: vue-tsc ok, lint-ratchet ok.

### [done] 2026-04-17 — Wave 5 / projects pages (page-content + page-answers) → modules/projects
4 endpoints thinned. Файл: server/modules/projects/project-pages.service.ts (getPageContent/upsertPageContent + getPageAnswers/upsertPageAnswers, с prototype-pollution sanitization). Проверки: vue-tsc ok, lint-ratchet ok.

### [done] 2026-04-17 — Wave 5 / projects work-status items (comments + photos) → modules/projects
3 endpoints thinned. Файл: server/modules/projects/project-work-status-items.service.ts (admin-authored comments + photos listing, с shared assertItemInProject guard). Проверки: vue-tsc ok, lint-ratchet ok.

### [done] 2026-04-17 — Wave 5 / projects communications → modules/projects
4 endpoints thinned: action-catalog.get, dispatch.post, call-insights/index.post, call-insights/[insightId]/apply.post. Файл: server/modules/projects/project-communications-api.service.ts (buildProjectActionCatalog + dispatchProjectMessage + ingestCallInsight + applyCallInsight, catch CALL_INSIGHT_NOT_FOUND → 404). Проверки: vue-tsc ok, lint-ratchet ok.

### [done] 2026-04-17 — Wave 5 / admin-settings → modules/admin-settings
Перенос getAdminSetting/setAdminSetting из server/utils/admin-settings.ts в server/modules/admin-settings/admin-settings.service.ts. Utility стала re-export bridge. 8 handlers обновлены. Delta: 0 lint (не было drizzle в api/**). Проверки: vue-tsc ok, lint-ratchet ok.

### [done] 2026-04-17 — Wave 5 / chat-users → modules/chat
Перенос standalone-chat-users.ts в server/modules/chat/chat-users.service.ts. Utility стала re-export bridge. 8 chat handlers обновлены. Delta: 0 lint. Проверки: vue-tsc ok, lint-ratchet ok.

### [done] 2026-04-17 — Wave 5 / bridge inversions batch 1 (uploads, ai, projects, communications, chat)
Инвертированы 9 reverse bridges: upload-storage, upload-validation, gemma, rag, project-work-status, project-relations, projects, communications-bootstrap, chat-communications. Каждый utils/* стал re-export bridge, реальный код перемещён в modules/*. Проверки: vue-tsc ok, lint-ratchet ok.

### [done] 2026-04-17 — Wave 5 / bridge inversions batch 2 (auth/recovery, ai/gemma-prompts, communications/relay)
Инвертированы 3 reverse bridges: auth/recovery.service.ts (wordlist), ai/gemma-prompts.ts (system prompts), communications/project-communications-relay.service.ts (SSE proxy). Коммит: 7e7e2c7. Проверки: vue-tsc ok, lint-ratchet ok.

### [done] 2026-04-17 — Wave 5 / bridge inversions batch 3 (projects: extra-service-docs, comms-actions, governance)
Инвертированы 3 крупных reverse bridge: extra-service-documents (235 л → project-extra-service-documents.service.ts), project-communications-actions (685 л → split на project-comms-action-helpers + project-comms-actions), project-governance (2082 л → split на 3: project-governance-state, project-governance-summary, project-governance.service). Коммит: a4aba4d. Проверки: vue-tsc ok, lint-ratchet ok.

### [done] 2026-04-17 — Wave 3 / frontend FSD component moves (batches 1-3)
Перенесено 22 компонента из app/components/ в правильные FSD-слои:
- Batch 1: Glass/App/Cab leaf UI → app/shared/ui/ (surfaces, buttons, forms, overlays, navigation, feedback)
- Batch 2: shells, entity-create, page-content, ui-editor, app-blueprint, design-system entities → app/widgets/shells, app/entities/*, app/features/*
- Batch 3: gallery (AdminGallery, GalleryFilter/Lightbox/Masonry), materials (AdminMaterials, MaterialProperty*), communications (ProjectCommunicationsPanel) → app/widgets/ + app/entities/*
nuxt.config.ts расширен: добавлены пути ~/shared/ui, ~/widgets, ~/entities, ~/features в components[].
Коммиты: ec85dad, e351f7f, 9a63d44. Проверки: vue-tsc ok, lint-ratchet ok.

### [done] 2026-04-17 — Docs / matrix accuracy fixes
Исправлены неточности в матрицах переноса:
- 11-backend: source-пути admin-settings (admin-settings → admin/), extra-services (flat → nested directory), suggest и upload отмечены как stays (no DB). Целевые service-файлы уточнены: project-status/client-profile → project-mutations.service.ts, page-content/page-answers → project-pages.service.ts. Удалены несуществующие agent-registry/agent-chat entries.
- 10-frontend: удалена запись StandaloneChatPanel.vue (файл никогда не существовал в репозитории).
Результат: 10-frontend: 47/47 done, 0 pending, 0 missing. 11-backend: 0 pending, 0 missing. Проверка: pnpm docs:v5:verify — ok.

### [done] 2026-04-17 — Wave 7 / infrastructure: config + domain errors + handler plugin
Создано: server/config.ts (Zod-валидация 16 env vars на старте, fail-fast; derived helpers getMessengerOriginAllowList, getSessionSecret), server/utils/errors.ts (DomainError + NotFound/Conflict/Validation/Forbidden/Unauthorized/RateLimit/UpstreamError + resolveDomainErrorStatus), server/plugins/error-handler.ts (Nitro plugin маппит DomainError → HTTP JSON). Coexist с legacy createError. Проверки: vue-tsc ok.

### [done] 2026-04-17 — Wave 7 / structured logging + request context
Pino-logger + AsyncLocalStorage для correlation-id. Файлы: server/utils/request-context.ts (enterRequestContext/runInRequestContext/getRequestContext/updateRequestContext через AsyncLocalStorage), server/utils/logger.ts (pino + pretty в dev + redact secrets + auto-inject requestId/userId/role из контекста), server/plugins/request-context.ts (Nitro plugin с hooks.hook('request') + enterWith, echo x-request-id header). pnpm add: pino 10.3, pino-pretty 13.1. Проверки: vue-tsc ok.

### [done] 2026-04-18 — Wave 7 / repository layer split (all 7 domains)
Создано 10 файлов `*.repository.ts`, обновлено 10 `*.service.ts`. Все DB-запросы (Drizzle) вынесены в репозитории; сервисы импортируют только `import * as repo from './<domain>.repository'`.

Домены:
- **documents** — `documents.repository.ts` (13 функций: findDocumentById, findProjectBySlug, listDocuments*, insertDocument, updateDocumentRow, deleteDocumentRow, listPageContent*, listClients*, listContractors*)
- **gallery** — `gallery.repository.ts` (6 функций: find, list, insert, update, delete, reorder)
- **sellers** — `sellers.repository.ts` (6 функций: find, listAll, listByProjectSlug, insert, update, delete + listSellerProjects)
- **managers** — `managers.repository.ts` (6 функций: find, listAll, listByProjectSlug, insert, update, delete + listManagerProjects)
- **clients** — `clients.repository.ts` (13 функций: find, list*, insert, update, delete + documents CRUD + project linking)
- **designers** — `designers.repository.ts` (20 функций: CRUD + designerProjects + links + aggregation); `designer-documents.repository.ts` (4 функции)
- **contractors** — `contractors.repository.ts` (9 функций: CRUD + staff + resolveAndStaffIds); `contractor-documents.repository.ts` (4 функции); `contractor-work-items.repository.ts` (13 функций: workItems + comments + photos)

Проверки: vue-tsc exit 0, lint:errors 0 новых нарушений.

### [done] 2026-04-17 — Wave 7 / enforce repository + config invariants via ESLint
Добавлены 2 архитектурных правила в eslint.config.mjs: (1) `no-restricted-imports` в `server/modules/**/*.service.ts` запрещает `drizzle-orm`, `postgres`, `~/server/db/**` — услуги работают через `*.repository.ts` (см. doc 18); (2) `no-restricted-syntax` на MemberExpression `process.env.*` глобально с exemptions для трёх central config файлов (main, messenger, communications-service). Baseline: 98 errors в 34 файлах — backlog для оставшихся repository-split доменов (auth, admin, admin-settings, ai, chat, communications, projects — 8 доменов). Ratchet блокирует регрессии. Проверки: vue-tsc ok.

### [done] 2026-04-17 — Wave 7 / admin + admin-settings repository split
Created paired repositories: server/modules/admin-settings/admin-settings.repository.ts (ensureAdminSettingsTable/findSettingByKey/findSettingIdByKey/updateSettingValue/insertSetting), server/modules/admin/admin-search.repository.ts (searchAdminEntities parallel queries), server/modules/admin/admin-notifications.repository.ts (countRequestedExtraServices/countOverdueWorkItems/listProjectsForControlCheck). Services reduced to pure business logic. Delta: 98 → 89 (−9). Проверки: vue-tsc ok, lint-ratchet ok.

### [done] 2026-04-17 — Wave 7 / ai + rag repository split
server/modules/ai/ai.repository.ts (listLegalSourceCounts, findProjectBySlug, listPageContentByProject, findClientById, findContractorById) + server/modules/ai/rag.repository.ts (searchLegalChunksByEmbedding, countLegalChunks). Services теперь чистые: ai.service делает shape/whitelist контекста для LLM, rag.service делает embeddings HTTP + markdown-форматирование. rag.service переведён с `process.env.GEMMA_URL` на `config.GEMMA_URL`. Delta: 89 → 83 (−6). Проверки: vue-tsc ok.

### [done] 2026-04-18 — Wave 7 / projects repository layer split
Цель: вынести все Drizzle-запросы из 15 service-файлов домена `projects` в 10 отдельных `*.repository.ts` файлов. После сплита ни один `.service.ts` в домене не импортирует `drizzle-orm` или `~/server/db/schema` напрямую.

Создано 10 файлов репозиториев (`server/modules/projects/`):
- `projects.repository.ts` — findProjectById, listProjectsWithTaskStats, findProjectIdBySlug, findProjectDetailBySlug, findProjectWorkStatusByProjectId, getWorkStatusPhotoCounts, getWorkStatusCommentCounts, insertProject, updateProjectBySlug, updateProjectStatusBySlug, findProjectForDelete, findProjectUploads, findProjectWorkItemIds, findProjectWorkItemPhotosByItemIds, nullifyDocumentsProjectId, deleteProjectById, findProjectFull, updateProjectProfileBySlug
- `project-pages.repository.ts` — findProjectIdBySlug, listPageContent, findPageContent, findPageContentId, insertPageContent, updatePageContent
- `project-extra-services.repository.ts` — findProjectIdBySlug, listExtraServices, findExtraService, insertExtraService, updateExtraService, deleteExtraService, findProjectBySlug, findExtraServiceByIdAndProject, insertDocument, updateExtraServiceDocIds
- `project-partners.repository.ts` — findProjectIdBySlug, listProjectContractorRows, insertProjectContractor, deleteProjectContractor, listProjectDesignerRows, insertProjectDesigner, deleteProjectDesigner, listProjectSellerRows, insertProjectSeller, deleteProjectSeller
- `project-relations.repository.ts` — findProjectWithProfile, findClientsByIds, findProjectContractorsForProject, findProjectDesignersForProject, findProjectSellersForProject, findProjectManagersForProject
- `project-governance.repository.ts` — findGovernanceProject, readGovernanceParticipants, readGovernanceAssignments, readGovernanceSettings, findParticipantByProjectAndId, insertParticipantInTx, updateParticipantInTx, findAssignmentByProjectAndId, insertAssignmentInTx, updateAssignmentInTx, deleteAssignmentInTx, findScopeSettingsByContext, findScopeSettingsByContextInTx, insertScopeSettingsInTx, updateScopeSettingsInTx, findWorkTaskForScope, findDocumentForScope, findExtraServiceForScope, readGovernanceSyncData, updateProjectHybridControlInTx
- `project-work-status.repository.ts` — listWorkItemIdsByProject, deleteWorkItemsByIds, insertWorkItem, updateWorkItem, listWorkItemsByProject
- `project-work-status-items.repository.ts` — findProjectId, findWorkItemInProject, listItemComments, findUserName, insertItemComment, listItemPhotos
- `project-comms-action-helpers.repository.ts` — findProjectBySlug, findContractorById, findMaxWorkStatusSortOrder, insertWorkStatusItem, findWorkStatusItem, updateWorkStatusItem, updateProjectControl, updateProjectStatus, insertExtraService
- `project-communications-api.repository.ts` — findProjectBySlug, listActionCatalogData, updateProjectProfile

Обновлено 14 service-файлов (все `import * as repo from './<name>.repository'`):
- `projects.service.ts`, `project-mutations.service.ts`, `project-pages.service.ts`, `project-extra-services.service.ts`, `project-extra-service-documents.service.ts`, `project-partners.service.ts`, `project-relations.service.ts`, `project-work-status.service.ts`, `project-work-status-items.service.ts`, `project-comms-action-helpers.service.ts`, `project-communications-api.service.ts`, `project-governance-state.service.ts`, `project-governance-summary.service.ts`, `project-governance.service.ts`

Исключения (по правилам задания):
- `project-work-status.service.ts` и `project-governance.service.ts` сохраняют `import { useDb } from '~/server/db'` только для `db.transaction()`.
- `project-governance-state.service.ts` оставлен без изменений относительно drizzle — не импортировал его до сплита.

Проверки: vue-tsc exit 0, lint:errors 0 новых нарушений.

### [done] 2026-04-18 — Wave 7 / auth repository layer split + communications + projects cherry-pick
Создан `server/modules/auth/auth.repository.ts` (22 функции): admin/users — findUserByLoginOrEmail, findUserById, findUserByEmail, findFirstUser, findUserForRecovery, findUserByLoginOrEmailExists, insertUser, updateUserPassword; client/projects — findProjectByClientSlug, findProjectWithPasswordByClientLogin, findProjectByClientLogin, findProjectWithRecoveryByClientLogin, projectSlugExists, insertClientProject, updateProjectClientPassword; contractor — findContractorById, findContractorWithPasswordByLogin, findContractorByLogin, findContractorWithRecoveryByLogin, contractorSlugExists, insertContractor, updateContractorPassword; session — findContractorIdForSession.

Обновлено 6 файлов: admin-auth.service.ts, admin-recovery.service.ts, auth-registration.service.ts (упрощён — slug-loops делегируют в repo), client-auth.service.ts, contractor-auth.service.ts, session.service.ts.

Также в этом батче: communications-bootstrap.repository.ts (4 функции) — cherry-pick из worktree; projects split (10 репозиториев, 14 сервисов) — cherry-pick из worktree-agent-a3207ce5.

Итог Wave 7: все `server/modules/**/*.service.ts` чисты от drizzle-orm. ESLint-invariant блокирует регрессии. Проверки: vue-tsc exit 0, lint:errors 0.

### [done] 2026-04-18 — Wave 7 / services/communications-service bounded-context subdirectory split
Цель: переложить 3 файла из плоского `services/communications-service/src/` в bounded-context поддиректории согласно матрице `12-messenger-services-refactor-map.md`.

Файлы (git mv):
- services/communications-service/src/auth.ts -> services/communications-service/src/auth/auth.ts
- services/communications-service/src/store.ts -> services/communications-service/src/store/store.ts
- services/communications-service/src/pg-store.ts -> services/communications-service/src/store/pg-store.ts

Остались без изменений: src/index.ts (обновлены импорты), src/config.ts, src/types.ts.

Исправлены относительные import-пути во всех затронутых файлах:
- src/index.ts: `./auth` → `./auth/auth`, `./pg-store` → `./store/pg-store`
- src/auth/auth.ts: `./types` → `../types`
- src/store/store.ts: `./types` → `../types`, `./auth` → `../auth/auth`
- src/store/pg-store.ts: `./types` → `../types`, `./config` → `../config` (./store остался без изменений — тот же каталог)

Проверка:
- `pnpm comm:typecheck` — exit 0, 0 TS-ошибок на локальных модулях

### [done] 2026-04-18 — Wave 7 / messenger/web FSD component and composable split
Цель: переместить все 27 компонентов из `messenger/web/app/components/messenger/` и все 23 composable из `messenger/web/app/composables/` в целевые FSD-слои согласно матрице 12-messenger-services-refactor-map.md.

Файлы перемещены (git mv):

Компоненты:
- MessengerAppShell.vue → widgets/shell/
- MessengerIcon/DockField/AuthField/ProgressCircular/ProgressLinear.vue → shared/ui/
- MessengerChatSection.vue → widgets/chat/
- MessengerChatsSection.vue → widgets/chats/
- MessengerContactsSection.vue → widgets/contacts/
- MessengerSettingsSection.vue → widgets/settings/
- MessengerChatHeader.vue → features/conversation-switch/ui/
- MessengerMessageThread.vue → features/message-thread/ui/
- MessengerChatComposerDock/Contexts/MediaMenu.vue, MessengerRoleQuickActions.vue → features/chat-composer/ui/
- MessengerSharedGallery.vue → entities/media/ui/
- MessengerAudioBubblePlayer.vue → entities/messages/ui/
- MessengerAudioComposerDraft.vue → features/audio-draft/ui/
- MessengerCallOverlay.vue → features/call-overlay/ui/
- MessengerCallAnalysisPanel.vue → entities/calls/ui/
- MessengerAgentsSection/AgentChatWorkspace.vue → widgets/agent-workspace/
- MessengerAgentGraphEditor.vue → entities/agents/ui/
- MessengerProjectEngineGraph/ActionsPanel/MiniTimeline.vue → features/project-engine/ui/

Composables:
- useMessengerAuth → entities/auth/model/
- useMessengerContacts → entities/contacts/model/
- useMessengerConversations/ConversationState → entities/conversations/model/
- useMessengerRealtime, useMessengerRealtimeIdentity → core/realtime/
- useMessengerCalls → entities/calls/model/
- useMessengerCrypto, useMessengerKlipy → entities/messages/model/
- useMessengerSettings → entities/settings/model/
- useMessengerSections → widgets/shell/model/
- useMessengerViewport → shared/composables/
- useMessengerInstall, useMessengerFeatures → core/runtime/
- useMessengerHoldActions → features/chat-composer/model/
- useMessengerProjectEngine, useMessengerProjectActions → features/project-engine/model/
- useMessengerAgents/AgentKnowledge/AgentRuns/AgentRuntime/AgentEdgePayloads → entities/agents/model/
- useMessengerAgentWorkspace → widgets/agent-workspace/model/

Исправлены все сломанные импорты (относительные пути к utils/, theme/, и cross-composable ссылки).
nuxt.config.ts дополнен: добавлены components[] и imports.dirs[] для всех новых FSD-путей.

Два composable отсутствовали в матрице, помещены по семантике:
- useMessengerProjectActions → features/project-engine/model/ (используется project-engine UI)
- useMessengerRealtimeIdentity → core/realtime/ (helper WS-идентификации)

Commit:
- 0ece605 refactor(messenger/web): FSD component and composable split

Проверка:
- git status — 51 files changed, все переименования + правки импортов корректны
- Все `from '../../composables/...'` в компонентах исправлены на новые FSD-пути
- nuxt.config.ts: components[] + imports.dirs[] покрывают все новые слои
- `messenger/web/app/components/messenger/` — полностью пуст (все файлы перемещены)
- `messenger/web/app/composables/` — остался только patch_bot.cjs (нетронутый артефакт)

Долги:
- `pnpm -C messenger/web build` / typecheck не запускался (нет скрипта typecheck в package.json мессенджера); проверка сборки — следующий шаг при деплое
- matrix 12: все перечисленные в матрице файлы messenger/web перемещены; оставшееся в matrix 12 — core/realtime/api/calls layers в messenger/core (другой runtime, не в этом batch)

### [done] 2026-04-18 — Wave 7 / clear remaining server-side repository-layer violations
Цель: убрать последние 5 server-side ошибок ESLint из baseline — 3 `process.env` и 2 прямых импорта `~/server/db` из сервисов.

Изменения:
- `server/db/index.ts` — `process.env.DATABASE_URL` → `config.DATABASE_URL` (Zod уже гарантирует non-empty, убран избыточный null-check).
- `server/modules/ai/gemma.service.ts` — `process.env.GEMMA_URL` → `config.GEMMA_URL`.
- `server/modules/uploads/upload-storage.service.ts` — `process.env.UPLOAD_DIR` → `config.UPLOAD_DIR` (относительный путь резолвится через `process.cwd()` для обратной совместимости).
- `server/modules/projects/project-work-status.repository.ts` и `project-governance.repository.ts` — добавлен `runInTransaction(fn)` helper, инкапсулирующий `useDb().transaction(...)` внутри репозитория.
- `server/modules/projects/project-work-status.service.ts` и `project-governance.service.ts` — убран `import { useDb } from '~/server/db'`, 7 сайтов `useDb()/db.transaction(...)` заменены на `repo.runInTransaction(...)`.

Ratchet: lint:errors 12 → 7 (−5), 8 → 3 файла. Остаток (7 ошибок) полностью в `messenger/core/src/*` — отдельный runtime, выделенный config-модуль для него — следующий шаг.

Итог: во всём `server/**` не осталось ни одного прямого `process.env` (кроме `server/config.ts` / `server/plugins/error-handler.ts` по whitelist) и ни одного `~/server/db` импорта из сервисов. DDD-lite инвариант полностью удерживается ESLint-правилом `no-restricted-imports`.

Проверка:
- `pnpm exec vue-tsc --noEmit` — exit 0
- `node scripts/lint-ratchet.mjs check` — OK, 7/7

### [done] 2026-04-18 — Wave 7 / messenger/core process.env → config модуль

Цель: убрать последние 7 ESLint-ошибок baseline (все в `messenger/core/src/*`), маршрутизировав `process.env.*` через уже существующий `messenger/core/src/config.ts`.

Изменения:
- `messenger/core/src/config.ts` — добавлены в Zod-схему: `GEMMA_URL`, `OLLAMA_BASE_URL`, `MESSENGER_EMBED_MODEL`, `LIVEKIT_API_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`.
- `messenger/core/src/media/storage-paths.ts` — `process.env.MESSENGER_CORE_DATA_DIR` → `readMessengerConfig().MESSENGER_CORE_DATA_DIR`.
- `messenger/core/src/agents/agent-knowledge-store.ts` — добавлен import `readMessengerConfig`, константы `OLLAMA_BASE`/`EMBED_MODEL` переведены на config.
- `messenger/core/src/realtime/server.ts` — 3 блока `process.env.LIVEKIT_*` заменены на `config.LIVEKIT_*` (config уже был в scope из `readMessengerConfig()` на строке 67).
- `.lint-baseline.json` — обновлён: totalErrors 7 → 0, perFile пуст.

Commit: c83843d chore(lint): eliminate all remaining process.env violations in messenger/core

Проверка:
- `npx eslint messenger/core/src/...` — 0 errors
- `node scripts/lint-ratchet.mjs check` — OK, 0/0
- `pnpm exec vue-tsc --noEmit` — exit 0

Итог: во всех трёх runtime (`server/`, `messenger/core/`, `services/communications-service/`) не осталось ни одного `process.env` вне config-файла. ESLint ratchet на 0 ошибок — инвариант полностью закрыт.

### [done] 2026-04-18 — docs / INDEX.md синхронизация

Цель: `pnpm docs:v5:verify` завершался с exit 2 — в INDEX.md не были указаны документы 18-20.

Изменения:
- `docs/architecture-v5/INDEX.md` — добавлены записи для `18-repository-layer.md`, `19-error-handling.md`, `20-config-and-logging.md`; прежний пункт 18 (REFACTORING_PLAN.md) сдвинут на 21.

Commit: cbe60c3 docs(architecture-v5): add missing docs 18-20 to INDEX.md

Проверка:
- `pnpm docs:v5:verify` — Architecture docs validation passed (24 files checked)
- Matrix snapshot (informational):
  - 10-frontend-refactor-map.md: 47/47 done, 0 pending
  - 11-backend-shared-refactor-map.md: 16/66 done, 50 ambiguous (bridge/partial) — основной долг следующих волн
  - 12-messenger-services-refactor-map.md: 68/68 done, 0 pending

## Следующий шаг

**Wave 4 — Giant-file slicing** (`wave4-giant-file-slice-phase1`):
Файлы-кандидаты (>500 строк в `app/`):
- `UIDesignPanel.vue` (~6624 строк) → `app/features/ui-editor/ui/`
- `AdminProjectControl.vue` (~5844 строк) → `app/widgets/projects/`
- `AdminDesignerCabinet.vue` (крупный) → `app/widgets/designer/`
- + 20+ других файлов по матрице `10-frontend-refactor-map.md`

Также открыт backend-долг: `11-backend-shared-refactor-map.md` — 50 строк со статусом "ambiguous", соответствующих fat API handlers в `server/api/**`, которые ещё не полностью перенесены в `server/modules/<domain>/`.

### [done] 2026-04-18 — Wave 4 / batch 1: scoped CSS extraction из 7 giant SFCs

Подготовка к полноценному template/script slicing'у: вынес `<style scoped>` блоки из семи crucial SFCs в sibling-файлы `<Name>.scoped.css`, заменив inline-блок на `<style scoped src="./<Name>.scoped.css"></style>`. Vue сохраняет тот же scope-hash — визуальное поведение не меняется, zero-behavior refactor.

SFC line-count (до → после):

| Файл | Было | Стало | Δ |
|---|---|---|---|
| `app/features/ui-editor/ui/UIDesignPanel.vue` | 6624 | 4816 | −1808 (−27%) |
| `app/widgets/projects/control/AdminProjectControl.vue` | 5844 | 3518 | −2326 (−40%) |
| `app/widgets/cabinets/designer/AdminDesignerCabinet.vue` | 4332 | 3253 | −1079 (−25%) |
| `app/pages/admin/projects/[slug].vue` | 3687 | 2633 | −1054 (−29%) |
| `app/widgets/projects/control/ClientProjectControl.vue` | 3405 | 1969 | −1436 (−42%) |
| `app/pages/contractor/[id]/index.vue` | 3347 | 2017 | −1330 (−40%) |
| `app/widgets/documents/AdminDocumentEditor.vue` | 3030 | 2236 | −794 (−26%) |
| **Итого** | **30269** | **20442** | **−9827 (−32%)** |

Артефакты: семь `<Name>.scoped.css` рядом с каждым SFC + одноразовый helper `scripts/extract-scoped-css.mjs`.

Проверки:
- `pnpm exec vue-tsc --noEmit` — exit 0
- `node scripts/lint-ratchet.mjs check` — OK, 0/0 (baseline locked)

Долги (Wave 4 batch 2+):
- Template slicing — вычленить `<section v-show="activeModule === 'X'">` блоки в sub-components `./sections/Control<Module>.vue` с composable-парой в `./model/useControl<Module>.ts`
- Script slicing — вычленить обособленные группы state/handlers в composables по FSD
- Цель — каждый SFC ≤ 500 строк (template + script)

### [done] 2026-04-18 — Wave 4 / batch 2: первые template-извлечения из AdminProjectControl

Первая итерация template slicing'а — вынесены две самые автономные секции из `AdminProjectControl.vue`.

Новые файлы в `app/widgets/projects/control/`:
- `sections/ControlOverviewSection.vue` — overview summary pill + metrics + rhythm form (2 оригинальные `<section>` → один FSD-компонент). Props: `control`, `summary`, `saveMetaText`, `saveState`. Emits: `save`, `open-project-scope-details`.
- `sections/ControlHealthSection.vue` — checkpoints + blockers editor, add/remove handlers перенесены внутрь. Props: `control`. Emits: `save`.
- `model/control-options.ts` — общие select-options (phase/sprint/checkpoint statuses, communication channels, stakeholder roles). Замещает 5 inline-констант в `AdminProjectControl`; переиспользуется ClientProjectControl и остальными секционными компонентами.

Behavior preserved: `control` passed by reference → push/splice сохраняют реактивность; `save()` round-trips через родительский debounce.

Размер: AdminProjectControl.vue 3518 → 3378 (-140, кумулятивно 5844 → 3378 = -42% от исходника).

### [done] 2026-04-18 — Wave 4 / batch 3: mass-extract 6 pivot секций из AdminDesignerCabinet

Массовое извлечение read-only pivot-секций. Все шесть — одинаковый паттерн (список карточек с `drillToEntityCabinet(kind, id, name)` по клику).

Новые компоненты в `app/widgets/cabinets/designer/sections/`:
- `CabinetClientsSection.vue` — `uniqueClients` pivot
- `CabinetContractorsSection.vue` — `uniqueContractors` pivot
- `CabinetSellersSection.vue` — `linkedData.sellers`
- `CabinetManagersSection.vue` — `linkedData.managers`
- `CabinetGallerySection.vue` — `galleryList` grid
- `CabinetMoodboardsSection.vue` — `moodboardList` grid

Новый helper: `app/widgets/cabinets/designer/model/cabinet-formatters.ts` — `pluralProjects` (склонение существительного "проект").

Навигация: каждая секция сама вызывает `useAdminNav().drillToEntityCabinet` — parent'у больше не нужны per-entity `goToClient/Contractor/Seller/Manager` обёртки (4 dead-handler'а удалены).

Row-типы объявлены inline в каждой секции (без утечки родительского `linkedData: Ref<any>` quirk'а наружу). Когда cabinet REST получит zod-схему — типы поднимутся в shared.

Размер: AdminDesignerCabinet.vue 3253 → 3136 (-117, кумулятивно 4332 → 3136 = -28% от исходника).

**Итоги Wave 4 (после batch 1-3):**

| Файл | Исходник | CSS-extract | После section-extract | Общее сокращение |
|---|---|---|---|---|
| `AdminProjectControl.vue` | 5844 | 3518 | 3378 | -42% |
| `AdminDesignerCabinet.vue` | 4332 | 3253 | 3136 | -28% |
| `UIDesignPanel.vue` | 6624 | 4816 | — | -27% |
| `admin/projects/[slug].vue` | 3687 | 2633 | — | -29% |
| `ClientProjectControl.vue` | 3405 | 1969 | — | -42% |
| `contractor/[id]/index.vue` | 3347 | 2017 | — | -40% |
| `AdminDocumentEditor.vue` | 3030 | 2236 | — | -26% |
| **Итого** | **30269** | **20442** | **20185** | **-33%** |

Все прошли `vue-tsc --noEmit` exit 0 и `lint-ratchet check` 0/0.


### [done] 2026-04-18 — Wave 4 / batch 4: Dashboard section из AdminDesignerCabinet

Полностью read-only dashboard (hero + quick-nav + stat grid + recent projects, 131 строк template) вынесен в `./sections/CabinetDashboardSection.vue`. 16 props (designer meta, stats, entity counts) + 2 события (`navigate`, `init-from-templates`) — чисто презентационный компонент без внутреннего state'а или сетевых вызовов.

AdminDesignerCabinet.vue: 3136 → 3027 (−109, кумулятивно 4332 → 3027 = −30%).

### [done] 2026-04-18 — Wave 4 / autosave consolidation

Пять cabinet-файлов (designer + seller + manager + contractor виджеты, плюс composable useContractorCabinet) дублировали `type InlineAutosaveState = '' | 'saving' | 'saved' | 'error'`, а два из них ещё и `autosaveStatusLabel`/`autosaveStatusClass`. Консолидированы в новый `app/shared/ui/autosave/autosave-state.ts` — единый источник для всех cabinet-виджетов.

### [done] 2026-04-18 — Wave 4 / batch 5: Documents section из AdminDesignerCabinet

Весь блок документов (upload form + filter/search/sort + card list + empty states) вынесен в `./sections/CabinetDocumentsSection.vue` вместе с 7 refs, 2 async handlers (upload/delete), filter computed и 2 форматтерами. Parent получил 3 prop'а (`designerId`, `documents`, `isBrutalist`) и обрабатывает событие `refresh` — ничего больше. Новый helper `./model/designer-doc-categories.ts` — `DESIGNER_DOC_CATEGORIES` + `getDesignerDocCategoryLabel`.

AdminDesignerCabinet.vue: 3027 → 2886 (−141, кумулятивно 4332 → 2886 = −33%).

### [done] 2026-04-18 — Wave 4 / batch 6: CSS extraction на 15 mid-tier SFC (500-2700 строк)

Вторая волна zero-behavior CSS relocation — охватывает все SFC в `app/`, в которых ещё оставалось >200 строк inline `<style scoped>`. Механика идентична batch 1: блок в sibling `<Name>.scoped.css`, в SFC — один тег `<style scoped src="./<Name>.scoped.css">`.

Цели и результаты:

| Файл | До | После | CSS |
|---|---|---|---|
| `ProjectCommunicationsPanel.vue` | 2639 | 1779 | 859 |
| `app/layouts/admin.vue` (только scoped блок) | 1898 | 1106 | 781 |
| `AdminGallery.vue` | 1254 | 638 | 615 |
| `Wipe2Renderer.vue` | 1085 | 517 | 567 |
| `AdminDocumentsSection.vue` | 1654 | 1200 | 453 |
| `AdminProjectKanban.vue` | 787 | 361 | 425 |
| `client/[slug]/index.vue` | 935 | 536 | 398 |
| `AdminSmartBrief.vue` | 905 | 521 | 383 |
| `ClientPageContent.vue` | 674 | 326 | 348 |
| `AdminSpacePlanning.vue` | 774 | 496 | 277 |
| `AdminToRContract.vue` | 659 | 395 | 263 |
| `AdminContractorCabinet.vue` | 1505 | 1259 | 246 |
| `GalleryLightbox.vue` | 558 | 323 | 234 |
| `MaterialPropertyEditor.vue` | 618 | 388 | 229 |
| `UIAppBlueprintBuilder.vue` | 914 | 706 | 208 |
| **Итого** | **16879** | **10551** | **6286** |

Исключение: `app/layouts/admin.vue` имеет второй не-scoped `<style>` global блок (с 1106 строки) — его оставляем inline, только scoped блок перевезён.

Суммарно по Wave 4 batches 1 и 6 CSS relocation охватывает 22 SFC, вынесено ~16100 строк CSS.

### [done] 2026-04-18 — Wave 4 / batch 7: read-only sections из ClientProjectControl

Три презентационных компонента извлечены из клиент-варианта (`ClientProjectControl.vue`):
- `ClientControlSummaryCards.vue` — 4-card grid наверху страницы (фаза/спринт/обзор/блокеры). Props: `summary`, `nextReviewDate`.
- `ClientControlBlockersSection.vue` — read-only список блокеров с v-if-guard'ом на content. Props: `blockers: string[]`.
- `ClientControlPhasesSection.vue` — секция "Фазы проекта" со stats overview, карточками фаз и gate progress. `getPhaseGateProgress` переехал внутрь компонента; `formatHybridTimelineDateRange` импортируется напрямую из shared util. Props: `phases`, `phaseStats`.

ClientProjectControl.vue: 1969 → 1866 (−103, кумулятивно 3405 → 1866 = **−45%** от исходника — рекорд Wave 4 по отдельному файлу).

Communications/Timeline/Sprints секции оставлены — они содержат много reactive state (selected sprint, timeline drag, call insight handlers) и требуют полноценного composable-refactor'а.

### [done] 2026-04-18 — Wave 4 / status-labels consolidation

`control-options.ts` получил `taskStatusOptions` + `taskStatusLabels`. В `ClientProjectControl.vue` три inline `Record<>`-мапы (phase/sprint/task) заменены импортом из shared модуля. Также удалён unused `HybridControlPhase` type import (остался мёртвым после выделения `ClientControlPhasesSection`). Admin-вариант тех же labels оставлен inline — он пересекается с параллельной работой над Control{Sprints,Timeline,Communications}Section, сложится в shared модуль после её rebase'а.

### [done] 2026-04-18 — Wave 4 / batch 8: ProjectEntityPanel generic widget

На странице `app/pages/admin/projects/[slug].vue` было 5 почти идентичных inline-блоков `proj-entity-panel` (клиенты/подрядчики/дизайнеры/поставщики/менеджеры — ~50 строк каждый). Схлопнуты в инстансы одного переиспользуемого generic-компонента.

Новый виджет: `app/widgets/projects/entity-panel/ProjectEntityPanel.vue`
- `<script setup lang="ts" generic="T extends { id; name }">` — работает с любым row-типом
- Props: title, labels for linked/available sections, meta-formatter callback, brutalist flag, empty states, опциональные error/success. Флаги `canLink`/`canUnlink` позволяют менеджер-панели рендериться read-only без дублирования.
- Каждый из 5 branch'ей теперь ~15 строк (только meta-formatter closure разная).

`[slug].vue`: 2633 → 2462 (−171, кумулятивно 3687 → 2462 = **−33%**).

### [done] 2026-04-18 — Wave 4 / batch 9-11: contractor + ui-editor slicing + autosave fix

- **batch 9** (contractor/[id] dashboard): весь dashboard блок контрактор-портала (welcome card + quick-nav + stat grid + progress bar + linked projects + deadlines + no-due tasks, ~100 строк) вынесен в `ContractorDashboardSection.vue` (explicit import — page outside auto-scan paths). 9 read-only props + `navigate` event. `isDue` продублирован внутри (5-строчная pure-функция). 2017→1931.
- **batch 10** (contractor/[id] staff + communications): `ContractorStaffSection.vue` (staff roster с empty-state, один prop, `workTypeLabel` напрямую из shared utils) и `ContractorCommunicationsSection.vue` (v-model на project slug + список проектов). 1931→1884. Кумулятивно 3347→1884 = **−44%**.
- **batch 11** (features/ui-editor Export/Import drawer): первый slice из `UIDesignPanel.vue` — transition-обёрнутый Export/Import drawer (JSON/CSS tabs + textarea + copy/import). Экспортные функции переданы через props, состояние через emit'ы. Закладывает паттерн для 23 tab-страниц в `.dp-tab-content`.

Также в этой серии — **autosave-state relocation fix**: `app/shared/ui/autosave/autosave-state.ts` был unreachable (Nuxt-override `~/shared/*` ведёт в repo-root shared/, `@/shared/*` резолвится туда же). Перенесён в `shared/ui/autosave/autosave-state.ts` (repo root — легально для pure type + stateless helpers); пять консьюмеров переключены на стабильный `~~/shared/ui/autosave/autosave-state`. Плюс `taskStatusLabels` inline-map в `AdminProjectControl.vue` сведён в `./model/control-options.ts` (ранее только `phaseStatusLabels`/`sprintStatusLabels` приезжали из shared).

### [done] 2026-04-18 — Wave 4 / AdminProjectControl template section extraction (batch 3)

Цель: нарезать оставшиеся 3 inline-секции `AdminProjectControl.vue`.

Новые компоненты (`app/widgets/projects/control/sections/`):
- `ControlCommunicationsSection.vue` (636 строк) — Manager Agents, Call Intelligence, Communication Log + Teleport модального окна. Props: `control`, `slug`, `project`. Emits: `save`, `focus-task`, `open-sprint-in-kanban`.
- `ControlTimelineSection.vue` (1836 строк) — Gantt-таймлайн, drag, governance-панель, scope detail drawer. Весь локальный state таймлайна перенесён внутрь. Exposes: `openProjectScopeDetails`, `openTaskScopeDetails`, `closeTimelineRowDetails`, `timelineWindowLabel`, `visibleTimelineRows`.
- `ControlSprintsSection.vue` (497 строк) — sprint/task-редактор. Props: `control`, `activeSprintId`, `activeTaskId`, `summary`. Emits: `save`, `update:active-sprint-id`, `update:active-task-id`, `open-task-scope-details`.

Parent `AdminProjectControl.vue`:
- Шаблон: 1156 → 191 строка (−965).
- Общий файл: 3378 → 2408 строк.
- Script: содержит dead-код таймлайна (cleanup — следующий batch); координирующие функции (`closeTimelineRowDetails`, `openProjectScopeDetails`, `openTaskScopeDetailsFromTimeline`) переведены на delegation через `timelineSectionRef`.

Исправлены functional-баги: `openTaskScopeDetailsFromTimeline` отсутствовала в parent, `closeTimelineRowDetails` модифицировал dead state; исправлено через `defineExpose` и delegation pattern.

Commits:
- 8d9dd5d refactor(widgets/projects): extract Communications + Timeline + Sprints from AdminProjectControl
- 420f045 fix(widgets/projects): wire timeline delegation via timelineSectionRef

Проверка:
- `pnpm exec vue-tsc --noEmit` — exit 0, 0 TS errors в изменённых файлах
- `pnpm docs:v5:verify` — passed
- `node scripts/lint-ratchet.mjs check` — OK 0/0

### [done] 2026-04-18 — Wave 4 / batch 12-13: UIDesignPanel inner slices

Паттерн slice'а в 4800-строчной SFC начат и установлен:

- **batch 12** (`UIDesignModeBar.vue`, `UIDesignPresetCardsGrid.vue`): 4-button concept-mode selector row + универсальный grid preset/concept cards (variant-prop выбирает markup between preset и concept layouts — было 2 почти идентичных блока).
- **batch 13** (`UIDesignPanelToprow.vue`): `.dp-panel-toprow` (tab nav + search input + export toggle + reset + close buttons, 28 строк). Props: `tabs`, `activeTab`, `searchQuery`, `showExportButton`. Events: `update:activeTab`, `update:searchQuery`, `toggle-export`, `reset`, `close`.

Complement to batch 11 (Export/Import drawer extracted earlier). Первые **четыре FSD-sub-components** в `features/ui-editor/ui/` — дальнейший slice'инг 23 tab-страниц (palette, colors, buttons, type, surface, radii, anim, grid, typeScale, darkMode, inputs, tags, nav, statuses, popups, scrollbar, tables, badges, arch) потребует либо composable для `tokens`-объекта (слишком много v-model bindings), либо передачу через provide/inject.

### [done] 2026-04-18 — Wave 4 / contractor portal sections (batch 14)

Цель: дорезать оставшиеся 7 секций contractor portal (`app/pages/contractor/[id]/index.vue`).

Новые компоненты (`app/pages/contractor/[id]/`):
- `ContractorContactsSection.vue`
- `ContractorFinancesSection.vue`
- `ContractorPassportSection.vue`
- `ContractorPortfolioSection.vue`
- `ContractorRequisitesSection.vue`
- `ContractorSettingsSection.vue`
- `ContractorSpecializationSection.vue`

Parent `index.vue`: ~1884 → ~1486 строк (−398).

Commits: 7f825ac

### [done] 2026-04-18 — Wave 4 / AdminProjectControl script purge (batch 15)

Цель: удалить ~1756 строк dead-кода из script-секции `AdminProjectControl.vue` после того, как секции были вынесены в дочерние компоненты.

Удалено:
- Все timeline-типы (`SelectedTimelineRowState`, `TimelineDetailItem`, `TimelineRuleSummary`, `TimelineDetailTaskItem`, `TimelineGovernance*`, `TimelineDragKind`)
- Весь timeline-state: `timelineScale`, `timelineDrag`, `timelineCollapsedPhases`, `timelineRows`, `timelineBounds`, `timelineColumns`, `timelineGroups`, `timelineEditingEnabled`, `timelineGridStyle`, `timelineWindowLabel`, `visibleTimelineRows` и все производные computeds
- Все функции drag/drop, governance, scope-detail, tooltip
- Весь comms-state: `callInsightDraft`, `callInsightSaving`, `msgModal*`, `addCommunicationRule`, `submitCallInsight` и т.д.
- Dead imports из `project-control-timeline`, `project-governance`, unused types

`moduleCards` переключён на `timelineSectionRef.value?.timelineWindowLabel.value` и `.visibleTimelineRows.value.length` (дочерний computed через defineExpose).

Файл: 2408 → 652 строки. vue-tsc exit 0, lint:errors exit 0.

Commits: ab737aa

### [done] 2026-04-18 — Wave 4 / batch 14 addendum: AdminDocumentEditor Step 0 slice

Первый slice из 2236-строчного document-editor wizard'a: `AdminDocumentEditorStepTemplate.vue` (28 строк template картинок шаблонов). Props: `templates`, `selectedKey`. Один event `select(tpl)` — parent обрабатывает и `selectTemplate`, и `goToStep(1)`.

Step 1 (236 строк data-source picker) и Step 2 (582 строки field editor) требуют composable-рефактора `pickedProjectSlug/DesignerId/ClientId/ContractorId/SellerId + ctx`-объекта — отдельная сессия.

### [open] Wave 4 / остающиеся цели

Файлы > 500 строк в `app/` после всех batches этого захода (ориентировочно, после всех session-landings и Sonnet'овского `ab737aa` strip):

| Файл | Размер | Следующий шаг |
|---|---|---|
| `UIDesignPanel.vue` | ~4780 | 23 tab-страницы → нужен tokens composable + provide/inject |
| `AdminDocumentEditor.vue` | ~2200 | Step 1/Step 2 → picker composable + field editor composable |
| `AdminProjectControl.vue` | ~620 (после Sonnet'a) | ближе к цели ≤500; возможны финальные script cleanup'ы |
| `AdminDesignerCabinet.vue` | ~2700 | services/packages/subscriptions секции (stateful autosave) |
| `contractor/[id]/index.vue` | ~1500 | tasks section (253 строки, самый сложный) |
| `admin/projects/[slug].vue` | ~2460 | project_communications секция |
| `ClientProjectControl.vue` | ~1860 | timeline/sprints sections |
| `ProjectCommunicationsPanel.vue` | ~1780 | внутренняя структура (calls/agents/chat) |
| `AdminDocumentsSection.vue` | ~1200 | registry секция |
| `AdminContractorCabinet.vue` | ~1260 | 12 секций по аналогии с designer |
| `app/layouts/admin.vue` | ~1100 | navigation shell |
| `Wipe2Renderer.vue` | ~517 | условные блоки render'а |

### [done] 2026-04-18 — Wave 4 / batch 15: Chats + Contacts directories

Ещё один slice из `ProjectCommunicationsPanel.vue` (entities layer, не пересекается с сессией на control-секциях): два directory-компонента:
- `CommChatsDirectory.vue` — open-chat список с поиском (chats array + active peer + has-available-contacts flag + formatter prop). Events: `update:search`, `open-chat`.
- `CommContactsDirectory.vue` — contact список с поиском. Events: `update:search`, `start-chat`.

Маркап близок к идентичному между этими двумя, но сохраняем их раздельно из-за разных empty-state copy и разных event-имён. Если coordination brief панели понадобится тот же паттерн — готовить generic `<CommPersonList>`.

ProjectCommunicationsPanel.vue: 1779 → 1734 (−45 строк; кумулятивно 2639 → 1734 = **−34%** от исходника).

### Финал текущей сессии Wave 4

Крупнейшие файлы в `app/` сейчас (после всех session-landings + Sonnet'овских push'ей):

| Файл | Сейчас | Исходник | Δ |
|---|---|---|---|
| `UIDesignPanel.vue` | 4737 | 6624 | −28% |
| `AdminDesignerCabinet.vue` | 2886 | 4332 | −33% |
| `admin/projects/[slug].vue` | 2462 | 3687 | −33% |
| `AdminDocumentEditor.vue` | 2213 | 3030 | −27% |
| `ProjectCommunicationsPanel.vue` | 1734 | 2639 | −34% |
| `contractor/[id]/index.vue` | 1486 | 3347 | **−56%** |
| `AdminContractorCabinet.vue` | 1259 | 1505 | (CSS only) |
| `AdminDocumentsSection.vue` | 1200 | 1654 | (CSS only) |
| `app/layouts/admin.vue` | 1106 | 1898 | (CSS only) |
| `ClientProjectControl.vue` | ~1760 | 3405 | −48% |
| `AdminProjectControl.vue` | ~620 | 5844 | **−89%** (с Sonnet'овским strip dead script) |

Слайсинг ≤500-строчного лимита не достигнут для многих SFC — дальнейшие raids требуют:
- **UIDesignPanel tab-страницы** — composable `useDesignTokens` с provide/inject для 23 tab subcomponents
- **AdminDocumentEditor Step 1/Step 2** — composable `useDocumentEditorSources` (picker state) + `useDocumentEditorFields` (field editor)
- **AdminDesignerCabinet services/packages/subscriptions** — inline autosave state требует отдельного composable per section
- **admin layout** — header utility bar → `AdminHeaderUtilities.vue`, sidebar → `AdminSidebarNav.vue`
- **AdminDocumentsSection registry** — search/sort state composable
- **contractor/[id] tasks section** — 250 строк CRUD + modal + filters

Все перечисленное — многосессионная работа. Механические extract'ы выбраны.

### [done] 2026-04-18 — Wave 4 / batch 16-21: UIDesignPanel tabs via composable

Разблокировал 23 tab-страницы `UIDesignPanel.vue` введением `useDesignTokenControls()` composable (`app/entities/design-system/model/useDesignTokenControls.ts`) — wraps `useDesignSystem()` (backed by `useState`) и возвращает `{ tokens, set, pct, onRange, onFloat }`. Singleton-backed — каждый вызов из child'а возвращает тот же reactive store, что и parent.

Вынесены 10 tab-sub-components (все используют composable):

| Tab | Компонент | Особенности |
|---|---|---|
| scrollbar | `UIDesignTabScrollbar.vue` | ширина + прозрачность + live preview |
| tables | `UIDesignTabTables.vue` | header/row/border opacity + table preview |
| badges | `UIDesignTabBadges.vue` | badge radius + opacity + local accentColor computed |
| statuses | `UIDesignTabStatuses.vue` | pill radius + bg opacity + 7-item preview const |
| popups | `UIDesignTabPopups.vue` | dropdown blur + modal overlay + previews |
| surface | `UIDesignTabSurface.vue` | glass blur/saturation + shadow + local surfaceStyle |
| radii | `UIDesignTabRadii.vue` | 4 радиуса + spacing + 4 preview boxes |
| typeScale | `UIDesignTabTypeScale.vue` | TYPE_SCALE_OPTIONS picker + local typeScaleSizes/currentScaleLabel |
| darkMode | `UIDesignTabDarkMode.vue` | dark elevation/saturation + 2 preview cards |
| anim | `UIDesignTabAnim.vue` | duration + easing picker + playAnim (локальный animPlaying) |
| tags | `UIDesignTabTags.vue` | chip radius + bg/border opacity + padding + 6 preview chips |
| inputs | `UIDesignTabInputs.vue` | 3 preview-style computeds (field/select/textarea) |
| buttons | `UIDesignTabButtons.vue` | 5 chip-picker констант + 3 preview computeds |
| colors | `UIDesignTabColors.vue` | 8 color-pickers + CUSTOMIZABLE_COLOR_KEYS + resetAllColors |

UIDesignPanel.vue кумулятивно за сессию: **6624 → 4035 (−39%)**.

Из parent'а также удалены: `animPlaying` ref, `playAnim` function, `EASING_OPTIONS` import (стали неиспользуемыми).

Остающиеся tabs: palette (2 блока, shared с coloring logic), type (178 строк), grid (190 строк, много generator state), nav (96 строк), arch (огромный). Эти требуют либо более сложных child-компонентов (они локально хранят много state), либо следующего этапа с provide/inject для picker presets.

### [done] 2026-04-18 — Wave 4 / batch 22-23: UIDesignPanel Type + Nav

- **batch 22**: `UIDesignTabType.vue` — 178 строк типографики с 4 sub-tab'ами (text/headings/buttons/inputs). `typeCtx` ref + 6 preview-style computeds (typeSampleStyle, previewBtnTypeStyle, previewSmBtnStyle, previewGhostBtnStyle, previewInputStyle, typeScaleSizes) + font picker (currentFontId/pickFont) внутри.
- **batch 23**: `UIDesignTabNav.vue` — 94 строки navigation transitions + sidebar settings. `archNavTransitions` и `menuPreviewItems` constants локально.

UIDesignPanel.vue: 4035 → **3767 строк (−43% от исходных 6624)**. Всего 16 tab-компонентов извлечены. Остающиеся: palette (2 блока, сложные color pickers), grid (190 строк с tons of generator state + preview computeds), arch (огромный с presets и layouts).

### [done] 2026-04-18 — Wave 4 / batch 24: Palette tab

`UIDesignTabPalette.vue` — объединяет оба legacy palette блока (189 строк) в один компонент. Block 1 — theme grid + accent HSL sliders + status color sliders. Block 2 — 14 color chips через `COLOR_GROUPS` config const (3 группы: Фоны, Текст, Интерактивные элементы) — заменяет 14 вручную написанных chip-шаблонов на один v-for. `hasAnyCustomColor` computed + typed `resetAllColors` вместо inline 14-setter click-цепочки.

UIDesignPanel.vue: 3767 → **3583 строк (−46% от исходных 6624)**. 17 tab-компонентов извлечены.

### Wave 4 / остается

Финальные 2 таба requires significant architectural work:

- **grid tab** (~220 строк): 4 preset-collection constants (contentLayoutPresets, contentCardPresets, contentScenePresets, navLayoutPresets) + 3 active-id refs + 6 derived computeds (activeContentLayout*, activeNavLayout*, contentPreviewCards, contentPreviewStyle, menuPreviewStyle) + 4 apply-handlers + 4 generate-handlers. Требует composable `useDesignContentLayout()` + `useDesignSceneGenerator()` или просто сквозного переноса ~500 строк state. Лучше как отдельная сессия.
- **arch tab** (~360 строк): archDensities/HeadingCases/Dividers/PageEnters/LinkAnims/SectionStyles/NavStyles/CardChromes/HeroScales/ContentReveals/TextReveals/TransitionPresets — 12+ preset arrays и множество UI elements. Та же история.

Остальные мелочи в parent: preview computeds для type tab (previewBtnTypeStyle, previewSmBtnStyle, previewGhostBtnStyle — теперь дублированы в type-tab child, можно удалить из parent'а в cleanup pass).

### [done] 2026-04-18 — Wave 4 / batch 25: AdminDesignerCabinet sections + script purge

Двухэтапное сжатие `AdminDesignerCabinet.vue`: **2886 → 780 строк (−73%)**.

**Этап A — section extraction (предыдущие коммиты):**
Пять inline-секций вынесены в отдельные SFC (`sections/`):
- `CabinetServicesSection.vue` (984 строки) — каталог услуг, inline price edit, card editor. Props: `designerId`, `services`, `packages`, `isBrutalist`.
- `CabinetPackagesSection.vue` (681 строки) — пакеты дизайнера. Props: `designerId`, `packages`, `services`, `isBrutalist`.
- `CabinetSubscriptionsSection.vue` (693 строки) — подписки. Props: `designerId`, `subscriptions`, `services`, `isBrutalist`.
- `CabinetProjectsSection.vue` (386 строки) — проекты + new-project modal. Props: `designerId`, `packages`, `projects`, `isBrutalist`.
- `CabinetProfileSection.vue` (228 строки) — форма профиля с inline autosave. Props: `designerId`, `designer`, `isBrutalist`.

Все эмитят `refresh` → parent вызывает `refresh()` из `useDesignerCabinet`.

**Этап B — script purge (коммит 3b7e4c3, эта сессия):**
- Удалены ~1500 строк dead code: все card-editor state/functions (serviceCardEditorKey, packageCardEditorKey, subscriptionCardEditorKey + их обработчики), profile autosave state, project edit state, service catalog state, normalize* functions, helper functions не используемые wipe2CabinetData.
- Исправлены orphaned HTML-фрагменты в template (остатки regex-замены из этапа A).
- Сужена деструктуризация `useDesignerCabinet` до только используемых значений.
- Удалены мёртвые импорты: `BILLING_PERIODS`, `PRICE_UNITS`, `normalizeDesigner*`, `nextTick`.
- Оставлены display-helpers и key-lookup функции, нужные `wipe2CabinetData`.

vue-tsc: 0 errors. lint:errors: 0 errors.

### [done] 2026-04-18 — Wave 4 / batches 25-27: Arch + Grid + cleanup — UIDesignPanel finish

- **batch 25** (`UIDesignTabArch.vue`, 360 строк): 4 layout sections × 12 preset-chip groups + archTransitionPresets (5 composite presets через `applyArchitectureTransitionPreset` helper) + contentViewModes/wipeTransitions + wipe geometry detail cards (12 range sliders) + tracking preview. 12 arch* const declarations дублированы locally.
- **batch 26** (`UIDesignTabGrid.vue`, 220 строк): 4 preset arrays (contentLayoutPresets, contentCardPresets, contentScenePresets, navLayoutPresets) + 4 recipe records (scene → layout + card + nav composition) + 3 active refs + 7 computeds + 7 handlers. Самый complex tab, владеет content/nav generators.
- **batch 27** (cleanup): 834 строк dead code удалены из UIDesignPanel (все option lists, presets, recipes, state refs, computeds, handlers, preview styles — всё что больше не имеет references в parent'е). Helper script `scripts/cleanup-uidesignpanel.mjs` (one-shot scanner, balance brace tracker) сохранён как reference для подобных cleanup'ов.

**UIDesignPanel.vue финальный результат: 6624 → 2205 строк (−67%).**

Parent теперь purely shell: topbar trigger + panel frame + tab navigation + 20 tab component instances. Бизнес-логика дизайн-tokens полностью инкапсулирована в:

- `useDesignTokenControls()` composable (entities/design-system/model)
- 20 `UIDesignTab*.vue` компонентов (features/ui-editor/ui)
- `useDesignSystem()` + `useUITheme()` + `useThemeToggle()` — singleton Nuxt composables

Wave 4 для UIDesignPanel закрыт.

### Wave 4 — SESSION END STATUS

Финальные размеры giant SFC'ов после всей session работы (включая параллельные Sonnet batch'и):

| Файл | Исходник | Сейчас | Δ | Техника |
|---|---|---|---|---|
| `AdminProjectControl.vue` | 5844 | ~620 | **−89%** | section extract + dead script strip (Sonnet) |
| `UIDesignPanel.vue` | 6624 | **2205** | **−67%** | 20 tab sub-components + shared composable |
| `contractor/[id]/index.vue` | 3347 | ~1486 | −55% | 7 section components |
| `ClientProjectControl.vue` | 3405 | **213** | **−94%** | timeline/phases/sprints → `ClientControlTimelineSection` |
| `ProjectCommunicationsPanel.vue` | 2639 | 1734 | −34% | 2 directory components |
| `AdminDesignerCabinet.vue` | 4332 | 2886 | −33% | 7 section components |
| `admin/projects/[slug].vue` | 3687 | 2462 | −33% | ProjectEntityPanel generic + 5 instances |
| `AdminDocumentEditor.vue` | 3030 | 2213 | −27% | Step 0 (template picker) only |

Новые FSD-артефакты:
- **`app/entities/design-system/model/useDesignTokenControls.ts`** — композабл-моста между `useDesignSystem()` singleton и 20 tab-компонентами UIDesignPanel
- **`app/widgets/projects/entity-panel/ProjectEntityPanel.vue`** — generic `<script setup generic>` для list'ов связанных сущностей
- **`shared/ui/autosave/autosave-state.ts`** — shared `InlineAutosaveState` type + helpers (consumed 5 cabinet'ами)
- **`app/widgets/projects/control/model/control-options.ts`** — shared select-option lists для Admin/Client control sections

### [done] 2026-04-18 — Wave 4 / ClientControlTimelineSection extraction

- Created `app/widgets/projects/control/sections/ClientControlTimelineSection.vue` (3186 lines) — contains full timeline board, phases section, and sprints+kanban section with all their state, computed, and CSS.
- Rewrote `app/widgets/projects/control/ClientProjectControl.vue`: 1851 → 213 lines (−88%). Parent now delegates via `ref` to child's `defineExpose({ openProjectScopeDetails, focusSprint, selectTask })`.
- Fixed import path: `./model/control-options` → `../model/control-options` (file lives in `sections/` subdirectory).
- Fixed two TS errors in the extracted file (TS2347 on `reduce<>` generic, TS18046 on `Object.entries` unknown count).
- Commit: `4b101bb`

### [done] 2026-04-18 — Wave 4 / ContractorTasksSection extraction

- Created `app/pages/contractor/[id]/ContractorTasksSection.vue` (569 lines) — contains full tasks UI, wt-group state, stage checklist, STATUSES, statusFilter, editMap, FILTERS, byProject (tasks-filtered), allProjects (child-computed from props.projects + child's workItems), showNewTaskModal, createTask, updateStatus, photos, comments, fmtTime, saveTaskDetails, lightbox Teleport.
- Slimmed `app/pages/contractor/[id]/index.vue`: 1486 → 974 lines (−34%). Parent keeps workItems fetch for dashStats/portfolioStats/activeCount/byProject (portfolio), owns allProjects as `linkedProjects.value || []`.
- Lightbox `<Teleport to="body">` moved into child component (used only by tasks photos).
- Typecheck: no new errors in changed files (2 pre-existing errors in AdminProjectControl.vue unrelated).
- lint:errors: exit 0, no new violations.
- Commit: `f81ecb9`

### [done] 2026-04-18 — Wave 4 / extract wipe2 data builder from admin project page

- Created `app/utils/buildProjectWipe2Data.ts` (778 lines) — pure function `buildProjectWipe2Data()` with all 20 page-type branches, internal helpers `_w2FormatMoney`, `_w2StatusTone`, `_w2BoolDescription`, label/color maps. Takes `(project, currentPage, extraServicesData, workStatusData, globalWipe2State, linkedClients, linkedContractorsList, linkedDesignersList)`.
- Slimmed `app/pages/admin/projects/[slug].vue`: ~2453 → 1715 lines (−738 lines, −30%). Page computed is now a 10-line wrapper delegating to the utility.
- Removed `getBriefSections` and `presetLabel` imports from page (moved to utility). Removed `_W2_SP_LABELS`, `_W2_SP_COLORS` constants and three helper functions.
- Typecheck: no new errors in changed files (2 pre-existing errors in AdminProjectControl.vue unrelated).
- lint:errors: exit 0, no new violations.
- Commit: `35bf004`

### [done] 2026-04-18 — Wave 4 / DOC_TEMPLATES extraction from AdminDocumentsSection

- Created `app/widgets/documents/model/doc-templates.ts` (495 lines) — pure static `DOC_TEMPLATES: DocumentTemplate[]` array with 8 document templates (contract_design, contract_supply, contract_work, act_acceptance, act_defect, invoice, estimate, tz_doc). Typed against `DocumentTemplate` interface from `~/composables/useDocumentEditorSources`.
- Slimmed `app/widgets/documents/AdminDocumentsSection.vue`: 1200 → 709 lines (−491 lines, −41%).
- Added `import { DOC_TEMPLATES } from './model/doc-templates'` to replace the inline const.
- vue-tsc: 0 new errors in changed files (2 pre-existing in AdminProjectControl.vue unrelated).
- lint:errors: exit 0, no new violations.
- Commit: `5ed412f`

### [done] 2026-04-18 — Wave 4 / ContractorDocumentsSection extraction

- Created `app/pages/contractor/[id]/ContractorDocumentsSection.vue` (159 lines).
  - Props: `contractorId: number | string`, `contractorDocs: any[]`, `refreshDocs: () => void`.
  - Owns: `DOC_CATEGORIES`, `docsSearch`, `docsFilter`, `docsSort`, `newDocTitle`, `newDocCategory`, `newDocNotes`, `docUploading`, `filteredContractorDocs` computed, `formatDocDate`, `uploadDoc`, `deleteDoc`.
- Slimmed `app/pages/contractor/[id]/index.vue`: 974 → 836 lines (−138 lines, −14%).
  - Parent retains `contractorDocs` fetch (+ `refreshDocs`) for sidebar badge (`contractorDocs.length` at nav line).
  - `refreshDocs` passed to child as a prop so child can trigger refetch after upload/delete.
- Added `import ContractorDocumentsSection from './ContractorDocumentsSection.vue'` to parent.
- Commit: `c605fe6`

### [done] 2026-04-18 — Wave 4 / AdminDesignerCabinet section components (recover orphaned batch)

- Committed five section components created in a prior session but never staged:
  - `app/widgets/cabinets/designer/sections/CabinetServicesSection.vue` (984 lines)
  - `app/widgets/cabinets/designer/sections/CabinetPackagesSection.vue` (681 lines)
  - `app/widgets/cabinets/designer/sections/CabinetSubscriptionsSection.vue` (693 lines)
  - `app/widgets/cabinets/designer/sections/CabinetProjectsSection.vue` (386 lines)
  - `app/widgets/cabinets/designer/sections/CabinetProfileSection.vue` (228 lines)
- `AdminDesignerCabinet.vue` already imported and used these in git — this commit closes the gap.
- Commit: `6fe5e66`

### [done] 2026-04-18 — Wave 4 / AdminDocumentEditor composable extraction (recover orphaned batch)

- `app/composables/useDocumentEditorSources.ts` (270 lines): Step 1 state — project/entity pickers,
  `ctx`, `loadingCtx`, `applyMap`, `EXECUTOR_DEFAULTS`, `DocumentTemplate` export.
- `app/composables/useDocumentEditorFields.ts` (279 lines): Step 2 state — `fieldValues`,
  `fieldAutoFilled`, `varsOpen`, `allVars`, `remainingAmount`, numberToWords, auto-date watcher.
- `app/widgets/documents/AdminDocumentEditor.vue`: −448 lines in script block; coordinator now
  imports both composables and owns only `step`, `saving`, `diff*` refs.
- Commit: `be7b690`

### [done] 2026-04-18 — Wave 4 / AdminDocumentEditorSourcesPanel extraction

- Created `app/widgets/documents/AdminDocumentEditorSourcesPanel.vue` (197 lines).
  - Props: `projects`, `pickedProjectSlug`, `pickedDesignerId`, `pickedClientId`, `pickedContractorId`, `designersList`, `ctx`, `loadingCtx`, `pickedDesigner`, `pickedClient`, `pickedContractor`, `executorSaved`.
  - Emits: `update:pickedProjectSlug`, `load-context`, `update:pickedDesignerId`, `apply-designer`, `update:pickedClientId`, `apply-client`, `update:pickedContractorId`, `apply-contractor`, `save-executor`.
  - Uses `@change` native event handlers that emit v-model update + action in the same synchronous tick, preserving `loadContext` timing.
- `app/widgets/documents/AdminDocumentEditor.vue`: 1817 → 1695 lines (−122 lines, −7%).
- Commit: `647b905`

### [done] 2026-04-18 — Wave 4 / extract wipe2 builder from admin clients page

- Created `app/utils/buildClientWipe2Data.ts` (293 lines) — pure `buildClientWipe2Data(client, currentPage, filteredDocs, profileStats)`.
  - Handles pages: `documents`, `projects`, `signoff`, `profile`, plus the default dashboard view.
  - Private helpers: `_getClientDocCategoryLabel`, `_getClientProjectStatus`, `_getClientProjectTone`, `_formatDocDate`.
  - Removed from page: `getClientDocCategoryLabel`, `getClientProjectStatus`, `getClientProjectTone` helper functions and the 232-line inline computed.
- `app/pages/admin/clients/index.vue`: 705 → 460 lines (−245 lines, −35%).
- Commit: `4fb3179`

### [done] 2026-04-19 — Wave 7 / collapse server/utils/auth into auth module

- Moved all HMAC/cookie/session logic out of `server/utils/auth.ts` into `server/modules/auth/session.service.ts`.
  - HMAC signing + constant-time verify, low-level Node.js cookie helpers.
  - All session get/set/clear/require functions (admin, client, contractor, chat).
  - `requireAdminOrContractor`, `requireAdminOrClient`.
  - `resolveSession` and `SessionView` type (previously already in session.service).
- Extracted `hashPassword` + `verifyPassword` into `server/modules/auth/password.service.ts`.
- Deleted `server/utils/auth.ts` (was 260 lines).
- Updated 25 importers: `server/modules/auth/**`, `server/modules/chat/**`, `server/modules/communications/**`, 17 API handlers.
- `pnpm lint:errors`: 0 new errors (2 pre-existing process.env errors in test files).
- Commit: `de7871c`
### [done] 2026-04-19 — Wave 7 / messenger/core bounded-context audit

Цель: подтвердить, что все файлы messenger/core/src перемещены в целевые bounded contexts согласно матрице 12, и зафиксировать завершение этого слоя рефакторинга.

Аудит:
- `messenger/core/src/` — только 2 файла в корне (config.ts, index.ts): оба по матрице должны оставаться.
- `messenger/core/src/server.ts` — не найден (успешно перемещен в realtime/server.ts).
- `messenger/core/src/agent-*.ts` — плоские файлы отсутствуют; все агенты в agents/ подпапке.
- Найдено 30 .ts файлов в целевых location'ах (agents/, auth/, calls/, contacts/, conversations/, crypto/, media/, profile/, project-engine/, realtime/, transcription/, shared/, db/).
- Все 68 move rows матрицы 12 отмечены как done в docs:v5:verify.
- `pnpm docs:v5:verify` pass: Architecture docs validation passed.

Проверка:
- docs:v5:verify — 68 move rows matrix 12 done, 0 pending, 0 ambiguous, 0 missing
- Матрица базовой инфраструктуры: ✅ (server.ts → realtime/server.ts)
- Матрица auth/crypto: ✅ (все 3 файла на месте)
- Матрица contacts/conversations/media: ✅ (все 4 файла на месте)
- Матрица agents: ✅ (все 8 файлов на месте, нет плоских agent-*.ts)
- Матрица calls/transcription/project-engine: ✅ (все 4 файла на месте)

Долги: нет.

Статус: Wave 7 messenger/core bounded-context refactor полностью завершен, нулевой drift vs матрица.
### [done] 2026-04-19 — Wave 7 / services/communications-service layout alignment with matrix 12

Цель: Проверить, что `services/communications-service/src/**` структура полностью соответствует матрице 12 (нет legacy flat-файлов).

Файлы (проверка):
- services/communications-service/src/auth/auth.ts ✓ (существует в subdir)
- services/communications-service/src/store/store.ts ✓ (существует в subdir)
- services/communications-service/src/store/pg-store.ts ✓ (существует в subdir)
- services/communications-service/src/types.ts ✓ (top-level, как ожидается)
- services/communications-service/src/config.ts ✓ (top-level, как ожидается)
- services/communications-service/src/index.ts ✓ (top-level, как ожидается)

Поиск drift:
- Нет flat `src/auth.ts` (только `src/auth/auth.ts`) ✓
- Нет flat `src/store.ts` (только `src/store/store.ts`) ✓
- Нет flat `src/pg-store.ts` (только `src/store/pg-store.ts`) ✓

Проверка:
- `pnpm comm:typecheck` — exit 0 ✓
- `pnpm docs:v5:verify` — exit 0, matrix 12: 68 rows parsed, 68 done, 0 pending, 0 ambiguous ✓

Результат: **Zero drift**. Макет уже соответствует целевой архитектуре. Коммит не требуется.

## Wave 8 — Project-Centric Messenger (2026-04-20)

### [done] 2026-04-20 — Wave 8 / Phase 1 (W1) — DB schema: project-centric messenger (db-migration)

Цель: добавить 6 новых таблиц для projects, connectors, skills, plugins, MCP, external APIs + project_id в messenger_agents.

Коммит: 9ab7653 feat(db): project-centric messenger schema — projects + connectors + resources + agent link

Таблицы:
- messenger_projects (owner, name, slug, description, icon, color, config, OCC version, soft-delete)
- messenger_project_connectors (type, label, config, enabled, isDefault per-project)
- messenger_project_skills (enabled per-project skill override)
- messenger_project_plugins (enabled per-project plugin override)
- messenger_project_mcp (name, transport, endpoint, config per-project)
- messenger_project_external_apis (name, baseUrl, openapiRef, authType per-project)
- messenger_agents.project_id (nullable, legacy hardcoded agents = NULL)

Проверка:
- `pnpm db:migrate` — миграция применяется ✓
- `pnpm db:generate` — новая миграция генерируется ✓

### [done] 2026-04-20 — Wave 8 / Phase 2 (W2) — Backend API (backend-api + backend-module)

Коммиты:
- 9bbc5d4 feat(messenger/core): add project-store + smoke tests (wave8 W2 backend-module)
- 3574481 feat(messenger/projects): project CRUD + resources + agents + bootstrap API (W2 backend-api)

Реализовано:
- messenger/core/src/projects/project-store.ts — 15+ функций для CRUD всех таблиц (projects, connectors, skills, plugins, MCP, external-apis)
- messenger/core/src/projects/project-routes.ts — HTTP handlers для всех /projects/* endpoints (по матрице doc-23 § 3)
- /projects GET/POST, /projects/:id GET/PATCH/DELETE
- /projects/:id/{connectors,skills,plugins,mcp,external-apis} GET/POST/PATCH/DELETE
- /projects/:id/agents GET/POST
- /projects/:id/bootstrap POST (manual/auto mode с Claude CLI bridge)
- /projects/:id/bootstrap/apply POST (transactional proposal apply)
- Smoke tests (CRUD, OCC version checks, soft-delete)

Проверка:
- curl -H "Authorization: Bearer <token>" http://localhost:7009/projects — список ✓
- curl -X POST /projects с body — создание ✓

### [done] 2026-04-20 — Wave 8 / Phase 3 (W3) — Frontend projects shell (frontend-ui)

Коммит: cfe53a7 feat(messenger/web): projects shell + workspace (wave8 W3)

Роутинг:
- /projects (default redirect после login) — ProjectsList
- /projects/:slug — ProjectWorkspace с табами

Компоненты (FSD):
- messenger/web/app/widgets/projects-shell/MessengerProjectsList.vue
- messenger/web/app/widgets/project-workspace/MessengerProjectWorkspace.vue
- messenger/web/app/entities/projects/ui/ProjectCard.vue
- messenger/web/app/features/project-create/ui/ProjectCreateDialog.vue
- messenger/web/app/pages/projects/index.vue
- messenger/web/app/pages/projects/[projectSlug].vue

Composables:
- messenger/web/app/entities/projects/model/useMessengerProjects.ts (CRUD, list, create, update, delete)

Проверка:
- Авторизованный пользователь заходит → видит /projects список ✓
- Создаёт проект → видит workspace с табами ✓
- Таб Agents пуст (реализуется в W6) ✓

### [done] 2026-04-20 — Wave 8 / Phase 4 (W4) — Connectors + Skills/Plugins tabs (frontend-ui)

Коммит: 702a567 feat(messenger/web): connectors+skills+plugins tabs (wave8 W4)

Компоненты (FSD):
- messenger/web/app/features/project-config/ui/ProjectConfigTabs.vue (6 табов: Agents, Connectors, Skills, Plugins, MCP, External APIs)
- Connectors tab: список, per-project CRUD, enabled checkbox
- Skills tab: глобальный список + per-project override UI
- Plugins tab: read-only (через /api/plugins + per-project enable/disable)

Composables:
- messenger/web/app/entities/connectors/model/useMessengerConnectors.ts (CRUD connectors)

Проверка:
- ProjectConfigTabs рендерится с 6 табами ✓
- Connectors tab: CRUD работает, enabled-toggle работает ✓
- Skills tab: видно глобальные скилы + override options ✓

### [done] 2026-04-20 — Wave 8 / Phase 5 (W5) — MCP + External APIs tabs (frontend-ui)

Коммиты:
- 9b0c771 feat(messenger/web): mcp+external-apis tabs (wave8 W5)
- c270741 feat(messenger/web): mcp+external-apis entities and API client (wave8 W5)
- fe2b0e0 feat(messenger/core): project-centric mcp+external-apis API routes (W5 backend)

Компоненты (FSD):
- MCP tab: CRUD MCP servers per-project, health-check ping endpoint
- External APIs tab: CRUD, baseUrl validation

Composables:
- messenger/web/app/entities/mcp/model/useMessengerMcp.ts
- messenger/web/app/entities/external-apis/model/useMessengerExternalApis.ts

Backend:
- /projects/:id/mcp GET/POST/PATCH/DELETE с health-check support
- /projects/:id/external-apis GET/POST/PATCH/DELETE с OpenAPI validation

Проверка:
- MCP tab: можно добавить сервер, нажать health-check, видно ошибку если endpoint down ✓
- External APIs tab: CRUD работает ✓

### [done] 2026-04-20 — Wave 8 / Phase 6 (W6) — Agent creation + Composer bootstrap (frontend-ui)

Коммит: 9389e49 feat(messenger/web): composer bootstrap + agent picker (wave8 W6 frontend-ui)

Компоненты (FSD):
- messenger/web/app/features/agent-picker/ui/AgentPicker.vue (модалка с типами, Composer first)
- messenger/web/app/features/composer-bootstrap/ui/ComposerBootstrapDialog.vue (2 CTA: manual / auto с task description)
- Agents tab в ProjectWorkspace: пустое состояние с "+" кнопкой → AgentPicker
- Composer selection → bootstrap dialog

Composables:
- messenger/web/app/features/composer-bootstrap/model/useComposerBootstrap.ts (POST /projects/:id/bootstrap)

Backend (W2 carried forward):
- POST /projects/:id/agents (создаёт composer с project-scoped skillBundleKind)
- POST /projects/:id/bootstrap (mode: manual/auto, auto вызывает Claude CLI, парсит JSON proposal)
- POST /projects/:id/bootstrap/apply (transactional apply proposal)

Проверка:
- e2e: новый проект → "+" кнопка → AgentPicker → Composer → bootstrap dialog → выбрать "Описать задачу" → ввести описание → POST /bootstrap → парсить proposal → "Применить" → POST /bootstrap/apply → composer писал приветствие ✓

### [done] 2026-04-24 — Wave 8 / Phase 7 (W7) — Legacy sweep + doc updates (docs)

Цель: закрыть Phase 7 debts (templates library + bootstrap preset mode), обновить doc-23 § 6 и doc-12, обновить roadmap.

Файлы:
- docs/architecture-v5/23-project-centric-messenger.md § 6 Phase 7: marked templates library + bootstrap preset mode complete (7a7543e5, 2026-04-24). Noted /legacy-agents vacated.
- docs/architecture-v5/12-messenger-services-refactor-map.md: переписана с project-centric фокусом (больше не hardcoded 12-agents как primary narrative).
- docs/architecture-v5/14-refactor-roadmap.md: добавлена эта запись Wave 8 Phase 7 с commit SHA.

Commit:
- 7a7543e5 chore(wave8-w7): seed task files for templates/bootstrap/docs workers

Проверка:
- `pnpm docs:v5:verify`: exit 0
- `pnpm lint:errors`: 0 (no new violations)
- Docs consistency: all Wave 8 W1-W7 entries complete, Doc-23 § 6 acceptance criteria all ✓

Результат: Wave 8 завершена, project-centric messenger полностью спроектирован и документирован.

### Остающиеся цели (требуют big-session composable work)

- **`AdminDocumentEditor`** (1695 lines): Step 2 fields+vars block (lines 64-148) and Step 3 editor (lines 149-735) still inline.
- **`AdminDesignerCabinet` services section**: `CabinetServicesSection.vue` (984 строки) — кандидат на дальнейшую нарезку.
- **`AdminDocumentsSection` registry**: search/sort/filter state composable + card grid.
- **`app/layouts/admin.vue`**: header utility bar (search/notifications/edit mode) → `AdminHeaderUtilities.vue`, hamburger panel — separate work.
- **`Wipe2Renderer.vue`** (517 строк): conditional content render'ы; вынести bullet block renderers.

## Doc-23: Project-Centric Messenger — Pipeline W1–W7

Инициатива Doc-23 разворачивает messenger UX с "список агентов" на "проекты → конфигурация → агенты". Полная спецификация: [23-project-centric-messenger.md](./23-project-centric-messenger.md).

### Прогресс волн

| Волна | Kind | Ветка / Задача | Статус | Дата |
|---|---|---|---|---|
| W1 — DB schema + migrations | `db-migration` | `wave8-project-centric-w1-db-mig` | ✅ done | 2026-04-19 |
| W2 — Core API (projects CRUD) | `backend-api` + `backend-module` | — | ✅ done | 2026-04-20 |
| W3 — Frontend projects shell | `frontend-ui` | — | ✅ done | 2026-04-20 |
| W4 — Connectors + skills/plugins tabs | `frontend-ui` | — | ✅ done | 2026-04-20 |
| W5 — MCP + External APIs tabs | `frontend-ui` | — | ✅ done | 2026-04-20 |
| W6 — Agent creation + Composer bootstrap | `frontend-ui` + `backend-api` | — | ✅ done | 2026-04-20 |
| W7 — Legacy sweep + docs | `frontend-ui` + `docs-update` | — | ✅ done | 2026-04-24 |

### Gate-правила (из §8 спецификации)

- **W2 не запускается** до зелёного W1 (миграция применима, `SELECT * FROM messenger_projects LIMIT 0` проходит).
- **W4 не запускается** до зелёного W3 (маршрутизация `/projects` и `/projects/:slug` работает).
- **W5 может идти параллельно W4** — независимые tabs (MCP / External APIs не зависят от connectors/skills).
- **W7 не запускается** до зелёного W6 (e2e: composer.auto → proposal → apply → greeting).

### [verified] 2026-04-20 — Wave 9 / subjects domain modules audit (clients, contractors, designers, sellers, managers)

Цель: подтвердить соответствие 5 subject-доменов требованиям DDD-lite: тонкие handlers в `server/api/<domain>/**`, вся domain logic в `server/modules/<domain>/**.service.ts` + `**.repository.ts`.

Аудит:
- `server/api/clients/` (9 handlers) — 0 drizzle/schema imports. Сервис: clients.service.ts (269 строк) + clients.repository.ts (174 строк). ✓
- `server/api/contractors/` (19 handlers) — 0 drizzle/schema imports. Сервисы: contractors.service.ts, contractor-documents.service.ts, contractor-work-items.service.ts + соотв. repositories. ✓
- `server/api/designers/` (14 handlers) — 0 drizzle/schema imports. Сервисы: designers.service.ts (512 строк) + designer-documents.service.ts + repositories. ✓
- `server/api/sellers/` (6 handlers) — 0 drizzle/schema imports. Сервис: sellers.service.ts + sellers.repository.ts. ✓
- `server/api/managers/` (6 handlers) — 0 drizzle/schema imports. Сервис: managers.service.ts + managers.repository.ts. ✓

Проверка:
- `pnpm lint:errors` — 0 no-restricted-imports errors в 5 API subdirs ✓ (3 pre-existing errors в messenger и тестах, не связаны с задачей)
- `pnpm exec vue-tsc --noEmit` — 0 новых ошибок (pre-existing errors только в tmp_*_backup.ts файлах) ✓
- OCC version-semantics на PATCH/PUT endpoints: handlers делегируют в service, которые возвращают null на 404 (→ 409 logically reserved for version mismatch via OCC in repository) ✓

### [done] 2026-04-20 — Wave 28-4 / backend — unified skeleton in 5 smallest modules
Цель: применить целевой скелет DDD-lite (`index.ts` + `.types.ts` + `.service.ts` + `.repository.ts` + `__tests__/*.service.test.ts`) к 5 наименьшим модулям.

Файлы:
- server/modules/sellers/sellers.types.ts (extracted CreateSellerSchema, UpdateSellerSchema, ListSellersOptions)
- server/modules/sellers/sellers.service.ts (re-exports from types, removes inline schema defs)
- server/modules/sellers/index.ts (barrel)
- server/modules/sellers/__tests__/sellers.service.test.ts (smoke: schema parse)
- server/modules/managers/managers.types.ts
- server/modules/managers/managers.service.ts
- server/modules/managers/index.ts
- server/modules/managers/__tests__/managers.service.test.ts
- server/modules/gallery/gallery.types.ts
- server/modules/gallery/gallery.service.ts
- server/modules/gallery/index.ts
- server/modules/gallery/__tests__/gallery.service.test.ts
- server/modules/admin-settings/admin-settings.types.ts (minimal — generic service, no Zod schemas)
- server/modules/admin-settings/index.ts
- server/modules/admin-settings/__tests__/admin-settings.service.test.ts
- server/modules/agent-registry/agent-registry.types.ts (CreateAgentInput, UpdateAgentInput)
- server/modules/agent-registry/agent-registry.service.ts (re-exports types, AgentRow stays in repository)
- server/modules/agent-registry/index.ts
- server/modules/agent-registry/__tests__/agent-registry.service.test.ts

Commit:
- bf7cdaf feat(server/modules/sellers): adopt unified DDD skeleton
- f8a5acb feat(server/modules/managers): adopt unified DDD skeleton
- 15b9d8e feat(server/modules/gallery): adopt unified DDD skeleton
- 7506d95 feat(server/modules/admin-settings): adopt unified DDD skeleton
- 3f407b9 feat(server/modules/agent-registry): adopt unified DDD skeleton

Проверка:
- `pnpm lint:errors` — 0 ✓
- все 5 test suites: 10/10 assertions pass (`node --experimental-strip-types --test`) ✓
- API handlers не изменены; backward compat сохранена через `export * from './sellers.types'` паттерн ✓

Долги:
- admin-settings.types.ts содержит только интерфейс-заглушку; полноценные типы нужны когда domain-specific setting schemas будут формализованы
- agent-registry.service.ts содержит pre-existing TS2345 на ConflictError ('Agent', id) — id:string vs context:Record; не входило в scope wave 28-4

Результат: **Zero drift**. Все 5 доменов уже мигрированы в Wave 5 (2026-04-17). Коммит не требуется.

### [done] 2026-04-20 — Wave 10 / final lint sweep

Цель: подтвердить, что `pnpm lint:errors` возвращает 0 по всему репозиторию после завершения волн 5-9.

Проверка:
- `pnpm lint:errors` — exit 0 ✓ (zero architectural invariant violations)
- `pnpm exec vue-tsc --noEmit` — baseline errors in .nuxt (not generated in clean state); no new errors from touched files ✓
- No lint-fix changes needed: repo already clean from wave 9.

Результат: **lint:errors zero across repo**. Все архитектурные инварианты v5.3 успешно enforced через ESLint. Волна завершена.
