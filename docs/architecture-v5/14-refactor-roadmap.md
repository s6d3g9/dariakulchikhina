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

### [done] 2026-04-07 — Wave 0 / deploy isolation for fork domain
Цель: подготовить отдельный deploy-контур для refactor branch и зафиксировать серверный gap для `admin.dariakulchikhina.com`.

Файлы:
- ecosystem.refactor.config.cjs
- scripts/deploy-refactor-safe.sh
- docs/architecture-v5/15-refactor-deploy-domain.md
- docs/architecture-v5/INDEX.md
- docs/architecture-v5/REFACTORING_PLAN.md

Commit:
- pending

Проверка:
- найдено: локальный refactor runtime на `127.0.0.1:3018` отвечает `200 OK` для `/login?role=admin`
- nginx-блок `server_name admin.dariakulchikhina.com` на `8082` переведен на refactor runtime `3018` и refactor static aliases
- в Hiddify HTTP map добавлен отдельный backend `admin_daria_http` для `admin.dariakulchikhina.com`
- в HAProxy `https-in` добавлен отдельный SNI route `admin_daria_direct` на `127.0.0.1:4444`
- выпущен отдельный Let's Encrypt cert и установлен в `/etc/letsencrypt/live/admin.dariakulchikhina.com`
- поднят отдельный nginx SSL vhost `127.0.0.1:4444 ssl` для refactor runtime
- `curl -I 'http://admin.dariakulchikhina.com/login?role=admin'` — `200 OK`
- `curl -I 'https://admin.dariakulchikhina.com/login?role=admin'` — `200 OK`
- refactor deploy script переведен на ветку `refactor/architecture-v5`, путь `/opt/daria-nuxt-refactor`, PM2 app `daria-nuxt-refactor`

Долги:
- автоматический renewal-safe путь для HTTP-01 пока не доведен до конца: `/.well-known/acme-challenge/` на `8082` все еще падает в Nuxt `404`, поэтому выпуск cert был сделан через временный static backend bridge на `/var/www/daria`
- следующий infra-шаг здесь уже не routing, а либо постоянная ACME static handler схема, либо отдельный renew-script под admin domain

### [done] 2026-04-07 — Wave 2 / server-api shared import cutover
Цель: перевести безопасный thin-controller batch в `server/api/**` на новые v5 target-paths внутри `shared/**` без изменения логики endpoints.

Файлы:
- server/api/auth/login.post.ts
- server/api/auth/register.post.ts
- server/api/auth/client-register.post.ts
- server/api/auth/contractor-register.post.ts
- server/api/auth/recover.post.ts
- server/api/auth/client-recover.post.ts
- server/api/auth/contractor-recover.post.ts
- server/api/admin/design-modules.get.ts
- server/api/admin/design-modules.put.ts
- server/api/admin/element-visibility.get.ts
- server/api/admin/element-visibility.put.ts
- server/api/admin/element-alignment.get.ts
- server/api/admin/element-alignment.put.ts
- server/api/admin/app-blueprints.get.ts
- server/api/admin/app-blueprints.put.ts
- server/api/admin/notifications.get.ts
- server/api/projects/[slug]/client-profile.put.ts
- server/api/projects/[slug]/status.put.ts
- server/api/projects/[slug]/coordination/participants/index.post.ts
- server/api/projects/[slug]/coordination/participants/[participantId].patch.ts
- server/api/projects/[slug]/coordination/assignments/index.post.ts
- server/api/projects/[slug]/coordination/assignments/[assignmentId].patch.ts
- server/api/projects/[slug]/coordination/scopes/[scopeType]/[scopeId]/settings.patch.ts
- server/api/projects/[slug]/coordination/scopes/[scopeType]/[scopeId].get.ts
- server/api/projects/[slug]/communications/call-insights/index.post.ts
- server/api/projects/[slug]/communications/call-insights/[insightId]/apply.post.ts
- server/api/projects/[slug]/communications/action-execute.post.ts
- server/api/projects/[slug]/communications/action-catalog.get.ts
- server/api/designers/index.get.ts
- server/api/designers/index.post.ts
- server/api/designers/[id].get.ts
- server/api/designers/[id].put.ts
- server/api/designers/[id]/project.put.ts
- server/api/designers/[id]/create-project.post.ts

Commit:
- pending

Проверка:
- `get_errors` по всем измененным endpoint-файлам — no errors found
- повторный grep по `server/api/**` — legacy shared import paths из текущего batch больше не найдены

Долги:
- `server/utils/**` после этого batch уже очищен только частично; следующий backend этап должен идти в clean `app/**` import-cutover или в real logic split из utils в modules
- это import-cutover stage, а не перенос logic из `server/utils/**` в `server/modules/**`

### [done] 2026-04-07 — Wave 2 / server-utils shared import cutover
Цель: добрать безопасный backend batch в `server/utils/**` и перевести оставшиеся project/governance импорты на новые v5 target-paths без изменения поведения.

Файлы:
- server/utils/project-communications-actions.ts
- server/utils/project-governance.ts

Commit:
- pending

Проверка:
- `get_errors` по обоим util-файлам — no errors found
- повторный grep по `server/utils/**` для `~/shared/types/(catalogs|project|project-governance)` и `~/shared/utils/(project-control|project-governance)` — matches not found

Долги:
- `~/shared/utils/work-status` пока остается на legacy root-path, потому что отдельный target-path для него еще не выделен в `shared/utils/**`
- это все еще import-cutover stage; логика по-прежнему живет в `server/utils/**`, а не в `server/modules/**`

### [done] 2026-04-07 — Wave 2 / safe app shared import cutover
Цель: пройтись по чистым `app/components/**` и `app/composables/**`, где можно сменить legacy shared imports на v5 target-paths без пересечения с активным UI WIP.

Файлы:
- app/composables/useDesignModules.ts
- app/composables/useAppBlueprintCatalog.ts
- app/composables/useElementAlignment.ts
- app/composables/useElementVisibility.ts
- app/composables/useContractorCabinet.ts
- app/components/AdminProjectSettings.vue
- app/components/AdminSpacePlanning.vue
- app/components/UIAppBlueprintBuilder.vue
- app/components/AdminProjectPhaseBoard.vue
- app/components/AdminProjectKanban.vue
- app/components/ClientInitiation.vue
- app/components/ClientContactDetails.vue
- app/components/ClientSelfProfile.vue
- app/components/AdminProjectOverview.vue
- app/components/ClientOverview.vue
- app/components/ClientContracts.vue
- app/components/ClientExtraServices.vue
- app/components/AdminExtraServices.vue
- app/components/AdminToRContract.vue
- app/components/AdminWorkStatus.vue
- app/components/AdminClientProfile.vue
- app/components/AdminDesignerCabinet.vue
- app/components/ProjectCommunicationsPanel.vue
- app/components/ClientProjectControl.vue

