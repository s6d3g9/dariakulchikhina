# TOKEN_MAP — замены hardcoded → var(--token)

> RAG-файл для AI-агента. При рефакторинге CSS — заменяй хардкод на токен из этой таблицы.
> Не выдумывай новые переменные — используй только существующие.

---

## 1. Цвета — HEX → var()

### Фоны страниц / карточек

| Hardcoded           | Заменить на                          | Контекст           |
|---------------------|--------------------------------------|---------------------|
| `#f6f6f6` `#f4f4f2` `#f8f8f7` `#f2f2f2` | `var(--glass-page-bg)` | Фон страницы       |
| `#fff` `#ffffff`    | `var(--glass-bg)`                    | Фон карточек/панелей|
| `#0e0e0e` `#0a0a0a` `#111` `#121212` | `var(--glass-page-bg)` | Тёмный фон страницы |
| `#1a1a1a` `#151517` `#1f1f1f` | `var(--glass-bg)`         | Тёмный фон карточек |
| `#080808` `#0a1020` | `color-mix(in srgb, var(--glass-bg) 90%, black)` | Глубокий фон  |

### Текст

| Hardcoded                     | Заменить на                    | Контекст             |
|-------------------------------|--------------------------------|----------------------|
| `#1a1a1a` `#1a1a2e` `#333`   | `var(--glass-text)`            | Основной текст       |
| `#222` `#111` `#000`          | `var(--glass-text)`            | Жирный текст         |
| `#888` `#999` `#aaa`          | `color-mix(in srgb, var(--glass-text) 55%, transparent)` | Muted текст |
| `#666` `#777` `#555`          | `color-mix(in srgb, var(--glass-text) 42%, transparent)` | Подпись / hint |
| `#444` `#333`                 | `color-mix(in srgb, var(--glass-text) 30%, transparent)` | Disabled текст |
| `#ccc` `#ddd` `#e0e0e0`      | `color-mix(in srgb, var(--glass-text) 80%, transparent)` | Light muted    |
| `#bbb` `#b1b1b1`             | `color-mix(in srgb, var(--glass-text) 65%, transparent)` | Secondary text |
| `#f2f2f2`                     | `var(--glass-text)` (в dark)   | Текст в dark mode    |

### Границы

| Hardcoded                           | Заменить на                                                        |
|-------------------------------------|--------------------------------------------------------------------|
| `#e0e0e0` `#ddd` `#ececec` `#ccc`  | `color-mix(in srgb, var(--glass-text) 12%, transparent)`          |
| `#1e1e1e` `#222` `#2a2a2a` `#2d2d2d` `#3a3a3a` | `color-mix(in srgb, var(--glass-text) 10%, transparent)` |
| `1px solid #…`                      | `var(--ds-border-w, 1px) var(--ds-border-style, solid) color-mix(…)` |

### Акцент / Синий

| Hardcoded                              | Заменить на                | Контекст           |
|----------------------------------------|----------------------------|---------------------|
| `#6366f1` `#646cff` `#4a80f0` `#3b82f6` `#2563eb` `#1976d2` | `var(--ds-accent)` | Акцентный цвет |
| `#8ab4f8` `#6090ff`                    | `var(--ds-accent-light)`   | Акцент light       |
| `#2a4080` `#1a2340`                    | `var(--ds-accent-dark)`    | Акцент dark        |

### Успех / Зелёный

| Hardcoded                                     | Заменить на              |
|-----------------------------------------------|--------------------------|
| `#4caf50` `#22c55e` `#16a34a` `#2e7d32` `#388e3c` `#5caa7f` `#2a7a52` | `var(--ds-success)` |
| `#81c784` `#86efac` `#34d399`                 | `var(--ds-success-light)` |

### Ошибка / Красный

| Hardcoded                                 | Заменить на           |
|-------------------------------------------|-----------------------|
| `#dc2626` `#c00` `#e05252` `#a83232`     | `var(--ds-error)`     |
| `#f87171` `#e57373` `#ff6b6b`            | `var(--ds-error-light)`|

### Предупреждение / Оранжевый-жёлтый

| Hardcoded                           | Заменить на             |
|-------------------------------------|-------------------------|
| `#ff9800` `#ef6c00` `#fbbf24`      | `var(--ds-warning)`     |
| `#ffb74d`                           | `var(--ds-warning-light)`|

### Фиолетовый (AI)

| Hardcoded       | Заменить на                  |
|-----------------|------------------------------|
| `#a78bfa`       | `var(--ds-accent)` или отдельный `--ds-ai` при необходимости |

