# UI_STYLES — Дизайн-система и редактор стилей

> Версия: 1.0 · 2026-03-05  
> Источник: `app/composables/useDesignSystem.ts`, `app/composables/useUITheme.ts`, `app/assets/css/main.css`

---

## 1. Архитектура дизайн-системы

Система состоит из трёх слоёв:

```
DesignTokens (TypeScript interface)
    │
    ▼
CSS Custom Properties (--glass-*, --btn-*, --ds-*)
    │
    ▼
Scoped CSS / Tailwind CSS 4 классы
```

Composable `useDesignSystem` управляет токенами, обеспечивает undo/redo (до 50 шагов), экспорт/импорт JSON.  
Composable `useUITheme` предоставляет 6 готовых тем с CSS vars и token-overrides.

---

## 2. CSS Custom Properties — полный реестр

### 2.1. Glassmorphism (glass-*)

| Переменная | Назначение | Пример значения |
|-----------|-----------|----------------|
| `--glass-page-bg` | Фон страницы | `#f4f4f2` |
| `--glass-bg` | Фон поверхности/карточки | `rgba(255,255,255,0.52)` |
| `--glass-border` | Граница glass-элементов | `rgba(0,0,0,0.07)` |
| `--glass-shadow` | Тень glass-элементов | `0 8px 24px rgba(0,0,0,0.06)` |
| `--glass-text` | Основной цвет текста | `#2c2c2a` |

### 2.2. Кнопки (btn-*)

| Переменная | Назначение |
|-----------|-----------|
| `--btn-bg-base` | Фон кнопки (базовый) |
| `--btn-color` | Цвет текста кнопки |
| `--btn-border-base` | Граница кнопки |
| `--btn-sm-bg` | Фон малой кнопки |
| `--btn-sm-border` | Граница малой кнопки |

### 2.3. Дизайн-токены (ds-*)

| Переменная | Источник токена |
|-----------|----------------|
| `--ds-accent` | `accentHue` + `accentSaturation` + `accentLightness` (HSL) |
| `--ds-success` | `successHue` + `successSaturation` |
| `--ds-error` | `errorHue` + `errorSaturation` |
| `--ds-warning` | `warningHue` + `warningSaturation` |
| `--ds-text-sm` | ~0.84rem |
| `--ds-text-xs` | ~0.78rem |
| `--ds-heading-weight` | `headingWeight` |
| `--card-radius` | `cardRadius` (px) |
| `--ds-font` | `fontFamily` |

---

## 3. Токены дизайн-системы (DesignTokens)

### 3.1. Кнопки

| Токен | Тип | Диапазон |
|-------|-----|---------|
| `btnRadius` | number | px |
| `btnSize` | enum | `xs` · `sm` · `md` · `lg` |
| `btnStyle` | enum | `filled` · `outline` · `ghost` · `soft` |
| `btnTransform` | enum | `none` · `uppercase` · `capitalize` |
| `btnWeight` | number | 400–700 |
| `btnPaddingH` | number | px (0 = авто) |
| `btnPaddingV` | number | px (0 = авто) |

### 3.2. Типографика

| Токен | Тип | Диапазон |
|-------|-----|---------|
| `fontFamily` | string | Системные и Google Fonts |
| `fontSize` | number | rem |
| `fontWeight` | number | 300–700 |
| `headingWeight` | number | 400–900 |
| `letterSpacing` | number | em |
| `lineHeight` | number | 1.0–2.5 |
| `typeScale` | number | 1.067–1.5 |
| `headingLetterSpacing` | number | -0.05–0.1em |
| `headingLineHeight` | number | 1.0–2.0 |
| `paragraphMaxWidth` | number | 0 или 40–100ch |
| `textAlign` | enum | `left` · `center` · `right` · `justify` |
| `textIndent` | number | 0–3em |
| `wordSpacing` | number | 0–0.25em |
| `paragraphSpacing` | number | em |

### 3.3. Цвета (HSL)

| Токен | Назначение |
|-------|-----------|
| `accentHue` + `accentSaturation` + `accentLightness` | Акцентный цвет |
| `successHue` + `successSaturation` | Зелёный (успех) |
| `errorHue` + `errorSaturation` | Красный (ошибка) |
| `warningHue` + `warningSaturation` | Янтарный (предупреждение) |

### 3.4. Glass / Поверхности

| Токен | Назначение | Диапазон |
|-------|-----------|---------|
| `glassBlur` | Blur подложки | px |
| `glassOpacity` | Прозрачность фона | 0–1 |
| `glassBorderOpacity` | Прозрачность границы | 0–1 |
| `glassSaturation` | Насыщенность | 0–200% |

### 3.5. Тени

| Токен | Назначение |
|-------|-----------|
| `shadowOffsetY` | Смещение вертикальное |
| `shadowBlurRadius` | Размытие |
| `shadowSpread` | Распространение |
| `shadowOpacity` | Прозрачность тени |

### 3.6. Радиусы

| Токен | Элемент |
|-------|---------|
| `cardRadius` | Карточки |
| `inputRadius` | Поля ввода |
| `chipRadius` | Теги/чипы |
| `modalRadius` | Модальные окна |

### 3.7. Отступы и сетка