Commit:
- pending

Проверка:
- `get_errors` по всем touched app-файлам из batch — no errors found
- повторный grep по `app/components/**` и `app/composables/**` показал, что из старых project/governance import-paths остались только `AdminProjectControl.vue`, `AdminProjectControl.vue.bak` и уже изменяемый `useProjectControlTimeline.ts`

Долги:
- `AdminProjectControl.vue` и `useProjectControlTimeline.ts` еще не переведены, потому что пересекаются с текущим измененным worktree и требуют отдельного аккуратного прохода
- `AdminProjectControl.vue.bak` пока игнорируется как временный/архивный файл и не должен участвовать в target-архитектуре

### [done] 2026-04-07 — Wave 2 / control app import reconciliation
Цель: закрыть последние живые legacy shared imports в control-слое отдельным аккуратным проходом, не трогая archive `.bak` и не меняя логику UI.

Файлы:
- app/components/AdminProjectControl.vue
- app/composables/useProjectControlTimeline.ts

Commit:
- pending

Проверка:
- `get_errors` по обоим control-файлам — no errors found
- отдельный type-fix в `refreshTimelineGovernanceView` добавлен через `Promise.resolve(refresh())`, чтобы недавно затронутый composable оставался чистым по диагностике
- повторный grep по `app/components/**` и `app/composables/**` для legacy shared import-paths — живых matches в рабочих app-файлах больше не осталось

Долги:
- `app/components/AdminProjectControl.vue.bak` остается вне refactor target как архивный файл
- app-этап shared import-cutover завершен, следующий app-шаг уже не import-only, а реальная декомпозиция крупных control/UI монолитов

### [done] 2026-04-07 — Wave 3 / backend logic split / project-relations
Цель: выполнить первый реальный перенос backend-логики из `server/utils/**` в `server/modules/**` на чистом project-domain блоке без изменения поведения API.

Файлы:
- server/modules/projects/project-relations.service.ts
- server/utils/project-relations.ts
- server/api/projects/[slug]/relations.get.ts
- server/api/projects/[slug]/communications/action-catalog.get.ts
- server/utils/communications.ts
- server/utils/project-governance.ts

Commit:
- pending (working tree on top of `ace2d98`)

Проверка:
- `get_errors` по всем touched backend-файлам — no errors found
- `pnpm build` — ok
- `server/utils/project-relations.ts` оставлен как compatibility facade, но живая реализация теперь находится в `server/modules/projects/project-relations.service.ts`

Долги:
- часть project-domain цепочек все еще заходит в modules через legacy re-export, например `server/modules/communications/communications-bootstrap.service.ts -> server/utils/communications.ts`
- следующий backend batch должен переносить уже соседний project-domain блок (`communications bootstrap` или `project-governance`), а не создавать новые bridge-only файлы

### [done] 2026-04-07 — Wave 3 / backend logic split / communications-bootstrap
Цель: перенести живую bootstrap-логику project communications из `server/utils/**` в модульный communications-service и сразу перевести прямых consumer-ов на module entrypoint.

Файлы:
- server/modules/communications/communications-bootstrap.service.ts
- server/utils/communications.ts
- server/api/projects/[slug]/communications/bootstrap.get.ts
- server/api/projects/[slug]/communications/call-insights/index.post.ts
- server/utils/project-communications-relay.ts

Commit:
- pending (working tree on top of `ace2d98`)

Проверка:
- `get_errors` по всем touched backend-файлам — no errors found
- `pnpm build` — ok
- `grep -RIn "~/server/utils/communications" server` — live matches not found
- `server/utils/communications.ts` оставлен как compatibility facade, но живая реализация теперь находится в `server/modules/communications/communications-bootstrap.service.ts`

Долги:
- relay/orchestration слой все еще живет в legacy utils, например `server/utils/project-communications-relay.ts` и `server/utils/project-communications-actions.ts`
- следующий backend batch должен переносить либо `project-governance`, либо соседний communications orchestration block, а не расширять compatibility facade surface

### [done] 2026-04-07 — Wave 3 / backend logic split / communications-relay
Цель: вынести relay-слой project communications из `server/utils/**` в модульный communications-service и перевести весь room-controller batch на module entrypoint.

Файлы:
- server/modules/communications/communications-relay.service.ts
- server/utils/project-communications-relay.ts
- server/api/projects/[slug]/communications/rooms/[roomId].get.ts
- server/api/projects/[slug]/communications/rooms/[roomId]/events.get.ts
- server/api/projects/[slug]/communications/rooms/[roomId]/key-bundles.get.ts
- server/api/projects/[slug]/communications/rooms/[roomId]/key-bundles.post.ts
- server/api/projects/[slug]/communications/rooms/[roomId]/me/nickname.put.ts
- server/api/projects/[slug]/communications/rooms/[roomId]/messages.get.ts
- server/api/projects/[slug]/communications/rooms/[roomId]/messages.post.ts
- server/api/projects/[slug]/communications/rooms/[roomId]/signals.post.ts
- server/api/projects/[slug]/communications/rooms/index.get.ts
- server/api/projects/[slug]/communications/rooms/index.post.ts

Commit:
- pending (working tree on top of `ace2d98`)

Проверка:
- `get_errors` по всем touched backend-файлам — no errors found
- `pnpm build` — ok
- `grep -RIn "~/server/utils/project-communications-relay" server` — live matches not found
- `server/utils/project-communications-relay.ts` оставлен как compatibility facade, но живая реализация теперь находится в `server/modules/communications/communications-relay.service.ts`

Долги:
- action orchestration для communications все еще живет в legacy util `server/utils/project-communications-actions.ts`
- governance-domain по-прежнему целиком находится в `server/utils/project-governance.ts`, поэтому следующий крупный перенос должен идти либо туда, либо в `communications-actions`

### [done] 2026-04-07 — Wave 3 / backend logic split / communications-actions
Цель: перенести action orchestration для project communications из `server/utils/**` в модульный communications-service и перевести controller на module entrypoint.

Файлы:
- server/modules/communications/communications-actions.service.ts
- server/utils/project-communications-actions.ts
- server/api/projects/[slug]/communications/action-execute.post.ts

Commit:
- pending (working tree on top of `ace2d98`)

