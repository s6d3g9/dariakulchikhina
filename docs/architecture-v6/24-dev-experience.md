# 24. Developer Experience

Архитектура v6 масштабна: 35 сервисов, 60+ card-types, 6 слоёв, 4 runtime'а (TS/Go/Rust/Python). Без жёсткого DX (developer experience) — команда не потянет. Этот документ фиксирует: онбординг, golden path, codegen, scaffolding, локальный цикл разработки.

## 1. Принципы DX

1. **Convention over configuration** — если есть шаблон, он работает «из коробки».
2. **Scaffolding над копипастой** — `pnpm create-*` генерирует скелеты.
3. **Одна команда — один стек** — не заставляем мобильного разработчика учить Go.
4. **Обратная связь < 5 сек** — HMR, fast typecheck, fast lint на изменённом.
5. **Моноязыковые задачи изолированы** — ts-сервисы не ждут Go-компиляции.
6. **Никаких tribal knowledge** — всё, что нужно делать вручную регулярно, описано в README.

## 2. Локальный dev loop

Единая точка входа — `Makefile` / `pnpm` scripts на root:

```bash
pnpm dev:infra       # platform/docker-compose up (все БД + инфра)
pnpm dev:services    # все services/* в hot-reload (filtered by WHAT=...)
pnpm dev:apps        # все apps/* (Next.js / Expo / Tauri)
pnpm dev             # всё сразу (не рекомендуется — тяжело на ноуте)

# или точечно:
pnpm dev:service --filter booking
pnpm dev:card-type --filter car
pnpm dev:app --filter shell-web
```

Под капотом — Turborepo с правильным dependency-graph.

## 3. Scaffolding — codegen-команды

Каждая регулярно создаваемая сущность имеет генератор:

```bash
# Создать новый card-type
pnpm create card-type my-kind
# → packages/card-types/my-kind/ с полным скелетом:
#   index.ts, instance.view.ts, type.view.ts, 8 panels, timeline.ts,
#   entity-provider.ts, schemas.ts, tests/{fractal,contract}.test.ts, README.md

# Создать новый primitive service
pnpm create service my-service --layer 3 --runtime ts
# → services/my-service/ с package.json, src/, Dockerfile, README.md, migration-template

# Создать новый event
pnpm create event my-domain my-event-name
# → packages/events/domains/my-domain/my-event-name.v1.schema.json
#   + TypeScript типы автогенерятся

# Создать новую law-profile
pnpm create law-profile XX
# → platform/law-profiles/XX.yaml из template'а

# Создать новый contract endpoint
pnpm create endpoint --service booking --name createSlot
# → обновляет packages/contracts-domain/booking.ts + server handler skeleton
```

Все генераторы — это `plop.js` templates в `scripts/codegen/`.

## 4. Golden path

Типичная задача: **добавить новую вертикаль `sneakers`**.

1. `pnpm create card-type sneakers`
2. `pnpm create card-type sneakers:panels` (подтвердить набор)
3. Заполнить `schemas.ts` (данные sneakers)
4. Заполнить `instance.view.ts` + `type.view.ts`
5. Заполнить 8 panels (shop для type, журнал ношения для instance)
6. `timeline.ts`: acquired → in-use → retired
7. `pnpm test:fractal -- sneakers` (CI blocker passes)
8. `pnpm test:contract -- sneakers`
9. Регистрация в `packages/card-types/_registry.ts` (авто, через плагин IDE)
10. Добавить в `docs/architecture-v6/06-card-types-matrix.md`
11. PR

Ожидаемое время — **1 день** для card-type без своих новых примитивов. Acid-test T1.

## 5. IDE setup

`.vscode/` в репо:
- `settings.json` — TypeScript workspace, path-aliases, eslint.
- `launch.json` — дебаг per-service.
- `extensions.json` — обязательные (ESLint, Prettier, Vitest, GraphQL, OpenAPI, Drizzle, Rego, Rust-analyzer).
- `tasks.json` — типовые задачи одной кнопкой.

GPT-4 / Claude integration в IDE (через Cursor / VSCode extensions) — **рекомендовано**, особенно для scaffolding и рутинных миграций. Code-review остаётся за человеком.

## 6. Pre-commit / pre-push

Автоматически через Husky / lefthook (single source — `.githooks/`):

- **pre-commit**: форматирование staged-файлов (prettier, gofmt, rustfmt, black).
- **pre-push**: `lint:errors` + `typecheck` на изменённых + fractal-harness если трогали card-types.
- **commit-msg**: conventional commits lint.

Скорость — всё, что медленнее 30 сек, переходит в CI, не в pre-push.

## 7. CI pipeline

Все три этапа параллельно:

1. **Validate** (~2 мин)
   - ESLint errors
   - Typecheck affected
   - Lint docs (`docs:v5:verify` + новый `docs:v6:verify`)
   - Schema drift (OpenAPI vs Zod)

