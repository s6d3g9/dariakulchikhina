# UIDesignPanel — справочник редактора стилей

> Полная карта компонента `UIDesignPanel.vue` (3 922 строки).
> Используй при проектировании дизайна — здесь все табы, токены, диапазоны и варианты.
> Читай параллельно с `UI_RULES.md` (примитивы / шаблоны).

---

## 1. Архитектура

```
UIDesignPanel.vue
  └─ useDesignSystem()          composable, tokens → CSS custom props
       ├─ DESIGN_PRESETS (36)   быстрые образы
       ├─ DESIGN_CONCEPTS (9)   целостные концепции
       ├─ FONT_OPTIONS (10)     шрифты
       ├─ TYPE_SCALE_OPTIONS (8) модулярные шкалы
       ├─ BTN_SIZE_MAP           XS / S / M / L
       └─ EASING_OPTIONS (6)    функции плавности
  └─ useUITheme()               5 палитровых тем
  └─ useThemeToggle()           light ↔ dark
```

**Поток данных:**
```
Контрол → tokens.{key} → useDesignSystem.applyToDOM() → CSS custom property → весь UI
```

**Персистентность:**
- `localStorage['design-tokens']` — JSON всех токенов
- `localStorage['design-concept']` — канонический short slug активного концепта
- `localStorage['design-mode']` — активное mode-family (`brutalist` / `liquid-glass` / `material3`)
- `localStorage['ui-theme:<mode>']` — последняя palette-тема внутри конкретного family
- `localStorage['ui-theme']` — legacy fallback и указатель на текущую активную palette-тему

**Undo / Redo:** история до 50 состояний, кнопки `⟲` / `⟳` в хедере панели.

---

## 2. Три режима (Mode Bar)

| Режим           | Slug              | Суть                                        |
|-----------------|-------------------|---------------------------------------------|
| Liquid Glass    | `glass`           | Chrome-first glass, blur, depth, мягкие формы |
| Minale+Mann     | `minale`          | Основной brutalist baseline: editorial black, tracked capitals, hairlines |
| Material 3      | `m3`              | Tonal surfaces, state layers, pill navigation, системные M3 affordance |
| По умолчанию    | `minale`          | Сброс к default family без потери общей архитектуры |

В UI переключение по-прежнему вызывается через `switchMode('concept-glass')`, `switchMode('concept-minale')`, `switchMode('concept-m3')`, но в DOM и storage пишутся канонические short slug: `glass`, `minale`, `m3`.

Обычные recipe-presets не должны самовольно писать произвольный `data-concept`: если preset не является явно concept-bound, он сохраняет текущий concept family и меняет только токены.

---

## 3. Образы — DESIGN_PRESETS (36 шт.)

Кнопки-рецепты на вкладке **«образы»**. Каждый пресет меняет 20-50 токенов разом.

| ID              | Стиль                              |
|-----------------|------------------------------------|
| `minimal`       | Минимализм, лёгкие тени            |
| `soft`          | Мягкий, скруглённый                |
| `brutalist`     | Брутализм, жёсткие углы            |
| `corporate`     | Корпоративный, деловой             |
| `editorial`     | Журнальный, типографика            |
| `neomorphism`   | Нео-морфизм, вдавленные карточки   |
| `glassmorphism` | Стеклянный эффект                  |
| `luxury`        | Премиальный, тёмные акценты        |
| `playful`       | Яркий, игривый                     |
| `swiss`         | Швейцарская типографика            |
| `monochrome`    | Чёрно-белый                        |
| `scandinavian`  | Сканди, натуральные тона           |
| `dashboard`     | Дэшборд, плотный                   |
| `material3`     | Material Design 3                  |
| `apple`         | Apple Human Interface              |
| `retro`         | Ретро, тёплые тона                 |
| `glow`          | Неоновое свечение                  |
| `ink`           | Чернильный, контрастный            |
| `bubblegum`     | Bubble-gum, розово-голубой         |
| `blueprint`     | Чертёжный, сетка                   |
| `minale`        | Minale+Mann                        |
| `bauhaus`       | Баухаус                            |
| `artdeco`       | Ар-деко                            |
| `cyberpunk`     | Киберпанк                          |
| `zen`           | Дзен, спокойный                    |
| `y2k`           | Y2K, глянцевый                     |
| `newspaper`     | Газетная вёрстка                   |
| `pastel`        | Пастельные тона                    |
| `tokyonoir`     | Tokyo Noir, тёмный урбан           |
| `terracotta`    | Терракота, землистые тона          |
| `arctic`        | Арктика, холодные тона             |
| `snohetta`      | Snøhetta (арх. бюро)              |
| `olsonkundig`   | Olson Kundig (арх. бюро)          |
| `mvrdv`         | MVRDV (арх. бюро)                 |
| `som`           | SOM (арх. бюро)                   |
| `mad`           | MAD Architects                     |

