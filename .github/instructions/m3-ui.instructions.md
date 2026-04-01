# Технический стандарт Material 3 (M3)

Этот документ содержит СТРОГИЕ ПАТТЕРНЫ КОДА для реализации M3 в проекте. 
Только технические спецификации, CSS API и готовые сниппеты для стандартизации элементов. Никакой воды.

## 1. Архитектура и Scoping
Все M3 стили изолируются строго через глобальный селектор концепта. Не используйте tailwind цвета напрямую в разметке, только с CSS-переменными в `.vue` файлах, если это требуется.
```css
html[data-concept="m3"] .component-class { ... }
```

## 2. Цветовая система (CSS Tokens API)
Вместо хардкода нужно использовать токены, выдаваемые `useDesignSystem.ts`:
- `var(--sys-color-surface)` — Базовый фон
- `var(--sys-color-surface-container-low)` -> `high` / `highest` — Карточки, модалки, контейнеры
- `var(--sys-color-outline)` / `var(--sys-color-outline-variant)` — Границы
- `var(--sys-color-on-surface)` / `var(--sys-color-on-surface-variant)` — Текст и иконки
- `var(--sys-color-primary)` — Акценты и активные состояния

### 2.1 Role-based color, contrast, dynamic/fixed
- Цвета должны задаваться по роли, а не по произвольному HEX на компоненте. Сначала выбрать правильную semantic role, потом применять ее к surface/text/icon.
- Surface-иерархия строится по тону: `surface` -> `surface-container-low` -> `surface-container` -> `surface-container-high` -> `surface-container-highest`.
- Поддерживать три уровня контраста: standard, medium, high. Если экран уходит в low-contrast из-за glass/m3 пресета, исправлять токены роли, а не локально подкручивать случайный цвет.
- Dynamic color допустим как источник палитры или theme preset, но фиксированные accent-role нужны там, где важна стабильная узнаваемость между светлой и темной темой.
- Новые токены добавлять только как semantic-role (`error-container`, `on-secondary-container`), а не как одноразовый цвет экрана.

### 2.2 Shape и typography discipline
- Shape в M3 задает иерархию. Для одной группы однотипных surface использовать одно семейство радиусов, а не случайный набор `8/12/18/24` на соседних элементах.
- Expressive shape использовать точечно: hero-акцент, selected state, заметная action-surface. Рутинные формы, списки и registry должны оставаться спокойными и системными.
- Emphasized typography использовать только для focal points: hero-title, ключевой KPI, важный section-heading. Поля, caption и dense-листы держать на базовых text roles.
- Не пытаться сделать M3 "богаче" через лишние жирности, трекинг и случайные uppercase. Выразительность должна идти через token roles, а не через шум.

## 3. Паттерны Компонентов (Snippets)

### 3.1 State Layers (Интерактивные Ripple)
M3 интерактивные состояния делаются маской `::before` поверх элемента.
```css
html[data-concept="m3"] .m3-interactive {
  position: relative;
  overflow: hidden;
}
html[data-concept="m3"] .m3-interactive::before {
  content: "";
  position: absolute;
  inset: 0;
  background-color: currentColor; /* Цвет Ripple */
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
}
html[data-concept="m3"] .m3-interactive:hover::before { opacity: 0.08; }
html[data-concept="m3"] .m3-interactive:active::before { opacity: 0.12; }
```

### 3.2 Карточки (Surfaces)
Переход на Solid backgrounds (сплошная заливка) + Elevation без `backdrop-filter`.
```css
/* Паттерн: M3 Elevated & Outlined Cards */
html[data-concept="m3"] .glass-card, 
html[data-concept="m3"] .glass-surface {
  background: var(--sys-color-surface-container-low) !important;
  border-radius: var(--sys-radius-md, 12px) !important;
  box-shadow: var(--sys-elevation-level1) !important;
  border: 1px solid var(--sys-color-outline-variant) !important;
  backdrop-filter: none !important;
  color: var(--sys-color-on-surface);
}
```

