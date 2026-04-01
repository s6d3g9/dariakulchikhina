# Правила реализации и список элементов дизайна Material 3 (M3)

## 0. Идеология перехода к M3 (От старого к новому)
Текущие темы, такие как `Glassmorphism` и `Brutalism`, строились на жестко заданных границах, тенях и `backdrop-filter`. Мы переводим корневые стили (base components) на архитектуру **Material 3 (M3)**.

*   Никаких прозрачных подложек с размытием (blur) в режиле M3.
*   Строгие рамки высоты и скругления `border-radius`.
*   Интерактивные состояния обеспечиваются наложениями цвета (`opacity` поверх `currentColor`).

---

## 1. Базовые эффекты и состояния (Effects & States)
В M3 мы жестко отказываемся от нестандартных приемов.

*   **Elevation (Высота/Тени):** 5 уровней теней (от `--sys-elevation-level1` до `level5`). Поверхности должны иметь сплошной цвет фона (`--sys-color-surface` или `--sys-color-surface-container`).
*   **State Layers (Состояния - Ripple/Hover):** Визуальный отклик обеспечивается полупрозрачным `::before` слоем (сплошная заливка `currentColor`):
    *   **Hover**: 8% opacity (`0.08`).
    *   **Focus/Pressed**: 12% opacity (`0.12`).
*   **Transitions (Анимации):** Стандарт: `0.2s cubic-bezier(0.2, 0, 0, 1)`.
*   **Disabled**: Убирается `transform: scale(0.95)` на `:active` везде.

---

## 2. Формы и Радиусы (Shapes - Tokens)
*   **Full (100px):** Кнопки (Filled, Tonal, Outlined), Pills (вкладки навигации), Чипы.
*   **Extra Large (28px):** Модальные окна (Dialogs), Bottom Sheets, Большие карточки.
*   **Medium (12px - 16px):** Обычные формы, карточки (`.glass-card`), контейнеры, виджеты.
*   **Extra Small Top (4px 4px 0 0):** Текстовые поля (Filled Inputs), табы, вкладки.

---

## 3. Типографика (Typography)
*   Используется `Sentence case` (Title case в некоторых заголовках — никаких UPPERCASE кнопок по умолчанию).
*   **Label/Button:** `font-weight: 500`, `letter-spacing: 0.1px`, `font-size: 14px`.
*   **Body:** `font-weight: 400`, `font-size: 14px/16px`.

---

## 4. Список UI Элементов для рефакторинга (API Map)

### ✅ 1. Buttons (Кнопки) [ЗАВЕРШЕНО В ПРЕДЫДУЩЕМ ЭТАПЕ]
Переведены на Full Shape, State Layers, Height 40px/32px. Полностью унифицированы под единый дизайн.

### 🔄 2. Inputs (Поля ввода) [ПРОЦЕСС РЕФАКТОРИНГА]
*   **Текущие классы:** `.glass-input`, `textarea`, `.u-field`.
*   **M3 Изменения:** Переводим в **M3 Filled TextField**. Заливка `surface-variant` или `surface-container-highest`, прямая линия внизу (`border-bottom: 1px solid outline`). При фокусе линия выделяется `2px solid primary`. Убираем эффекты `box-shadow`/blur внутри.
*   **Padding/Height:** Высота 56px для одиночного `input`, радиус `4px 4px 0 0`.

### ⏳ 3. Cards (Карточки и поверхности)
*   **Текущие классы:** `.glass-card`, `.glass-surface`.
*   **M3 Изменения:** Удаляем `backdrop-filter` если включен M3. Ставим сплошной `surface-container-low` или `surface`. Радиус `12px` (Medium Shape). Для Elevated карт добавляем тень `var(--sys-elevation-level1)`.

### ⏳ 4. Dialogs & Modals (Диалоги)
*   **Текущие классы:** `.glass-modal`, `.admin-modal`.
*   **M3 Изменения:** Радиус `28px` (Extra Large Shape). Backdrop scrim темный `rgba(0,0,0,0.5)`, цвет окна `surface-container-high`. Минимальные паддинги по краям `24px`.

### ⏳ 5. Navigation (Боковое меню)
*   **Текущие классы:** `.adm-sidebar`, Sidebar items.
*   **M3 Изменения:** Активный пункт навигации (`.active`) должен быть в форме Pill (`border-radius: 100px`) на фоне `secondary-container`, текст `on-secondary-container`. Иконки и текст без теней.
