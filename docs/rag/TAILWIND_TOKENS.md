# Tailwind CSS v4 + Nuxt UI — Design Tokens (RAG)

> Источники: tailwindcss.com/docs (theme, functions-and-directives, blog/tailwindcss-v4),
> ui.nuxt.com (design-system, css-variables)
> Версии: Tailwind CSS 4.2, @nuxt/ui 3.x (v4.5.1)

---

## 1. CSS-First конфигурация (Tailwind v4)

### Нет tailwind.config.js!
Tailwind v4 конфигурируется **только через CSS**:

```css
/* app/assets/css/main.css */
@import "tailwindcss";
@import "@nuxt/ui";

@theme {
  --font-sans: 'Inter', system-ui, sans-serif;
  --color-brand-500: #6366f1;
  --radius-lg: 0.75rem;
}
```

### Ключевые директивы

| Директива | Назначение |
|-----------|-----------|
| `@import "tailwindcss"` | Подключает Tailwind (base + utilities + variants) |
| `@theme { }` | Определяет design tokens как CSS custom properties |
| `@source "../components/**/*.vue"` | Указывает файлы для сканирования утилит |
| `@utility name { }` | Регистрирует кастомную утилиту |
| `@variant name { }` | Регистрирует кастомный вариант |
| `@custom-variant name (selector)` | Кастомный вариант через селектор |
| `@apply` | Инлайнит Tailwind-утилиты в CSS правиле |
| `@reference "path"` | **Импорт для ссылок без дублирования CSS** |

---

## 2. @theme — Design Tokens

### Пространства имён (namespaces → utilities)

| Namespace | Утилиты | Пример токена |
|-----------|---------|---------------|
| `--color-*` | `bg-*`, `text-*`, `border-*` | `--color-primary-500: #6366f1` |
| `--font-*` | `font-*` | `--font-sans: 'Inter', sans-serif` |
| `--text-*` | `text-*` (размер) | `--text-sm: 0.875rem` |
| `--radius-*` | `rounded-*` | `--radius-lg: 0.75rem` |
| `--shadow-*` | `shadow-*` | `--shadow-md: 0 4px 6px ...` |
| `--spacing-*` | `p-*`, `m-*`, `gap-*`, `w-*`, `h-*` | `--spacing-18: 4.5rem` |
| `--ease-*` | `ease-*` | `--ease-bounce: cubic-bezier(...)` |
| `--animate-*` | `animate-*` | `--animate-spin: spin 1s linear infinite` |
| `--breakpoint-*` | `sm:`, `md:`, `lg:` | `--breakpoint-3xl: 1920px` |
| `--container-*` | `max-w-*` | `--container-8xl: 90rem` |

### Модификаторы @theme

```css
/* Переопределить дефолты (очистить namespace) */
@theme {
  --color-*: initial;        /* Удаляет все дефолтные цвета */
  --color-white: #fff;       /* Определяет только нужные */
  --color-black: #000;
}

/* inline — для ссылочных переменных (не генерируют утилиты) */
@theme inline {
  --color-primary: var(--ui-primary);
}

/* static — принудительно включить все переменные */
@theme static {
  --color-green-500: #00C16A;
}
```

### Кастомные цвета (50–950 шкала)
```css
@theme static {
  --color-brand-50: #fef2f2;
  --color-brand-100: #fee2e2;
  --color-brand-200: #fecaca;
  --color-brand-300: #fca5a5;
  --color-brand-400: #f87171;
  --color-brand-500: #ef4444;
  --color-brand-600: #dc2626;
  --color-brand-700: #b91c1c;
  --color-brand-800: #991b1b;
  --color-brand-900: #7f1d1d;
  --color-brand-950: #450a0a;
}
```

---

## 3. @reference — КРИТИЧНО для Vue SFC!

### Проблема
В Vue `<style scoped>` нет доступа к `@theme` переменным для `@apply`.

### Решение
```vue
<style scoped>
@reference "../../app/assets/css/main.css";

.my-class {
  @apply bg-primary text-white rounded-lg;
}
</style>
```

- **Не дублирует CSS** — только импортирует определения для ссылок.
- Позволяет использовать `@apply` и `@variant` внутри компонентов.
- Необходим для @apply с кастомными @theme токенами.

---

## 4. Функции Tailwind v4

### --alpha() — прозрачность через color-mix
```css
.overlay {
  background: --alpha(var(--color-brand-500), 50%);
  /* Компилируется в: color-mix(in oklab, var(--color-brand-500) 50%, transparent) */
}
```

### --spacing() — ссылка на spacing-шкалу
```css
.card {
  padding: --spacing(4);        /* var(--spacing) * 4 = 1rem */
  margin-top: --spacing(2.5);   /* 0.625rem */
}
```

---

## 5. Cascade Layers (Tailwind v4)

Tailwind v4 использует нативные CSS cascade layers:
```
@layer theme, base, components, utilities;
```
- `@theme` → `theme` layer
- Reset стили → `base` layer
- `@layer components { }` → `components` layer
- Утилиты → `utilities` layer (**всегда побеждает**)