**Порядок:** клик → `previewPreset()` → live-preview → «Применить стиль» / «отмена».

---

## 4. Концепции — DESIGN_CONCEPTS (10 шт.)

Вкладка **«концепция»** — целостная смена *всех* параметров. «Меняет всё».

| ID                   | Название                       |
|----------------------|--------------------------------|
| `concept-silence`    | Тишина                         |
| `concept-function`   | Функция                        |
| `concept-craft`      | Ремесло                        |
| `concept-future`     | Будущее                        |
| `concept-editorial`  | Редакционный                   |
| `concept-brutal`     | Брутальный                     |
| `concept-glass`      | Стекло (Liquid Glass)          |
| `concept-grand`      | Гранд                          |
| `concept-minale`     | Minale+Mann                    |
| `concept-m3`         | Material 3                     |

Примечание:
- `concept-*` — это editor/API id, а не конечный DOM slug.
- После применения концепт нормализуется в short slug для `html[data-concept="..."]`.

---

## 5. Вкладки — полная карта (21 таб)

### 5.1 `palette` — Палитра

Палитра теперь **family-aware**: набор свотчей зависит от активной концепции.

**Liquid Glass family** — для `glass`, `craft`, `future` (5 свотчей):

| ID         | Цвет основы |
|------------|-------------|
| `cloud`    | #f4f4f2     |
| `linen`    | #ede8de     |
| `stone`    | #e8e5e0     |
| `fog`      | #eeeef0     |
| `parchment`| #f2ece1     |

**Material 3 family** — для `m3` (4 свотча):

| ID              | Цвет основы |
|-----------------|-------------|
| `m3-ocean`      | #d3e3fd     |
| `m3-sage`       | #c1f0ae     |
| `m3-terracotta` | #ffdbca     |
| `m3-slate`      | #d6e3ff     |

**Brutalist family** — для `minale`, `brutal`, `silence`, `function`, `editorial`, `grand` (4 свотча):

| ID               | Цвет основы |
|------------------|-------------|
| `brutal-mono`    | #f5f3ee     |
| `brutal-signal`  | #f5ed48     |
| `brutal-poster`  | #f7efe7     |
| `brutal-cobalt`  | #e8eeff     |

Примечание:
- При смене концепт-family редактор автоматически нормализует сохранённую тему к первой валидной теме нового семейства.
- Theme-vars очищаются перед применением новой темы, чтобы `material3`, `brutalist` и `liquid-glass` не оставляли друг другу хвосты в DOM.

**Акцент (HSL):**

| Токен              | Диапазон   | Шаг  |
|--------------------|-----------|------|
| `accentHue`        | 0 — 360   | 1    |
| `accentSaturation` | 0 — 100   | 1    |
| `accentLightness`  | 20 — 80   | 1    |

**Статусные цвета:**

