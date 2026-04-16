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
15. [План рефакторинга (мастер-документ)](./REFACTORING_PLAN.md)
16. [Аудит соответствия target-архитектуре](./15-target-alignment-audit.md)

## Операционные отчеты
1. [Refactor tail report](./refactor-tail-report.md)
2. [Server audit report](./server-audit-report.md)

## Правило актуальности
- Текущий статус выполнения и фактические batch-изменения ведутся в `14-refactor-roadmap.md`.
- Документы 09-13 задают целевую архитектуру и порядок миграции, но не заменяют operational-log.

## Как читать этот набор документов
- `09` фиксирует target-tree и обязательные точки входа.
- `10-12` фиксируют матрицы переноса по контурам: frontend, backend/shared, messenger/services.
- `13` задает порядок волн и ограничения выполнения.
- `14` является рабочим журналом фактического прогресса.
- `REFACTORING_PLAN.md` связывает документы в одну программу рефакторинга.