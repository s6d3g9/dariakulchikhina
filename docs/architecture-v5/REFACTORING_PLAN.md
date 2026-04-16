# План рефакторинга: Переход к целевой архитектуре v5.3

Этот файл является мастер-навигатором по рефакторингу. Полный каркас уже разложен на отдельные документы, чтобы двигаться поэтапно и без конфликтующих схем.

## Source of truth

1. Полный целевой каркас репозитория: ./09-target-repository-tree.md
2. Frontend: матрица переноса в FSD-структуру: ./10-frontend-refactor-map.md
3. Backend + Shared: матрица переноса в DDD-структуру: ./11-backend-shared-refactor-map.md
4. Messenger + Services: матрица realtime-контуров: ./12-messenger-services-refactor-map.md
5. Волны рефакторинга: ./13-refactor-waves.md
6. Рабочий roadmap исполнения: ./14-refactor-roadmap.md

## Роль этого файла
- зафиксировать общую стратегию
- связать подробные документы между собой
- определить безопасный старт миграции

Оперативная фиксация уже выполненных батчей и следующих шагов ведется в `14-refactor-roadmap.md`.

## Приоритет старта
1. Создать пустой каркас директорий и отдельный refactor runtime.
2. Вынести shared-константы, типы и pure-utils.
3. Перенести shared/ui и shared/composables фронтенда.
4. Вынести навигацию и design-system в entities.
5. Перевести auth и projects на server/modules.
6. Только потом переносить крупные widgets и contractor cabinet.

## Operational fork

Для рефакторинга уже выделяем отдельный контур:
- git-ветка refactor/architecture-v5
- PM2 конфиг ecosystem.refactor.config.cjs
- PM2 конфиг messenger/ecosystem.refactor.config.cjs
- отдельный порт приложения
- отдельная БД и отдельная Redis DB

Это позволяет вести рефакторинг без давления на production-контур.

## Current Status vs Target (2026-04-16)

- Стратегический статус: refactor-программа активна, operational-log ведется в `14-refactor-roadmap.md`.
- Зафиксированные завершения: frontend widget-shell cutover (ключевые CRM admin pages), backend projects/work-status service cutover, operational audit/tail reports.
- Открытые направления до полного target-match: окончательное выравнивание FSD слоев (`app/shared`, `app/features`), доменных server-модулей, и DB schema split.
- Правило управления риском: движение только батчами с обязательной compile/runtime валидацией и фиксацией residual-debt.