---

## 2. Border-Radius → var()

| Hardcoded px         | Заменить на                                          |
|----------------------|------------------------------------------------------|
| `6px` `8px` `10px`  | `var(--card-radius, 14px)`                           |
| `12px` `14px` `16px`| `var(--card-radius, 14px)`                           |
| `20px` `28px`        | `var(--modal-radius, 14px)`                          |
| `3px` `4px`          | `var(--input-radius, 8px)` или `calc(var(--card-radius)/3)` |
| `999px` `99px`       | `var(--chip-radius, 999px)`                          |
| `2px`                | `calc(var(--card-radius) * 0.15)`                    |

**Правило:** если это карточка/панель → `var(--card-radius)`, если инпут → `var(--input-radius)`, если чип/пилюля → `var(--chip-radius)`, если модалка → `var(--modal-radius)`.

---

## 3. Font-Size → var()

| Hardcoded                         | Заменить на                    |
|-----------------------------------|--------------------------------|
| `.6rem` `.62rem` `.66rem` `.68rem`| `var(--ds-text-xs, .694rem)`   |
| `.7rem` `.72rem` `.74rem` `.75rem` `.76rem` `.78rem` | `var(--ds-text-sm, .833rem)` |
| `.8rem` `.82rem` `.85rem` `.88rem`| `var(--ds-text-sm, .833rem)`   |
| `1rem`                            | `var(--ds-text-base, 1rem)`    |
| `1.1rem` `1.2rem`                | `var(--ds-text-lg, 1.2rem)`    |
| `1.4rem` `1.44rem`               | `var(--ds-text-xl, 1.44rem)`   |
| `1.6rem` `1.7rem` `1.728rem`     | `var(--ds-text-2xl, 1.728rem)` |
| `2rem` `2.074rem`                | `var(--ds-text-3xl, 2.074rem)` |

---

## 4. Тени → var()

| Hardcoded                          | Заменить на                   |
|------------------------------------|-------------------------------|
| `0 2px 10px rgba(0,0,0,0.05)`     | `var(--ds-shadow-sm)`         |
| `0 8px 24px rgba(0,0,0,0.06)`     | `var(--ds-shadow)`            |
| `0 16px 48px rgba(0,0,0,0.08)`    | `var(--ds-shadow-lg)`         |
| Любая тень с `rgba(0,0,0,...)`     | `var(--ds-shadow)` или `0 var(--ds-shadow-y) var(--ds-shadow-blur) var(--ds-shadow-spread) rgba(0,0,0,var(--ds-shadow-alpha))` |

---

## 5. Отступы → calc()

| Hardcoded         | Заменить на                                             |
|-------------------|---------------------------------------------------------|
| `padding: 12px`   | `padding: calc(var(--ds-spacing-unit, 4px) * 3)`       |
| `padding: 16px`   | `padding: calc(var(--ds-spacing-unit, 4px) * 4)`       |
| `gap: 8px`        | `gap: var(--ds-gap, 8px)` или `calc(var(--ds-spacing-unit) * 2)` |
| `gap: 16px`       | `gap: calc(var(--ds-spacing-unit, 4px) * 4)`           |

---

## 6. rgba() → color-mix()

**Паттерн замены:**

```css
/* БЫЛО */
background: rgba(0, 0, 0, 0.05);
/* СТАЛО */
background: color-mix(in srgb, var(--glass-text) 5%, transparent);

/* БЫЛО */
border: 1px solid rgba(255, 255, 255, 0.1);
/* СТАЛО (в dark) */
border: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
```

**Правило:** `rgba(0,0,0, X)` → `color-mix(in srgb, var(--glass-text) {X*100}%, transparent)`.
Это автоматически инвертируется при смене темы.

---

## 7. Шрифты → var()

| Hardcoded                               | Заменить на                    |
|-----------------------------------------|--------------------------------|
| `font-family: sans-serif`              | `font-family: var(--ds-font-family)` |
| `font-family: 'Inter', sans-serif`     | `font-family: var(--ds-font-family)` |
| `font-weight: 400`                     | `font-weight: var(--ds-font-weight, 400)` |
| `font-weight: 600` `700` (заголовки)   | `font-weight: var(--ds-heading-weight, 600)` |
| `letter-spacing: .03em`                | `letter-spacing: var(--ds-letter-spacing, .03em)` |
| `line-height: 1.5`                     | `line-height: var(--ds-line-height, 1.5)` |
