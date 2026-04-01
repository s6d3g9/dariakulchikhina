# Инструкция: Реализация Material 3 (M3)

## Статус: ✅ ЗАВЕРШЕНО

Разработка концепта `m3` завершена. Базовые принципы Material You (M3) интегрированы и заменяют свойства по умолчанию (от Brutalism и Glassmorphism), сохраняя архитектурную целостность приложения.

## Реализованные элементы дизайна

### 1. Поверхности и Карточки (Surfaces & Cards)
- Глобальный фон теперь использует `var(--sys-color-surface)`.
- Отключены градиенты, блюр-эффекты (`backdrop-filter`) и прозрачности.
- Карточки (`.glass-card`) переведены в режим "Elevated/Filled Card" с фоном `surface-container-low` и `border-radius: 12px` (Medium Radius), без рамки.

### 2. Кнопки (Buttons)
- Все кнопки (`a-btn-save`, `a-btn-sm` и др.) имеют полную форму пилюли (`border-radius: 999px` или `var(--sys-radius-full)`).
- Интегрированы **M3 State Layers** с использованием псевдоэлементов `::before`:
  - Hover: `opacity: 0.08` поверх currentColor.
  - Active/Focus: `opacity: 0.12` поверх currentColor.
- Отключено масштабирование (`transform: none`) при клике, так как M3 обходится визуально State Layers.

### 3. Навигация (Navigation Drawer / Rail)
- Боковая левая панель (`.adm-sidebar`) использует плотный цвет `surface` (без прозрачности) и `border-radius: Large` только справа.
- Активный пункт меню (`.std-nav-item.active`) использует `Secondary Container` с внутренними отступами (`margin`) для формирования M3-"пилюли".

### 4. Текстовые поля (Inputs - Filled Variant)
- `glass-input` теперь выглядит как M3 Filled Field: 
  - Скругление сверху: `4px 4px 0 0`
  - Фон: `surface-container-highest`
  - Линейный нижний бордер, который утолщается при фокусе (`2px`).
  - Рамки по бокам отключены.

### 5. Диалоговые окна и Выпадающие списки (Dialogs & Menus)
- Модальные окна (`.a-modal .glass-surface`) получили увеличенное скругление Extra Large (`28px`).
- Выпадающие списки (`dropdown`) используют Extra Small радиус (`4px`) и `Elevation 2`.
- Фон: плотный `surface-container-high`, без эффектов Glassmorphism.

### 6. Таблицы и Структура 
- Таблицы (`.std-table`) лишены внешних рамок, используют систему Container lowest/low/highest. 
- Настройки текста и лейблов в формах больше не используют Brutalism прозрачность `opacity: 0.6`, а используют плотный цвет `on-surface-variant`.