2. **Test** (~5 мин)
   - Unit / contract / fractal-harness tests affected
   - Integration (docker-compose up) только на затронутых сервисах

3. **Build** (~3 мин)
   - Buildx multi-arch images
   - SBOM
   - Cosign sign
   - Turborepo remote cache

**Total**: ≤ 10 мин на средний PR, параллельно на GitHub runners.

## 8. Testing pyramid

| Тип | Scope | Частота | Tool |
|---|---|---|---|
| Unit | function-level | каждый коммит | vitest / go test / pytest |
| Contract | API <-> Zod/OpenAPI | каждый PR | packages/testing/contract-harness |
| Fractal | UI structural | каждый card-type PR | packages/testing/fractal-harness |
| Integration | service-to-service | nightly + main | docker-compose + vitest |
| End-to-end | user journey | nightly + pre-release | Playwright (web) + Maestro (mobile) |
| Acid-test | phase-gate | pre-phase-release | packages/testing/acid/T*.test.ts |
| Load | perf regression | weekly | k6 |
| Chaos | resilience | quarterly (Phase 6+) | Chaos Mesh |

## 9. Onboarding (новый разработчик — день 1)

Checklist (занимает ~4 часа):

1. [ ] Clone repo
2. [ ] `pnpm install`
3. [ ] `pnpm dev:infra` → всё поднимается
4. [ ] `pnpm docs:v6:verify` → зелёное
5. [ ] Открыть `docs/architecture-v6/README.md` → прочитать TL;DR
6. [ ] Прочитать `17-fractal-ux.md` (главный UX-закон)
7. [ ] Прочитать `09-invariants.md` (все 23 правила)
8. [ ] Прочитать `05-shell-entity-model.md` (ментальная модель)
9. [ ] Сделать first-contribution task — `pnpm create card-type hello-world`, пройти fractal-harness
10. [ ] Открыть PR → ревью архитектора

## 10. Documentation as code

- Все `docs/architecture-v6/*.md` — single source of truth.
- CI проверяет: если код трогает слой/сервис — соответствующий doc упомянут в PR description, либо есть `docs-change` label.
- `docs:v6:verify` — автоматическая проверка консистентности (ссылки, упоминания инвариантов, каталог сервисов).
- ADR (Architecture Decision Record) template для больших изменений: `docs/adr/NNNN-<slug>.md`.

## 11. Runbooks и playbooks

Помимо runbook'ов на alert'ы (`18-observability-ops.md` §13), есть playbook'и на типовые задачи:

- `docs/playbooks/deploy-new-service.md`
- `docs/playbooks/rotate-jwt-key.md`
- `docs/playbooks/add-card-type.md` (развёрнутый golden-path)
- `docs/playbooks/handle-gdpr-erase.md`
- `docs/playbooks/migrate-data-between-services.md`
- `docs/playbooks/onboard-new-vertical.md`

## 12. Feature flags как dev-tool

GrowthBook используется не только для продакшн-экспериментов, но и для **dev-мapping**:

- Включить feature в dev-окружении отдельно от прод.
- `localOverrides` через cookie для тестирования.
- Shadow-mode: новый код выполняется параллельно со старым, результаты сравниваются.

## 13. Monorepo хуки

Правила, чтобы большой репо оставался управляемым:

- Changesets для версионирования (опциональный, для publish'а sdk-*).
- CODEOWNERS — кто owner каждого сервиса (blocking reviewer на PR).
- PR size limit (soft 500 lines / hard 1500) — большие PR отклоняются автоматически.
- Branch protection: main требует зелёный CI + 1 approval.
- Stale PR auto-reminder после 5 дней.

## 14. Observability для разработки

- `pnpm logs:service booking --follow` — live-логи локально.
- `pnpm trace <traceId>` — pretty-print trace из локального SigNoz.
- `pnpm db:studio` — Drizzle Studio на локальные БД.
- Temporal Web UI: http://localhost:8080 — видеть все running workflows.
- MinIO Console: http://localhost:9001 — видеть S3.

## 15. Local data seeding

```bash
pnpm seed:infra       # создаёт default tenants, users, scopes в Zitadel
pnpm seed:dev         # набор реалистичных данных: 100 users, 50 templates, timelines в разных статусах
pnpm seed:empty       # чистый старт (wipe + re-init)
pnpm seed:vertical -- travel   # данные для конкретной вертикали
```

## 16. Антипаттерны

- ❌ Копипаста card-type/service без scaffolding — рано или поздно структура разъедется.
- ❌ Скрипты-helper'ы в домашней директории разработчика. Всё — в `scripts/`.
- ❌ "Runs on my machine" — без docker-compose параити кода.
- ❌ Отсутствие README в новом сервисе / card-type.
- ❌ CI > 15 минут — разбивать, параллелить, кешировать.
- ❌ Обязательные manual-шаги в golden-path — это звоночек, автоматизировать.
- ❌ Не обновлять `docs/architecture-v6/*.md` при изменении инварианта.
