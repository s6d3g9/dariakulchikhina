# Project Engine API

Новый слой `project-engine` внутри `messenger/core` нужен для того, чтобы использовать messenger не только как чат, но и как orchestration API для разработки разных проектов и модулей.

## Что решает

- хранит список интегрируемых проектов;
- описывает контексты проекта: кабинеты, модули, страницы, API и shared-зоны;
- фиксирует coverage по фронту, бэку, логике, стилям, данным, QA и интеграции;
- хранит субъектов проекта и их связь с кабинетами;
- хранит договорённости между субъектами и context-зонами;
- хранит связи между кабинетами как отдельный API-слой;
- назначает агентам роли и responsibility map по каждому контексту;
- строит `sync brief`, который показывает пробелы покрытия, рекомендации по агентам и несоответствие repository/workspace;
- строит `manager brief`, который показывает gaps по субъектам, договорённостям и manager-agent ownership.

## REST endpoints

Все endpoints требуют `Authorization: Bearer <messenger-token>`.

### Получить список проектов

`GET /project-engine/projects`

### Получить список встроенных шаблонов

`GET /project-engine/templates`

Сейчас доступен шаблон:

- `platform-role-cabinets` — bootstrap для кабинетов `designer`, `manager`, `client`, `contractor`.

### Создать проект вручную

`POST /project-engine/projects`

### Создать проект из шаблона

`POST /project-engine/projects/bootstrap`

Пример body:

```json
{
  "templateId": "platform-role-cabinets",
  "slug": "core-cabinets",
  "label": "Кабинеты платформы",
  "repositoryId": "repo-main",
  "rootPath": "/opt/daria-nuxt"
}
```

### Получить проект

`GET /project-engine/projects/:projectId`

`projectId` принимает и `id`, и `slug`.

### Обновить проект

`PUT /project-engine/projects/:projectId`

### Удалить проект

`DELETE /project-engine/projects/:projectId`

### Построить sync brief

`GET /project-engine/projects/:projectId/sync-brief`

Опциональный query:

- `contextId` — построить brief только по одному кабинету или модулю.

### Построить manager brief

`GET /project-engine/projects/:projectId/manager-brief`

Возвращает:

- субъектов проекта и какие manager agents их ведут;
- договорённости между субъектами и кабинетами;
- связи между кабинетами и их привязку к agreements;
- gaps по отсутствующим manager agents и неоформленным approval/handoff связям.

### CRUD по субъектам

- `GET /project-engine/projects/:projectId/subjects`
- `POST /project-engine/projects/:projectId/subjects`
- `PUT /project-engine/projects/:projectId/subjects/:entityId`
- `DELETE /project-engine/projects/:projectId/subjects/:entityId`

### CRUD по договорённостям

- `GET /project-engine/projects/:projectId/agreements`
- `POST /project-engine/projects/:projectId/agreements`
- `PUT /project-engine/projects/:projectId/agreements/:entityId`
- `DELETE /project-engine/projects/:projectId/agreements/:entityId`

### CRUD по cabinet links

- `GET /project-engine/projects/:projectId/cabinet-links`
- `POST /project-engine/projects/:projectId/cabinet-links`
- `PUT /project-engine/projects/:projectId/cabinet-links/:entityId`
- `DELETE /project-engine/projects/:projectId/cabinet-links/:entityId`

## Модель проекта

Проект хранит:

- `slug`, `label`, `description`;
- `targetKind`: `platform | messenger | external`;
- `repositoryId`, `rootPath`, `defaultBranch`;
- `contexts[]`;
- `agentBindings[]`.
- `subjects[]`;
- `cabinetLinks[]`;
- `agreements[]`.

## Context

Каждый context описывает отдельную зону разработки:

- `kind`: `cabinet | module | page | feature | api | shared`;
- `ownerRole`: `admin | client | manager | designer | contractor | shared | external`;
- `capabilities[]` с coverage status;
- `syncContract` со списком путей и reference-файлов;
- `assignedAgentIds[]` для быстрой видимости.

## Capability coverage

Поддерживаемые capability:

- `frontend`
- `backend`
- `logic`
- `styles`
- `data`
- `qa`
- `docs`
- `integration`

Статусы:

- `planned`
- `in-progress`
- `review`
- `blocked`
- `done`

## Agent bindings

Binding привязывает конкретного агента к context и фиксирует:

- `role`: `lead | support | review | observer`;
- `responsibilities[]` — какие capability реально закрывает агент;
- `notes` — локальные правила синхронизации;
- `active` — участвует ли binding в текущем brief.

## Subjects

Субъекты описывают стороны, вовлечённые в проект:

- `client`
- `manager`
- `designer`
- `contractor`
- `admin`
- `vendor`
- `partner`
- `external`

У субъекта есть:

- `contextIds[]` — в каких кабинетах или модулях он участвует;
- `managerAgentIds[]` — какие manager agents ведут коммуникацию и контроль;
- `status`, `tags`, `notes`.

## Agreements

Договорённости фиксируют управляемые соглашения между субъектами и кабинетами:

- `scope`
- `delivery`
- `approval`
- `payment`
- `change-request`
- `support`

У agreement есть:

- `subjectIds[]`;
- `contextIds[]`;
- `managerAgentIds[]`;
- `summary` и `terms[]`;
- `status`: `draft | active | review | blocked | closed`.

## Cabinet links

Связи между кабинетами нужны, чтобы синхронизация шла не вручную, а через API-модель.

Варианты link type:

- `mirrors`
- `depends-on`
- `handoff`
- `approval`
- `shared-data`

Link хранит:

- `sourceContextId` и `targetContextId`;
- `sharedCapabilities[]`;
- `agreementIds[]`, если связь закреплена договорённостью;
- `status` и `notes`.

## Sync brief

`sync brief` возвращает:

- coverage summary по capability;
- contexts с назначенными bindings;
- `recommendedAgentIds`, если coverage не закрыт;
- `missingCapabilities`, если capability заявлен, но никто за него не отвечает;
- срез по агентам: какие contexts ведут, какие responsibilities у них есть, совпадает ли repo/workspace с целевым проектом;
- список `gaps`: отсутствующие агенты, пробелы покрытия, repo mismatch.

## Как использовать для кабинетов

Для каждого кабинета можно создать отдельный context и повесить на него:

- `platform-ui` — экран, layout, UI primitives, styles;
- `api-platform` — endpoints и серверная логика;
- `db-platform` — schema, migrations, data risks;
- `qa-release` — регрессия и release readiness;
- `orchestrator` — сведение межмодульных зависимостей.

Для управления субъектами и межкабинетными договорённостями можно использовать manager-агентов:

- `cabinet-manager` — ведёт cabinet-to-cabinet sync;
- `agreements-manager` — ведёт subject agreements, approval flows и handoff.

Это позволяет держать cabinet development в одном API-контуре вместо разрозненных заметок по чату.