| Токен                | Диапазон   | Назначение   |
|----------------------|-----------|--------------|
| `successHue`         | 0 — 360   | Успех (H)    |
| `successSaturation`  | 0 — 100   | Успех (S)    |
| `warningHue`         | 0 — 360   | Внимание (H) |
| `warningSaturation`  | 0 — 100   | Внимание (S) |
| `errorHue`           | 0 — 360   | Ошибка (H)   |
| `errorSaturation`    | 0 — 100   | Ошибка (S)   |

**Цвета элементов — Фон:**

| Токен         | Элемент   |
|---------------|-----------|
| `bgPage`      | Фон страницы |
| `bgCards`     | Фон карточек |
| `bgNav`       | Фон навигации |
| `bgModals`    | Фон модалок |
| `bgBorders`   | Цвет границ |

**Цвета элементов — Текст:**

| Токен         | Элемент        |
|---------------|----------------|
| `textMain`    | Основной текст |
| `textHeadings`| Заголовки      |
| `textMuted`   | Приглушённый   |
| `textLinks`   | Ссылки         |

**Цвета элементов — Интерактивные:**

| Токен         | Элемент        |
|---------------|----------------|
| `btnBg`       | Фон кнопок     |
| `btnText`     | Текст кнопок   |
| `inputBg`     | Фон инпутов    |
| `tagBg`       | Фон тегов      |
| `tagText`     | Текст тегов    |

Каждый — `<input type="color">` + кнопка сброса.

---

### 5.2 `colors` — Цвета (детально)

Расширенные color-picker'ы с hex-отображением и live-preview карточкой.
Группы: фоны (page / surface / border), тексты (main / heading / link), кнопки (bg / text).

---

### 5.3 `buttons` — Кнопки

| Контрол       | Токен           | Варианты / Диапазон                              |
|---------------|-----------------|--------------------------------------------------|
| Стиль         | `btnStyle`      | `filled` · `outline` · `ghost` · `soft`          |
| Размер        | `btnSize`       | `xs` · `sm` · `md` · `lg`                        |
| Регистр       | `btnTransform`  | `none` · `uppercase` · `capitalize`              |
| Hover-аним.   | `btnHoverAnim`  | `none` · `lift` · `scale` · `glow` · `fill` · `sheen` |
| Hover карточек| `cardHoverAnim` | `none` · `lift` · `scale` · `dim` · `border` · `reveal` |
| Скругление    | `btnRadius`     | 0 — 32 px                                       |
| Жирность      | `btnWeight`     | 300 — 800                                        |
| Отступ гор.   | `btnPaddingH`   | 0 (авто) — 60 px                                |
| Отступ верт.  | `btnPaddingV`   | 0 (авто) — 32 px                                |

**BTN_SIZE_MAP** (размеры по умолчанию):

| Размер | fontSize (rem) | px (гор.) | py (верт.) |
|--------|----------------|-----------|-----------|
| `xs`   | ≈ 0.68        | 10        | 4         |
| `sm`   | ≈ 0.75        | 14        | 6         |
| `md`   | ≈ 0.83        | 20        | 9         |
| `lg`   | ≈ 0.95        | 28        | 12        |

---

### 5.4 `type` — Типографика

4 контекста: **Текст** / **Заголовки** / **Кнопки** / **Поля**.

**Контекст «Текст»:**

| Токен              | Диапазон         | Шаг    |
|--------------------|-----------------|--------|
| `fontSize`         | 0.70 — 1.40     | 0.02   |
| `fontWeight`       | 300 — 700       | 100    |
| `letterSpacing`    | −0.02 — 0.15 em | 0.005  |
| `lineHeight`       | 1.1 — 2.0       | 0.05   |
| `paragraphSpacing` | 0 — 2.5 rem     | 0.05   |
| `wordSpacing`      | 0 (авто) — 0.3 em | 0.01 |
| `textIndent`       | 0 — 4 em        | 0.25   |
| `paragraphMaxWidth`| 0 (∞) — 100 ch  | 2      |
| `textAlign`        | `left` · `center` · `right` · `justify` | — |

**Контекст «Заголовки»:**

