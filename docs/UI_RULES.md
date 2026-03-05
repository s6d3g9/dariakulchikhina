# UI_RULES — справочник для разработки

> Основной документ. Читай перед любой правкой компонентов, страниц, лейаутов.
> Детали по API / DB — `ARCHITECTURE.md`. Фазы проекта — `roadmap-sync-rules.md`. UIDesignPanel — `DESIGN_EDITOR.md`.

## Стек

Nuxt 4 · Vue 3 · TypeScript · CSS custom properties · Glass morphism · 5 тем · Dark mode

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

## Admin-лейаут (`app/layouts/admin.vue`)

```
adm-util-bar  (fixed, правый верх) — 🔍 / Ctrl+K · тема · уведомления · выйти
ent-sidebar   (fixed, левая колонка) — заполняется через <Teleport to="#admin-sidebar-portal"> внутри каждой страницы
adm-main      (<slot />) — контент страницы
```

| Кнопка util-bar | Действие |
|---|---|
| 🔍 / Ctrl+K | `searchOpen = true` → `AdminSearch` (модал) |
| тема ●/○ | `toggleTheme()` |
| бейдж-число | только индикатор, не кнопка |
| выйти | `POST /api/auth/logout` → `/admin/login` |

## Layout — фрактальный паттерн

Любая страница = **sidebar + main**. Всегда используй одну из двух пар:

```
ent-layout > ent-sidebar + ent-main    ← admin-разделы (списки)
cab-body   > cab-sidebar + cab-main    ← кабинеты (подрядчик, дизайнер, продавец)
```

≤ 980px → sidebar переворачивается в горизонтальный tab-strip автоматически.

## AdminSidebarSwitcher

**Файл:** `app/components/AdminSidebarSwitcher.vue`  
**Props:** `title: string`, `count?: number`, `v-model` (строка поиска)

### Структура DOM — строго в таком порядке:
1. `esw-head` — кнопка (title + count + стрелка), клик → `open = !open`
2. `esw-search-wrap` — поле поиска — **всегда видно** (не зависит от `open`)
3. `esw-dropdown` — список разделов, `v-if="open"`, **`position: relative`** (in-flow, не absolute)

### Правила:
- Клик вне компонента → `open = false` (document listener)
- Переход: `navigate(item)` → если `projectSlug` в query — сохраняет его: `push({ path, query: { projectSlug } })`
- `isActive`: `projects` → `path === '/admin'` или `startsWith('/admin/projects')`; `gallery` → `startsWith('/admin/gallery')`; остальные → `startsWith(item.path)`
- Монохромный стиль: цвет только `var(--glass-text)`, opacity `.38 → .72 → 1`

### Маппинг разделов:

| Пункт | path |
|---|---|
| проекты | `/admin` |
| клиенты | `/admin/clients` |
| подрядчики | `/admin/contractors` |
| дизайнеры | `/admin/designers` |
| поставщики | `/admin/sellers` |
| галерея | `/admin/gallery/interiors` |
| документы | `/admin/documents` |

---

## Sidebar — два режима отображения

Каждая страница entity-раздела (`clients`, `contractors`, `designers`, `sellers`, `documents`) имеет **два состояния sidebar**:

### Режим 1 — Список (URL без query-id)

```
[раздел ›]          ← esw-head (title + count)
[🔍 поиск...]       ← v-model="searchQuery", всегда виден
─────────────
Запись А      [→]   ← .ent-nav-item, клик → переход в кабинет
Запись Б      [→]
Запись В      [→]
─────────────
[+ добавить]        ← внизу (опционально)
```

Поиск фильтрует список в реальном времени: `searchQuery` → `computed filteredItems` (debounce 300ms).

### Режим 2 — Кабинет (URL с `?clientId=`, `?contractorId=` и т.д.)

```
[раздел ›]          ← esw-head сохраняется
[🔍 поиск...]       ← поиск остаётся доступен
─────────────
[← к списку]        ← кнопка возврата: navigateTo('/admin/clients')
─────────────
вкладка 1           ← .cab-nav-item (секции кабинета)
вкладка 2
вкладка 3
```

