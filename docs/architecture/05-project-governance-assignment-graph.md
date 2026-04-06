# 05. Project Governance Assignment Graph

## Зачем нужен новый слой

Сейчас проектный контур уже умеет показывать фазы, спринты, задачи и связанных участников, но делает это из нескольких разных источников без единой модели ответственности:

- `shared/types/project.ts` хранит `hybridControl.team`, `phase.owner` и `task.assignee`, но это плоские и в основном одиночные поля.
- `server/utils/project-relations.ts` собирает клиентов, подрядчиков, дизайнеров, менеджеров и поставщиков на уровне проекта, но не знает, кто ведёт конкретную фазу, задачу или спринт.
- `server/api/projects/[slug]/communications/action-catalog.get.ts` превращает эти данные в `subjects`, `objects`, `phases`, `sprints` и `tasks`, но каталог остаётся read-only снимком без модели назначений.
- `app/components/ClientProjectControl.vue` уже открывает detail-panel по клику на фазу/спринт, но наполняет блоки `Субъекты` и `Действия` вычислениями поверх `owner`/`assignee`, а не через канонический контур ответственности.

Из-за этого сейчас нельзя надёжно решить задачу пользователя:

1. Открыть фазу по клику и увидеть её настройки.
2. Показать, какие роли подключены к фазе или задаче: менеджер, дизайнер, юрист, подрядчик и т.д.
3. Назначать нескольких участников одновременно на проект, фазу, спринт, задачу, документ или услугу.
4. Отобразить одинаковую картину и в основной платформе, и в messenger без второго параллельного state-layer.

## Цели

Новая архитектура должна:

1. Дать единый source of truth для участников проекта и их назначений.
2. Поддержать несколько участников на одном scope.
3. Работать и для project-level, и для phase/sprint/task-level контуров.
4. Поддержать существующие сущности из БД и новые произвольные роли, которых пока нет в таблицах, например юриста.
5. Сохранить совместимость с текущим `hybridControl`, messenger action-catalog и уже существующим UI detail-panel.

## Принцип разделения источников истины

Новый контур не должен пытаться засунуть всё в один JSON.

Каноническое разделение такое:

1. `projects.profile.hybridControl` остаётся источником истины для структуры project control.
   Здесь живут фазы, спринты, задачи, гейты, контрольные точки, playbook и manager agents.
2. Новый relational layer становится источником истины для людей и назначений.
   Здесь живут участники проекта, их роли, их привязки к scope и scope-level настройки.
3. Messenger и main app читают один и тот же собранный read model с сервера основной платформы.
   Messenger не хранит отдельную «правду» о проекте локально.

Это важно по двум причинам:

- `hybridControl` хорошо подходит для графика, фаз и состояния исполнения.
- many-to-many назначения плохо живут внутри JSON и быстро ломают читаемость, миграции и выборки вида «покажи все задачи юриста по проекту».

## Канонические сущности

### 1. Participant directory

Нужен единый реестр участников проекта.

```ts
type ProjectParticipantSourceKind =
  | 'client'
  | 'contractor'
  | 'designer'
  | 'seller'
  | 'manager'
  | 'custom'

type ProjectParticipantRoleKey =
  | 'client'
  | 'manager'
  | 'designer'
  | 'lawyer'
  | 'contractor'
  | 'seller'
  | 'engineer'
  | 'consultant'
  | 'service'
  | 'other'

type ProjectParticipant = {
  id: string
  projectId: number
  sourceKind: ProjectParticipantSourceKind
  sourceId?: number
  roleKey: ProjectParticipantRoleKey
  displayName: string
  companyName?: string
  phone?: string
  email?: string
  messengerNick?: string
  isPrimary: boolean
  status: 'active' | 'archived'
  notes?: string
  meta?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}
```

Правило:

1. Если участник уже существует в доменной таблице (`managers`, `contractors`, `designers`, `sellers`, клиент из profile/clients), то `sourceKind + sourceId` ссылаются на него.
2. Если участника нет в отдельных доменах, создаётся `custom` participant.
3. `custom` закрывает юриста, технического консультанта, внешнего комплектатора, инженера и любые другие роли, которых сейчас нет в текущей БД.

Это лучше, чем заводить отдельную таблицу `lawyers` прямо сейчас, потому что в текущем репозитории нет отдельного legal-domain для исполнителей проекта. Есть legal RAG и документы, но нет сущности «юрист проекта» как первого класса.

### 2. Scope reference

Назначение должно быть не только на проект, но и на конкретный объект.

