# Единые правила синхронизации дорожной карты (Roadmap)

> Этот файл — **обязательный регламент**. Все компоненты, показывающие этапы/фазы проекта,
> должны строго следовать этим правилам. Нарушение = рассинхронизация между экранами.

---

## 1. Каноничные статусы этапов

Единственные допустимые значения статуса этапа roadmap:

| Ключ          | Русская подпись | Иконка | CSS-класс          |
|---------------|-----------------|--------|---------------------|
| `pending`     | ожидание        | `○`    | `rm-status--pending`  |
| `in_progress` | в работе        | `◉`    | `rm-status--progress` |
| `done`        | готово          | `✓`    | `rm-status--done`     |
| `skipped`     | пропущено       | `—`    | `rm-status--skipped`  |

### Правило #1: Любой статус из БД → `normalizeRoadmapStatus()`

Нельзя напрямую сравнивать `stage.status === 'done'` и т.д.
Всегда проходим через `normalizeRoadmapStatus()` из `shared/utils/roadmap.ts`.

---

## 2. Единые UI-хелперы

Файл: `shared/utils/roadmap.ts` — единственный источник истины.

### Функции (экспортируются):

| Функция | Где используется | Что делает |
|---------|------------------|------------|
| `normalizeRoadmapStatus(raw)` | API + UI | Приводит любой legacy-статус к каноничному |
| `normalizeRoadmapStages(stages)` | UI (списки) | Массово нормализует массив этапов |
| `roadmapStatusLabel(status)` | UI (подписи) | `pending` → `'ожидание'`, и т.д. |
| `roadmapStatusIcon(status)` | UI (точки/иконки) | `pending` → `'○'`, и т.д. |
| `roadmapStatusCssClass(status)` | UI (классы) | `pending` → `'rm-status--pending'`, и т.д. |
| `deriveProjectPhaseFromRoadmap(stages)` | UI (фаза проекта) | Вычисляет текущую фазу из этапов |
| `roadmapPhaseFromStageKey(key)` | Маппинг этапа→фазы | Определяет фазу по ключу сценария |
| `roadmapDoneCount(stages)` | UI (счётчик) | Кол-во завершённых этапов |

### Правило #2: Локальные маппинги запрещены

Запрещено определять в компонентах локальные функции вроде:
```ts
// ❌ ЗАПРЕЩЕНО — приведёт к рассинхрону
function localStatusLabel(s) { return { pending: 'ожидание', ... }[s] }
function localRoadmapClass(s) { if (s === 'done') return 'done'; ... }
```

Вместо этого:
```ts
// ✅ ПРАВИЛЬНО — всегда из shared
import { roadmapStatusLabel, roadmapStatusCssClass } from '~~/shared/utils/roadmap'
```

---

## 3. Единые CSS-классы

### 3.1 Цветовые переменные (определяются в `main.css`)

```css
:root {
  --rm-color-pending:  #9ca3af;
  --rm-color-progress: #f59e0b;
  --rm-color-done:     #16a34a;
  --rm-color-skipped:  #d1d5db;

  --rm-bg-pending:     rgba(156, 163, 175, 0.10);
  --rm-bg-progress:    rgba(245, 158, 11, 0.12);
  --rm-bg-done:        rgba(22, 163, 74, 0.10);
  --rm-bg-skipped:     rgba(209, 213, 219, 0.08);
}
```

### 3.2 CSS-классы статусов (определяются в `main.css`)

```css
.rm-status--pending  { color: var(--rm-color-pending);  background: var(--rm-bg-pending);  }
.rm-status--progress { color: var(--rm-color-progress); background: var(--rm-bg-progress); }
.rm-status--done     { color: var(--rm-color-done);     background: var(--rm-bg-done);     }
.rm-status--skipped  { color: var(--rm-color-skipped);  background: var(--rm-bg-skipped);  opacity: .5; }
```

### 3.3 Точки (dots)

Класс точки = `rm-dot rm-dot--{status}`, где `{status}` — результат `roadmapStatusCssClass()`.

### 3.4 Соединительные линии (segments)

```css
.rm-seg            { height: 2px; border-radius: 999px; }
.rm-seg--pending   { background: var(--rm-color-pending);  opacity: .2; }
.rm-seg--progress  { background: var(--rm-color-progress); opacity: .7; }
.rm-seg--done      { background: var(--rm-color-done);     opacity: .8; }
.rm-seg--skipped   { background: var(--rm-color-skipped);  opacity: .2; }
```

