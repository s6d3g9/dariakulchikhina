# DARK_MODE — правила тёмной темы

> RAG-файл. Как правильно поддерживать dark mode в этом проекте.
> Главный принцип: **НЕ ПИШИ html.dark правила вручную** — используй токены.

---

## Как работает dark mode

```
1. useThemeToggle() → isDark → toggles html.dark class
2. theme-sync.client.ts → MutationObserver на html.dark
3. main.css → html.dark { --glass-*: dark values; --btn-*: dark values; … }
4. useDesignSystem → darkElevation, darkSaturation → подстраивает карточки
```

**Все `var(--glass-*)`, `var(--ds-*)`, `var(--btn-*)` уже имеют dark-версии в main.css.**
Если ты используешь эти переменные — dark mode бесплатный.

---

## Правило 1: Нет #hex → нет html.dark

### ЗАПРЕЩЕНО ❌
```css
.card { background: #fff; color: #333; }
html.dark .card { background: #1a1a1a; color: #e0e0e0; }
```

### ПРАВИЛЬНО ✅
```css
.card { background: var(--glass-bg); color: var(--glass-text); }
```

---

## Правило 2: rgba() → color-mix()

### ЗАПРЕЩЕНО ❌
```css
.hint { color: rgba(0, 0, 0, 0.5); }
html.dark .hint { color: rgba(255, 255, 255, 0.5); }
```

### ПРАВИЛЬНО ✅
```css
.hint { color: color-mix(in srgb, var(--glass-text) 50%, transparent); }
```

`color-mix` берёт `--glass-text` (который уже инвертирован в dark) и смешивает с transparent.
Работает одинаково в обеих темах.

---

## Правило 3: Семантические цвета статусов

```css
/* Эти переменные уже адаптированы под dark: */
var(--ds-success)        /* зелёный */
var(--ds-success-light)  /* бледно-зелёный фон */
var(--ds-error)          /* красный */
var(--ds-error-light)    /* бледно-красный фон */
var(--ds-warning)        /* оранжевый */
var(--ds-warning-light)  /* бледно-оранжевый фон */
var(--ds-accent)         /* акцентный (синий) */
var(--ds-accent-light)   /* акцент светлый */
var(--ds-accent-dark)    /* акцент тёмный */
```

---

## Правило 4: Фоновые слои через opacity 

Не пиши два цвета (light + dark). Пиши один слой с прозрачностью:

```css
/* Слегка виден на любом фоне: */
background: color-mix(in srgb, var(--glass-text) 4%, transparent);

/* Средняя заметность: */
background: color-mix(in srgb, var(--glass-text) 8%, transparent);

/* Насыщенный фон: */
background: color-mix(in srgb, var(--glass-text) 15%, transparent);
```

---

## Правило 5: Границы

```css
border: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
```

Не пиши `border: 1px solid #e0e0e0` / `html.dark { border-color: #333; }`.

---

## Правило 6: Тени

```css
box-shadow: var(--ds-shadow);    /* стандартная */
box-shadow: var(--ds-shadow-sm); /* малая */
box-shadow: var(--ds-shadow-lg); /* большая */
```

В dark mode тени автоматически плотнее (через `--ds-shadow-alpha`).

---

## Правило 7: Когда html.dark ДОПУСКАЕТСЯ

Только для структурных изменений, **не для цветов**:

```css
/* ОК — меняем layout behavior в dark: */
html.dark .logo { filter: invert(1); }

/* ОК — меняем SVG stroke: */
html.dark .icon path { stroke: var(--glass-text); }

/* НЕ ОК — меняем цвет фона: */
html.dark .card { background: #222; } /* ← ЗАПРЕЩЕНО */
```

---

## Правило 8: Изображения в dark mode

```css
img { transition: filter var(--ds-anim-duration, 200ms) var(--ds-anim-easing, ease); }
html.dark img:not([data-no-invert]) { filter: brightness(0.9) contrast(1.05); }
```

---

## Шаблон: Компонент с полной dark-поддержкой

```vue
<template>
  <div class="my-widget glass-card">
    <h3 class="my-widget__title">{{ title }}</h3>
    <p class="my-widget__desc">{{ description }}</p>
    <div class="my-widget__actions">
      <button class="a-btn-save">Сохранить</button>
      <button class="a-btn-sm">Отмена</button>
    </div>
  </div>
</template>

<style scoped>
.my-widget {
  /* glass-card уже даёт: background, border, radius, shadow */
  padding: calc(var(--ds-spacing-unit, 4px) * 4);
}

.my-widget__title {
  font-size: var(--ds-text-lg, 1.2rem);
  font-weight: var(--ds-heading-weight, 600);
  color: var(--glass-text);
  letter-spacing: var(--ds-heading-letter-spacing, -0.01em);
  margin-bottom: calc(var(--ds-spacing-unit, 4px) * 2);
}

.my-widget__desc {
  font-size: var(--ds-text-sm, .833rem);
  color: color-mix(in srgb, var(--glass-text) 65%, transparent);
  line-height: var(--ds-line-height, 1.5);
}

.my-widget__actions {
  display: flex;
  gap: calc(var(--ds-spacing-unit, 4px) * 2);
  margin-top: calc(var(--ds-spacing-unit, 4px) * 3);
}

/* Нет html.dark секции — всё через токены */
</style>
```

---

## Чек-лист: dark-mode готовность

```
□ 0 строк с html.dark (кроме filter/layout)
□ 0 hardcoded #hex
□ 0 hardcoded rgba() — только color-mix()
□ Все фоны через var(--glass-bg) / color-mix()
□ Все тексты через var(--glass-text) / color-mix()
□ Все статусы через var(--ds-success|error|warning)
□ Все тени через var(--ds-shadow*)
□ Все border через color-mix()
```