| Токен                  | Диапазон          | Шаг   |
|------------------------|--------------------|-------|
| `headingWeight`        | 300 — 900          | 100   |
| `headingLetterSpacing` | −0.06 — 0.15 em    | 0.005 |
| `headingLineHeight`    | 0.9 — 2.0          | 0.05  |

**Контекст «Кнопки»:** `letterSpacing`, `btnWeight`, `btnTransform` (дублирует таб Кнопки).

**Контекст «Поля»:** `inputFontSize` (0 = авто — 1.2 rem), `inputPaddingH` (4–32), `inputPaddingV` (2–24).

**Шрифты — FONT_OPTIONS (10, все локальные):**

| ID          | Семейство                          |
|-------------|-------------------------------------|
| `system`    | SF Pro / Segoe UI / system-ui       |
| `roboto`    | M3 Sans локальный UI stack          |
| `inter`     | Neo Grotesk                         |
| `geist`     | Sharp Sans                          |
| `dmSans`    | Humanist Sans                       |
| `manrope`   | Display Sans                        |
| `outfit`    | Wide Sans                           |
| `satoshi`   | UI Sans                             |
| `jetbrains` | "JetBrains Mono", monospace         |
| `georgia`   | Georgia, "Times New Roman", serif   |
| `playfair`  | Editorial Serif                     |

Примечание:
- Названия `inter`, `geist`, `dmSans`, `manrope`, `outfit`, `satoshi`, `playfair` сохранены как editor id для обратной совместимости.
- Фактические значения теперь указывают на локальные fallback-стеки и не требуют загрузки внешних Google Fonts.

---

### 5.5 `surface` — Поверхности

Две колонки: **Стекло** и **Тени** + live-preview карточка.

| Токен               | Диапазон      | Шаг   | Категория |
|---------------------|--------------|-------|-----------|
| `glassBlur`         | 0 — 40 px    | 1     | Стекло    |
| `glassOpacity`      | 0 — 1        | 0.02  | Стекло    |
| `glassBorderOpacity`| 0 — 0.5      | 0.01  | Стекло    |
| `glassSaturation`   | 100 — 200 %  | 5     | Стекло    |
| `shadowOffsetY`     | 0 — 24 px    | 1     | Тени      |
| `shadowBlurRadius`  | 0 — 64 px    | 1     | Тени      |
| `shadowSpread`      | −8 — 8 px    | 1     | Тени      |
| `shadowOpacity`     | 0 — 0.4      | 0.01  | Тени      |

---

### 5.6 `radii` — Скругления

| Токен          | Диапазон    | Шаг  |
|----------------|------------|------|
| `cardRadius`   | 0 — 32 px  | 1    |
| `inputRadius`  | 0 — 20 px  | 1    |
| `chipRadius`   | 0 — 999 px | 1    |
| `modalRadius`  | 0 — 28 px  | 1    |
| `spacingBase`  | 2 — 12 px  | 1    |
| `spacingScale` | 0.6 — 1.8  | 0.05 |

`chipRadius = 999` → бесконечный (пилюля).

---

### 5.7 `anim` — Анимация

| Токен          | Диапазон     | Шаг  |
|----------------|-------------|------|
| `animDuration` | 0 — 600 ms  | 10   |
| `animEasing`   | chip-picker  | —    |

**EASING_OPTIONS:**

| Значение                          | Метка      |
|-----------------------------------|------------|
| `ease`                            | Ease       |
| `ease-in-out`                     | Ease In-Out|
| `cubic-bezier(0.16,1,0.3,1)`     | Spring     |
| `linear`                          | Linear     |
| `cubic-bezier(0.33,1,0.68,1)`    | Smooth Out |
| `cubic-bezier(0.22,1,0.36,1)`    | Expo Out   |

Live-preview: анимированный шарик с кнопкой «▶ запуск».

---

### 5.8 `grid` — Сетка и макет