```ts
type ProjectScopeType =
  | 'project'
  | 'phase'
  | 'sprint'
  | 'task'
  | 'document'
  | 'service'

type ProjectScopeSource =
  | 'project'
  | 'hybrid-control'
  | 'work-status'
  | 'documents'
  | 'extra-services'

type ProjectScopeRef = {
  scopeType: ProjectScopeType
  scopeSource: ProjectScopeSource
  scopeId: string
}
```

Правило идентификации:

1. Для проекта используем `scopeType='project'`, `scopeSource='project'`, `scopeId=project.slug`.
2. Для фаз и спринтов используем `id` из `hybridControl`.
3. Для задач используем единый `scopeType='task'`, а различие между task из `hybridControl` и `work_status_items` задаём через `scopeSource`.
4. Для документов и услуг используем их DB id в строковом виде.

Такой подход позволяет строить одну таблицу назначений без жёстких FK на каждый тип scope.

### 3. Assignment edge

Нужна отдельная сущность связи «участник отвечает за scope в определённой роли».

```ts
type ProjectResponsibilityKey =
  | 'lead'
  | 'owner'
  | 'executor'
  | 'reviewer'
  | 'approver'
  | 'observer'
  | 'consultant'

type ProjectScopeAssignment = {
  id: string
  projectId: number
  participantId: string
  scopeType: ProjectScopeType
  scopeSource: ProjectScopeSource
  scopeId: string
  responsibility: ProjectResponsibilityKey
  allocationPercent?: number
  status: 'active' | 'pending' | 'done' | 'removed'
  dueDate?: string
  notes?: string
  meta?: Record<string, unknown>
  assignedBy?: string
  assignedAt: string
  updatedAt: string
}
```

Ключевая идея:

1. Один и тот же менеджер может быть `lead` у проекта, `owner` у одной фазы и `reviewer` у конкретной задачи.
2. У одной фазы может быть несколько участников одновременно: `owner`, `executor`, `approver`, `consultant`.
3. Для задачи можно назначить больше одного исполнителя без потери структуры.

### 4. Scope settings

Клик по фазе должен открывать не только summary, но и настраиваемый scope-level слой.

```ts
type ProjectScopeSettings = {
  id: string
  projectId: number
  scopeType: ProjectScopeType
  scopeSource: ProjectScopeSource
  scopeId: string
  settings: Record<string, unknown>
  updatedAt: string
}
```

Примеры, что хранится в `settings`:

- для `phase`: канал коммуникации по умолчанию, режим согласования, required responsibilities, visibility в messenger, escalation policy;
- для `sprint`: cadence review, definition of done, handoff policy;
- для `task`: acceptance mode, required approvers, reminder cadence;
- для `document`: approval flow, required reviewers;
- для `service`: ответственный менеджер, SLA, обязательные участники.

Что важно:

1. Даты, проценты, deliverable и status фазы остаются в `hybridControl`.
2. Управленческие настройки scope и связи с участниками живут отдельно.
3. Detail-panel на фронте получает агрегированный bundle и не должен знать, где физически лежит каждая часть данных.

## Предлагаемые таблицы БД

### `project_participants`

Поля:

- `id`
- `project_id`
- `source_kind`
- `source_id`
- `role_key`
- `display_name`
- `company_name`
- `phone`
- `email`
- `messenger_nick`
- `is_primary`
- `status`
- `notes`
- `meta jsonb`
- `created_at`
- `updated_at`

Ограничения:

- `unique(project_id, source_kind, source_id)` для записей, у которых `source_id` заполнен;
- индекс по `project_id, role_key, status`.

### `project_scope_assignments`

Поля:

- `id`
- `project_id`
- `participant_id`
- `scope_type`
- `scope_source`
- `scope_id`
- `responsibility`
- `allocation_percent`
- `status`
- `due_date`
- `notes`
- `meta jsonb`
- `assigned_by`
- `assigned_at`
- `updated_at`

Ограничения:

- `unique(project_id, participant_id, scope_type, scope_source, scope_id, responsibility)`;
- индексы по `project_id, scope_type, scope_source, scope_id` и `participant_id, status`.

### `project_scope_settings`

Поля:

- `id`
- `project_id`
- `scope_type`
- `scope_source`
- `scope_id`
- `settings jsonb`
- `created_at`
- `updated_at`

Ограничения:

- `unique(project_id, scope_type, scope_source, scope_id)`.

## Shared contracts

Для реализации нужен отдельный shared contract слой, а не messenger-local интерфейсы.

Рекомендуемая структура:

1. `shared/types/project-governance.ts`
2. `shared/utils/project-governance.ts`

Минимальный набор экспортов:

```ts
export type ProjectParticipant
export type ProjectScopeRef
export type ProjectScopeAssignment
export type ProjectScopeSettings

export type ProjectGovernanceSummary
export type ProjectScopeDetailBundle
export type ProjectParticipantWorkloadBundle
```

