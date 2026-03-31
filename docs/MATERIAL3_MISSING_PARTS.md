# Инструкция: Недостающие элементы Material 3 (M3)

## Анализ текущего состояния (`html[data-concept="m3"]`)
Текущая реализация подключает базовые переменные для Elevaton и Surface контейнеров, а также скругления кнопок (Pill). Тем не менее, для полного соответствия спецификации M3 требуется доработать компоненты.

## 1. Карточки (Cards)
**Спецификация:** 
M3 имеет 3 типа карточек: Elevated (светлый тональный фон + легкая тень), Filled (более темный тональный фон без тени), Outlined (бордер). Стандартный радиус: `12px` (Medium).
**Наше текущее состояние:** 
`.glass-card` имеет тень `elevation-level1`, но не имеет специфичного M3 тонального фона, поэтому карточки могут сливаться.
**План реализации:**
Добавить в правило M3 для `.glass-card`:
- `background: var(--sys-color-surface-container-low, #f7f7f9);`
- Отключить бордеры: `border: none;`
- Зафиксировать радиус: `border-radius: var(--sys-radius-md);`

## 2. Диалоговые окна (Dialogs / Modals)
**Спецификация:** 
Массивные формы, радиус `28px` (Extra Large), фон `surface-container-high`, Elevation 3. Без эффекта размытия (blur) на фоне для самого окна (в отличие от Liquid Glass).
**Наше текущее состояние:**
Окна наследуют стили от Glass, что делает их полупрозрачными с 16px скруглением.
**План реализации:**
Переопределить `.a-modal .glass-surface` в M3:
- `border-radius: var(--sys-radius-xl, 28px) !important;`
- `background: var(--sys-color-surface-container-high) !important;`
- `box-shadow: var(--sys-elevation-level3) !important;`

## 3. Навигация (Navigation Rail & Items)
**Спецификация:**
Активный пункт меню имеет "Pill" индикатор (заполненная овальная плашка) вокруг иконки или текста.
**Наше текущее состояние:**
Фон прозрачный, активный элемент подчеркивается или просто текст становится ярче.
**План реализации:**
Для `html[data-concept="m3"] .std-nav-item--active`:
- Добавить полупрозрачный фон заливки: `background: var(--sys-color-surface-container-highest) !important;`
- Сделать скругление полным: `border-radius: 100px !important;`
- Убрать лишние подчеркивания `border-bottom`.
Для `.std-nav-item`:
- Установить `margin: 2px 8px;`, чтобы плашка не прилипала к краям.

## 4. Поля ввода (Inputs)
**Спецификация:**
M3 Filled TextField: Скругления только сверху (`4px 4px 0 0`), внизу прямая линия, активный бордер снизу (underline). Фон — `surface-container-highest`.
**Наше текущее состояние:**
`.glass-input` имеет круговые бордеры или зависит от `--input-radius`. Настройки `useDesignSystem` ставят радиус 4px, но это применяется ко всем 4 углами и бордер идет со всех сторон.
**План реализации:**
Для `html[data-concept="m3"] .glass-input`:
- Скругление: `border-radius: 4px 4px 0 0 !important;`
- Бордеры: `border: none !important; border-bottom: 1px solid var(--sys-color-on-surface-variant) !important;`
- Фон: `background: var(--sys-color-surface-container-highest) !important;`
- При фокусе (`:focus`): `border-bottom: 2px solid var(--glass-text) !important;`

## 5. Эффекты наведения (State Layers)
**Спецификация:**
Hover = 8% opacity поверх, Focus/Pressed = 12% opacity.
**Наше текущее состояние:**
Опирается на общие токены системы `useDesignSystem` которые генерируют `:hover` для кнопок, но часто делают `opacity: 0.8` (выцветание). В M3 кнопки остаются плотными, а сверху накладывается цвет.
**План реализации:**
Добавить к кнопкам в M3 эффект через `::after` (State Layer), либо переопределить `:hover` так, чтобы фон становился чуть темнее, а не прозрачнее.

## 6. Отступы (Spacing Grid)
Строго кратные 4px. Текущие отступы в `main.css` для `.ent-layout` могут иметь 14px и т.д.
Это будет решаться через общие переменные темы `--ds-grid-gap`, которые мы уже перевели с 10 на 16 в M3 пресете.