| Токен            | Диапазон        | Шаг  |
|------------------|----------------|------|
| `containerWidth` | 900 — 1400 px  | 10   |
| `sidebarWidth`   | 200 — 360 px   | 10   |
| `gridGap`        | 4 — 32 px      | 1    |
| `borderWidth`    | 0 — 3 px       | 0.5  |
| `borderStyle`    | `solid` · `dashed` · `none` | — |

---

### 5.9 `typeScale` — Модулярная шкала

Chip-picker из 8 вариантов:

| Ratio | Метка          |
|-------|----------------|
| 1.067 | Minor Second   |
| 1.125 | Major Second   |
| 1.150 | Custom 1.15    |
| 1.200 | Minor Third    |
| 1.250 | Major Third    |
| 1.333 | Perfect Fourth |
| 1.414 | Aug. Fourth    |
| 1.500 | Perfect Fifth  |

Визуализация: 7 ступеней (3xl → xs) с примерами размеров.

---

### 5.10 `darkMode` — Тёмная тема

| Токен            | Диапазон   | Шаг  | Hint                              |
|------------------|-----------|------|-----------------------------------|
| `darkElevation`  | 0 — 20    | 1    | Осветляет фоны карточек в dark    |
| `darkSaturation` | 0 — 100 % | 5    | Убавляет насыщенность в dark mode |

Live-preview: две карточки на тёмном фоне с текущими настройками.

---

### 5.11 `inputs` — Поля ввода

| Токен               | Диапазон     | Шаг    |
|---------------------|-------------|--------|
| `inputBgOpacity`    | 0 — 0.25    | 0.005  |
| `inputBorderOpacity`| 0 — 0.4     | 0.01   |
| `inputRadius`       | 0 — 20 px   | 1      |

Live-preview: text, select, textarea.

---

### 5.12 `tags` — Теги и чипы

| Токен              | Диапазон    | Шаг    |
|--------------------|-----------|--------|
| `chipRadius`       | 0 — 999   | 1      |
| `chipBgOpacity`    | 0 — 0.3   | 0.005  |
| `chipBorderOpacity`| 0 — 0.4   | 0.01   |
| `chipPaddingH`     | 3 — 24 px | 1      |
| `chipPaddingV`     | 1 — 12 px | 1      |

---

### 5.13 `nav` — Навигация

| Токен              | Диапазон     | Шаг |
|--------------------|-------------|-----|
| `navItemRadius`    | 0 — 24 px   | 1   |
| `navItemPaddingH`  | 4 — 28 px   | 1   |
| `navItemPaddingV`  | 2 — 18 px   | 1   |
| `sidebarWidth`     | 180 — 380 px| 5   |

---

### 5.14 `statuses` — Статусы и пин-бары

| Токен              | Диапазон   | Шаг    |
|--------------------|-----------|--------|
| `statusBgOpacity`  | 0 — 0.5   | 0.005  |
| `statusPillRadius` | 0 — 999   | 1      |

Статусы: ожидание, в работе, выполнено, пропущено, запланировано, на паузе, отмена.

---

### 5.15 `popups` — Попапы и оверлеи

| Токен                | Диапазон    | Шаг   |
|----------------------|------------|-------|
| `dropdownBlur`       | 0 — 40 px  | 1     |
| `modalOverlayOpacity`| 0 — 0.9    | 0.02  |
| `modalRadius`        | 0 — 28 px  | 1     |

---

### 5.16 `scrollbar` — Скроллбар

| Токен              | Диапазон   | Шаг   |
|--------------------|-----------|-------|
| `scrollbarWidth`   | 2 — 14 px  | 1     |
| `scrollbarOpacity` | 0 — 0.8    | 0.01  |

---

### 5.17 `tables` — Таблицы

| Токен                  | Диапазон   | Шаг    |
|------------------------|-----------|--------|
| `tableHeaderOpacity`   | 0 — 0.25  | 0.005  |
| `tableRowHoverOpacity` | 0 — 0.15  | 0.005  |
| `tableBorderOpacity`   | 0 — 0.4   | 0.01   |

