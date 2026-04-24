# 15. Target Alignment Audit

Last refresh: 2026-04-20
Scope: сверка документов 09-14 с фактической структурой репозитория после завершенных batch-рефакторингов (Wave 0-6 в основном закрыты, Wave 5 API-facade в активной работе).

## Как читать этот аудит

- `Aligned` — целевой документ соответствует фактическому состоянию.
- `Partially aligned` — направление верное, но есть заметные незавершенные зоны.
- `Not yet aligned` — документ описывает в основном target-state, а не текущую фактическую структуру.

## 09. Target repository tree

Status: Aligned

Что совпадает:
- базовые контуры `app`, `server`, `shared`, `messenger`, `services`, `docs`, `scripts`, `public` существуют;
- `app/{entities,widgets,features,shared,pages,layouts}` присутствуют; `app/components/**` — пусто (полная миграция);
- `server/modules/**` содержит все целевые домены: `admin`, `admin-settings`, `ai`, `auth`, `chat`, `clients`, `communications`, `contractors`, `designers`, `documents`, `gallery`, `managers`, `projects`, `sellers`, `uploads`;
- `server/db/schema/**` разложен: `clients`, `contractors`, `designers`, `documents`, `managers`, `messenger`, `project-governance`, `projects`, `sellers`, `uploads`, `users`, `work-status` + `relations.ts`;
- `messenger/core/src/**` разложен по bounded contexts (`agents`, `auth`, `calls`, `contacts`, `conversations`, `crypto`, `media`, `profile`, `project-engine`, `realtime`, `transcription`);
- `messenger/web/app/**` соответствует FSD (`core`, `shared`, `entities`, `features`, `widgets`, `pages`);
- `services/communications-service/src/**` разложен (`auth`, `store`, `config.ts`, `index.ts`, `types.ts`).

Что остаётся:
- ✓ closed 2026-04-20: доменная логика перенесена в `server/modules/**`; `server/utils/**` теперь содержит только infrastructure-утилиты (`errors.ts`, `logger.ts`, `security-headers.ts`, `body.ts`, `query.ts` и др.) — это целевое состояние.

## 10. Frontend refactor map

Status: Aligned (47/47 move rows done по verify-architecture-docs.mjs).

Что совпадает:
- route-shell и widget-shell cutover выполнены для всех ключевых CRM admin-страниц;
- domain-composables живут в `app/entities/**`;
- `app/shared/ui/**` и `app/features/**` (`entity-create`, `page-content`, `ui-editor`) наполнены;
- `app/components/**` пусто — legacy-слой полностью удалён.

Что остаётся:
- нарезка хвостовых больших .vue (AdminDocumentEditor Step 2/3, CabinetServicesSection, Wipe2Renderer, admin layout header utilities) — косметика, структура уже целевая.

## 11. Backend + Shared refactor map

Status: Aligned (matrix 11 closed).

Что совпадает:
- `shared/constants/**`, `shared/types/**`, `shared/utils/**` выровнены под target-taxonomy;
- `server/modules/**` покрывает все целевые домены;
- `server/db/schema/**` split выполнен + `relations.ts`;
- `server/api/**` содержит 0 handlers импортирующих `drizzle-orm` или `~/server/db/schema` (thin-wrap complete).

Что остаётся:
- ✓ closed 2026-04-20: `server/utils/**` содержит только infrastructure-утилиты; доменная логика в `server/modules/**`.

## 12. Messenger + Services refactor map

Status: Aligned (68/68 move rows done).

Что совпадает:
- `messenger/core/src/**` — все 11 bounded contexts;
- `messenger/web/app/**` — все FSD-слои, `components/messenger/**` пусто, `composables/**` пусто;
- `services/communications-service/src/**` — auth + store decomposed;
- realtime-контур полностью независим от main Nuxt app;
- cross-boundary-контракты идут только через `shared/**`.

## 13. Refactor waves

Status: Aligned

Порядок волн соответствует реальному execution-порядку: Wave 0-3 закрыты, Wave 4 frontend domain в хвостовой фазе, Wave 5 server facade в активной работе, Wave 6 db schema split уже выполнен, Wave 7 messenger cutover завершён структурно, Wave 8 cleanup (удаление legacy) продолжается инкрементально.

## 14. Refactor roadmap

Status: Aligned

Roadmap log содержит 80+ завершённых batch-этапов и остаётся единственным источником истины по фактическому прогрессу.

## New gaps (2026-04-20)

Сравнение с целевым деревом из `09-target-repository-tree.md` по фактическому состоянию `ls -F` выявило следующие расхождения:

### Целевые пути, отсутствующие в факте (target → actual missing)

| Target path | Статус |
|---|---|
| `app/entities/directories/` | отсутствует — сущность директорий не создана |
| `app/features/admin-search/` | отсутствует — фича поиска в admin не вынесена в отдельный слой |
| `app/features/auth/` | отсутствует — auth-фича не вынесена в `app/features/` |
| `app/widgets/client-cabinet/` | отсутствует — кабинет клиента не выделен в отдельный виджет |
| `app/widgets/project-cabinet/` | отсутствует — кабинет проекта не выделен в отдельный виджет |
| `server/modules/suggest/` | отсутствует — suggest-домен остаётся только на уровне `server/api/suggest/` без модульного фасада |

### Фактические пути, отсутствующие в target (actual → target extra)

| Actual path | Примечание |
|---|---|
| `app/widgets/projects/` | нет в target — возможно замена/дополнение к `project-cabinet/` |
| `server/api/agents/` | нет в target — добавлен после фиксации doc-09 |
| `server/api/geocode/` | нет в target — добавлен после фиксации doc-09 |
| `server/api/suggestions.get.ts` | нет в target — loose файл вне `suggest/` директории |
| `server/api/upload.post.ts` | нет в target — loose файл вне именованной директории |

## Priority gaps

Выявлено 6 missing-target-path gap'ов (см. таблицу выше). Из них приоритетен `server/modules/suggest/` (нарушение DDD-lite: domain-логика через API-handler без модульного фасада). Остальные — frontend structural gaps, не нарушающие архитектурных инвариантов ESLint.

## Verdict

The v5 architecture is fully implemented across the main app, messenger, and communications-service. All 47 frontend moves are complete, the three-runtime isolation constraint is enforced. Six structural gaps remain versus the doc-09 target tree: five missing FSD directories (`entities/directories/`, `features/admin-search/`, `features/auth/`, `widgets/client-cabinet/`, `widgets/project-cabinet/`) and one missing DDD module facade (`server/modules/suggest/`). These are Wave backlog items, not merge blockers.