Проверка:
- `get_errors` по всем touched backend-файлам — no errors found
- `pnpm build` — ok
- `grep -RIn "~/server/utils/project-communications-actions" server` — live matches not found
- `server/utils/project-communications-actions.ts` оставлен как compatibility facade, но живая реализация теперь находится в `server/modules/communications/communications-actions.service.ts`

Долги:
- communications-domain почти полностью выведен из bridge-stage, но governance-domain все еще остается крупным legacy utility block
- следующий backend batch должен идти уже в `server/utils/project-governance.ts`, а не в новый communications surface

### [done] 2026-04-07 — Wave 3 / backend logic split / project-governance
Цель: перенести governance-domain из legacy utility блока в projects-module, перевести все живые endpoint consumer-ы на module entrypoint и убрать устаревший util-path, который начал шуметь в Nitro duplicate-import warning.

Файлы:
- server/modules/projects/project-governance.impl.ts
- server/modules/projects/project-governance.service.ts
- server/api/projects/[slug]/communications/action-catalog.get.ts
- server/api/projects/[slug]/coordination/participants/index.post.ts
- server/api/projects/[slug]/coordination/participants/[participantId].patch.ts
- server/api/projects/[slug]/coordination/assignments/index.post.ts
- server/api/projects/[slug]/coordination/assignments/[assignmentId].patch.ts
- server/api/projects/[slug]/coordination/assignments/[assignmentId].delete.ts
- server/api/projects/[slug]/coordination/scopes/[scopeType]/[scopeId].get.ts
- server/api/projects/[slug]/coordination/scopes/[scopeType]/[scopeId]/settings.patch.ts

Commit:
- pending (working tree on top of `ace2d98`)

Проверка:
- `get_errors` по module/service и всем touched governance endpoint-файлам — no errors found
- `grep -RIn "~/server/utils/project-governance" server` — live matches not found
- `pnpm build` — ok
- повторный `pnpm build` после удаления `server/utils/project-governance.ts` — ok
- Nitro duplicate-import warning по governance исчез после удаления устаревшего util facade

Долги:
- governance-domain больше не живет в `server/utils/**`, но внутри projects-модуля еще остается крупный implementation файл, который позже можно резать на participant/assignment/scope sub-services
- backend-волна на project/communications/governance дала уже достаточный прогресс, поэтому следующий безопасный этап лучше переводить из backend batch-ов в UI monolith split

### [done] 2026-04-07 — Wave 3 / ui monolith split / client-project-control timeline-state
Цель: сделать первый реальный UI non-import batch в `ClientProjectControl` и вынести timeline/detail state-контур из монолитного SFC в отдельный composable без изменения поведения экрана.

Файлы:
- app/composables/useClientProjectControlTimeline.ts
- app/components/ClientProjectControl.vue

Commit:
- pending (working tree on top of `ace2d98`)

Проверка:
- `get_errors` по `app/components/ClientProjectControl.vue` и `app/composables/useClientProjectControlTimeline.ts` — no errors found
- `pnpm build` — ok

Долги:
- `ClientProjectControl.vue` стал заметно меньше по state/behavior, но template и scoped CSS все еще остаются крупным монолитом
- следующий безопасный UI batch лучше делать либо как extraction timeline view-shell, либо как отдельный phases/sprints slice из того же control-компонента

### [done] 2026-04-07 — Wave 3 / ui monolith split / client-project-control execution-state
Цель: вынести из `ClientProjectControl` второй крупный state-блок с route-sync, sprint/task selection, deep-link поведением и execution-derived stats в отдельный composable, не меняя визуальную структуру экрана.

Файлы:
- app/composables/useClientProjectControlExecution.ts
- app/components/ClientProjectControl.vue

Commit:
- pending (working tree on top of `ace2d98`)

Проверка:
- `get_errors` по `app/components/ClientProjectControl.vue` и `app/composables/useClientProjectControlExecution.ts` — no errors found
- `pnpm build` — ok

Долги:
- `ClientProjectControl.vue` теперь значительно легче по script-части, но template/layout и scoped CSS по-прежнему концентрируют много view-responsibility в одном SFC
- следующий безопасный UI batch лучше выбирать уже не из state extraction, а из view-shell extraction: timeline board section, phases/sprints panel или call-insights subsection

### [done] 2026-04-07 — Wave 3 / ui monolith split / client-project-control communications-shell
Цель: вынести из `ClientProjectControl` верхний communications/coordination view-shell в отдельный child-компонент, сохранив текущую visual contract и не трогая timeline/phases execution flow.

Файлы:
- app/components/ClientProjectControlCommunications.vue
- app/components/ClientProjectControl.vue

Commit:
- pending (working tree on top of `ace2d98`)

Проверка:
- `get_errors` по `app/components/ClientProjectControl.vue` и `app/components/ClientProjectControlCommunications.vue` — no errors found
- `pnpm build` — ok

Долги:
- `ClientProjectControl.vue` уже разгружен по communications и state-слоям, но timeline board и phases/sprints shell все еще остаются крупными view-блоками внутри одного SFC
- следующий безопасный UI batch теперь лучше брать из `timeline board section` или `phases/sprints panel`, а не возвращаться в уже вынесенный communications slice

### [done] 2026-04-07 — Wave 3 / ui monolith split / client-project-control timeline-board-shell
Цель: вынести из `ClientProjectControl` timeline board и detail-pane в отдельный child-компонент, сохранив timeline state в composable и не ломая responsive contract секции.

Файлы:
- app/components/ClientProjectControlTimelineBoard.vue
- app/components/ClientProjectControl.vue
- app/composables/useClientProjectControlTimeline.ts

Commit:
- pending (working tree on top of `ace2d98`)

Проверка:
- `get_errors` по `app/components/ClientProjectControl.vue`, `app/components/ClientProjectControlTimelineBoard.vue` и `app/composables/useClientProjectControlTimeline.ts` — no errors found
- `pnpm build` — ok

Долги:
- `ClientProjectControl.vue` теперь разгружен и по communications, и по timeline board/detail shell, но phases/sprints execution panel и часть timeline-section orchestration все еще остаются в родительском SFC
- timeline visual tokens (`--cpc-tl-*`) и section-level shell намеренно оставлены в родителе как shared contract для child view-shell; это нормально для текущего batch, но позже можно будет еще дочистить ownership CSS

### [done] 2026-04-07 — Wave 3 / ui monolith split / client-project-control execution-shell
Цель: вынести из `ClientProjectControl` phases/sprints execution shell в отдельный child-компонент, сохранив deep-link и selection state внутри execution composable.

Файлы:
- app/components/ClientProjectControlExecutionShell.vue
- app/components/ClientProjectControl.vue
- app/composables/useClientProjectControlExecution.ts