---

### 5.18 `badges` — Значки / счётчики

| Токен            | Диапазон   | Шаг   |
|------------------|-----------|-------|
| `badgeRadius`    | 0 — 999   | 1     |
| `badgeBgOpacity` | 0 — 0.5   | 0.01  |

---

### 5.19 `arch` — Архитектура дизайна

Мастер-таб, управляющий пространственной архитектурой всего UI.

**Колонка «Пространство»:**

| Контрол                     | Токен                   | Варианты / Диапазон                           |
|-----------------------------|-------------------------|------------------------------------------------|
| Плотность                   | `archDensity`           | `dense` · `normal` · `airy` · `grand`          |
| Трекинг заголовков          | `archHeadingTracking`   | −5 — 30 (× 0.01 em)                            |
| Регистр заголовков          | `archHeadingCase`       | `none` · `uppercase` · `lowercase` · `capitalize` |
| Разделители секций          | `archDivider`           | `none` · `line` · `gradient`                    |
| Вертикальный ритм           | `archVerticalRhythm`    | 0.3 — 3.0 (×)                                   |

**Колонка «Хром и масштаб»:**

| Контрол                     | Токен                   | Варианты                                        |
|-----------------------------|-------------------------|-------------------------------------------------|
| Стиль навигации             | `archNavStyle`          | `full` · `minimal` · `hidden`                   |
| Хром карточек               | `archCardChrome`        | `visible` · `subtle` · `ghost`                  |
| Масштаб героя               | `archHeroScale`         | `compact` · `normal` · `large` · `cinematic`    |
| Появление контента          | `archContentReveal`     | `none` · `fade-up` · `fade` · `slide-up` · `blur` |
| Появление текста            | `archTextReveal`        | `none` · `clip` · `blur-in` · `letter-fade`     |
| Hover-эффект на карточку    | `cardHoverAnim`         | `none` · `lift` · `scale` · `dim` · `border` · `reveal` |
| Анимация ссылок             | `archLinkAnim`          | `none` · `underline` · `arrow`                  |
| Переход между страницами    | `archPageEnter`         | `none` · `fade` · `slide`                       |
| Стиль секций                | `archSectionStyle`      | `flat` · `card` · `striped`                     |

---

## 6. Экспорт / Импорт

| Действие   | Формат | Метод                |
|------------|--------|----------------------|
| Экспорт    | JSON   | `exportJSON()`       |
| Экспорт    | CSS    | `exportCSS()`        |
| Импорт     | JSON   | `importJSON(string)` |
| Копировать | —      | кнопка «копировать»  |

**JSON** — полный объект `DesignTokens` (все ≈100 ключей).
**CSS** — набор `--ds-*` / `--glass-*` custom properties, вставляемый в `:root`.

---

## 7. Инспектор

Две кнопки-режима в хедере:

| Режим              | Что делает                                                   |
|--------------------|--------------------------------------------------------------|
| **CSS Inspector**  | Наводишь → highlight-рамка + класс + CSS-путь + computed-значения токенов. Клик → карточка с `cssSelector`, `tokenInfo[]`, quick-edit слайдерами. |
| **Component Inspector** | Наводишь → Vue-компонент name + file path. Клик → карточка с кнопкой «копировать». |

**Quick-edit** в инспекторе: до 8 слайдеров, специфичных для секции элемента (кнопка → btnRadius/btnWeight, текст → fontSize/lineHeight/letterSpacing, и т.д.).

---

## 8. Футер панели

| Состояние           | Что отображается                                    |
|---------------------|-----------------------------------------------------|
| Preview active      | Badge «превью» + «отмена» + «✓ Применить стиль»   |
| Applied flash       | Тост «✓ Стиль применён» (1.6 с)                   |

---

## 9. Поиск по табам

Поле в хедере панели. Авто-переключает активный таб по ключевым словам.
Карта поиска (`sectionSearchMap`): каждый таб привязан к 5-30 русским и английским ключевым словам.

