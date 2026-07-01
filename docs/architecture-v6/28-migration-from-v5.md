# 28. Migration from v5.3

Конкретный план переноса существующей функциональности studio (v5.3) в v6. У проекта **нет живых пользователей**, поэтому подход — **spec-first redesign**, а не strangler. Вместо «меняем по частям с live traffic'ом» — «документируем поведение как спеки, строим заново в v6, studio становится reference-архивом».

## 1. Инвентарь v5.3 (что есть сейчас)

### Main Nuxt (studio)

12 доменных областей в `server/modules/<domain>/`:

| Домен | Назначение | Объём |
|---|---|---|
| `admin-settings` | Конфиг студии, дизайн-токены | средний |
| `designer-catalog` | Каталог материалов / поставщиков | большой |
| `projects` | Проекты студии, этапы | большой |
| `sellers` | Поставщики, продавцы | средний |
| `warehouse` | Склад, логистика | средний |
| `work-status` | Статусы работ | малый |
| `users` | Пользователи студии | средний |
| `clients` | Клиенты (B2C) | средний |
| `contractors` | Подрядчики | малый |
| `quotes` / `estimates` | Сметы, расчёты | средний |
| `documents` | Генерация документов (docx) | средний |
| `notifications` | In-app / email | малый |

Плюс:
- FSD frontend (`app/entities`, `widgets`, `pages`).
- Design-system runtime (`useDesignSystem.runtime.ts`).

### Messenger (standalone)

- `messenger/core` — real-time сервер.
- `messenger/web` — UI клиент.
- Cursor pagination, ticket-based WS.

### Communications-service

- E2EE call signaling / WebRTC relay.

## 2. Mapping v5 → v6

Не прямой 1:1. v5-домены **реинтерпретируются** через примитивы v6:

| v5 домен | v6 примитивы / card-types |
|---|---|
| `admin-settings` | `packages/design-tokens` + `services/feature-flags` + `policy-engine` |
| `designer-catalog` | `services/inventory` + `packages/card-types/catalog-item` |
| `projects` | `packages/card-types/project` (compound Pattern-Card) + `timeline-engine` |
| `sellers` | `packages/card-types/company-profile` (provider-mode) |
| `warehouse` | `services/inventory` + `packages/card-types/warehouse-item` |
| `work-status` | `timeline-engine` native (workflow states) |
| `users` | `services/identity` (Zitadel) |
| `clients` | `packages/card-types/person-profile` (instance-view provider) |
| `contractors` | `packages/card-types/person-profile` (instance provider-mode) + credentials-vault |
| `quotes` / `estimates` | `packages/card-types/contract-deal` + `pattern-template` |
| `documents` | `services/media-pipeline` + специальный endpoint для DOCX-gen |
| `notifications` | `services/notifications` (расширение) |
| FSD frontend | `apps/shell-web` + `packages/card-types` + `packages/ui-react` |
| Design-system runtime | `packages/design-tokens` + runtime в shell'е |
| `messenger/core` | `services/messenger` |
| `messenger/web` | Интеграция в `apps/shell-*` (right-panel) |
| `communications-service` | Остаётся как `services/communications-service` (E2EE calls) |

**Самое важное наблюдение**: studio — это specific compound Pattern-Card («ведение интерьерного проекта»). Её можно оформить как **шаблон** в v6: `pattern-template` с children-cards (`contract-deal`, `design-task`, `warehouse-item`, `contractor-assignment`). Не отдельная вертикаль, не отдельный сервис.

## 3. Migration strategy

### Принцип: спеки, не код

1. **Spec each v5 domain** в `docs/domain/v5-<domain>.md` — что делает, какие inputs/outputs, какие события, какие constraints.
2. **Design v6 realization** в том же doc'е — какие v6 примитивы используются, какой card-type, какой timeline.
3. **Implement v6** свежим кодом (generators + scaffolding из `24-dev-experience.md`).
4. v5 остаётся в `_archive/v5/` как reference. Нет переписок, нет strangler-роутинга.

### Зачем так, а не strangler

- **Нет live-пользователей** → нет downtime-риска.
- **v5 код писался итеративно** → много implicit assumptions. Переписывание даёт чистый контракт.
- **v5 использует Drizzle / Nuxt / Vue** — v6 на React / Expo / Tauri. Strangler одновременно двух стеков — сложнее чем построить с нуля.
- **v6 fractal-invariants** не совместимы с v5 UI as-is. Вместо адаптации — естественный rebuild.

### Что сохраняется физически из v5.3

- **База данных** — не мигрируется как live; может быть использована для seeding test-data.
- **Drizzle schemas** → используются как **reference** для Zod-схем в `packages/contracts-domain/`.
- **DDD-lite модули** → изучаются для извлечения бизнес-правил в спеки.
- **FSD-layout** → адаптируется в shell-panels анатомию.
- **Design-system tokens** → экспортируются в `packages/design-tokens/`.

## 4. План по Фазам

### Фаза 0 — Foundation (параллельно с продолжением v5.3 поддержки)

- `pnpm-workspace.yaml` с включением v5 (app/server/messenger) **и** v6 (apps/packages/services) как equal workspaces.
- Turborepo работает над обеими.
- v5.3 продолжает жить, но **новая feature-работа — только в v6 каркасе**.
- Design-tokens экстрактятся из v5 `useDesignSystem.runtime.ts` → `packages/design-tokens/`.

### Фаза 1 — Platform Core

