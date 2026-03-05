# UI Rules — справочник для разработки

> Компактная выжимка из `UI_INTERFACE.md`. Читай перед любой правкой компонентов.

## Стек

Nuxt 3 · Vue 3 · CSS custom properties · Glass morphism · 5 тем · Dark mode

## Роли → маршруты

| Роль       | Login              | Кабинет                     | Layout         | Middleware     |
|------------|--------------------|-----------------------------|----------------|----------------|
| Дизайнер   | `/admin/login`     | `/admin` → `/admin/projects/[slug]` | `admin.vue` | `admin.ts`  |
| Клиент     | `/project/login`   | `/project/[slug]`           | встроен в страницу | `project.ts` |
| Подрядчик  | `/contractor/login`| `/contractor/[id]`          | `contractor.vue` | `contractor.ts` |

## Примитивы (используй ТОЛЬКО эти)

| Элемент           | Класс                          | Когда                              |
|-------------------|--------------------------------|------------------------------------|
| Поверхность       | `.glass-surface` / `.glass-card` | Панели, карточки                 |
| Чип               | `.glass-chip`                  | Метки, теги, фильтры               |
| Инпут             | `.glass-input`                 | Все поля ввода                     |
| Инпут (inline)    | `.glass-input--inline`         | Ячейки таблиц                      |
| Кнопка (основная) | `.a-btn-save`                  | Сохранить, подтвердить             |
| Кнопка (малая)    | `.a-btn-sm`                    | Добавить, отменить                 |
| Кнопка (danger)   | `.a-btn-sm.a-btn-danger`       | Удалить, сброс                     |
| Кнопка (AI)       | `.a-btn-ai`                    | Генерация ИИ                       |
| Навигация (admin) | `.ent-nav-item`                | Sidebar в admin-разделах           |
| Навигация (cabinet)| `.cab-nav-item`               | Sidebar в кабинетах                |
| Статус            | `.ws-status--{state}`          | pending/planned/progress/done/paused/cancelled/skipped |
| Dropdown          | `.glass-dropdown`              | Все popover/popup                  |
| Пустое            | `.u-empty` / `.cab-empty`      | Нет данных                         |
| Загрузка          | `.ent-content-loading`         | Skeleton-линии при загрузке        |
| Секция формы      | `.u-form-section`              | Блок с полями                      |
| Поле формы        | `.u-field` + `.u-field__label` | Label + input обёртка              |
| Заголовок секции  | `.cab-section-title`           | Над блоком формы / списком         |

## Layout — фрактальный паттерн

Любая страница = **sidebar + main**. Всегда используй одну из двух пар:

```
ent-layout > ent-sidebar + ent-main    ← admin-разделы (списки)
cab-body   > cab-sidebar + cab-main    ← кабинеты (подрядчик, дизайнер, продавец)
```

≤ 980px → sidebar переворачивается в горизонтальный tab-strip автоматически.

## Форма — шаблон

```html
<div class="u-form-section">
  <h3>Заголовок</h3>
  <div class="u-grid-2">
    <div class="u-field">
      <label class="u-field__label">Поле</label>
      <input class="glass-input" />
    </div>
    <div class="u-field u-field--full">
      <label class="u-field__label">Широкое</label>
      <textarea class="glass-input"></textarea>
    </div>
  </div>
  <div class="u-form-foot">
    <button class="a-btn-save">Сохранить</button>
  </div>
</div>
```

## Состояния — обязательны для каждого компонента

```vue
<template>
  <div v-if="pending" class="ent-content-loading">
    <div v-for="i in 5" class="ent-skeleton-line" />
  </div>
  <div v-else-if="error" class="cab-inline-error">
    {{ error.message }} <button class="a-btn-sm" @click="refresh()">повторить</button>
  </div>
  <div v-else-if="!data?.length" class="u-empty">нет данных</div>
  <div v-else>
    <!-- контент -->
  </div>
</template>
```

## Переход между вкладками

```vue
<Transition name="tab-fade" mode="out-in">
  <component :is="activeComponent" :key="activePage" />
</Transition>
```

## Цвета — ТОЛЬКО токены

| Нужен цвет для     | Токен                      |
|---------------------|----------------------------|
| Текст               | `var(--glass-text)`        |
| Фон                 | `var(--glass-bg)`          |
| Фон страницы        | `var(--glass-page-bg)`     |
| Бордер              | `var(--glass-border)`      |
| Акцент              | `var(--ds-accent)`         |
| Успех               | `var(--ds-success)`        |
| Ошибка              | `var(--ds-error)`          |
| Предупреждение      | `var(--ds-warning)`        |
| Полупрозрачность    | `color-mix(in srgb, var(--glass-text) N%, transparent)` |