Commit:
- pending (working tree on top of `ace2d98`)

Проверка:
- `get_errors` по `app/components/ClientProjectControl.vue`, `app/components/ClientProjectControlExecutionShell.vue` и `app/composables/useClientProjectControlExecution.ts` — no errors found
- `pnpm build` — ok

Долги:
- `ClientProjectControl.vue` после этого batch уже разгружен по timeline, communications и execution view-shell, но checkpoint/blocker секции и часть shared CSS ownership все еще остаются в родительском SFC
- `useClientProjectControlExecution.ts` теперь экспортирует typed view-contract для child shell; при следующих extraction лучше продолжать тот же pattern, а не возвращаться к inline shape-объектам в родителе

### [done] 2026-04-07 — Wave 3 / ui monolith split / client-project-control status-shell
Цель: вынести из `ClientProjectControl` checkpoint и blocker секции в отдельный child-компонент, не затрагивая timeline/execution state и оставив в родителе только orchestration-level shell.

Файлы:
- app/components/ClientProjectControlStatusShell.vue
- app/components/ClientProjectControl.vue

Commit:
- pending (working tree on top of `ace2d98`)

Проверка:
- `get_errors` по `app/components/ClientProjectControl.vue`, `app/components/ClientProjectControlStatusShell.vue` и соседнему execution shell — no errors found
- `pnpm build` — ok

Долги:
- `ClientProjectControl.vue` теперь в основном держит summary/orchestration слой и shared visual tokens, но внутри него все еще остается заметный объём scoped CSS, часть которого уже принадлежит вынесенным child-shell компонентам
- следующий безопасный шаг теперь уже не очередной крупный template split, а cleanup ownership: либо вынести оставшийся parent-only summary shell, либо подчистить dead scoped CSS после серийных extraction batch-ов

### [done] 2026-04-07 — Wave 3 / ui monolith split / client-project-control summary-shell
Цель: вынести из `ClientProjectControl` верхний summary/hero shell в отдельный child-компонент, сохранив orchestration и summary-computed в родителе.

Файлы:
- app/components/ClientProjectControlSummaryShell.vue
- app/components/ClientProjectControl.vue

Commit:
- pending (working tree on top of `ace2d98`)

Проверка:
- `get_errors` по `app/components/ClientProjectControl.vue` и `app/components/ClientProjectControlSummaryShell.vue` — no errors found
- `pnpm build` — ok

Долги:
- `ClientProjectControl.vue` теперь почти полностью сведён к orchestration и timeline-section shell, но в нем остается dead scoped CSS от уже вынесенных child-shell
- для summary shell оказался достаточен локальный typed prop-contract по реально используемым полям; пока не нужно раздувать shared слой отдельным summary view-type ради одного экрана

### [done] 2026-04-07 — Wave 3 / ui monolith split / client-project-control parent-css-cleanup
Цель: дочистить `ClientProjectControl.vue` до реального orchestration shell, убрать dead scoped CSS после serial child-shell extraction и зафиксировать clean recreate файла после неудачного большого patch.

Файлы:
- app/components/ClientProjectControl.vue

Commit:
- pending (working tree on top of `ace2d98`)

Проверка:
- `get_errors` по `app/components/ClientProjectControl.vue` — no errors found
- `pnpm build` — ok

Долги:
- в `ClientProjectControl.vue` теперь остается в основном orchestration и timeline section wrapper; следующий шаг уже спорный по ROI и требует смотреть не только на размер файла, но и на визуальную/ownership пользу
- при больших wholesale-rewrite patch для крупных SFC это tool-окружение может вставить style-content прямо в template; если структура уже повреждена, безопаснее не чинить её серией микропатчей, а пересобрать файл clean целиком

### [done] 2026-04-07 — Wave 3 / ui monolith split / client-project-control timeline-shell
Цель: вынести из `ClientProjectControl` последний timeline section wrapper в отдельный child-компонент и оставить в родителе только orchestration + root token ownership.

Файлы:
- app/components/ClientProjectControlTimelineShell.vue
- app/components/ClientProjectControl.vue

Commit:
- pending (working tree on top of `ace2d98`)

Проверка:
- `get_errors` по `app/components/ClientProjectControl.vue` и `app/components/ClientProjectControlTimelineShell.vue` — no errors found
- `pnpm build` — ok

Долги:
- `ClientProjectControl.vue` теперь фактически сведен к orchestration/composables wiring и root `--cpc-*` token layer; дальнейший split этого файла уже не нужен автоматически и должен оправдываться только отдельной visual или ownership-задачей
- следующий UI batch лучше выбирать уже не из остатка `ClientProjectControl.vue`, а из следующего реального monolith/shell с лучшим ROI

### [done] 2026-04-07 — Wave 3 / ui monolith split / admin-designer-cabinet services-state
Цель: вынести из `AdminDesignerCabinet.vue` services editor/catalog/autosave state-контур в отдельный composable, не трогая пока package/subscription flows и template shell.

Файлы:
- app/composables/useDesignerCabinetServices.ts
- app/components/AdminDesignerCabinet.vue

Commit:
- pending (working tree on top of `ace2d98`)

Проверка:
- `get_errors` по `app/components/AdminDesignerCabinet.vue` и `app/composables/useDesignerCabinetServices.ts` — no errors found
- `pnpm build` — ok

Долги:
- `AdminDesignerCabinet.vue` теперь заметно легче по services-state, но package/subscription editor flows и крупный template shell всё еще остаются в родителе
- следующий безопасный cabinet batch лучше брать либо как package/subscription state extraction в этом же файле, либо как зеркальный services/autosave slice в `AdminContractorCabinet.vue`, если там подтвердится похожий контракт

### [done] 2026-04-07 — Wave 3 / ui monolith split / admin-designer-cabinet package-state
Цель: вынести из `AdminDesignerCabinet.vue` package editor/autosave/reorder/remove state-контур в отдельный composable, не затрагивая пока subscription flow и presentation helper-ы.

Файлы:
- app/composables/useDesignerCabinetPackages.ts
- app/components/AdminDesignerCabinet.vue

Commit:
- pending (working tree on top of `ace2d98`)

Проверка:
- `get_errors` по `app/components/AdminDesignerCabinet.vue` и `app/composables/useDesignerCabinetPackages.ts` — no errors found
- `pnpm build` — ok

Долги:
- `AdminDesignerCabinet.vue` заметно разгружен по package-state, но subscription editor/autosave и крупный template shell всё еще остаются в родителе
- package presentation helpers (`allServiceOptions`, `packageCardDraftServices`, usage/display summary) пока осознанно оставлены в parent-shell, чтобы batch оставался bounded