---

## 10. Рецепт быстрого прототипирования

```
1. Открой панель (⚙ в хедере)
2. Вкладка «концепция» → выбрать concept (задаёт всё)
3. Вкладка «палитра» → скорректировать тему + акцент
4. Вкладка «типографика» → выбрать шрифт, подправить размер
5. Вкладка «кнопки» → стиль + hover
6. «Применить стиль»
7. Экспорт → JSON (для передачи / сохранения)
```

---

## 11. Рецепт тонкой доводки

```
1. CSS Inspector → кликнуть любой элемент
2. Карточка покажет: класс, CSS-путь, текущие токены, quick-edit слайдеры
3. Подкрутить слайдеры прямо в карточке
4. Переключиться в нужный таб для полного контроля
```

---

## 12. Полный список токенов → CSS-переменных

| Токен (JS)               | CSS custom property          | Категория     |
|---------------------------|-------------------------------|---------------|
| `accentHue`               | `--ds-accent-h`              | Палитра       |
| `accentSaturation`        | `--ds-accent-s`              | Палитра       |
| `accentLightness`         | `--ds-accent-l`              | Палитра       |
| `fontFamily`              | `--ds-font`                  | Типографика   |
| `fontSize`                | `--ds-text-base`             | Типографика   |
| `fontWeight`              | `--ds-fw-normal`             | Типографика   |
| `headingWeight`           | `--ds-fw-heading`            | Типографика   |
| `letterSpacing`           | `--ds-tracking`              | Типографика   |
| `lineHeight`              | `--ds-leading`               | Типографика   |
| `headingLetterSpacing`    | `--ds-heading-tracking`      | Типографика   |
| `headingLineHeight`       | `--ds-heading-leading`       | Типографика   |
| `typeScale`               | `--ds-type-scale`            | Типографика   |
| `glassBlur`               | `--glass-blur`               | Поверхности   |
| `glassOpacity`            | `--glass-opacity`            | Поверхности   |
| `glassBorderOpacity`      | `--glass-border-opacity`     | Поверхности   |
| `glassSaturation`         | `--glass-saturation`         | Поверхности   |
| `shadowOffsetY`           | `--ds-shadow-y`              | Тени          |
| `shadowBlurRadius`        | `--ds-shadow-blur`           | Тени          |
| `shadowSpread`            | `--ds-shadow-spread`         | Тени          |
| `shadowOpacity`           | `--ds-shadow-opacity`        | Тени          |
| `cardRadius`              | `--card-radius`              | Скругления    |
| `inputRadius`             | `--input-radius`             | Скругления    |
| `chipRadius`              | `--chip-radius`              | Скругления    |
| `modalRadius`             | `--modal-radius`             | Скругления    |
| `btnRadius`               | `--btn-radius`               | Кнопки        |
| `btnWeight`               | `--btn-weight`               | Кнопки        |
| `btnSize`                 | `--btn-size`                 | Кнопки        |
| `btnStyle`                | `--btn-style`                | Кнопки        |
| `btnTransform`            | `--btn-transform`            | Кнопки        |
| `btnHoverAnim`            | `--btn-hover-anim`           | Кнопки        |
| `btnPaddingH`             | `--btn-px`                   | Кнопки        |
| `btnPaddingV`             | `--btn-py`                   | Кнопки        |
| `cardHoverAnim`           | `--card-hover-anim`          | Кнопки        |
| `animDuration`            | `--ds-anim-duration`         | Анимация      |
| `animEasing`              | `--ds-anim-easing`           | Анимация      |
| `containerWidth`          | `--ds-container`             | Сетка         |
| `sidebarWidth`            | `--ds-sidebar-w`             | Сетка         |
| `gridGap`                 | `--ds-gap`                   | Сетка         |
| `borderWidth`             | `--ds-border-w`              | Сетка         |
| `borderStyle`             | `--ds-border-style`          | Сетка         |
| `spacingBase`             | `--ds-space-base`            | Скругления    |
| `spacingScale`            | `--ds-space-scale`           | Скругления    |
| `darkElevation`           | `--ds-dark-elevation`        | Тёмная тема   |
| `darkSaturation`          | `--ds-dark-saturation`       | Тёмная тема   |
| `inputBgOpacity`          | `--input-bg-opacity`         | Инпуты        |
| `inputBorderOpacity`      | `--input-border-opacity`     | Инпуты        |
| `inputFontSize`           | `--input-font-size`          | Инпуты        |
| `inputPaddingH`           | `--input-px`                 | Инпуты        |
| `inputPaddingV`           | `--input-py`                 | Инпуты        |
| `chipBgOpacity`           | `--chip-bg-opacity`          | Теги          |
| `chipBorderOpacity`       | `--chip-border-opacity`      | Теги          |
| `chipPaddingH`            | `--chip-px`                  | Теги          |
| `chipPaddingV`            | `--chip-py`                  | Теги          |
| `navItemRadius`           | `--nav-item-radius`          | Навигация     |
| `navItemPaddingH`         | `--nav-item-px`              | Навигация     |
| `navItemPaddingV`         | `--nav-item-py`              | Навигация     |
| `statusBgOpacity`         | `--status-bg-opacity`        | Статусы       |
| `statusPillRadius`        | `--status-pill-radius`       | Статусы       |
| `dropdownBlur`            | `--dropdown-blur`            | Попапы        |
| `modalOverlayOpacity`     | `--modal-overlay-opacity`    | Попапы        |
| `scrollbarWidth`          | `--scrollbar-w`              | Скроллбар     |
| `scrollbarOpacity`        | `--scrollbar-opacity`        | Скроллбар     |
| `tableHeaderOpacity`      | `--table-header-opacity`     | Таблицы       |
| `tableRowHoverOpacity`    | `--table-row-hover-opacity`  | Таблицы       |
| `tableBorderOpacity`      | `--table-border-opacity`     | Таблицы       |
| `badgeRadius`             | `--badge-radius`             | Значки        |
| `badgeBgOpacity`          | `--badge-bg-opacity`         | Значки        |
| `archDensity`             | `--arch-density`             | Архитектура   |
| `archHeadingTracking`     | `--arch-heading-tracking`    | Архитектура   |
| `archHeadingCase`         | `--arch-heading-case`        | Архитектура   |
| `archDivider`             | `--arch-divider`             | Архитектура   |
| `archVerticalRhythm`      | `--arch-vertical-rhythm`     | Архитектура   |
| `archNavStyle`            | `--arch-nav-style`           | Архитектура   |
| `archCardChrome`          | `--arch-card-chrome`         | Архитектура   |
| `archHeroScale`           | `--arch-hero-scale`          | Архитектура   |
| `archContentReveal`       | `--arch-content-reveal`      | Архитектура   |
| `archTextReveal`          | `--arch-text-reveal`         | Архитектура   |
| `archLinkAnim`            | `--arch-link-anim`           | Архитектура   |
| `archPageEnter`           | `--arch-page-enter`          | Архитектура   |
| `archSectionStyle`        | `--arch-section-style`       | Архитектура   |

---

## 13. Связи файлов

| Файл                                   | Роль                                  |
|-----------------------------------------|---------------------------------------|
| `app/components/UIDesignPanel.vue`      | UI редактора (3 922 строки)           |
| `app/composables/useDesignSystem.ts`    | Composable: tokens, presets, apply    |
| `app/composables/useUITheme.ts`         | 5 тем с light/dark вариантами         |
| `app/composables/useThemeToggle.ts`     | Dark/light переключатель              |
| `app/plugins/theme-sync.client.ts`      | MutationObserver для html.dark        |
| `app/assets/css/design-system.css`      | CSS-переменные, генерируемые by tokens|

---

*Последнее обновление: автогенерация из UIDesignPanel.vue*