Hex / rgb / hsl литералы = **баг**. Исключение: SVG `currentColor`.

## Скругления — только токены

| Элемент   | `var(--card-radius)` | `var(--chip-radius)` | `var(--input-radius)` | `var(--modal-radius)` | `var(--btn-radius)` |
|-----------|:---:|:---:|:---:|:---:|:---:|
| Карточка  | ✓ | | | | |
| Чип       | | ✓ | | | |
| Инпут     | | | ✓ | | |
| Модал     | | | | ✓ | |
| Кнопка    | | | | | ✓ |

`border-radius: 8px` литерал = **баг**.

## Типографика

- Шрифт: `font-family: inherit` (каскад от `--ds-font-family`)
- Размеры: `--ds-text-xs` (.694rem) → `--ds-text-3xl` (2.074rem)
- Заголовки: всегда `text-transform: uppercase`, `letter-spacing: ≥ .06em`
- Opacity иерархия: .35 (action) → .4 (sidebar title) → .48 (section) → .65 (form h3) → .75 (entity name) → 1 (активный)

## Анимация

```css
transition: opacity var(--ds-anim-duration) var(--ds-anim-easing); /* 180ms ease */
```

Не хардкодь длительность. Все button/a/input/select/textarea наследуют из токенов.

## Breakpoints

| px    | Эффект                                            |
|-------|---------------------------------------------------|
| 980   | cab-body → column, cab-nav → horizontal scroll   |
| 768   | ent-sidebar → 100% width, nav → pill scroll      |
| 600   | u-grid-2, u-grid-3 → 1 column                    |
| 480   | dash-stats → 1 col, compact padding              |

Не пиши свои @media для layout — `cab-body` и `ent-layout` уже адаптивны.

## Тёмный режим

Автоматический через `html.dark` → все `--glass-*` инвертируются.  
**Не пиши** scoped `.dark` переопределения — токены сделают всё сами.

## 5 тем

`cloud` · `linen` · `stone` · `fog` · `parchment`  
Хранятся: `localStorage['ui-theme']`, `localStorage['design-tokens']`.

## Admin: навигация проекта

Источник: `shared/constants/pages.ts` → `PROJECT_PAGES[]`

Фазы: 0-lead (5) → 1-concept (3) → 2-working_project (4) → 3-procurement (3) → 4-construction (4) → 5-commissioning (3) = 22 вкладки

Переключение вкладок: `selectAdminPage(slug)` → `activePage` → `<component :is>` (без URL).

Режимы: default | `?view=client` | `?view=contractor&cid=`

## Admin: entity-разделы (все одинаковые)

Паттерн **список → детали** через query:

| Раздел      | Query param      | Секции кабинета |
|-------------|------------------|-----------------|
| clients     | `?clientId=`     | getClientPages() + overview + self_profile |
| contractors | `?contractorId=` | 11: dashboard, tasks, staff*, contacts, passport, requisites, documents, specialization, finances, portfolio, settings |
| designers   | `?designerId=`   | 7: dashboard, services, packages, subscriptions, documents, projects, profile |
| sellers     | `?sellerId=`     | 5: dashboard, profile, requisites, terms, projects |

`*staff` — только если `contractorType === 'company'`

## Галерея

5 вкладок: `interiors` · `furniture` · `materials` · `art` · `moodboards`  
URL: `/admin/gallery/{tab}` (реальная навигация, не component swap)

## Запреты

- ❌ Новые CSS-классы для layout (используй cab-body / ent-layout)
- ❌ Hardcoded цвета (используй --glass-* / --ds-*)
- ❌ Hardcoded border-radius (используй --card/chip/input/modal/btn-radius)
- ❌ Hardcoded font-size (используй --ds-text-*)
- ❌ Hardcoded transition duration (используй --ds-anim-duration)
- ❌ `<input>` без `.glass-input`
- ❌ `<button>` без `.a-btn-save` / `.a-btn-sm` / `.a-btn-ai`
- ❌ Компонент без loading/empty/error состояний
- ❌ Вкладки без `<Transition name="tab-fade">`
- ❌ Scoped dark-mode стили
- ❌ Собственные @media для sidebar↔main
