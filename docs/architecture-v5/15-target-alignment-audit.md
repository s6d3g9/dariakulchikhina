# 15. Target Alignment Audit

Date: 2026-04-16
Scope: сверка документов 09-14 с фактической структурой репозитория после завершенных batch-рефакторингов.

## Как читать этот аудит

- `Aligned` — целевой документ в основном соответствует фактическому состоянию.
- `Partially aligned` — направление верное, но есть заметные незавершенные зоны.
- `Not yet aligned` — документ описывает в основном target-state, а не текущую фактическую структуру.

## 09. Target repository tree

Status: Partially aligned

Что совпадает:
- базовые контуры `app`, `server`, `shared`, `messenger`, `services`, `docs`, `scripts`, `public` существуют;
- `server/modules/auth/**` и `server/modules/projects/**` существуют;
- `shared/constants/system/{roles,status-colors,websocket-events}.ts` существуют.

Что расходится:
- в `app/` отсутствуют как реальные primary-layer каталоги `core`, `shared`, `features`;
- `app/widgets/**` существует, но покрывает только часть target-срезов;
- `server/modules/**` покрывает только часть доменов из target-tree;
- `server/db` все еще опирается на `schema.ts`, а не на завершенный split `schema/**` + `relations.ts`;
- `messenger/web/app` и `messenger/core/src` еще не приведены к target-FSD/bounded-context виду.

Вывод:
- документ корректен как target-state;
- не должен интерпретироваться как описание текущего состояния дерева.

## 10. Frontend refactor map

Status: Partially aligned

Что совпадает:
- route-shell подход соблюдается;
- выполнен widget-shell cutover ключевых CRM admin-страниц;
- часть domain-composables уже вынесена в `app/entities/**`.

Что расходится:
- `app/shared/ui/**` как системный слой практически не заполнен;
- `app/features/**` как основной слой почти не используется;
- часть логики по-прежнему скрыта за legacy `app/components/**` под widget-обертками;
- целевые first-stage frontend-файлы из документа созданы только частично.

Вывод:
- frontend движется в target-направлении;
- документ пока описывает более зрелое состояние, чем реально достигнуто в CRM app.

## 11. Backend + Shared refactor map

Status: Partially aligned

Что совпадает:
- `shared/constants/**`, `shared/types/**`, `shared/utils/**` близки к target-taxonomy;
- `projects/work-status` hot-path уже переведен к thin-controller + service-layer модели;
- `server/modules/auth/**`, `server/modules/projects/**`, `server/modules/chat/**`, `server/modules/communications/**`, `server/modules/uploads/**` существуют.

Что расходится:
- значительная часть доменов (`clients`, `designers`, `gallery`, `documents`, `sellers`, `managers`, `admin-settings`, `agent-registry`) еще не оформлена как полноценные target-модули;
- `server/utils/**` все еще содержит заметный объем доменной логики;
- `server/db/schema.ts` не разложен в целевую модульную схему.

Вывод:
- shared-layer выровнен лучше backend-layer;
- backend migration еще находится между bridge-stage и final service-only stage.

## 12. Messenger + Services refactor map

Status: Not yet aligned

Что совпадает:
- `services/communications-service/src/auth` и `src/store` существуют;
- messenger runtime отделен от main Nuxt app.

Что расходится:
- `messenger/web/app` все еще больше похоже на legacy Nuxt-структуру (`components`, `composables`, `utils`), чем на target FSD;
- `messenger/core/src` все еще преимущественно плоский набор файлов, а не разложенные bounded contexts (`agents`, `auth`, `calls`, `contacts`, `conversations`, `crypto`, `media`, `profile`, `project-engine`, `realtime`, `transcription`).

Вывод:
- realtime-контур организационно отделен;
- его структурный refactor по документу 12 в основном еще впереди.

## 13. Refactor waves

Status: Aligned

Что совпадает:
- документ задает порядок волн, а не заявляет ложный фактический прогресс;
- порядок волн соответствует реальным остаточным задачам.

Что важно:
- этот документ нужно использовать как execution-order guide;
- фактический прогресс должен читаться только через roadmap.

## 14. Refactor roadmap

Status: Aligned

Что совпадает:
- roadmap уже выполняет роль operational-log;
- в него внесены завершенные batch-этапы по frontend, backend и docs;
- next-step секция отражает реальные остаточные направления.

Что важно:
- это основной документ для контроля фактического состояния программы рефакторинга.

## 15. Agent orchestration

Status: Aligned

Что совпадает:
- `messenger_agents`, `messenger_agent_runs`, `messenger_agent_run_events` — схема в БД;
- `messenger/core/src/agents/ingest-handler.ts` — Fastify-роут `POST /agents/:id/stream` с rate-limiting, персистенцией событий, машиной состояний (pending → running → completed/failed);
- `scripts/workrooms/claude-stream-bridge.ts` — адаптер Claude CLI stream-json → ingest endpoint;
- `scripts/smoke/agent-orchestration.sh` — E2E верификатор (SQL seed → bridge → DB assertions);
- Runbook `docs/claude-cli-dispatcher-runbook.md` содержит секцию "End-to-end verification".

Что остаётся как forward-looking:
- Convenience-обёртка `claude-session create --agent-id --run-id` (сейчас bridge вызывается напрямую из smoke-скрипта);
- Admin API для управления агентами (сейчас агенты сидируются через SQL).

Вывод:
- pipeline полностью реализован и верифицирован smoke-тестом;
- структурные файлы лежат в ожидаемых местах по архитектурной карте.

## Приоритетные structural gaps

1. Создать и реально наполнить `app/shared/**` и `app/features/**` как primary-layer.
2. Завершить перенос доменной логики из `server/utils/**` в `server/modules/**` по оставшимся доменам.
3. Выполнить `server/db/schema.ts -> server/db/schema/** + relations.ts` split.
4. Привести `messenger/web/app/**` к FSD-структуре из документа 12.
5. Привести `messenger/core/src/**` к bounded-context структуре из документа 12.

## Итоговый verdict

- Папка `docs/architecture-v5` теперь логически согласована между собой.
- Наиболее близко к факту сейчас документы 11, 13 и 14.
- Наиболее «вперёдсмотрящими» относительно реального кода остаются документы 09, 10 и особенно 12.
- Следующая разумная волна работы: structure-alignment по frontend/backend, а не переписывание самих архитектурных документов.