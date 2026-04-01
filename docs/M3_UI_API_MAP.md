# Карта API и план M3 редизайна (M3 UI API MAP)

В этом документе зафиксировано пошаговое приведение интерфейса к стандарту Material 3 (M3). Текущий дизайн — «каша», поэтому мы унифицируем сущности.

## Оглавление компонентов
1. **Buttons (Кнопки)** `[ТЕКУЩИЙ ЭТАП]`
2. **Inputs (Поля ввода)**
3. **Cards & Surfaces (Контейнеры)**
4. **Dialogs & Modals (Модальные окна)**
5. **Navigation (Меню)**

---

## 1. Buttons (Кнопки) [В РАБОТЕ В ПЕРВУЮ ОЧЕРЕДЬ]

### Старое API
В проекте используются классы-франкенштейны из разных этапов:
- `.a-btn-save`
- `.a-btn-md`, `.a-btn-sm`, `.a-btn-danger`
- `.cab-cta-btn`, `.a-btn-ai`
- Намешаны паддинги, радиусы, бордеры без единого M3 токена.

### Новое M3 API
**Свойства (CSS переменные M3):** Форма `var(--md-sys-shape-corner-full)` = `100px`. Высота `40px` (стандарт M3).

Мы внедряем следующие концепции (и заменяем старые стили в `main.css`):
1. **M3 Filled Button:** Основное действие (e.g., Сохранить, Отправить).
2. **M3 Tonal Button:** Второстепенное действие (e.g., Сгенерировать AI, Отмена).
3. **M3 Outlined Button:** Альтернативное действие без заливки.
4. **M3 Text Button:** Действия с низким приоритетом (в таблицах, мелких списках).

---

## 2. Inputs (Поля ввода) [ПЛАН]

### Старое API
- `.glass-input`, `.glass-input--inline`, инпуты без классов, использующие `.u-field`.

### Новое M3 API
- **Filled Text Field:** Фон `surface-variant`, нижняя линия (border-bottom), при фокусе толстая цветная линия `primary`.
- Радиус только сверху `var(--md-sys-shape-corner-extra-small-top)` `4px 4px 0 0`.

---

## 3. Cards & Surfaces [ПЛАН]

### Старое API
- `.glass-card`, `.glass-surface` (имеют разрозненные тени, background-filters).

### Новое M3 API
- Будут зависеть от Elevation `level1` - `level5`.
- Убирается `backdrop-filter` для плоских элементов M3. Цвет фона `surface-container-low` или `surface-container-high`.
- Радиус `var(--md-sys-shape-corner-medium)` = `12px` или `16px`.