### [done] 2026-04-07 — Wave 3 / ui monolith split / admin-designer-cabinet subscription-state
Цель: вынести из `AdminDesignerCabinet.vue` subscription editor/autosave/reorder/remove state-контур в отдельный composable, оставив display/helper слой и template shell в родителе.

Файлы:
- app/composables/useDesignerCabinetSubscriptions.ts
- app/components/AdminDesignerCabinet.vue

Commit:
- pending (working tree on top of `ace2d98`)

Проверка:
- `get_errors` по `app/components/AdminDesignerCabinet.vue` и `app/composables/useDesignerCabinetSubscriptions.ts` — no errors found
- `pnpm build` — ok

Долги:
- `AdminDesignerCabinet.vue` теперь уже хорошо разгружен по state-слою services/packages/subscriptions, но крупный template shell и display/helper блоки всё еще остаются в родителе
- следующий безопасный cabinet batch лучше выбирать либо как extraction presentation/helper slice в этом же файле, либо как зеркальный bounded split в `AdminContractorCabinet.vue`

### [done] 2026-04-07 — Wave 3 / ui monolith split / admin-designer-cabinet pricing-view
Цель: вынести из `AdminDesignerCabinet.vue` pricing display/helper слой в отдельный composable, сохранив state/computed orchestration в родителе и не трогая template/CSS shell.

Файлы:
- app/composables/useDesignerCabinetPricingView.ts
- app/components/AdminDesignerCabinet.vue

Commit:
- pending (working tree on top of `ace2d98`)

Проверка:
- `get_errors` по `app/components/AdminDesignerCabinet.vue` и `app/composables/useDesignerCabinetPricingView.ts` — no errors found
- `pnpm build` — ok

Долги:
- `AdminDesignerCabinet.vue` теперь разгружен и по state-, и по pricing helper-слою, но крупный template shell и project/dashboard orchestration всё еще остаются в родителе
- следующий safe cabinet batch лучше выбирать уже не как очередной helper extraction в этом же месте, а как bounded template/presentation slice или зеркальный split в `AdminContractorCabinet.vue`

### [done] 2026-04-07 — Wave 3 / ui monolith split / admin-designer-cabinet project-flow
Цель: вынести из `AdminDesignerCabinet.vue` project create/edit/autosave flow в отдельный composable, не трогая project template shell и wipe2/dashboard сборку.

Файлы:
- app/composables/useDesignerCabinetProjects.ts
- app/components/AdminDesignerCabinet.vue

Commit:
- pending (working tree on top of `ace2d98`)

Проверка:
- `get_errors` по `app/components/AdminDesignerCabinet.vue` и `app/composables/useDesignerCabinetProjects.ts` — no errors found
- `pnpm build` — ok

Долги:
- `AdminDesignerCabinet.vue` теперь разгружен ещё и по project create/edit/autosave state, но крупный template shell, wipe2 aggregation и dashboard/profile orchestration всё еще остаются в родителе
- следующий safe target лучше брать либо как bounded wipe2/dashboard presentation slice в этом же файле, либо как симметричный autosave/task slice в `AdminContractorCabinet.vue`

### [done] 2026-04-07 — Wave 3 / ui monolith split / admin-designer-cabinet profile-state
Цель: вынести из `AdminDesignerCabinet.vue` profile specialization/autosave state в отдельный composable, не трогая profile template shell и linked-entities/dashboard блоки.

Файлы:
- app/composables/useDesignerCabinetProfileState.ts
- app/components/AdminDesignerCabinet.vue

Commit:
- pending (working tree on top of `ace2d98`)

Проверка:
- `get_errors` по `app/components/AdminDesignerCabinet.vue` и `app/composables/useDesignerCabinetProfileState.ts` — no errors found
- `pnpm build` — ok

Долги:
- `AdminDesignerCabinet.vue` теперь разгружен и по profile autosave/specialization state, но linked-entities/dashboard view-model и wipe2 aggregation всё еще остаются в родителе
- следующий safe target лучше брать либо как bounded linked-entities/dashboard presentation slice в этом же файле, либо как симметричный autosave/task slice в `AdminContractorCabinet.vue`

### [done] 2026-04-07 — Wave 3 / ui monolith split / admin-designer-cabinet documents-state
Цель: вынести из `AdminDesignerCabinet.vue` documents fetch/filter/upload/delete и display helper-ы в отдельный composable, не трогая documents template shell и wipe2 consumption.

Файлы:
- app/composables/useDesignerCabinetDocuments.ts
- app/components/AdminDesignerCabinet.vue

Commit:
- pending (working tree on top of `ace2d98`)

Проверка:
- `get_errors` по `app/components/AdminDesignerCabinet.vue` и `app/composables/useDesignerCabinetDocuments.ts` — no errors found
- `pnpm build` — ok

Долги:
- `AdminDesignerCabinet.vue` теперь разгружен и по documents-state/view helper-слою, но linked-entities/dashboard view-model и wipe2 aggregation всё еще остаются в родителе
- следующий safe target лучше брать либо как bounded linked-entities/dashboard presentation slice в этом же файле, либо как симметричный autosave/task slice в `AdminContractorCabinet.vue`

### [done] 2026-04-08 — Wave 3 / ui monolith split / admin-designer-cabinet relations-dashboard
Цель: вынести из `AdminDesignerCabinet.vue` linked-entities fetch/pivot navigation/dashboard facts в отдельный composable, не трогая template shell и wipe2 aggregation.

Файлы:
- app/composables/useDesignerCabinetRelationsView.ts
- app/components/AdminDesignerCabinet.vue

Commit:
- pending (working tree on top of `ace2d98`)

Проверка:
- `get_errors` по `app/components/AdminDesignerCabinet.vue` и `app/composables/useDesignerCabinetRelationsView.ts` — no errors found
- `pnpm build` — ok

Долги:
- `AdminDesignerCabinet.vue` теперь разгружен и по linked-entities/dashboard view-model, но крупная wipe2 aggregation и оставшийся orchestration shell всё еще остаются в родителе
- следующий safe target лучше брать либо как bounded wipe2 aggregation slice в этом же файле, либо как симметричный autosave/task slice в `AdminContractorCabinet.vue`

### [done] 2026-04-08 — Wave 3 / ui monolith split / admin-designer-cabinet wipe2-view
Цель: вынести из `AdminDesignerCabinet.vue` wipe2 aggregation/projection в отдельный composable, оставив в parent только dependency wiring и `registerWipe2Data`.

