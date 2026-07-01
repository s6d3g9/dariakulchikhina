# packages/testing/fractal-harness

Структурный тест-прогон для card-types. Гарантирует инвариант I19 — фрактальную самоподобность UX.

## Что делает

1. Для каждого зарегистрированного card-type рендерит шесть сценариев:
   - Instance-view × 4 panels (`top`, `left`, `right`, `bottom`)
   - Type-view × 4 panels
2. Сравнивает **структурные snapshot'ы** — не пиксели, а дерево компонентов, роли, порядок секций.
3. Проверяет наличие всех 6 секций CardView в каноничном порядке.
4. Проверяет наличие всех 3 секций PanelView в каждой панели.
5. Проверяет, что жесты зарегистрированы только из списка 6 канонических.
6. Проверяет, что переключатели — только `InversionButton` и `ModeToggle`.
7. Проверяет, что `timeline` определён.

## Запуск

```bash
pnpm -C packages/testing/fractal-harness test
# или per-card-type:
pnpm -C packages/card-types/car test:fractal
```

CI запускает на каждый PR, который трогает `packages/card-types/*`, `packages/ui-react`, или `packages/shell-*`.

## Формат snapshot

```json
{
  "cardType": "car",
  "view": "instance",
  "panel": "left",
  "tree": [
    { "component": "PanelHeader",  "children": [{"component": "Title"}, {"component": "InversionButton"}] },
    { "component": "PanelStream",  "children": [
      { "component": "Section", "role": "shop" },
      { "component": "Section", "role": "budget" },
      { "component": "Section", "role": "service-history" }
    ]},
    { "component": "PanelFooter", "children": [{"component": "LoadMore"}] }
  ],
  "gestures": ["swipe-x", "swipe-y", "tap", "long-press", "pinch", "inversion"],
  "toggles": ["InversionButton", "ModeToggle"]
}
```

## Что НЕ проверяется

- Конкретные тексты (локализация).
- Конкретные картинки (data).
- Точный порядок секций внутри SectionStack (card-type может варьировать).
- Пиксельная идентичность (пусть card-type отличаются данными).

## Эталонный snapshot

Первый card-type, проходящий fractal-harness, становится эталоном. Каждый новый card-type сверяется с эталоном по структуре (список требуемых компонентов и секций).

Эталон — `packages/card-types/person-profile/` (создаётся в Фазе 3 первым).

## Обновление эталона

Изменение эталона — отдельный PR с ревью архитекторов + обновление `docs/architecture-v6/17-fractal-ux.md`. Не каждый card-type может «переопределить эталон».

## Статус

Placeholder-скелет. Реализация — Фаза 3 вместе с первым card-type.
