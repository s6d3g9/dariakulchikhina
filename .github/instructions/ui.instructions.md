---
applyTo: "app/**/*.vue,app/**/*.ts,app/assets/**/*.css"
---

# UI — правила построения интерфейса

> Источник истины: `docs/UI_RULES.md`. При конфликте — docs/UI_RULES.md приоритетнее.

## Стек
Nuxt 4 · Vue 3 SFC · `<script setup>` · TypeScript · CSS custom properties · Glass morphism · 5 тем · Dark mode

## CSS примитивы — ТОЛЬКО эти классы

| Элемент | Класс | Когда |
|---|---|---|
| Поверхность | `.glass-surface` / `.glass-card` | Панели, карточки |
| Чип | `.glass-chip` | Метки, теги, фильтры |
| Инпут | `.glass-input` | Все поля ввода |
| Инпут inline | `.glass-input--inline` | Ячейки таблиц |
| Кнопка основная | `.a-btn-save` | Сохранить, подтвердить |
| Кнопка малая | `.a-btn-sm` | Добавить, отменить |
| Кнопка danger | `.a-btn-sm.a-btn-danger` | Удалить, сброс |
| Кнопка AI | `.a-btn-ai` | Генерация ИИ |
| Навигация admin | `.ent-nav-item` | Sidebar в admin-разделах |
| Навигация cabinet | `.cab-nav-item` | Sidebar в кабинетах |
| Статус | `.ws-status--{state}` | pending/planned/progress/done/paused/cancelled/skipped |
| Dropdown | `.glass-dropdown` | Все popover/popup |
| Пустое состояние | `.u-empty` / `.cab-empty` | Нет данных |
| Загрузка | `.ent-content-loading` | Skeleton при загрузке |
| Секция формы | `.u-form-section` | Блок с полями |
| Поле формы | `.u-field` + `.u-field__label` | Label + input обёртка |
| Заголовок секции | `.cab-section-title` | Над блоком формы |

## Layout паттерн

Любая страница = sidebar + main. Всегда одна из двух пар:

```
ent-layout > ent-sidebar + ent-main    ← admin-разделы (списки)
cab-body   > cab-sidebar + cab-main    ← кабинеты (подрядчик, дизайнер, продавец)
```

Страница проекта: sidebar через `<Teleport to="#admin-sidebar-portal">` в `app/layouts/admin.vue`.

## Admin layout

```
adm-util-bar   — фиксированная полоска сверху справа
ent-sidebar    — фиксированный сайдбар (Teleport portal)
adm-main       — <slot /> контент
```

## Форма — шаблон

```html
<div class="u-form-section">
  <h3>Заголовок</h3>
  <div class="u-grid-2">
    <div class="u-field">
      <label class="u-field__label">Поле</label>
      <input class="glass-input" />
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
  <div v-else><!-- контент --></div>
</template>
```

## Переходы между вкладками

```vue
<Transition name="tab-fade" mode="out-in">
  <component :is="activeComponent" :key="activePage" />
</Transition>
```

## Цвета — ТОЛЬКО токены

| Нужен цвет | Токен |
|---|---|
| Текст | `var(--glass-text)` |
| Фон | `var(--glass-bg)` |
| Фон страницы | `var(--glass-page-bg)` |
| Бордер | `var(--glass-border)` |
| Акцент | `var(--ds-accent)` |
| Успех | `var(--ds-success)` |
| Ошибка | `var(--ds-error)` |
| Предупреждение | `var(--ds-warning)` |

`#hex` / `rgb()` / `hsl()` литералы — **баг**. Исключение: SVG `currentColor`.

## Скругления — только токены

| Элемент | Токен |
|---|---|
| Карточка | `var(--card-radius)` |
| Чип | `var(--chip-radius)` |
| Инпут | `var(--input-radius)` |
| Модал | `var(--modal-radius)` |
| Кнопка | `var(--btn-radius)` |

`border-radius: 8px` литерал — **баг**.

## Типографика

- Размеры: `var(--ds-text-xs)` → `var(--ds-text-3xl)`
- Заголовки: `text-transform: uppercase`, `letter-spacing: ≥ .06em`
- Opacity иерархия: `.35` → `.4` → `.48` → `.65` → `.75` → `1`

## Анимация

```css
transition: opacity var(--ds-anim-duration) var(--ds-anim-easing);
```

Не хардкодь длительность — только `var(--ds-anim-duration)`.

## Тёмный режим

```css
html.dark .my-class { }
```

**Никогда не использовать** `@media (prefers-color-scheme: dark)`.  
Не писать scoped dark-mode переопределения — токены `--glass-*` инвертируются автоматически.

## Навигация — AdminNestedNav

- Файл: `app/components/AdminNestedNav.vue`
- Используется **только** в `app/layouts/admin.vue`
- Структура: `app/composables/useAdminNav.ts`
- Тип узла: `NavigationNode` из `shared/types/navigation.ts`
- Только текст в меню — никаких иконок и эмодзи

## Страница проекта `/admin/projects/[slug]`

Вкладки без смены URL: `selectAdminPage(slug)` → `activePage` → `<component :is>`.  
Источник вкладок: `shared/constants/pages.ts` → `PROJECT_PAGES[]`  
22 вкладки в 6 фазах (0-lead → 5-commissioning).

## Breakpoints (встроены в классы — не пиши свои)

| px | Эффект |
|---|---|
| 980 | `cab-body` → column |
| 768 | `ent-sidebar` → 100% width |
| 600 | `u-grid-2/3` → 1 column |

## ЗАПРЕЩЕНО

- ❌ Новые CSS-классы для layout — используй `cab-body` / `ent-layout`
- ❌ Hardcoded цвета — используй `--glass-*` / `--ds-*`
- ❌ Hardcoded `border-radius` — используй `--card/chip/input/modal/btn-radius`
- ❌ Hardcoded `font-size` — используй `--ds-text-*`
- ❌ Hardcoded transition duration — используй `--ds-anim-duration`
- ❌ `<input>` без `.glass-input`
- ❌ `<button>` без `.a-btn-save` / `.a-btn-sm` / `.a-btn-ai`
- ❌ Компонент без loading/empty/error состояний
- ❌ Вкладки без `<Transition name="tab-fade">`
- ❌ Scoped dark-mode стили
- ❌ `@media` для sidebar↔main layout
- ❌ Tailwind-классы напрямую в компонентах
- ❌ `target="_blank"` на внутренних ссылках
