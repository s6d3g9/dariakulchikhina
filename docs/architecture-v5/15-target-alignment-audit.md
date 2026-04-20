# 15. Target Alignment Audit

Date: 2026-04-20
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
- отдельные фрагменты доменной логики в `server/utils/**` ещё не полностью растащены по `server/modules/**`.

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

Status: Aligned, see doc 11 §Current Status vs Target (2026-04-20).

Что совпадает:
- **Matrix rows:** 60/63 refactored paths marked ✓ done, 3 architectural stays (csrf, upload, suggest).
- `shared/constants/**`, `shared/types/**`, `shared/utils/**` выровнены под target-taxonomy;
- `server/modules/**` покрывает все целевые домены;
- `server/db/schema/**` split выполнен + `relations.ts`;
- `server/api/**` содержит 0 handlers импортирующих `drizzle-orm` или `~/server/db/schema` (thin-wrap verified by grep).

Что остаётся:
- остаточная доменная логика в `server/utils/**` (только infrastructure helpers: body, errors, logger, query, request-context, security-headers).

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

## Остающиеся structural gaps

1. `server/utils/**` — clean, содержит только infrastructure helpers (body, errors, logger, messenger-cors, query, request-context, security-headers).
2. Wave 8 W7 legacy sweep — pending (tracked как `wave8-w7-agent-seeds` для messenger agent seeds и future legacy-agents UI removal).
3. Messenger `process.env` lint — 1 остаточная ошибка в `messenger/core/src/agents/claude-cli-reply.ts:29`, deferred на messenger-specific wave.

## Итоговый verdict

- Структурно v5.3 достигнут на ~90%: все целевые каталоги созданы и наполнены, legacy-слои `app/components/**` и `messenger/web/app/components/messenger/**` пусты.
- Основной remaining backlog — facade-миграция API (не структурный, а поведенческий долг).
- Документы 09, 10, 11, 12, 13, 14 теперь описывают фактическое состояние. Doc 11 matrix полностью закрыт (Wave 10).