| Токен | Назначение |
|-------|-----------|
| `spacingBase` | Базовый отступ (px) |
| `spacingScale` | Мультипликатор сетки |
| `containerWidth` | Макс. ширина контейнера |
| `sidebarWidth` | Ширина sidebar |
| `gridGap` | Отступ в гриде |
| `gridColumns` | Кол-во колонок |

### 3.8. Анимация

| Токен | Тип | Варианты |
|-------|-----|---------|
| `animDuration` | number | ms |
| `animEasing` | string | CSS timing function |
| `archPageEnter` | enum | `none` · `fade` · `slide` |
| `archContentReveal` | enum | `none` · `fade-up` · `fade` · `slide-up` · `blur` |
| `archTextReveal` | enum | `none` · `clip` · `blur-in` · `letter-fade` |

### 3.9. Архитектурные токены (arch*)

| Токен | Назначение | Варианты |
|-------|-----------|---------|
| `archDensity` | Пространственная плотность | `dense` · `normal` · `airy` · `grand` |
| `archHeadingTracking` | Трекинг заголовков | ×0.01em, -5..30 |
| `archHeadingCase` | Регистр заголовков | `none` · `uppercase` · `lowercase` · `capitalize` |
| `archDivider` | Разделитель секций | `none` · `line` · `gradient` |
| `archLinkAnim` | Анимация ссылок | `none` · `underline` · `arrow` |
| `archSectionStyle` | Стиль секций | `flat` · `card` · `striped` |
| `archNavStyle` | Уровень chrome навигации | `full` · `minimal` · `hidden` |
| `archCardChrome` | Видимость границ карточек | `visible` · `subtle` · `ghost` |
| `archHeroScale` | Масштаб заголовка страницы | `compact` · `normal` · `large` · `cinematic` |
| `archVerticalRhythm` | Вертикальный ритм | 0.5–3.0 |

---

## 4. Готовые темы (UITheme)

Определены в `app/composables/useUITheme.ts`.

| ID | Название | Тон |
|----|---------|-----|
| `cloud` | Cloud | Холодный серый |
| `linen` | Linen | Тёплый кремовый |
| `stone` | Stone | Нейтральный камень |
| `noir` | Noir | Чёрный / тёмный |
| `garden` | Garden | Зелёный натуральный |
| `copper` | Copper | Медный тёплый |

Каждая тема содержит:
- `vars` — CSS переменные для **светлого** режима
- `darkVars` — CSS переменные для **тёмного** режима  
- `tokens` — Partial<DesignTokens> переопределения

---

## 5. CSS-классы: утилиты

### 5.1. Поверхности

```css
.glass-page     /* background страницы */
.glass-surface  /* поверхность с backdrop-filter blur */
.glass-card     /* карточка контента */
.glass-input    /* поле ввода */
.glass-chip     /* тег / чип / бейдж */
```

### 5.2. Навигация

```css
.std-nav          /* вертикальный список навигации */
.std-sidenav      /* sidebar-навигация с заголовком */
.std-nav-item     /* пункт навигации */
.std-nav-item--active  /* активный пункт */
.admin-tab        /* таб шапки admin */
.admin-tab--active  /* активный таб */
```

### 5.3. Кнопки

```css
.a-btn       /* основная кнопка */
.a-btn-sm    /* малая кнопка */
.std-btn     /* стандартная кнопка (альт. стиль) */
```

### 5.4. Цвета статусов

```css
.pj-phase--green   /* завершён / активен */
.pj-phase--yellow  /* на паузе */
.pj-phase--grey    /* архив */
```

---

## 6. Темизация — алгоритм применения

```
1. Пользователь нажимает свотч темы в UIDesignPanel
2. useUITheme.applyTheme(themeId) вызывается
3. theme.vars → применяются в document.documentElement.style (light)
4. theme.darkVars → сохраняются, применяются при isDark = true
5. theme.tokens → useDesignSystem.applyTokens(tokens)
6. Токены → CSS custom properties через bridge-плагин
7. Все компоненты перерисовываются реактивно
```

---

## 7. Экспорт/Импорт токенов

Доступно в вкладке "экспорт" UIDesignPanel:

- **JSON** — полный объект `DesignTokens` для хранения в файле конфигурации
- **CSS** — `@layer tokens { :root { --var: value; ... } }` для прямого использования
- **Импорт JSON** — загрузка токенов из файла с валидацией

---

## 8. Шрифты

Определены в `FONT_OPTIONS` в `useDesignSystem.ts`:

| ID | Значение |
|----|----------|
| `system` | `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` |
| + Google Fonts | Inter, Montserrat, Playfair Display, и др. |

---

## 9. Правила расширения дизайн-системы

1. **Добавить токен** → расширить `DesignTokens` интерфейс → добавить дефолт в `defaultTokens` → подключить в CSS bridge плагине.
2. **Добавить тему** → добавить объект в `UI_THEMES` с полями `id`, `label`, `swatch`, `swatchDark`, `vars`, `darkVars`, `tokens`.
3. **Новый компонент** → использовать переменные `var(--glass-*)`, `var(--btn-*)`, `var(--ds-*)` — не хардкодить цвета.
4. **Адаптивность** → breakpoints: `768px` (mobile), `992px` (tablet). Использовать `grid-gap: var(--ds-grid-gap)`.
