# RAG-04: Дизайн-токены и стили

## Ключевые файлы

| Файл | Назначение |
|------|-----------|
| `app/composables/useDesignSystem.ts` | Движок токенов, undo/redo, presets, export |
| `app/composables/useUITheme.ts` | 6 готовых тем (Cloud, Linen, Stone, Noir, Garden, Copper) |
| `app/assets/css/main.css` | Глобальные стили (~2055 строк) |
| `app/components/UIDesignPanel.vue` | Визуальный редактор токенов (admin only) |
| `app/components/UIThemePicker.vue` | Переключатель тем |

## CSS Custom Properties — быстрый справочник

```css
/* Поверхности */
--glass-page-bg    /* фон страницы */
--glass-bg         /* фон карточки/surface */
--glass-border     /* граница */
--glass-shadow     /* тень */
--glass-text       /* основной текст */

/* Семантические цвета */
--ds-accent        /* акцентный (HSL из токенов) */
--ds-success       /* зелёный */
--ds-error         /* красный */
--ds-warning       /* янтарный */

/* Кнопки */
--btn-bg-base      /* фон кнопки */
--btn-color        /* текст кнопки */
--btn-border-base  /* граница кнопки */

/* Типографика */
--ds-font          /* семейство шрифтов */
--ds-text-sm       /* малый текст (~0.84rem) */
--ds-text-xs       /* микро-текст (~0.78rem) */
--ds-heading-weight /* вес заголовка */

/* Радиусы */
--card-radius      /* радиус карточки (из токена cardRadius) */
```

## Готовые темы

| ID | Фон (light) | Текст (light) | Акцент |
|----|------------|--------------|--------|
| `cloud` | `#f4f4f2` | `#2c2c2a` | hsl(220, 14%, 50%) |
| `linen` | `#ede8de` | `#3e3228` | тёплый |
| `stone` | нейтральный серый | тёмный серый | нейтральный |
| `noir` | `#0a0a0a` | `#f0f0f0` | высококонтрастный |
| `garden` | зелёный | тёмный | зелёный акцент |
| `copper` | тёплый | тёмный | медный |

## Дизайн-токены (сгруппировано)

### Цвета (HSL)
```
accentHue, accentSaturation, accentLightness
successHue, successSaturation
errorHue, errorSaturation
warningHue, warningSaturation
```

### Типографика
```
fontFamily, fontSize, fontWeight, headingWeight
letterSpacing, lineHeight, typeScale
headingLetterSpacing, headingLineHeight
paragraphMaxWidth, textAlign, paragraphSpacing
```

### Кнопки
```
btnRadius, btnSize (xs/sm/md/lg), btnStyle (filled/outline/ghost/soft)
btnTransform, btnWeight, btnPaddingH, btnPaddingV
```

### Поверхности
```
glassBlur, glassOpacity, glassBorderOpacity, glassSaturation
shadowOffsetY, shadowBlurRadius, shadowSpread, shadowOpacity
```

### Радиусы
```
cardRadius, inputRadius, chipRadius, modalRadius
```

### Отступы/Сетка
```
spacingBase, spacingScale
containerWidth, sidebarWidth, gridGap, gridColumns
```

### Архитектурные
```
archDensity (dense/normal/airy/grand)
archPageEnter (none/fade/slide)
archContentReveal (none/fade-up/fade/slide-up/blur)
archTextReveal (none/clip/blur-in/letter-fade)
archNavStyle (full/minimal/hidden)
archCardChrome (visible/subtle/ghost)
archHeroScale (compact/normal/large/cinematic)
```

## CSS-классы: утилиты компонентов

### Поверхности
```
glass-page, glass-surface, glass-card, glass-input, glass-chip
```

### Навигация
```
std-nav, std-sidenav, std-nav-item, std-nav-item--active
admin-tab, admin-tab--active
ent-nav-item, ent-nav-item--active
```

### Кнопки
```
a-btn, a-btn-sm, std-btn
```

### Утилиты
```
pj-phase--green, pj-phase--yellow, pj-phase--grey  (статус проекта)
```

## Применение темы (алгоритм)

1. `useUITheme.applyTheme(id)` вызывается при смене темы
2. `theme.vars` → `document.documentElement.style.setProperty()`
3. При `isDark` → применяются `theme.darkVars`
4. `theme.tokens` → `useDesignSystem.applyTokens(tokens)`
5. Токены конвертируются в CSS vars через Nuxt-плагин
6. Реактивное обновление всех компонентов

## Undo / Redo

- `useDesignSystem` хранит историю до 50 шагов
- Методы: `undo()`, `redo()`, `canUndo`, `canRedo`
- Кнопки в `UIDesignPanel` топ-баре

## Export/Import

- JSON: полный объект `DesignTokens`
- CSS: `:root { --var: value; }` custom properties
- Импорт через file input с валидацией структуры

## Адаптивность

| Breakpoint | Поведение |
|-----------|----------|
| `≤768px` | Таб-бар → горизонтальный scroll; sidebar → горизонтальный |
| `≤992px` | Колонки схлопываются; модали — full-width |
