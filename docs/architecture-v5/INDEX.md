# Daria Design Studio — Архитектура Системы v5.3

Единый справочник по архитектуре монорепозитория, инфраструктуре, слоям данных и правилам интеграции сервисов.

**Стек:** Nuxt 4, Nitro/H3, Drizzle, PostgreSQL, Redis, standalone Messenger Core/Web, Communications Service, Dynamic CSSOM Design System.

## Оглавление
1. [Глобальная инфраструктура и Развертывание](./01-infrastructure.md)
2. [Структура Монорепозитория](./02-monorepo-structure.md)
3. [Слой Бэкенда (DDD)](./03-backend-layer.md)
4. [Слой Фронтенда (FSD)](./04-frontend-layer.md)
5. [Ключевые Архитектурные Паттерны](./05-architectural-patterns.md)
6. [Слой Shared (Общие контракты)](./06-shared-layer.md)
7. [Микросервис Мессенджера (Standalone)](./07-realtime-messenger.md)
8. [Скрипты и Обслуживание](./08-scripts-and-maintenance.md)
9. [Полный целевой каркас репозитория](./09-target-repository-tree.md)
10. [Frontend: матрица переноса в FSD-структуру](./10-frontend-refactor-map.md)
11. [Backend + Shared: матрица переноса в DDD-структуру](./11-backend-shared-refactor-map.md)
12. [Messenger + Services: матрица realtime-контуров](./12-messenger-services-refactor-map.md)
13. [Волны рефакторинга](./13-refactor-waves.md)
14. [Roadmap исполнения рефакторинга](./14-refactor-roadmap.md)
15. [Аудит соответствия target-архитектуре](./15-target-alignment-audit.md)
16. [Playbook расширения (новые микросервисы и приложения)](./16-extensibility-playbook.md)
17. [Coding Standards: файлы, имена, LLM-friendly структура](./17-coding-standards.md)
18. [Repository Layer — правила разделения service и persistence](./18-repository-layer.md)
19. [Error Handling — domain errors + HTTP mapping](./19-error-handling.md)
20. [Config + Logging — fail-fast конфигурация и structured логи](./20-config-and-logging.md)
21. [Agent Orchestration & Claude CLI Sync — дерево runs, CLI bridge, WS tree-стрим](./21-agent-orchestration.md)
22. [Skill Bundles — per-kind плагины для воркеров](./22-skill-bundles.md)
23. [Project-Centric Messenger — проекты, коннекторы, скилы, MCP, bootstrap composer](./23-project-centric-messenger.md)
24. [AIDev Module — Project-Centric Dev Flow inside Messenger](./24-aidev-module.md)
24b. [Arch Audit: Project-Centric Messenger (2026-04-20)](./24-arch-audit-2026-04-20.md)
28. [Code Excellence — эволюция паттернов модулей до идеала](./28-code-excellence-plan.md)
25. [План рефакторинга (мастер-документ)](./REFACTORING_PLAN.md)

## Операционные шаблоны

[Task Templates](../task-templates/README.md) — canonical TASK.md templates for the composer → orchestrator → workers pipeline. Includes feature, bug, refactor, and tests templates with acceptance criteria, architectural guardrails, and v5 doc references. See [§22 Skill Bundles](./22-skill-bundles.md) for how `kind:` field routes tasks to the right worker and skill bundle.

[ADR Index](./adr/README.md) — Architecture Decision Records: cursor pagination, WS ticket auth, DDD-lite, OCC versioning, soft-delete.

## Операционные отчеты
1. [Refactor tail report](./refactor-tail-report.md)
2. [Server audit report](./server-audit-report.md)
3. [Messenger Runbook](./messenger-runbook.md)
4. [Error Catalogue](./error-catalogue.md)

## Тактические справочники (RAG)
- [Backend Guide](../rag/BACKEND_GUIDE.md) — DDD-lite backend conventions, тонкие handlers, domain modules
- [Class Dictionary](../rag/CLASS_DICTIONARY.md) — словарь доменных классов и типов
- [Component Audit](../rag/COMPONENT_AUDIT.md) — инвентаризация компонентов
- [Dark Mode](../rag/DARK_MODE.md) — реализация тёмной темы
- [Drizzle Patterns](../rag/DRIZZLE_PATTERNS.md) — паттерны Drizzle ORM-запросов
- [Pinia Stores](../rag/PINIA_STORES.md) — управление состоянием
- [Redis Patterns](../rag/REDIS_PATTERNS.md) — кэш и Pub/Sub паттерны
- [Refactor Patterns](../rag/REFACTOR_PATTERNS.md) — рецепты повторяющихся рефакторингов
- [Tailwind Tokens](../rag/TAILWIND_TOKENS.md) — карта Tailwind-токенов
- [Token Map](../rag/TOKEN_MAP.md) — карта дизайн-системных токенов
- [Vue/Nuxt Guide](../rag/VUE_NUXT_GUIDE.md) — конвенции Nuxt 4 / Vue 3

## Правило актуальности
- Текущий статус выполнения и фактические batch-изменения ведутся в `14-refactor-roadmap.md`.
- Документы 09-13 задают целевую архитектуру и порядок миграции, но не заменяют operational-log.

## Как читать этот набор документов
- `01-08` — стратегические основы (инфраструктура, слои, паттерны).
- `09` — фиксирует target-tree и обязательные точки входа.
- `10-12` — матрицы переноса по контурам: frontend, backend/shared, messenger/services.
- `13` — задает порядок волн и ограничения выполнения.
- `14` — рабочий журнал фактического прогресса.
- `15` — аудит соответствия фактической структуры target-архитектуре.
- `16` — playbook расширения: как добавить новый микросервис или новое приложение без нарушения инвариантов.
- `REFACTORING_PLAN.md` — связывает документы в одну программу рефакторинга.