### 3.3 Поля ввода (Filled Text Fields)
M3 стандарт: Высота 56px, нижняя граница 1px (2px при фокусе), скругление 4px только наверху.
```css
/* Паттерн: M3 TextField (Filled) */
html[data-concept="m3"] .glass-input {
  height: 56px !important;
  background: var(--sys-color-surface-variant) !important;
  border-radius: 4px 4px 0 0 !important;
  border: none !important;
  border-bottom: 1px solid var(--sys-color-outline) !important;
  padding: 16px !important;
  transition: border-bottom-color 0.2s ease;
}
html[data-concept="m3"] .glass-input:focus {
  border-bottom: 2px solid var(--sys-color-primary) !important;
  padding-bottom: 15px !important; /* Убирает прыжок текста, компенсируя 2px */
}
```

### 3.4 Диалоги (Dialogs / Modals)
Extra Large Radius (28px), жесткие отступы.
```css
/* Паттерн: M3 Dialog */
html[data-concept="m3"] .glass-modal, 
html[data-concept="m3"] .admin-modal {
  background: var(--sys-color-surface-container-high) !important;
  border-radius: var(--sys-radius-xl, 28px) !important;
  backdrop-filter: none !important;
  padding: 24px !important;
  box-shadow: var(--sys-elevation-level3) !important;
  border: none !important;
}
```

### 3.5 Навигация (Navigation Drawer)
Форма Pill (radius 100px) для активных пунктов меню.
```css
/* Паттерн: M3 Nav Drawer Item */
html[data-concept="m3"] .adm-sidebar .nav-item {
  border-radius: 100px !important; /* В M3 это Full shape */
  padding: 0 16px !important;
  height: 56px !important;
}
html[data-concept="m3"] .adm-sidebar .nav-item.active {
  background: var(--sys-color-secondary-container) !important;
  color: var(--sys-color-on-secondary-container) !important;
}
```

### 3.6 Motion scheme и interaction discipline
- По умолчанию использовать standard motion scheme. Expressive motion включать только там, где нужен осмысленный акцент: hero-entry, major context switch, раскрытие ключевой surface.
- Разделять spatial motion и effects motion. Spatial отвечает за вход/выход/перемещение layout-элементов, effects motion — за opacity, emphasis и state change. Не наслаивать оба типа без необходимости.
- Длительности и easing держать в центральных токенах/глобальном CSS. Не раздавать в компоненты случайные `transition: all 500ms ease`.
- State layer должен быть главным interactive feedback. Не подменять его heavy shadow, scale-bounce или glass blur-анимацией.
- FAB в этом репозитории не является дефолтом M3. Использовать его только если у экрана действительно одно главное create-действие; для обычных форм и полей опора идет на inline actions и autosave.

## 4. Паттерн Vue SFC
Пример правильного M3-шаблона для использования в проекте.
```vue
<template>
  <!-- Обертка использует глобальную M3 структуру -->
  <section class="glass-card flex flex-col gap-4 p-4">
    <h2 class="text-xl font-medium text-[var(--sys-color-on-surface)]">
      Панель (M3 Standard)
    </h2>
    
    <div class="u-field">
      <input class="glass-input" placeholder="Значение (Filled Input API)" />
    </div>

    <!-- M3 action + repo autosave note -->
    <div class="flex items-center justify-between gap-2 mt-4">
      <p class="text-xs text-[var(--sys-color-on-surface-variant)]">
        Поле сохраняется автоматически при blur или change.
      </p>
      <button class="a-btn-sm m3-interactive">Подробнее</button>
    </div>
  </section>
</template>
```

## 5. Готовые структуры разметки (Copy-Paste Templates)
Чтобы расширение функционала было 100% консистентным, используйте эти готовые блоки при создании новых страниц и компонентов.

Важно для этого репозитория: явная primary action допустима только для создания, перехода или подтверждения отдельного flow. Обычное редактирование полей должно опираться на autosave, а не на submit-кнопку.

