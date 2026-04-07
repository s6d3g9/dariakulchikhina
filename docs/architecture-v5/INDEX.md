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
14. [План рефакторинга (мастер-документ)](./REFACTORING_PLAN.md)