Файлы:
- app/composables/useDesignerCabinetWipe2View.ts
- app/components/AdminDesignerCabinet.vue

Commit:
- pending (working tree on top of `ace2d98`)

Проверка:
- `get_errors` по `app/components/AdminDesignerCabinet.vue` и `app/composables/useDesignerCabinetWipe2View.ts` — no errors found
- `pnpm build` — ok

Долги:
- `AdminDesignerCabinet.vue` после этого batch практически перестал быть high-ROI script-monolith; в parent остался в основном orchestration shell
- следующий safe target логично переносить уже в `AdminContractorCabinet.vue`, начиная с autosave/task slice

### [done] 2026-04-08 — Wave 3 / ui monolith split / admin-contractor-cabinet wipe2-view
Цель: вынести из `AdminContractorCabinet.vue` contractor wipe2 projection в отдельный composable, не трогая task UI, documents UI и profile autosave flow.

Файлы:
- app/composables/useContractorCabinetWipe2View.ts
- app/components/AdminContractorCabinet.vue

Commit:
- pending (working tree on top of `ace2d98`)

Проверка:
- `get_errors` по `app/components/AdminContractorCabinet.vue` и `app/composables/useContractorCabinetWipe2View.ts` — no errors found
- `pnpm build` — ok

Долги:
- в `AdminContractorCabinet.vue` после этого batch всё еще оставались profile autosave cluster и documents view/filter helpers
- следующий safe slice в этом же файле: contractor profile autosave state

### [done] 2026-04-08 — Wave 3 / ui monolith split / admin-contractor-cabinet profile-state
Цель: вынести из `AdminContractorCabinet.vue` contractor profile autosave/toggle/certification helpers в отдельный composable, сохранив текущий template flow и source `saveProfile` в базовом cabinet composable.

Файлы:
- app/composables/useContractorCabinetProfileState.ts
- app/components/AdminContractorCabinet.vue

Commit:
- pending (working tree on top of `ace2d98`)

Проверка:
- `get_errors` по `app/components/AdminContractorCabinet.vue` и `app/composables/useContractorCabinetProfileState.ts` — no errors found
- `pnpm build` — ok

Долги:
- `AdminContractorCabinet.vue` после этого batch уже не держит profile autosave timer/state локально, но documents view/filter helpers всё еще были в parent
- следующий safe slice в этом же файле: contractor documents view/filter helpers

### [done] 2026-04-08 — Wave 3 / ui monolith split / admin-contractor-cabinet documents-view
Цель: вынести из `AdminContractorCabinet.vue` documents search/filter/sort и format helper-ы в отдельный composable, оставив upload/delete и template shell без изменения.

Файлы:
- app/composables/useContractorCabinetDocumentsView.ts
- app/components/AdminContractorCabinet.vue

Commit:
- pending (working tree on top of `ace2d98`)

Проверка:
- `get_errors` по `app/components/AdminContractorCabinet.vue`, `app/composables/useContractorCabinetDocumentsView.ts`, `app/composables/useContractorCabinetWipe2View.ts`, `app/composables/useContractorCabinetProfileState.ts` — no errors found
- `pnpm build` — ok

Долги:
- `AdminContractorCabinet.vue` после трёх contractor batch-ей заметно разгружен; в parent в основном остались dashboard hero/view helpers, section sync/ribbon scroll orchestration и task-specific shell
- следующий safe target уже лучше брать либо как contractor dashboard hero/view-model slice, либо как task-shell slice без смешивания с autosave/documents логикой

### [done] 2026-04-08 — Wave 3 / ui monolith split / admin-contractor-cabinet dashboard-view
Цель: вынести из `AdminContractorCabinet.vue` contractor dashboard hero subtitle/facts и brutalist hero flag в отдельный composable, не трогая task flow и shell navigation.

Файлы:
- app/composables/useContractorCabinetDashboardView.ts
- app/components/AdminContractorCabinet.vue

Commit:
- pending (working tree on top of `ace2d98`)

Проверка:
- `get_errors` по `app/components/AdminContractorCabinet.vue` и `app/composables/useContractorCabinetDashboardView.ts` — no errors found
- `pnpm build` — ok

Долги:
- после этого batch в `AdminContractorCabinet.vue` в основном оставался shell-level ribbon/wipe2 navigation cluster и task-specific shell
- следующий safe slice: shared ribbon-nav shell contract для cabinet-компонентов

### [done] 2026-04-08 — Wave 3 / ui monolith split / shared-cabinet ribbon-nav
Цель: вынести повторяющийся wipe2/showAll/section-scroll ribbon shell из cabinet-компонентов в общий composable и подключить его минимум в активных cabinet-экранах wave.

Файлы:
- app/composables/useCabinetSectionRibbonNav.ts
- app/components/AdminContractorCabinet.vue
- app/components/AdminDesignerCabinet.vue
- app/components/AdminManagerCabinet.vue
- app/components/AdminSellerCabinet.vue

Commit:
- pending (working tree on top of `ace2d98`)

Проверка:
- `get_errors` по `app/components/AdminContractorCabinet.vue`, `app/components/AdminDesignerCabinet.vue`, `app/components/AdminManagerCabinet.vue`, `app/components/AdminSellerCabinet.vue`, `app/composables/useCabinetSectionRibbonNav.ts`, `app/composables/useContractorCabinetDashboardView.ts` — no errors found
- `pnpm build` — ok

Долги:
- contractor parent после этого уже близок к чистому orchestration shell; заметный remaining ROI теперь в task-specific cluster
- shared ribbon-nav contract теперь вынесен, но дальнейший rollout на другие cabinet-похожие экраны стоит делать только при очередном локальном refactor batch, без широкого механического прохода

### [done] 2026-04-08 — Wave 3 / ui monolith split / admin-contractor-cabinet task-shell
Цель: вынести из `AdminContractorCabinet.vue` самый тяжёлый task-specific template cluster в отдельный section component, не меняя источник task state и действий в `useContractorCabinet`.

Файлы:
- app/components/AdminContractorTasksSection.vue
- app/components/AdminContractorCabinet.vue

Commit:
- pending (working tree on top of `ace2d98`)

Проверка:
- `get_errors` по `app/components/AdminContractorCabinet.vue` и `app/components/AdminContractorTasksSection.vue` — no errors found
- `pnpm build` — ok

Долги:
- `AdminContractorCabinet.vue` после этого batch уже почти сведён к shell/orchestration роли; дальнейший ROI там заметно ниже, чем до task extraction
- следующий safe target теперь разумнее выбирать уже среди соседних cabinet-monolith файлов, а не продолжать механически выжимать contractor parent