### ProjectGovernanceSummary

Компактный read model для timeline rail, chip counters и messenger action-catalog.

```ts
type ProjectGovernanceSummary = {
  revision: string
  participants: Array<{
    id: string
    roleKey: string
    displayName: string
    assignmentCount: number
    activeTaskCount: number
  }>
  scopeCounters: Record<string, number>
}
```

### ProjectScopeDetailBundle

Основной payload для клика по фазе/спринту/задаче.

```ts
type ProjectScopeDetailBundle = {
  revision: string
  scope: ProjectScopeRef & {
    title: string
    subtitle?: string
    status?: string
  }
  core: Record<string, unknown>
  settings: Record<string, unknown>
  participants: Array<{
    assignmentId: string
    participantId: string
    displayName: string
    roleKey: string
    responsibility: string
    activeTaskCount: number
    secondary?: string
  }>
  linkedScopes: Array<{
    scopeType: string
    scopeId: string
    title: string
    status?: string
  }>
  tasks: Array<{
    id: string
    title: string
    status: string
    assigneeLabels: string[]
  }>
  rules: Array<{
    id: string
    title: string
    channelLabel: string
    trigger: string
  }>
}
```

### ProjectParticipantWorkloadBundle

Нужен для сценария «покажи менеджера, его задачи, его фазы, что он ведёт сейчас».

```ts
type ProjectParticipantWorkloadBundle = {
  revision: string
  participant: ProjectParticipant
  projectAssignments: ProjectScopeAssignment[]
  scopedAssignments: ProjectScopeAssignment[]
  activeTasks: Array<{
    id: string
    title: string
    scopeSource: string
    status: string
    phaseTitle?: string
    sprintTitle?: string
  }>
  blockerCount: number
}
```

## Как это собирается на сервере

Нужен новый композиционный слой на сервере, например `server/utils/project-governance.ts`.

Он делает четыре вещи:

1. Читает базовый project control из `ensureHybridControl(...)`.
2. Читает текущие связи проекта из `getProjectRelationsSnapshot(...)`.
3. Читает `project_participants`, `project_scope_assignments`, `project_scope_settings`.
4. Собирает из этого read model для main app и messenger.

Ключевое правило: action-catalog и detail endpoint должны использовать один и тот же composer, а не собирать похожие payload отдельно.

## API слой

### 1. Summary API

Текущий endpoint `server/api/projects/[slug]/communications/action-catalog.get.ts` остаётся, но начинает получать `subjects` не из ad hoc набора relation rows, а из нового participant directory.

Дополнение к payload:

- `project.revision`
- `governance` summary block
- для `phases` и `sprints` можно добавить `participantCount`, `ownerLabels`, `settingsBadgeCount`

### 2. Scope detail API

Новый endpoint:

`GET /api/projects/[slug]/coordination/scopes/[scopeType]/[scopeId]`

Назначение:

1. Открытие detail-panel по клику на фазу.
2. Открытие detail-panel по клику на спринт.
3. Открытие scope-level pane в messenger.

Ответ: `ProjectScopeDetailBundle`.

### 3. Participant workload API

Новый endpoint:

`GET /api/projects/[slug]/coordination/participants/[participantId]`

Назначение:

1. Открыть карточку менеджера/дизайнера/юриста/подрядчика.
2. Показать все его назначения и активные задачи.

Ответ: `ProjectParticipantWorkloadBundle`.

### 4. Mutation API

Новый набор endpoints:

1. `POST /api/projects/[slug]/coordination/participants`
2. `PATCH /api/projects/[slug]/coordination/participants/[participantId]`
3. `POST /api/projects/[slug]/coordination/assignments`
4. `PATCH /api/projects/[slug]/coordination/assignments/[assignmentId]`
5. `DELETE /api/projects/[slug]/coordination/assignments/[assignmentId]`
6. `PATCH /api/projects/[slug]/coordination/scopes/[scopeType]/[scopeId]/settings`

Все mutation endpoints должны:

1. Валидировать payload через Zod.
2. Обновлять `projects.updatedAt` как project-level revision marker.
3. При необходимости зеркалить краткий legacy snapshot обратно в `phase.owner` и `task.assignee`.

## UI архитектура

### Main app

Текущий `ClientProjectControl.vue` уже умеет открывать detail-panel по `openTimelineRowDetails(...)`. Его не нужно переписывать концептуально.

Нужно изменить источник данных:

1. Вместо вычисления `timelineDetailSubjects`, `timelineDetailObjects` и `timelineDetailActions` из `phase.owner`, `task.assignee` и playbook в лоб компонент должен получать `ProjectScopeDetailBundle`.
2. `ClientProjectControl.vue` использует read-only subset.
3. `AdminProjectControl.vue` использует тот же bundle, но с editing controls поверх `settings` и assignments.

