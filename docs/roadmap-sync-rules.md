# Правила синхронизации фаз и project control

> Исторический roadmap-layer удалён из текущей кодовой базы. Этот файл теперь описывает актуальный источник истины для фаз, шагов и hybrid project-control UI.

---

## 1. Канонические источники истины

Использовать нужно только эти модули:

| Источник | Назначение |
|----------|------------|
| `shared/types/catalogs.ts` | `PROJECT_STATUSES`, `PROJECT_PHASES` и остальные справочники |
| `shared/types/phase-steps.ts` | `PHASE_STEPS` с business/IT-описанием шагов по фазам |
| `shared/constants/pages.ts` | `PHASE_LABELS`, `PROJECT_PAGES`, page/phase mapping |
| `shared/types/project.ts` | `HybridControlSchema` и типы hybrid project control |
| `shared/utils/project-control.ts` | bootstrap и orchestration helper-ы project control |
| `shared/utils/project-control-timeline.ts` | timeline/date helper-ы для phase/project-control представлений |

Любые ссылки на `shared/utils/roadmap.ts`, `roadmap-templates`, `useRoadmapBus()` и `AdminRoadmap` считать устаревшими.

---

## 2. Базовые правила

1. Фаза проекта берётся из канонического `project.status` и shared phase catalogs, а не из локального массива шагов в компоненте.
2. Бизнес-описание шагов берётся из `PHASE_STEPS`, а не из локально захардкоженных строк.
3. Hybrid project-control payload должен проходить через `HybridControlSchema` / helper-ы `project-control.ts`.
4. Timeline представления должны использовать helper-ы из `project-control-timeline.ts`, а не собственные вычисления диапазонов/масштабов.
5. Локальные phase/status maps в компонентах запрещены.

---

## 3. Где это используется сейчас

| Файл | Роль |
|------|------|
| `app/components/AdminProjectControl.vue` | orchestration, checkpoints, calls, communications bootstrap |
| `app/components/AdminProjectPhaseBoard.vue` | сводка по фазам и progress board |
| `app/components/ClientTimeline.vue` | клиентский timeline и date-range визуализация |
| `shared/utils/project-control.ts` | bootstrap дефолтных фаз, checkpoints, manager agents, communication rules |
| `shared/utils/project-control-timeline.ts` | расчёт timeline rows, bounds, scales, labels |

---

## 4. Чеклист для новых phase/project-control компонентов

- Не добавлять новый standalone roadmap state/store/event bus.
- Не описывать фазы строками вручную, если они уже есть в `PROJECT_PHASES` или `PHASE_STEPS`.
- Не вычислять timeline вручную, если есть helper в `project-control-timeline.ts`.
- Не вводить отдельный CRUD шаблонов фаз без реального runtime-контракта в коде.
- Если нужен bootstrap новой структуры, расширять shared contracts и server bootstrap, а не JSON-файл с шаблонами на диске.

---

## 5. Антипаттерны

- Упоминание `roadmapTemplateKey`, `/api/roadmap-templates`, `AdminRoadmap`, `ClientRoadmap`, `useRoadmapBus()` как активной архитектуры.
- Локальные словари фаз/статусов внутри Vue-компонента вместо shared contracts.
- Отдельная storage-модель для roadmap/template слоя без подтверждённого кода в `server/` и `shared/`.

Если в документации или коде встречаются эти паттерны, их нужно либо удалить, либо пометить как historical.