### [done] 2026-04-08 — Wave 3 / ui monolith split / admin-manager-cabinet wipe2-view
Цель: вынести из `AdminManagerCabinet.vue` manager wipe2 projection в отдельный composable, не трогая profile autosave и project navigation flow.

Файлы:
- app/composables/useManagerCabinetWipe2View.ts
- app/components/AdminManagerCabinet.vue

Commit:
- pending (working tree on top of `ace2d98`)

Проверка:
- `get_errors` по `app/components/AdminManagerCabinet.vue` и `app/composables/useManagerCabinetWipe2View.ts` — no errors found
- `pnpm build` — ok

Долги:
- в `AdminManagerCabinet.vue` после этого batch всё еще остаётся profile autosave cluster и часть dashboard/profile shell logic
- следующий safe slice логично брать либо как manager profile-state extraction, либо как seller wipe2-view extraction по тому же подтвержденному паттерну

### [done] 2026-04-08 — Wave 3 / ui monolith split / admin-manager-cabinet profile-state
Цель: вынести из `AdminManagerCabinet.vue` profile autosave timer/state в отдельный composable, сохранив `saveProfile` и форму в parent.

Файлы:
- app/composables/useManagerCabinetProfileState.ts
- app/components/AdminManagerCabinet.vue

Commit:
- pending (working tree on top of `ace2d98`)

Проверка:
- `get_errors` по `app/components/AdminManagerCabinet.vue`, `app/composables/useManagerCabinetProfileState.ts`, `app/composables/useManagerCabinetWipe2View.ts` — no errors found
- `pnpm build` — ok

Долги:
- `AdminManagerCabinet.vue` после этого batch уже заметно ближе к shell/orchestration роли; следующий ROI теперь сопоставим с seller cabinet
- следующий safe target лучше брать как seller wipe2-view или seller profile-state по тем же подтвержденным паттернам

### [done] 2026-04-08 — Wave 3 / ui monolith split / admin-seller-cabinet wipe2-view
Цель: вынести из `AdminSellerCabinet.vue` seller wipe2 projection в отдельный composable, не трогая profile autosave и dashboard shell.

Файлы:
- app/composables/useSellerCabinetWipe2View.ts
- app/components/AdminSellerCabinet.vue

Commit:
- pending (working tree on top of `ace2d98`)

Проверка:
- `get_errors` по `app/components/AdminSellerCabinet.vue` и `app/composables/useSellerCabinetWipe2View.ts` — no errors found

Долги:
- после этого batch в `AdminSellerCabinet.vue` всё еще оставался profile autosave/toggleCategory cluster
- следующий safe slice в этом же файле: seller profile-state

### [done] 2026-04-08 — Wave 3 / ui monolith split / admin-seller-cabinet profile-state
Цель: вынести из `AdminSellerCabinet.vue` profile autosave timer/state и category toggle helper в отдельный composable, сохранив форму и `saveProfile` в parent.

Файлы:
- app/composables/useSellerCabinetProfileState.ts
- app/components/AdminSellerCabinet.vue

Commit:
- pending (working tree on top of `ace2d98`)

Проверка:
- `get_errors` по `app/components/AdminSellerCabinet.vue`, `app/composables/useSellerCabinetWipe2View.ts`, `app/composables/useSellerCabinetProfileState.ts` — no errors found
- `pnpm build` — ok

Долги:
- `AdminSellerCabinet.vue` после этой mini-wave заметно ближе к shell/orchestration роли; immediate ROI там теперь ощутимо ниже
- следующий safe target разумнее искать уже за пределами seller/manager/contractor trio, если не требуется адресно добивать их template-level section split

### [done] 2026-04-08 — Wave 3 / ui monolith split / project-communications directory-view
Цель: вынести из `ProjectCommunicationsPanel.vue` directory/nickname derived layer в отдельный composable, не заходя в call runtime, signal flow и room-key orchestration.

Файлы:
- app/composables/useProjectCommunicationsDirectoryView.ts
- app/components/ProjectCommunicationsPanel.vue

Commit:
- pending (working tree on top of `ace2d98`)

Проверка:
- `get_errors` по `app/components/ProjectCommunicationsPanel.vue` и `app/composables/useProjectCommunicationsDirectoryView.ts` — no errors found
- `pnpm build` — ok

Долги:
- `ProjectCommunicationsPanel.vue` после этого batch всё ещё остаётся крупным monolith с плотным call/runtime и message-sync слоем
- следующий safe slice внутри этого файла лучше брать либо как call-quality/security/runtime helpers, либо как identity/room-key/message-sync extraction; только после этого ROI начнет соперничать с `AdminDocumentEditor.vue`

### [done] 2026-04-08 — Wave 3 / ui monolith split / project-communications call-runtime
Цель: вынести из `ProjectCommunicationsPanel.vue` call-controls, media-permission и connection-quality runtime в отдельный composable, не заходя в signaling flow, invite/offer/answer orchestration и room-key message sync.

Файлы:
- app/composables/useProjectCommunicationsCallRuntime.ts
- app/components/ProjectCommunicationsPanel.vue

Commit:
- pending (working tree on top of `ace2d98`)

Проверка:
- `get_errors` по `app/components/ProjectCommunicationsPanel.vue` и `app/composables/useProjectCommunicationsCallRuntime.ts` — no errors found
- `pnpm build` — ok

Долги:
- `ProjectCommunicationsPanel.vue` после этого batch всё ещё держит крупный identity/room-key/message-sync слой и signaling flow
- следующий safe slice внутри этого файла теперь логичнее брать как identity/room-key/message-sync extraction; после него можно переоценивать переключение на `AdminDocumentEditor.vue`

### [done] 2026-04-08 — Wave 3 / ui monolith split / project-communications message-sync
Цель: вынести из `ProjectCommunicationsPanel.vue` identity keys, room-key storage, key-bundle sync и rebuild decrypted messages в отдельный composable, не заходя в signaling flow и peer-connection orchestration.

Файлы:
- app/composables/useProjectCommunicationsMessageSync.ts
- app/components/ProjectCommunicationsPanel.vue

Commit:
- pending (working tree on top of `ace2d98`)

Проверка:
- `get_errors` по `app/components/ProjectCommunicationsPanel.vue`, `app/composables/useProjectCommunicationsMessageSync.ts`, `app/composables/useProjectCommunicationsCallRuntime.ts` — no errors found
- `pnpm build` — ok

