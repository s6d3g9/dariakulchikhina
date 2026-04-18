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
21. [План рефакторинга (мастер-документ)](./REFACTORING_PLAN.md)

## Операционные отчеты
1. [Refactor tail report](./refactor-tail-report.md)
2. [Server audit report](./server-audit-report.md)

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