---

## 6. Nuxt UI — Semantic Colors

### Встроенные семантические цвета

| Alias | Default | Назначение |
|-------|---------|-----------|
| `primary` | green | CTA, навигация, ссылки |
| `secondary` | blue | Вторичные кнопки |
| `success` | green | Успех, завершение |
| `info` | blue | Информация, подсказки |
| `warning` | yellow | Предупреждение |
| `error` | red | Ошибки, удаление |
| `neutral` | slate | Текст, бордеры, фоны |

### Runtime настройка (app.config.ts)
```ts
export default defineAppConfig({
  ui: {
    colors: {
      primary: 'blue',
      secondary: 'purple',
      neutral: 'zinc'
    }
  }
})
```

### Расширение цветов (nuxt.config.ts)
```ts
export default defineNuxtConfig({
  ui: {
    theme: {
      colors: ['primary', 'secondary', 'tertiary', 'info', 'success', 'warning', 'error']
    }
  }
})
```

---

## 7. Nuxt UI — CSS Variables

### Colors (light/dark автоматически)
```css
:root {
  --ui-primary: var(--ui-color-primary-500);
  --ui-secondary: var(--ui-color-secondary-500);
  --ui-success: var(--ui-color-success-500);
  --ui-info: var(--ui-color-info-500);
  --ui-warning: var(--ui-color-warning-500);
  --ui-error: var(--ui-color-error-500);
}

/* Кастомизация оттенка */
:root { --ui-primary: var(--ui-color-primary-700); }
.dark { --ui-primary: var(--ui-color-primary-200); }
```

### Text утилиты
```css
:root {
  --ui-text-dimmed: var(--ui-color-neutral-400);
  --ui-text-muted: var(--ui-color-neutral-500);
  --ui-text-toned: var(--ui-color-neutral-600);
  --ui-text: var(--ui-color-neutral-700);
  --ui-text-highlighted: var(--ui-color-neutral-900);
  --ui-text-inverted: white;
}
```
Классы: `text-dimmed`, `text-muted`, `text-toned`, `text-default`, `text-highlighted`, `text-inverted`

### Background утилиты
```css
:root {
  --ui-bg: white;
  --ui-bg-muted: var(--ui-color-neutral-50);
  --ui-bg-elevated: var(--ui-color-neutral-100);
  --ui-bg-accented: var(--ui-color-neutral-200);
  --ui-bg-inverted: var(--ui-color-neutral-900);
}
```
Классы: `bg-default`, `bg-muted`, `bg-elevated`, `bg-accented`, `bg-inverted`

### Border утилиты
```css
:root {
  --ui-border: var(--ui-color-neutral-200);
  --ui-border-muted: var(--ui-color-neutral-200);
  --ui-border-accented: var(--ui-color-neutral-300);
  --ui-border-inverted: var(--ui-color-neutral-900);
}
```
Классы: `border-default`, `border-muted`, `border-accented`, `border-inverted`

### Radius
```css
:root {
  --ui-radius: 0.25rem;  /* Базовое значение */
}
```
Все `rounded-*` утилиты рассчитываются относительно `--ui-radius`.

### Container / Header
```css
:root {
  --ui-container: 80rem;       /* max-width контейнера */
  --ui-header-height: --spacing(16);  /* высота шапки */
}
```

### Body defaults
```css
body {
  @apply antialiased text-default bg-default scheme-light dark:scheme-dark;
}
```

---

## 8. Color Mode

### useColorMode composable
```vue
<script setup>
const colorMode = useColorMode()
const isDark = computed({
  get: () => colorMode.value === 'dark',
  set: (v) => { colorMode.preference = v ? 'dark' : 'light' }
})
</script>
```

### Встроенные компоненты
- `<ColorModeButton />` — переключатель темы
- `<ColorModeSwitch />` — switch-стиль
- `<ColorModeSelect />` — select-стиль
- `<ColorModeAvatar />` — разные картинки для light/dark
- `<ColorModeImage />` — разные изображения для light/dark

---

## Быстрая шпаргалка для рефакторинга

| Было (hardcode) | Стало (token) |
|-----------------|---------------|
| `color: #6366f1` | `@apply text-primary` или `color: var(--ui-primary)` |
| `background: #f8f9fa` | `@apply bg-muted` |
| `background: #1a1a2e` | `@apply bg-elevated` (dark) |
| `border: 1px solid #e5e7eb` | `@apply border border-default` |
| `border-radius: 8px` | `@apply rounded-lg` или `border-radius: var(--ui-radius)` |
| `color: #6b7280` | `@apply text-muted` |
| `color: #111827` | `@apply text-highlighted` |
| `rgba(0,0,0,0.5)` | `--alpha(var(--color-black), 50%)` |
| `font-size: 14px` | `@apply text-sm` |
| `font-size: 12px` | `@apply text-xs` |