- Identity через Zitadel поднимается рядом с HMAC-cookie v5.
- v5 остаётся на HMAC, v6 apps (которых пока нет) будут сразу на JWT.
- Нет миграции sessions (нет live users).

### Фаза 2 — Domain Primitives

**Первая реальная миграция**. Для каждого v5 домена:

1. Spec-doc в `docs/domain/v5-<domain>.md`.
2. Identify нужные v6 примитивы (часто уже есть — pattern/timeline/booking/etc.).
3. Create card-types в `packages/card-types/` по необходимости.
4. Implement без референса на v5-код (только spec).
5. Seed локальные test-data из v5 DB для acceptance-тестов.

Примерный порядок для studio domains:
1. `work-status` → timeline-engine (минимум кода, natural fit).
2. `warehouse` + `designer-catalog` → inventory service + card-types.
3. `contractors` + `sellers` → person/company profiles.
4. `quotes` / `estimates` → contract-deal card-type + pattern-template.
5. `projects` → project card-type (compound с children).
6. `documents` → media-pipeline + spec endpoint для DOCX.
7. `admin-settings` → feature-flags + design-tokens + policy-engine.

### Фаза 3 — Shell + First Vertical

Shell собирается как новый `apps/shell-web`. Studio-модули реализуются как первый vertical-набор card-types:

- Shell открывается на «daria.app/studio» (или отдельный поддомен).
- Первый реальный UX — открыть проект студии, увидеть timeline, связанные контракты, warehouse-items.
- v5 studio переводится в maintenance-mode (только фикс critical).

### Фаза 4+ — studio in archive

После Фазы 3, когда studio-domain полностью покрыт в v6:

- v5 код переезжает в `_archive/v5/`.
- Runtime PM2 v5 останавливается.
- DNS переключается на v6.
- Backups v5 DB сохраняются 12 мес «на всякий случай».

## 5. Data migration (если понадобится)

Hypothetically (если пользователи появятся в v5 до Фазы 3):

### Principle: one-time ETL, не continuous sync

1. Заморозить v5 DB на момент switch'а.
2. ETL-job читает v5 tables, пишет в v6 БД через v6 API (идёт через все valid-check'и).
3. Валидация row counts + sample integrity.
4. Переключение DNS.
5. Rollback: возврат к v5 DB dump, если что-то критическое.

Но **скорее всего не понадобится** — users появятся уже в v6.

## 6. Document porting

Docs v5.3 (`docs/architecture-v5/`) содержат ценные паттерны, которые **применяются** в v6. Не удаляются до закрытия migration.

После Фазы 3 помечаются `[ARCHIVED, reference only]`.

- `05-architectural-patterns.md` (v5) → информирует `15-integration-patterns.md` (v6).
- `16-extensibility-playbook.md` (v5) → теперь в `08-repository-structure.md` (v6) и `24-dev-experience.md` (v6).
- `17-coding-standards.md` (v5) → обновляется в `24-dev-experience.md` (v6).

## 7. Code portability

Минимальный физический перенос:

- `shared/types/**` + `shared/constants/**` из v5 → `packages/contracts-domain/` в v6 (после адаптации под Zod + OpenAPI).
- `messenger/core/src/**` → `services/messenger/src/**` (почти 1:1 с обновлением API под entity-context).
- `services/communications-service/**` → остаётся как есть, лишь обновление events.

Остальное — **пишется с нуля**.

## 8. Testing during migration

- v5 продолжает иметь `pnpm exec vue-tsc --noEmit` + `lint:errors` до archiving.
- v6 набирает свои тесты пропорционально (fractal, contract, acid).
- Shared CI: оба проходят green.
- Deploy gates: v5 `deploy:safe:*` для v5-prod; v6 через Argo CD.

## 9. Risk matrix

| Риск | Митигация |
|---|---|
| v5.3 Bug-fix остаётся нужен → отвлекает команду | Freeze new features в v5.3 после Фазы 1; только critical security/prod-bug |
| v6 дольше Phase-эстимата | Spec-first редуцирует overrun; phase-gate остаётся фиксированным |
| Design-team двойная загрузка (v5+v6 UX) | Shell в v6 — полная перезагрузка; design-system делается один раз под v6 |
| Data loss из v5 | Dump перед переключением, 12 мес retention |
| Regression: что-то в v5 не переехало | Spec review — checklist per-domain; QA on v6 |
| Команда привыкла к v5 patterns | ADR + playbooks + onboarding (24-dev-experience) |

## 10. Acid-check migration complete

Фаза 4 завершена только если:

- [ ] Все 12 v5 domains покрыты в `docs/domain/v5-*.md`.
- [ ] Каждый имеет соответствующий v6 card-type / primitive.
- [ ] End-to-end flow studio (открыть проект → увидеть всё) работает в v6.
- [ ] v5 prod-deploy остановлен.
- [ ] v5 code в `_archive/`.
- [ ] v5 docs помечены `[ARCHIVED]`.
- [ ] No production feature-work happens в v5 последние 2 недели.

## 11. Антипаттерны

- ❌ «Частично мигрировали» — продукт висит между мирами. Строго: domain либо полностью в v6, либо полностью в v5.
- ❌ Вручную переписывать v5-код «очищая» его. Лучше с spec и свежим.
- ❌ Переносить v5-БД напрямую в v6-БД без маппинга через API (нарушение I6 и потенциальный data-corrupt).
- ❌ Держать v5 в prod после Фазы 4 «на всякий случай».
- ❌ Dual-write (v5 + v6 одновременно) — для проекта без users — overkill.