### Messenger

Текущее sequential menu уже подходит для следующего шага.

Нужно добавить:

1. Клик по фазе в `MessengerProjectMiniTimeline.vue` эмитит `scopeType='phase'` и `scopeId=phase.id`.
2. `MessengerProjectActionsPanel.vue` открывает отдельный pane `phase-detail`.
3. Pane загружает `ProjectScopeDetailBundle` через платформенный API.
4. Из detail-pane можно открыть участника и его workload bundle.

При этом messenger по-прежнему не хранит бизнес-логику локально. Он только читает bundle и отправляет mutations в main app.

## Совместимость с текущей моделью

Чтобы не ломать существующий UI и не требовать одномоментной миграции, вводится двуступенчатая схема.

### Legacy read fallback

Если новых таблиц для проекта ещё нет:

1. `project_participants` строятся временно из `getProjectRelationsSnapshot(...)` плюс `hybridControl.team`.
2. `phase.owner` превращается в временный assignment `responsibility='owner'` на scope `phase`.
3. `task.assignee` превращается во временный assignment `responsibility='executor'` на scope `task`.

### Legacy write mirror

Пока старые экраны ещё читают legacy поля:

1. первый `owner` фазы зеркалится в `phase.owner`;
2. первый `executor` задачи зеркалится в `task.assignee`.

Таким образом старая отрисовка не ломается, а новая модель уже становится источником истины.

## Как решается сценарий с юристом

В текущей схеме БД нет отдельной таблицы юристов. Поэтому вводить ещё одну узкую доменную таблицу на этом этапе невыгодно.

Решение:

1. юрист заводится как `project_participants.sourceKind='custom'`;
2. `roleKey='lawyer'`;
3. далее он может быть назначен `approver`, `reviewer` или `consultant` на проект, фазу, задачу, документ или услугу.

Если позже появится полноценный legal cabinet, источник можно заменить на `sourceKind='lawyer'`, не меняя assignment model.

## Синхронизация main app и messenger

Синхронизация должна идти не через копирование структуры в messenger, а через единый platform read model.

Правила:

1. Main app хранит и изменяет данные.
2. Messenger читает только API основной платформы.
3. После любого mutation main app обновляет `projects.updatedAt`.
4. `action-catalog` и `scope detail` возвращают `revision`.
5. `useMessengerProjectActions.ts` после mutation делает forced refresh каталога и открытого detail bundle.

Этого достаточно для надёжной eventual consistency без второго state backend.

## Порядок внедрения

### Этап 1. Контракты и БД

1. Добавить `project_participants`, `project_scope_assignments`, `project_scope_settings`.
2. Добавить shared contracts в `shared/types/project-governance.ts`.
3. Добавить composer в `server/utils/project-governance.ts`.

### Этап 2. Read path

1. Перевести `action-catalog.get.ts` на participant/assignment read model.
2. Добавить `scope detail` и `participant workload` endpoints.
3. Оставить legacy fallback.

### Этап 3. Main UI

1. Перевести `ClientProjectControl.vue` на `ProjectScopeDetailBundle`.
2. Перевести `AdminProjectControl.vue` на editable version того же bundle.

### Этап 4. Messenger UI

1. Сделать клик по фазе и спринту на detail bundle.
2. Добавить pane участников и pane workload конкретного участника.
3. Добавить mutations на назначения и scope settings.

### Этап 5. Де-легасификация

1. Убрать зависимость новых экранов от `phase.owner` и `task.assignee`.
2. Оставить их как производные snapshot-поля или удалить после полной миграции.

## Почему это решение лучше текущего

1. Не ломает существующий `hybridControl`, а дополняет его там, где JSON уже перестал быть удобным.
2. Позволяет открывать фазу как полноценный scope с настройками и участниками.
3. Поддерживает нескольких участников на одном контуре без хака в строковых полях.
4. Даёт одинаковый payload для main app и messenger.
5. Не требует немедленно создавать отдельные таблицы под каждую новую роль.

## Итоговое решение

Каноническая архитектура для следующего этапа такая:

1. `hybridControl` хранит структуру project execution.
2. `project_participants` хранит единый список участников проекта.
3. `project_scope_assignments` хранит связи участников с проектом, фазами, спринтами, задачами и документами.
4. `project_scope_settings` хранит настройки конкретного scope.
5. Main app и messenger читают единый aggregated bundle из серверного composer слоя.

Это и есть базовый каркас для сценария: «нажал на фазу -> открыл настройки и связанных людей -> увидел кто за что отвечает -> провалился в workload конкретного участника -> изменения сразу отражаются и в messenger, и в основной платформе».