### 3.5 Пилюли (pills/badges)

Класс пилюли = `rm-pill rm-pill--{status}`.

### Правило #3: Имена CSS-классов

Префикс для всех глобальных roadmap-классов: `rm-`.
Scoped классы в компонентах допускаются, но ДОЛЖНЫ наследовать
переменные `--rm-color-*` / `--rm-bg-*`.

---

## 4. Фазы проекта (Project Phases)

Фазы проекта определены в `shared/types/catalogs.ts` (`PROJECT_PHASES`).
Текущая фаза вычисляется только через `deriveProjectPhaseFromRoadmap()`.

### Правило #4: Фолбэк

```
currentPhase = deriveProjectPhaseFromRoadmap(roadmapStages)
            ?? project.status
            ?? 'lead'
```

Фолбэк на `project.status` разрешён **только** если roadmap пуст (0 этапов).

### Правило #5: Этап без stageKey

Если у этапа нет `stageKey`, фаза определяется по порядковому индексу:
```
index 0 → lead
index 1 → concept
index 2 → working_project
index 3 → procurement
index 4 → construction
index 5 → commissioning
```

---

## 5. Где что подключено

| Файл | Что рендерит | Импорт из shared |
|------|-------------|------------------|
| `server/api/projects/index.get.ts` | roadmapSummary в списке проектов | `normalizeRoadmapStatus` |
| `server/api/projects/[slug]/roadmap.get.ts` | API чтения roadmap | `normalizeRoadmapStatus` |
| `server/api/projects/[slug]/roadmap.put.ts` | API записи roadmap | `normalizeRoadmapStatus` |
| `app/pages/admin/index.vue` | Точки roadmap на карточках | `roadmapStatusCssClass`, `roadmapStatusLabel`, `roadmapStatusIcon`, `roadmapDoneCount` |
| `app/components/AdminRoadmap.vue` | Редактор этапов | `normalizeRoadmapStatus` |
| `app/components/AdminProjectPhase.vue` | Полоса фаз в проекте | `PROJECT_PHASES` |
| `app/pages/client/[slug]/index.vue` | Полоса фаз в кабинете | `deriveProjectPhaseFromRoadmap` |
| `app/components/ClientTimeline.vue` | Таймлайн этапов | `normalizeRoadmapStages`, `roadmapStatusLabel`, `roadmapStatusIcon`, `roadmapStatusCssClass` |

---

## 6. Чеклист для новых компонентов

Перед merge любого PR с roadmap-компонентом:

- [ ] Нет локальных маппингов статусов (statusLabel, statusIcon, roadmapClass).
- [ ] Все статусы проходят через `normalizeRoadmapStatus()`.
- [ ] Текущая фаза — из `deriveProjectPhaseFromRoadmap()`.
- [ ] CSS-классы используют `--rm-color-*` / `--rm-bg-*` переменные.
- [ ] Подписи, иконки, CSS-классы берутся из `shared/utils/roadmap.ts`.
- [ ] На одном проекте в админке, редакторе roadmap и кабинете клиента совпадают:
  - активный этап / фаза;
  - цвет и состояние точки;
  - подпись статуса;
  - иконка в точке.

---

## 7. Антипаттерны (ЗАПРЕЩЕНО)

```ts
// ❌ Прямое сравнение raw-статуса
if (stage.status === 'done') return '✓'

// ❌ Локальный маппинг
const m = { pending: 'ожидание', in_progress: 'в работе' }

// ❌ Локальные CSS-классы без переменных
.my-dot--done { color: #15803d; background: rgba(34,197,94,.15); }

// ❌ Фаза из project.status при наличии roadmap
const phase = project.status  // если roadmap не пуст — это ОШИБКА
```

```ts
// ✅ Правильно
import {
  normalizeRoadmapStatus,
  roadmapStatusLabel,
  roadmapStatusIcon,
  roadmapStatusCssClass,
  deriveProjectPhaseFromRoadmap,
} from '~~/shared/utils/roadmap'

const normalized = normalizeRoadmapStatus(stage.status)
const label = roadmapStatusLabel(normalized)
const icon = roadmapStatusIcon(normalized)
const cls = roadmapStatusCssClass(normalized)
const phase = deriveProjectPhaseFromRoadmap(stages) ?? project.status ?? 'lead'
```
