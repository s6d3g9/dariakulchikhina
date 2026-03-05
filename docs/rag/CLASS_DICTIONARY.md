# CLASS_DICTIONARY — все CSS-классы дизайн-системы

> RAG-файл. Перед тем как писать свой CSS — проверь, есть ли готовый класс.
> Все классы определены в `app/assets/css/main.css` и работают с темами.

---

## 1. Поверхности

| Класс | Назначение | Токены |
|-------|-----------|--------|
| `.glass-page` | Фон страницы с текстурой | `--glass-page-bg` |
| `.glass-surface` | Полупрозрачная панель | `--glass-bg`, `--glass-blur`, `--glass-border` |
| `.glass-card` | Карточка (= surface + shadow + padding) | `--card-radius`, `--ds-shadow` |
| `.glass-chip` | Тег/чип/пилюля | `--chip-radius`, `--chip-bg-opacity` |
| `.glass-dropdown` | Выпадающий список | `--dropdown-bg`, `--dropdown-blur`, `--dropdown-shadow` |

---

## 2. Инпуты

| Класс | Назначение | Токены |
|-------|-----------|--------|
| `.glass-input` | Стандартное поле ввода | `--input-radius`, `--input-padding-h`, `--input-padding-v` |
| `.glass-input--inline` | Ячейка таблицы (без рамки) | border-bottom only |
| `.glass-input--xs` | Узкий инпут (56px) | max-width |
| `.glass-input--sm` | Малый инпут (100px) | max-width |
| `.glass-input--md` | Средний инпут (200px) | max-width |

Также авто-стилизованы: `input[type="text"]`, `input[type="email"]`, `input[type="number"]`, `textarea`, `select`.

---

## 3. Кнопки

| Класс | Назначение | Вид |
|-------|-----------|-----|
| `.a-btn-save` | Основное действие (Сохранить, Подтвердить) | `--btn-bg` фон, `--btn-color` текст |
| `.a-btn-sm` | Малое действие (Добавить, Отмена) | Контурная, полупрозрачная |
| `.a-btn-sm.a-btn-danger` | Деструктивное действие (Удалить) | Красная обводка |
| `.a-btn-ai` | AI действие (Генерация) | Фиолетовый градиент |
| `.a-btn-sm--primary` | Малая акцентная | Акцент color |

Все кнопки реагируют на: `--btn-radius`, `--btn-weight`, `--btn-transform`, `--btn-tracking`, `--btn-py`, `--btn-px`, `--btn-font-size`.

---

## 4. Статусы

| Класс | Текст | Фон |
|-------|-------|-----|
| `.ws-status--pending` | `--ws-color-pending` | `--ws-bg-pending` |
| `.ws-status--planned` | `--ws-color-planned` | `--ws-bg-planned` |
| `.ws-status--progress` | `--ws-color-progress` | `--ws-bg-progress` |
| `.ws-status--done` | `--ws-color-done` | `--ws-bg-done` |
| `.ws-status--paused` | `--ws-color-paused` | `--ws-bg-paused` |
| `.ws-status--cancelled` | `--ws-color-cancelled` | `--ws-bg-cancelled` |
| `.ws-status--skipped` | `--ws-color-skipped` | `--ws-bg-skipped` + opacity 0.5 |

Все используют `border-radius: var(--status-pill-radius, 999px)`.

---

## 5. Навигация — Admin sidebar

| Класс | Назначение |
|-------|-----------|
| `.ent-layout` | Flex-контейнер sidebar + main |
| `.ent-sidebar` | Боковая панель |
| `.ent-sidebar-head` | Шапка sidebar |
| `.ent-sidebar-title` | Заголовок |
| `.ent-search` | Поиск в sidebar |
| `.ent-nav-item` | Пункт навигации |
| `.ent-nav-item--active` | Активный пункт |
| `.ent-nav-avatar` | Аватар в пункте |
| `.ent-nav-name` | Имя в пункте |
| `.ent-nav-sub` | Подзаголовок |
| `.ent-nav-badge` | Бейдж-счетчик |
| `.ent-sidebar-foot` | Подвал sidebar |
| `.ent-sidebar-add` | Кнопка «+ добавить» |
| `.ent-main` | Основная область |
| `.ent-empty-detail` | Пустое состояние |

---

## 6. Навигация — Кабинет (подрядчик/продавец)

| Класс | Назначение |
|-------|-----------|
| `.cab-body` | Обёртка |
| `.cab-sidebar` | Боковая панель |
| `.cab-nav` | Навигация |
| `.cab-nav-item` | Пункт |
| `.cab-nav-item.active` | Активный пункт |
| `.cab-main` | Основная область |
| `.cab-inner` | Внутренний контейнер |
| `.cab-loading` | Загрузка |
| `.cab-empty` | Пустое состояние |
| `.cab-section-title` | Заголовок секции |
| `.cab-cta` | Call-to-action блок |
| `.cab-form` | Форма |
| `.cab-filters` | Панель фильтров |
| `.cab-filter-btn` | Кнопка фильтра |
| `.cab-filter-btn.active` | Активный фильтр |

---

## 7. Навигация — Standard (std)

| Класс | Назначение |
|-------|-----------|
| `.std-sidenav` | Стандартная боковая навигация |
| `.std-nav` | Список ссылок |
| `.std-nav-group-label` | Заголовок группы |
| `.std-nav-item` | Пункт |
| `.std-nav-item--active` | Активный пункт |

---

## 8. Формы / Утилиты

| Класс | Назначение |
|-------|-----------|
| `.u-form-section` | Секция формы (grid 2 колонки) |
| `.u-form-section h3` | Заголовок секции |
| `.u-field` | Обёртка поля |
| `.u-field__label` | Label поля |
| `.u-field--full` | Поле на всю ширину |
| `.u-form-foot` | Подвал формы с кнопками |
| `.u-empty` | Пустое состояние |

---

## 9. Загрузка

| Класс | Назначение |
|-------|-----------|
| `.ent-content-loading` | Skeleton-линии |

---

## 10. Прочие уведомления

| Класс | Назначение |
|-------|-----------|
| `.cab-inline-error` | Инлайн ошибка (красный) |
| `.cab-inline-success` | Инлайн успех (зелёный) |
| `.cab-task-overdue` | Просроченная задача (красный) |

---

## 11. Правила использования

1. **Всегда проверяй этот словарь** перед написанием кастомного CSS
2. **Не дублируй** — если есть `.glass-card`, не пиши свой `background: var(--glass-bg); border-radius:…`
3. **Не переопределяй** базовые классы в scoped styles — это сломает темы
4. **Комбинируй**: `<div class="glass-card my-specific-layout">` — свой класс для layout, glass-card для стиля
5. **Кнопки**: не пиши `<button style="…">`, используй `.a-btn-save` / `.a-btn-sm` / `.a-btn-danger`
6. **Статусы**: не пиши `color: green`, используй `.ws-status--done`