### 5.1. Типовая страница (Page Shell)
Стандартный каркас для любой страницы админки, клиента или подрядчика.
```vue
<template>
  <div class="flex flex-col gap-6 w-full max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
    <!-- Header -->
    <header class="flex items-center justify-between">
      <div class="flex flex-col gap-1">
        <h1 class="text-2xl font-semibold text-[var(--sys-color-on-surface)]">Заголовок страницы</h1>
        <p class="text-sm text-[var(--sys-color-on-surface-variant)]">Вспомогательное описание секции</p>
      </div>
      <!-- Primary Action -->
      <button class="a-btn-save m3-interactive flex items-center gap-2">
        <Icon name="ph:plus" class="w-5 h-5" />
        <span>Создать</span>
      </button>
    </header>

    <!-- Main Content Flow -->
    <main class="flex flex-col gap-4">
      <slot /> <!-- Инжект карточек или других секций -->
    </main>
  </div>
</template>
```

### 5.2. Карточка с контентом и действиями (Content Card)
Универсальный блок для группировки информации.
```vue
<template>
  <section class="glass-card flex flex-col p-5 sm:p-6 gap-6">
    <div class="flex items-start justify-between border-b border-[var(--sys-color-outline-variant)] pb-4">
      <h2 class="text-lg font-medium text-[var(--sys-color-on-surface)]">Название блока</h2>
      
      <!-- Иконочная кнопка (Icon Button) -->
      <button class="m3-interactive w-10 h-10 rounded-full flex items-center justify-center text-[var(--sys-color-on-surface-variant)] hover:bg-[var(--sys-color-surface-container-highest)] transition-colors">
        <Icon name="ph:dots-three-vertical-bold" class="w-5 h-5" />
      </button>
    </div>

    <div class="flex flex-col gap-4 text-sm text-[var(--sys-color-on-surface-variant)]">
      <!-- Тело карточки -->
      Текст, таблицы или другие элементы.
    </div>
  </section>
</template>
```

### 5.3. Стандартная форма (M3 Form Layout)
Паттерн для форм с отступами и группировкой полей.
```vue
<template>
  <section class="glass-card flex flex-col p-6 gap-6">
    <h3 class="text-lg font-medium text-[var(--sys-color-on-surface)]">Данные профиля</h3>
    
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <!-- Input 1 -->
      <div class="u-field flex flex-col gap-1">
        <label class="text-xs font-medium text-[var(--sys-color-on-surface-variant)] px-1">Имя</label>
        <input type="text" class="glass-input w-full" placeholder="Введите имя" />
      </div>
      
      <!-- Input 2 -->
      <div class="u-field flex flex-col gap-1">
        <label class="text-xs font-medium text-[var(--sys-color-on-surface-variant)] px-1">Телефон</label>
        <input type="tel" class="glass-input w-full" placeholder="+7..." />
      </div>
    </div>

    <!-- Repo rule: autosave instead of submit -->
    <div class="pt-4 border-t border-[var(--sys-color-outline-variant)] text-xs text-[var(--sys-color-on-surface-variant)]">
      Изменения сохраняются автоматически при blur или change.
    </div>
  </section>
</template>
```

### 5.4. Список элементов (M3 List)
Паттерн для списков (документы, задачи, пользователи).
```vue
<template>
  <div class="flex flex-col gap-2">
    <!-- List Item -->
    <div 
      class="glass-surface m3-interactive flex items-center justify-between p-4 cursor-pointer hover:bg-[var(--sys-color-surface-container-high)] transition-colors"
      style="border-radius: var(--sys-radius-md);"
    >
      <div class="flex items-center gap-4">
        <!-- Аватар / Иконка -->
        <div class="w-12 h-12 rounded-full bg-[var(--sys-color-primary-container)] text-[var(--sys-color-on-primary-container)] flex items-center justify-center">
          <Icon name="ph:file-text" class="w-6 h-6" />
        </div>
        <!-- Текст -->
        <div class="flex flex-col">
          <span class="text-base font-medium text-[var(--sys-color-on-surface)]">Документ.pdf</span>
          <span class="text-sm text-[var(--sys-color-on-surface-variant)]">1.2 MB • 2 окт.</span>
        </div>
      </div>
    </div>
  </div>
</template>
```

