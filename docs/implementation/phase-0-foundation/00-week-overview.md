# Phase 0: Foundation — week-by-week overview

2-3 недели. Цель: каркас monorepo, инфра локально, ноль бизнес-кода. После — Phase 1 может начаться.

Team: 2-3 чел (1 tech-lead, 1-2 full-stack, 1 DevOps part-time).

## Week 1: Monorepo + Docker

| День | Задача | Deliverable |
|---|---|---|
| Mon | Workspace setup | `pnpm-workspace.yaml`, `turbo.json`, workspace-root `package.json` |
| Tue | Git + CI skeleton | `.github/workflows/ci.yml` базовый, branch protection |
| Wed | Docker-compose full | `platform/docker-compose/docker-compose.yml` работает: `docker compose up` поднимает 10 инфра-сервисов |
| Thu | Scaffolding | `scripts/codegen/plop` с templates для card-type / service / event |
| Fri | Tests infrastructure | `packages/testing/` bootstrap, vitest config |

## Week 2: Packages

| День | Задача | Deliverable |
|---|---|---|
| Mon | `packages/contracts-*` | 3 packages с Zod runtime + OpenAPI export pipeline |
| Tue | `packages/events/` | CloudEvents base schema, codegen TS types |
| Wed | `packages/design-tokens` | Extract из v5 `useDesignSystem.runtime.ts` → JSON + CSS vars |
| Thu | `packages/shell-panels/` | Types + contracts (не runtime еще) |
| Fri | `packages/ui-react/` | 2 показательных компонента (`<Button>`, `<Card>`) с design-tokens |

## Week 3: Observability + polish

| День | Задача | Deliverable |
|---|---|---|
| Mon | SigNoz setup | docker-compose profile `observability`, dashboards exported |
| Tue | OTel integration main Nuxt | `server/middleware/tracing.ts`, traces в SigNoz |
| Wed | OTel integration messenger | `messenger/core/src/tracing.ts`, traces в SigNoz |
| Thu | CI: linting + typecheck | Workflow runs на каждый PR, блокирует на errors |
| Fri | Phase 0 exit review | All checklist items done, ready для Phase 1 |

## Phase 0 exit-criteria (final checklist)

### Infrastructure
- [ ] `pnpm install` работает без errors
- [ ] `pnpm dev:infra` поднимает все сервисы docker-compose
- [ ] `pnpm test` output success на пустом project
- [ ] Turborepo кеш работает (build второй раз = instant)

### Packages
- [ ] `packages/contracts-platform/`, `contracts-domain/`, `contracts-governance/` — валидные TS packages
- [ ] `packages/design-tokens/` экспортирует tokens
- [ ] `packages/events/` имеет CloudEvents base + codegen pipeline
- [ ] `packages/ui-react/` работает в Storybook (опционально) или standalone

### Observability
- [ ] SigNoz UI доступен на `http://localhost:3301`
- [ ] Traces из main Nuxt видны в SigNoz
- [ ] Traces из messenger видны в SigNoz
- [ ] Dashboard "Service Overview" template создан

### Tooling
- [ ] `pnpm create card-type <name>` создаёт skeleton
- [ ] `pnpm create service <name> --layer N --runtime X` создаёт skeleton
- [ ] `pnpm create event <domain> <name>` создаёт schema file
- [ ] CI pipeline проходит на пустом PR за < 5 минут

### Documentation
- [ ] `docs/architecture-v6/` полный canon доступен
- [ ] Все new packages имеют README
- [ ] `docs/implementation/phase-0-*` done

### Team
- [ ] 2-3 engineer onboarded на monorepo
- [ ] Все могут запустить local stack
- [ ] Code ownership распределён (CODEOWNERS создан для каждого слоя)

## После Phase 0

Phase 1 начинается с deployment Zitadel + первых Layer 2 сервисов. Каркас готов.

## Расход времени — реалистично

- Week 1: 5 рабочих дней × 3 чел = 15 человеко-дней.
- Week 2: 15 ч-д.
- Week 3: 15 ч-д.
- **Total**: ~45 ч-д для Phase 0. Плюс 10% overhead на meetings / review. ~50 ч-д.

При команде 3 чел full-time: 3 недели реально выполнимо.