Поиск в режиме кабинета: ввод текста → `navigateTo('/admin/clients?q=<query>')` → переключение обратно в режим списка с применённым фильтром.

### Переключение режимов:

```
Режим 1 → Режим 2:  клик по записи → navigateTo('?clientId=<id>')
Режим 2 → Режим 1:  клик «← к списку» → navigateTo('/admin/clients')
                    ИЛИ ввод в поиск → navigateTo('?q=<query>')
```

### Контекст проекта (`withCtx`):

Если `activeProjectSlug` задан — все переходы внутри sidebar используют `withCtx(path)`:
```
withCtx('/admin/clients') → '/admin/clients?projectSlug=<slug>'
```
При этом рядом с каждой записью появляются кнопки привязки/отвязки к проекту.

### Все кнопки связи (контекстный режим):

| Раздел | Привязать | Отвязать |
|---|---|---|
| clients | `POST /api/clients/<id>/link-project` | `POST /api/clients/<id>/unlink-project` |
| contractors | `POST /api/projects/<slug>/contractors` | `DELETE /api/projects/<slug>/contractors` |
| designers | `POST /api/projects/<slug>/designers` | — |
| sellers | `POST /api/projects/<slug>/sellers` | — |

После каждого вызова: `refreshProjectData()` + `refreshLinked*()`.

---

## Sidebar — проекты `/admin`

Отличается от entity-разделов: нет режима «кабинет» в sidebar.

```
[проекты ›]         ← esw-head
[🔍 поиск...]       ← фильтрует список проектов
─────────────
● Проект А          ← .ent-nav-item + аватар + статус-бейдж
● Проект Б
─────────────
ничего не найдено   ← v-if="!filteredProjects.length && searchQuery"
нет проектов        ← v-else-if="!projects?.length"
```

Клик по проекту → `router.push('/admin/projects/<slug>')` → переход на страницу проекта (sidebar меняется на фазы).

---

## Sidebar — страница проекта `/admin/projects/[slug]`

Sidebar полностью отличается: нет `AdminSidebarSwitcher` в главной части, вместо него `AdminProjectStatusBar`.

Структура: фазы как accordion-группы → вкладки без смены URL.

```
[статус-бар проекта]       ← AdminProjectStatusBar
─────────────
▼ Фаза 0. Инициация
   0.1 первичный контакт   ← .ent-nav-item, клик → selectAdminPage('first_contact')
   0.2 брифинг
   ...
▼ Фаза 1. Эскиз
   ...
─────────────
[sb-section-nav]           ← внизу: ссылки на все entity-разделы
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

## Admin: страница проекта `/admin/projects/[slug]`

Источник вкладок: `shared/constants/pages.ts` → `PROJECT_PAGES[]`

Фазы: 0-lead (5) → 1-concept (3) → 2-working_project (4) → 3-procurement (3) → 4-construction (4) → 5-commissioning (3) = **22 вкладки**

Переключение: `selectAdminPage(slug)` → `activePage` → `<component :is>` — **без смены URL**.

| slug фазы 0 | slug фазы 1 | slug фазы 2 | slug фазы 3 | slug фазы 4 | slug фазы 5 |
|---|---|---|---|---|---|
| first_contact | space_planning | working_drawings | procurement_list | construction_plan | punch_list |
| self_profile | moodboard | specifications | suppliers | work_status | commissioning_act |
| site_survey | concept_approval | mep_integration | procurement_status | work_log | client_sign_off |
| tor_contract | | design_album_final | | site_photos | |
| extra_services | | | | | |

Специальные режимы (через query):

| query | Что рендерится |
|---|---|
| default | Admin* компоненты |
| `?view=client` | Client* компоненты (превью клиента) |
| `?view=contractor&cid=<id>` | `AdminContractorCabinet :contractor-id` |

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