## 6. Экосистема стилей (Где лежат остальные настройки)
В проекте стили M3 (как и других концептов: Glass, Brutalism) распределены по строгим слоям. Если нужно добавить новый цвет, токен или глобальное поведение, используйте правильный файл:

### 6.1 `app/composables/useDesignSystem.ts` (Слой Токенов)
**За что отвечает:** 
- Определение и инжект ВСЕХ CSS-переменных `var(--sys-*)` и `var(--glass-*)`.
- Хранение массивов `DESIGN_CONCEPTS` (список тем: `m3-light`, `m3-dark` и т.д.).
- Логика переключения темных/светлых вариаций.
**Как расширять:** Если вам нужен новый смысловой цвет (например, `sys-color-error-container`), его нужно добавить в массив токенов конкретного концепта (`m3-light`) в функции генерации и вернуть как `Tokens`.

### 6.2 `app/assets/css/main.css` (Структурный слой)
**За что отвечает:**
- Глобальные переопределения (overrides) компонентов (`.glass-card`, `.glass-input`, `.adm-sidebar`), привязанные к `html[data-concept="m3"]`.
- Анимации компонентов, State Layers (`.m3-interactive::before`), специфичные тени (`box-shadow`), жесткие размеры (высота 56px для инпутов, скругления 100px для pill).
**Как расширять:** Если нужно, чтобы стандартный UI-компонент (например, dropdown) в режиме M3 выглядел иначе (имел другие отступы или формы), вы пишете CSS-правило в блок `MATERIAL 3 STRICT OVERRIDES`. Для общих `Glass*` primitive-компонентов сначала расширяйте канонический primitive-layer под `html[data-concept="m3"]`, а не локальный scoped-стиль экрана.

### 6.3 `tailwind.config.ts` (Слой утилит)
**За что отвечает:**
- Конфигурация Tailwind, брейкпоинты, базовые утилитные цвета, которые не меняются от смены "дизайн-концепта" (glass/m3).
**Как расширять:** Обычно мы не добавляем в Tailwind жестко зашитые HEX-цвета для компонентов M3 (M3 цвета всегда через `var(--sys-*)`). Здесь можно добавлять кастомные анимации (например, `animation: { 'ripple': '...' }`) или семейства шрифтов.

### 6.4 `app/app.config.ts` (Конфиг Nuxt UI - Слой вендора)
**За что отвечает:** 
- Базовые настройки встроенных компонентов библиотеки `@nuxt/ui` (селекты, модалки, тосты).
**Как расширять:** Если мы хотим, чтобы стандартный цвет кнопок библиотеки опирался на нашу M3 тему, можно связать глобальные `primary` цвета Nuxt UI с нашими переменными, но предпочтительнее стилизовать свои классы (см. п.5).


### 6.5 `app/composables/useUITheme.ts` (Слой динамики / JS Инъекций)
**За что отвечает:**
- Управляет абстракциями `UITheme` (например, темами Cloud, Mint, Noir, M3).
- Динамически инжемтит CSS-переменные (`vars`, `darkVars`) и переопределяет токены (`tokens`) черео inline-стили, **обходя** специфичность обычного CSS.
**Как расширять:** Если вы добавляете новый цветовой пресет (акцентный цвет) для всего приложения, который должен переключаться �;зером из панели (допустим M3-Blue), вы добавляете новый объект в `GLASS_THEMES` или создаете `M3_THEMES` внутри этого файла.


### 6.6 `app/components/UIDesignPanel.vue` (Интерфейс юзера / Dev Mode)
**За что отвечает2:**
- Панель переключения тем и тюнинга UI параметров в реальном времени (радиусы, шрифты, отступы). Вызывает методы `useDesignSystem` и `useUITheme`.
**Как расширяту:** Если вы создали новую "крхтилку" или новую глобальную настройку в `useDesignSystem` (например, "Сила теней"), ползунок управления для нее должен находиться именно здесь, в `UIDesignPanel.vue`.
