# Daria Design Studio — Архитектура Системы v5.3

Единый справочник по архитектуре монорепозитория, инфраструктуре, слоям данных и правилам интеграции сервисов.

**Стек:** Nuxt 4, Nitro/H3, Drizzle, PostgreSQL, Redis, standalone Messenger Core/Web, Communications Service, Dynamic CSSOM Design System.

## Оглавление

1. [Глобальная инфраструктура и Развертывание](./01-infrastructure.md) — Docker Compose, порты рантаймов, мониторинг и CI/CD
2. [Структура Монорепозитория](./02-monorepo-structure.md) — полирантаймовый монорепозиторий: правила изоляции и добавления новых рантаймов
3. [Слой Бэкенда (DDD)](./03-backend-layer.md) — структура `server/`, правила владения `api/modules/db/utils`
4. [Слой Фронтенда (FSD)](./04-frontend-layer.md) — структура `app/` по Feature-Sliced Design, слои `core→pages`
5. [Ключевые Архитектурные Паттерны](./05-architectural-patterns.md) — Ticket WS auth, E2EE, OCC, cursor pagination, design system, horizontal extensibility
6. [Слой Shared (Общие контракты)](./06-shared-layer.md) — правила изоляции `shared/`, единый источник DTO и констант
7. [Микросервис Мессенджера (Standalone)](./07-realtime-messenger.md) — почему standalone, структура `messenger/`, интеграция через Pub/Sub и ticket auth
8. [Скрипты и Обслуживание](./08-scripts-and-maintenance.md) — деплой, дата-миграции, сидирование; каталог скриптов в `scripts/`
9. [Полный целевой каркас репозитория](./09-target-repository-tree.md) — target-tree v5.3, обязательные точки входа по всем контурам
10. [Frontend: матрица переноса в FSD-структуру](./10-frontend-refactor-map.md) — матрица переноса компонентов из `app/components/` в FSD-слои
11. [Backend + Shared: матрица переноса в DDD-структуру](./11-backend-shared-refactor-map.md) — матрица переноса из `server/utils/` и монолитной схемы в DDD-модули
12. [Messenger + Services: матрица realtime-контуров](./12-messenger-services-refactor-map.md) — матрица bounded contexts `messenger/core` и `messenger/web` FSD
13. [Волны рефакторинга](./13-refactor-waves.md) — порядок волн 0–8, красные линии и практический старт
14. [Roadmap исполнения рефакторинга](./14-refactor-roadmap.md) — рабочий журнал батчей: что сделано, коммиты, валидация, долги
15. [Аудит соответствия target-архитектуре](./15-target-alignment-audit.md) — сверка документов 09–14 с фактической структурой репозитория
16. [Playbook расширения (новые микросервисы и приложения)](./16-extensibility-playbook.md) — чек-лист добавления нового микросервиса или публичного приложения
17. [Coding Standards: файлы, имена, LLM-friendly структура](./17-coding-standards.md) — размер файлов, naming conventions, DDD-lite module layout, FSD slice структура
18. [Repository Layer — правила разделения service и persistence](./18-repository-layer.md) — разделение service и persistence, правила `*.repository.ts`
19. [Error Handling — domain errors + HTTP mapping](./19-error-handling.md) — иерархия `DomainError`, HTTP-маппинг, wire-format ответов
20. [Config + Logging — fail-fast конфигурация и structured логи](./20-config-and-logging.md) — Zod-валидация env, pino-логирование, AsyncLocalStorage correlation
21. [Agent Orchestration & Claude CLI Sync](./21-agent-orchestration.md) — дерево agent-runs, CLI bridge, WS tree-стрим, UI в `messenger/web`
22. [Skill Bundles — per-kind плагины для воркеров](./22-skill-bundles.md) — bundle catalogue по worker-kind, dashboard toggle UI
23. [Project-Centric Messenger](./23-project-centric-messenger.md) — проекты, коннекторы, агенты, skills/plugins/MCP, bootstrap composer

## Мастер-документ рефакторинга

[План рефакторинга](./REFACTORING_PLAN.md) — мастер-навигатор по рефакторингу, связывает стратегию с детальными документами 09–14.

## Операционные шаблоны

[Task Templates](../task-templates/README.md) — canonical TASK.md templates for the composer → orchestrator → workers pipeline. Includes feature, bug, refactor, and tests templates with acceptance criteria, architectural guardrails, and v5 doc references. See [§22 Skill Bundles](./22-skill-bundles.md) for how `kind:` field routes tasks to the right worker and skill bundle.

## Операционные отчеты

1. [Refactor tail report](./refactor-tail-report.md) — отчёт о закрытии bridge-путей и нормализации compat-экспортов (2026-04-16)
2. [Server audit report](./server-audit-report.md) — аудит `server/api/**` и projects hot-path: N+1, валидация body, prepared queries

## Правило актуальности

- Текущий статус выполнения и фактические batch-изменения ведутся в `14-refactor-roadmap.md`.
- Документы 09–13 задают целевую архитектуру и порядок миграции, но не заменяют operational-log.

## Как читать этот набор документов

- `01–08` — стратегические основы (инфраструктура, слои, паттерны).
- `09` — фиксирует target-tree и обязательные точки входа.
- `10–12` — матрицы переноса по контурам: frontend, backend/shared, messenger/services.
- `13` — задает порядок волн и ограничения выполнения.
- `14` — рабочий журнал фактического прогресса.
- `15` — аудит соответствия фактической структуры target-архитектуре.
- `16` — playbook расширения: как добавить новый микросервис или новое приложение без нарушения инвариантов.
- `REFACTORING_PLAN.md` — связывает документы в одну программу рефакторинга.