Долги:
- `ProjectCommunicationsPanel.vue` всё ещё остаётся большим файлом, но после трёх подряд extraction batch-ов его logic-density уже заметно просела
- следующий высокий ROI target разумнее переключать на `AdminDocumentEditor.vue`; в `ProjectCommunicationsPanel.vue` дальше имеет смысл возвращаться только за одним очень чистым signaling/event-source slice

### [done] 2026-04-08 — Wave 3 / ui monolith split / admin-document-editor data-fill
Цель: вынести из `AdminDocumentEditor.vue` source-selection, context loading, executor defaults, autofill и derived fields в отдельный composable, не заходя в AI/chat, export/print и autosave orchestration.

Файлы:
- app/composables/useAdminDocumentEditorDataFill.ts
- app/components/AdminDocumentEditor.vue

Commit:
- pending (working tree on top of `ace2d98`)

Проверка:
- `get_errors` по `app/components/AdminDocumentEditor.vue` и `app/composables/useAdminDocumentEditorDataFill.ts` — no errors found
- `pnpm build` — ok

Долги:
- `AdminDocumentEditor.vue` после этого batch всё ещё держит крупные export/print, diff-review и AI/chat/action blocks
- следующий safe slice в этом файле логичнее брать либо как export/diff utilities, либо как chat/AI view-state extraction, в зависимости от обновлённой плотности кода после batch

### [done] 2026-04-08 — Wave 3 / ui monolith split / admin-document-editor output
Цель: вынести из `AdminDocumentEditor.vue` diff-review state, markdown cleanup и export/output helpers в отдельный composable, не заходя в AI transport, prompt payload и document persistence.

Файлы:
- app/composables/useAdminDocumentEditorOutput.ts
- app/components/AdminDocumentEditor.vue

Commit:
- pending (working tree on top of `ace2d98`)

Проверка:
- `get_errors` по `app/components/AdminDocumentEditor.vue` и `app/composables/useAdminDocumentEditorOutput.ts` — no errors found
- `pnpm build` — ok

Долги:
- `AdminDocumentEditor.vue` после этого batch просел примерно до 1983 строк и 37 logic markers, но всё ещё держит крупный chat/AI/action block
- следующий safe slice в этом файле теперь логичнее брать как chat-state / patch-helper extraction, оставляя AI transport и persistence orchestration в parent

### [done] 2026-04-08 — Wave 3 / ui monolith split / admin-document-editor chat-state
Цель: вынести из `AdminDocumentEditor.vue` chat-state, prompt chips и patch/instant-edit helpers в отдельный composable, не заходя в AI transport, payload assembly и save/autosave flow.

Файлы:
- app/composables/useAdminDocumentEditorChatState.ts
- app/components/AdminDocumentEditor.vue

Commit:
- pending (working tree on top of `ace2d98`)

Проверка:
- `get_errors` по `app/components/AdminDocumentEditor.vue` и `app/composables/useAdminDocumentEditorChatState.ts` — no errors found
- `pnpm build` — ok

Долги:
- `AdminDocumentEditor.vue` после этого batch просел примерно до 1795 строк и 23 logic markers; основной remaining block теперь сосредоточен в AI action transport и save/autosave persistence
- следующий safe target теперь нужно выбирать между AI action/payload slice внутри `AdminDocumentEditor.vue` и возвратом к отдельному signaling/event-source slice в `ProjectCommunicationsPanel.vue`

### [done] 2026-04-08 — Wave 3 / ui monolith split / project-communications realtime
Цель: вынести из `ProjectCommunicationsPanel.vue` event-source wiring, signaling flow, WebRTC peer-connection и call-security runtime в отдельный composable, не заходя в directory/open-chat orchestration и encrypted message send/open flows.

Файлы:
- app/composables/useProjectCommunicationsRealtime.ts
- app/composables/useProjectCommunicationsMessageSync.ts
- app/components/ProjectCommunicationsPanel.vue

Commit:
- pending (working tree on top of `ace2d98`)

Проверка:
- `get_errors` по `app/components/ProjectCommunicationsPanel.vue`, `app/composables/useProjectCommunicationsRealtime.ts`, `app/composables/useProjectCommunicationsMessageSync.ts` — no errors found
- `pnpm build` — ok

Долги:
- `ProjectCommunicationsPanel.vue` после этого batch просел примерно до 1656 строк и 24 logic markers; главный remaining block теперь сосредоточен в open-chat/send-message orchestration и project-call-insight admin helpers
- этот batch заодно убрал latent coupling: `rebuildDecryptedMessages` теперь явно экспортируется из `useProjectCommunicationsMessageSync`, а не используется как скрытая внешняя зависимость

### [done] 2026-04-08 — Wave 3 / ui monolith split / admin-document-editor ai-runtime
Цель: вынести из `AdminDocumentEditor.vue` AI model state, payload assembly и AI action runtime в отдельный composable, не заходя в save/autosave persistence и step/editor shell orchestration.

Файлы:
- app/composables/useAdminDocumentEditorAiRuntime.ts
- app/components/AdminDocumentEditor.vue

Commit:
- pending (working tree on top of `ace2d98`)

Проверка:
- `get_errors` по `app/components/AdminDocumentEditor.vue` и `app/composables/useAdminDocumentEditorAiRuntime.ts` — no errors found
- `pnpm build` — ok

Долги:
- `AdminDocumentEditor.vue` после этого batch просел примерно до 1590 строк и 12 logic markers; главный remaining block теперь сосредоточен в save/autosave persistence, existing-doc bootstrap и небольшом editor shell glue
- в процессе extraction всплыл parser-only остаток старого payload fragment; diagnostics его не ловили, но полный `pnpm build` поймал и после точечного фикса batch стал зелёным

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

### [next] Wave 3 / ui monolith split
Цель: продолжить реальную декомпозицию control/UI-монолитов после первого завершенного client-side batch, не откатываясь в import-only проходы.

Приоритет:
1. следующий высокий ROI target теперь разумнее вернуть в `app/components/ProjectCommunicationsPanel.vue`: open-chat/send-message orchestration и смежный admin call-insight glue
2. в `app/components/AdminDocumentEditor.vue` дальше заходить уже точечно только за save/autosave persistence slice, если после communications wave он останется выгоднее других монолитов
3. после каждого UI batch сохранять тот же ритуал валидации: file diagnostics + полный `pnpm build`
4. backend batch-ы продолжать только точечно и только если они не ломают текущий UI-focused темп

## Отдельный технический долг

### [risk] Mixed commit cleanup
Commit `48e10f0` нужно позднее либо:
- логически задокументировать как смешанный этап;
- либо вычистить через отдельную git-операцию в refactor fork.

Пока это не блокирует развитие v5, но ухудшает читаемость истории рефакторинга.
