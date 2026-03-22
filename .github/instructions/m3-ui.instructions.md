# Material Design 3 + Vuetify UI Instructions — Messenger

Этот файл описывает правила построения интерфейса мессенджера на основе Material Design 3 (M3) через Vuetify 3.
Читать перед любым UI-изменением в `messenger/web/`.

---

## 1. Принципы M3 — фундамент

### 1.1 Цветовая система

M3 использует **роли**, а не конкретные цвета. Никогда не хардкодить `#RRGGBB` напрямую — только токены.

| Роль | Назначение |
|---|---|
| `primary` | Главные CTA, иконки активного нав-пункта, FAB |
| `on-primary` | Текст/иконки поверх primary |
| `primary-container` | Active indicator в навигации, чипы выбора |
| `on-primary-container` | Текст поверх primary-container |
| `secondary` | Вторичные элементы, меньший акцент |
| `secondary-container` | Фон вторичных контейнеров |
| `surface` | Основной фон карточек, листов |
| `surface-container-low` | Фон нижнего нав-бара, bottom sheets, composer |
| `surface-container` | Фон большинства слоёв |
| `surface-container-high` | Фон поднятых surface (поиск, header) |
| `surface-container-highest` | Самый поднятый surface-слой (модальные) |
| `on-surface` | Основной текст |
| `on-surface-variant` | Вторичный текст, иконки-заглушки |
| `outline` | Разделители, рамки полей |
| `outline-variant` | Тонкие разделители |
| `error` | Ошибки, destructive actions |
| `scrim` | Затемнение under modal |

**Правила применения:**
- Elevation (высота) в M3 выражается **тональным сдвигом surface**, а не shadow. Shadow применяется минимально и только для FAB, bottom sheet, dialog.
- В тёмной теме более высокий surface = светлее. В светлой = немного темнее.
- Никаких кастомных цветов без явного токена в `--messenger-token-*`.

### 1.2 Типографика

M3 определяет 5 ролей × 3 размера = 15 стилей:

| Роль | Large | Medium | Small |
|---|---|---|---|
| `display` | 57px | 45px | 36px |
| `headline` | 32px | 28px | 24px |
| `title` | 22px | 16px | 14px |
| `body` | 16px | 14px | 12px |
| `label` | 14px | 12px | 11px |

**Маппинг на интерфейс мессенджера:**
- Имя собеседника в заголовке чата → `title-large` (22px, weight 500)
- Preview последнего сообщения в списке → `body-medium` (14px)
- Метка времени → `label-small` (11px, on-surface-variant)
- Текст сообщения → `body-large` (16px)
- Кнопка нав-бара → `label-medium` (12px)
- Заголовок секции настроек → `title-medium` (16px, weight 500)
- Подзаголовок поля настроек → `body-medium` (14px, on-surface-variant)

**Правила:**
- Не использовать font-weight > 700 в обычных элементах интерфейса.
- Шрифт мессенджера — Roboto (системный stack) или Roboto Flex для web.
- Letter-spacing для label: 0.5px; для body: 0px.

### 1.3 Форма (Shape)

M3 использует радиусы скругления по уровням:

| Уровень | Радиус | Применение |
|---|---|---|
| `none` | 0 | Разделители, полноэкранные слои |
| `extra-small` | 4px | Мелкие чипы, tooltips |
| `small` | 8px | Поля ввода текста (corners), маленькие карточки |
| `medium` | 12px | Карточки, меню |
| `large` | 16px | Большие карточки, нижняя навигация |
| `extra-large` | 28px | Bottom sheets, dialog, composer |
| `full` | 50% | Аватары, FAB-круглые, badges |

**В мессенджере:**
- Пузыри сообщений: `large` = 16px (с исключением для «хвостика» — 0px у прилегающего угла)
- Bottom dock (composer / search): `extra-large` = 28px сверху, 0 снизу
- Нижний нав-бар: `large` = 16px сверху
- Active indicator в нав-баре: `full` (pill shape)
- Чипы (`VChip`): `small` = 8px или `full` в зависимости от контекста
- Аватары: `full`
- Поля ввода: `small` = 8px сверху (filled) или `full` (rounded)

### 1.4 Elevation (эlewation)

M3 использует **6 уровней** elevation:

| Level | dp | Overlay opacity | Применение |
|---|---|---|---|
| 0 | 0 | 0% | Основные поверхности |
| 1 | 1dp | 5% | Chip, NavigationBar, bottom nav |
| 2 | 3dp | 8% | Card, FAB |
| 3 | 6dp | 11% | FAB hover, Tooltip |
| 4 | 8dp | 12% | App bar on scroll |
| 5 | 12dp | 14% | Bottom sheet, Dialog, Snackbar |

**Правила:**
- Не добавлять box-shadow к элементам elevation 0–2, если это не диктует тема.
- Elevation выражается через tonal overlay (для dark theme): чем выше уровень, тем светлее фон.
- В Vuetify это контролируется через `variant="tonal"` + `elevation` prop.

---

## 2. Компоненты M3 → Vuetify mapping

### 2.1 Navigation Bar

**M3 spec:** Navigation bar — для 3–5 destinations на compact (mobile) экранах.

```vue
<!-- ПРАВИЛЬНО -->
<VBottomNavigation v-model="active" grow class="bottom-nav">
  <VBtn value="chat" icon>
    <VIcon>mdi-message</VIcon>
    <span class="bottom-nav__label">Чат</span>
  </VBtn>
  <!-- 3-4 пункта максимум -->
</VBottomNavigation>
```

**Правила:**
- Высота нав-бара: 80px (M3 baseline), включая safe-area-inset-bottom.
- Цвет фона: `surface-container` (`variant="flat"`, `color="surface"` в Vuetify).
- Active indicator: pill форма вокруг иконки, `primary-container` background, ширина ~64px, высота ~32px.
- Иконка неактивного пункта: `on-surface-variant`.
- Иконка активного пункта: `on-secondary-container`.
- Метки всегда видны (не скрывать при малом экране).
- Максимум 4 пункта для данного мессенджера: Chat, Chats, Contacts, Settings.

### 2.2 App Bar / Header

**M3 spec:** Top app bar — заголовок текущего экрана + actions.

```vue
<!-- Заголовок чата — ПРАВИЛЬНО -->
<div class="section-head--chat-header">
  <VBtn icon variant="text" @click="back">
    <MessengerIcon name="arrow-back" :size="24" />
  </VBtn>
  <div class="chat-header-identity">
    <VAvatar size="36" color="primary" variant="tonal">{{ initial }}</VAvatar>
    <div>
      <p class="title-medium">{{ name }}</p>
      <p class="label-small on-surface-variant">{{ status }}</p>
    </div>
  </div>
  <VBtn icon variant="text">
    <MessengerIcon name="phone" :size="24" />
  </VBtn>
</div>
```

**Правила:**
- Header высота: min 64px (M3 small top app bar).
- Фон: `surface-container` с `backdrop-filter` для blur-эффекта.
- На scroll: elevation 2 — тональное затемнение.
- Никаких теней в состоянии покоя.

### 2.3 Cards

**M3 spec:** Три варианта карточек:

| Вид | Vuetify variant | Назначение |
|---|---|---|
| Elevated | `elevation` | Основные карточки, когда нужно выделение |
| Filled | `flat` + tonal color | Контентные блоки list items |
| Outlined | `outlined` | Вторичные блоки, настройки |

```vue
<!-- Карточка чата в списке — ПРАВИЛЬНО (filled) -->
<VCard
  color="surface"
  variant="tonal"
  class="list-card list-card--chat-row"
  @click="openChat"
>
```

**Правила:**
- Никогда не добавлять `elevation` > 2 к статичным карточкам в списке.
- Используй `variant="tonal"` для большинства карточек мессенджера.
- `border-radius: 16px`  — `large` M3 shape.
- Hover state: 8% state layer overlay над цветом карточки.

### 2.4 Buttons

| Тип | Vuetify | Применение |
|---|---|---|
| Filled | `variant="flat"` + `color="primary"` | Главный CTA (Отправить, Принять) |
| Tonal | `variant="tonal"` + `color="secondary"` | Вторичные действия |
| Outlined | `variant="outlined"` | Третичные действия |
| Text | `variant="text"` | Inline действия (Отмена) |
| Icon | `icon` + `variant="text"` | Toolbar actions |

```vue
<!-- Кнопка отправки — ПРАВИЛЬНО -->
<VBtn
  variant="flat"
  color="primary"
  :disabled="!hasContent"
  @click="send"
>
  <MessengerIcon name="send" :size="20" />
</VBtn>

<!-- Toolbar icon button — ПРАВИЛЬНО -->
<VBtn icon variant="text" aria-label="Прикрепить файл">
  <MessengerIcon name="paperclip" :size="24" />
</VBtn>
```

**Правила:**
- Минимальный tap target: 48×48px (M3 standard), обеспечивается padding, не размером иконки.
- Нельзя использовать `elevation` > 0 на icon-кнопках.
- `border-radius` для обычных кнопок: `full` (pill shape = 50px).
- State layers: hover = 8%, press = 10%, focused = 10%.

### 2.5 Text Fields (Input)

M3 предлагает два вида: **Filled** и **Outlined**.

```vue
<!-- Поле ввода поиска — ПРАВИЛЬНО (filled) -->
<VTextField
  v-model="query"
  variant="solo-filled"
  flat
  hide-details
  prepend-inner-icon="mdi-magnify"
  placeholder="Поиск"
  class="search-field"
  bg-color="surface-container-high"
/>

<!-- Поле ввода сообщения — ПРАВИЛЬНО -->
<textarea
  class="composer-input"
  placeholder="Сообщение"
  rows="1"
/>
```

**Правила:**
- Search-поле в dock: `variant="solo"` (filled, без outline), `bg-color="surface-container-high"`, `border-radius: 28px` (full/pill).
- Поля форм в Settings: `variant="outlined"`, `border-radius: 4px` согласно M3.
- Composer textarea: кастомный `<textarea>`, не Vuetify, для полного контроля автоизменения высоты.
- Active/focused состояние: outline цвет = `primary`, label поднимается вверх.
- Никогда не убирать `label` у форм — это ломает доступность.

### 2.6 Chips

```vue
<!-- Фильтр категорий — ПРАВИЛЬНО -->
<VChip
  :variant="isActive ? 'flat' : 'tonal'"
  :color="isActive ? 'secondary' : undefined"
  size="small"
  @click="select"
>
  Стикеры
</VChip>
```

**Правила:**
- Filter chips (категории контента): `border-radius: full`, высота 32px.
- Input chips (выбранные теги): с `closable`.
- Не использовать `elevated` chips в мессенджере.
- Active chip: `secondary-container` background, `on-secondary-container` text.

### 2.7 Lists

```vue
<!-- Список чатов — ПРАВИЛЬНО -->
<VList bg-color="transparent" lines="two">
  <VListItem
    v-for="chat in chats"
    :key="chat.id"
    class="list-card list-card--chat-row"
    @click="open(chat.id)"
  >
    <template #prepend>
      <VAvatar color="primary" variant="tonal">{{ initial }}</VAvatar>
    </template>
    <template #title>{{ chat.name }}</template>
    <template #subtitle>{{ chat.preview }}</template>
    <template #append>
      <span class="label-small">{{ chat.time }}</span>
    </template>
  </VListItem>
</VList>
```

**Правила:**
- `bg-color="transparent"` всегда — фон строит внешний контейнер.
- Высота строки списка: min 72px (two-line M3).
- Аватар в `#prepend`: size=48, `border-radius: full`.
- Разделители: НЕ использовать `<VDivider>` между ChatRow — достаточно gap/spacing.
- Hover/pressed state: 8%/10% overlay через CSS.

### 2.8 Tabs

```vue
<!-- Tabs меню стикеров — ПРАВИЛЬНО -->
<VTabs
  v-model="tabModel"
  class="composer-media-menu__tabs"
  bg-color="surface-container-low"
  color="primary"
  density="compact"
>
  <VTab value="emoji">😀 Смайлы</VTab>
  <VTab value="stickers">🎨 Стикеры</VTab>
  <VTab value="gif">📷 GIF</VTab>
</VTabs>
```

**Правила:**
- Active indicator под табом: 3px линия `primary` (secondary tabs) или pill (`primary tabs`).
- Высота Tab: 48px (secondary tabs в M3) или 64px (primary tabs).
- `VTabs` в composer: `density="compact"`, высота 56px.
- Горизонтальный скролл при нехватке ширины — обязательно.
- Равномерное распределение: `v-slide-group` с `justify-content: space-around`.

### 2.9 Switches

```vue
<!-- Тумблер настроек — ПРАВИЛЬНО -->
<div class="setting-toggle">
  <span class="setting-toggle__copy">
    <span class="setting-field__label">{{ label }}</span>
    <span class="setting-card__meta">{{ description }}</span>
  </span>
  <VSwitch
    v-model="value"
    color="primary"
    hide-details
    inset
  />
</div>
```

**Правила:**
- `color="primary"` всегда для Switch.
- `hide-details` — детали выводятся в `setting-card__meta` рядом, не внутри Switch.
- `inset` для правильного M3 thumb-трека.
- Ширина трека: 52px, высота: 32px.

### 2.10 Bottom Sheets

```vue
<!-- Bottom sheet (composer media menu) — ПРАВИЛЬНО -->
<div
  class="composer-media-menu"
  role="dialog"
  aria-modal="true"
  aria-label="Выбор медиа"
>
  <!-- drag handle не обязателен в мессенджере  -->
  <!-- контент -->
</div>
```

**Правила:**
- Фон: `surface-container-low`.
- `border-radius: 28px 28px 0 0` (extra-large сверху).
- Анимация появления: `transform: translateY(100%)` → `translateY(0)`, duration `300ms`, `cubic-bezier(0.2, 0, 0, 1)` (M3 emphasize decelerate).
- Максимальная ширина: 640dp, при превышении — 56dp margins с боков.
- Z-index higher than navigation bar: `z-index: 25+`.

### 2.11 Snackbars / Alerts

```vue
<!-- Успешное действие — ПРАВИЛЬНО -->
<VSnackbar v-model="show" color="surface-container-high" :timeout="3000">
  Контакт добавлен
  <template #actions>
    <VBtn variant="text" color="primary" @click="show = false">OK</VBtn>
  </template>
</VSnackbar>
```

**Правила:**
- `color="surface-container-high"` — M3 не использует зелёный для обычных snackbar.
- Для ошибок: `color="error"` +  `text="on-error"`.
- Позиция: bottom-center, над bottom-nav (bottom: `bottom-nav-height + 16px`).
- Timeout: 3000–4000ms для информационных, infinity для destructive.

---

## 3. Layout — структура экрана

### 3.1 Canonical Mobile Layout (compact window)

```
┌─────────────────────────────┐  ← viewport height 100dvh
│  [Section Header/App Bar]   │  ← z-index 30, sticky
│                             │
│           CONTENT           │  ← flex: 1, overflow-y: auto
│           (scroll)          │
│                             │
├─────────────────────────────┤
│  [Bottom Dock]              │  ← composer / search (не скроллируется)
│  [Bottom Navigation Bar]    │  ← z-index 20, fixed/sticky
└─────────────────────────────┘  ← safe-area-inset-bottom
```

**CSS правила:**
```css
.messenger-shell {
  display: flex;
  flex-direction: column;
  height: 100dvh;           /* dynamic viewport — обязательно для mobile */
  overflow: hidden;
}

.section-block {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;            /* критично для flex overflow */
  overflow: hidden;
}

.bottom-nav {
  position: sticky;
  bottom: 0;
  z-index: 20;
  padding-bottom: env(safe-area-inset-bottom); /* iPhone home indicator */
}
```

### 3.2 Chat Screen layout

```
┌─────────────────────────────┐
│  [Chat Header]              │  sticky top
│───────────────────────────── │
│                             │
│  [Message List]             │  flex: 1, overflow-y: auto
│  (scroll-padding-bottom     │  = composer height)
│                             │
├─────────────────────────────┤
│  [Media Menu] (optional)    │  bottom sheet, abs из section
├─────────────────────────────┤
│  [Composer Dock]            │
└─────────────────────────────┘
```

**Правила:**
- Message list scrolls независимо от composer.
- При открытии keyboard: viewport shrinks, composer остаётся прилеплен к keyboard через `env(keyboard-inset-height)`.
- `--messenger-composer-height` CSS custom property обновляется через ResizeObserver в JS.

### 3.3 Spacing (Margin/Padding)

M3 использует spc в кратных 4dp:

| Значение | Использование |
|---|---|
| 4px | Промежутки между иконкой и текстом |
| 8px | Внутренние отступы мелких компонентов, gap между чипами |
| 12px | Padding строки списка по горизонтали |
| 16px | Стандартный горизонтальный margin экрана |
| 20px | Padding sections/cards |
| 24px | Spacing между крупными блоками |
| 32px | Вертикальные отступы заголовков секций |

**В мессенджере:**
- Горизонтальный padding контента экрана: 16px.
- Вертикальный padding строки чата/контакта: 12px.
- Gap между строками: 0 (разделение задаётся самим height строки).
- Composer padding: 12px по горизонтали, 8px вертикально.

---

## 4. Motion / Animation

M3 определяет несколько кривых (easing):

| Тип | Кривая | Использование |
|---|---|---|
| Emphasized | `cubic-bezier(0.2, 0, 0, 1)` | Элементы появляются (enter) |
| Emphasized decelerate | `cubic-bezier(0.05, 0.7, 0.1, 1)` | Bottom sheet rise, sheets expand |
| Emphasized accelerate | `cubic-bezier(0.3, 0, 0.8, 0.15)` | Элементы уходят (exit) |
| Standard | `cubic-bezier(0.2, 0, 0, 1)` | Обычные переходы |
| Standard decelerate | `cubic-bezier(0, 0, 0, 1)` | Общие деcelerate |

**Длительности:**
| Сценарий | Duration |
|---|---|
| Micro (ripple, hover) | 100ms |
| Short (chip, icon) | 200ms |
| Standard transition | 300ms |
| Expansion (bottom sheet) | 350ms |
| Full-screen transition | 400–500ms |

```css
/* ПРАВИЛЬНО — enter bottom dock */
.composer-enter-active { transition: transform 350ms cubic-bezier(0.05, 0.7, 0.1, 1); }
.composer-enter-from   { transform: translateY(100%); }

/* ПРАВИЛЬНО — exit */
.composer-leave-active { transition: transform 200ms cubic-bezier(0.3, 0, 0.8, 0.15); }
.composer-leave-to     { transform: translateY(100%); }
```

**Правила:**
- Никаких `transition: all` — только конкретные свойства.
- Не анимировать `height` напрямую — использовать `transform: scaleY` или `max-height` + clip.
- Respect `prefers-reduced-motion`: оборачивать в `@media (prefers-reduced-motion: reduce) { transition: none; }`.

---

## 5. State Layers (состояния)

M3 определяет визуальную обратную связь через **полупрозрачный overlay** поверх компонента:

| Состояние | Overlay opacity |
|---|---|
| Hover | 8% |
| Focused | 10% |
| Pressed | 10% |
| Dragged | 16% |
| Disabled | 38% (на сам элемент, не overlay) |

```css
/* ПРАВИЛЬНО — state layer через ::before */
.list-card--clickable {
  position: relative;
  cursor: pointer;
}
.list-card--clickable::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: currentColor;
  opacity: 0;
  pointer-events: none;
  transition: opacity 100ms ease;
}
.list-card--clickable:hover::before { opacity: 0.08; }
.list-card--clickable:active::before { opacity: 0.10; }
.list-card--clickable:focus-visible::before { opacity: 0.10; }
```

**Правила:**
- Vuetify добавляет state layer автоматически для своих компонентов.
- Для кастомных кликабельных элементов — реализовать вручную через `::before`.
- Disabled state: `opacity: 0.38`, `pointer-events: none`, `cursor: not-allowed`.

---

## 6. Vuetify конфигурация в мессенджере

### 6.1 Инициализация темы

```ts
// messenger/web/plugins/vuetify.ts
import { createVuetify } from 'vuetify'

export default createVuetify({
  theme: {
    defaultTheme: 'messengerLight',
    themes: {
      messengerLight: {
        dark: false,
        colors: {
          // Маппинг к --messenger-token-* переменным через CSS
          primary:                    '#6750A4', // M3 baseline фиолетовый
          'on-primary':               '#FFFFFF',
          'primary-container':        '#EADDFF',
          'on-primary-container':     '#21005D',
          secondary:                  '#625B71',
          'on-secondary':             '#FFFFFF',
          'secondary-container':      '#E8DEF8',
          'on-secondary-container':   '#1D192B',
          tertiary:                   '#7D5260',
          surface:                    '#FEF7FF',
          'surface-container-low':    '#F7F2FA',
          'surface-container':        '#F3EDF7',
          'surface-container-high':   '#ECE6F0',
          'surface-container-highest':'#E6E0E9',
          'on-surface':               '#1C1B1F',
          'on-surface-variant':       '#49454F',
          outline:                    '#79747E',
          'outline-variant':          '#CAC4D0',
          error:                      '#B3261E',
          'on-error':                 '#FFFFFF',
          scrim:                      '#000000',
        },
        variables: {
          'border-color': '#000000',
          'border-opacity': 0.12,
          'hover-opacity': 0.08,
          'focus-opacity': 0.10,
          'pressed-opacity': 0.10,
          'disabled-opacity': 0.38,
        },
      },
      messengerDark: {
        dark: true,
        colors: {
          primary:                    '#D0BCFF',
          'on-primary':               '#381E72',
          'primary-container':        '#4F378B',
          'on-primary-container':     '#EADDFF',
          secondary:                  '#CCC2DC',
          'on-secondary':             '#332D41',
          'secondary-container':      '#4A4458',
          'on-secondary-container':   '#E8DEF8',
          surface:                    '#141218',
          'surface-container-low':    '#1D1B20',
          'surface-container':        '#211F26',
          'surface-container-high':   '#2B2930',
          'surface-container-highest':'#36343B',
          'on-surface':               '#E6E1E5',
          'on-surface-variant':       '#CAC4D0',
          outline:                    '#938F99',
          'outline-variant':          '#49454F',
        },
      },
    },
  },
  defaults: {
    VBtn: { variant: 'tonal', rounded: 'xl' },
    VTextField: { variant: 'outlined', density: 'comfortable' },
    VSwitch: { color: 'primary', inset: true, hideDetails: true },
    VChip: { rounded: 'xl' },
    VCard: { rounded: 'xl' },
    VList: { bgColor: 'transparent' },
    VAvatar: { rounded: 'circle' },
    VBottomNavigation: { bgColor: 'surface-container' },
  },
})
```

### 6.2 CSS Custom Properties bridge

Vuetify генерирует `--v-theme-*` переменные. Мессенджер использует `--messenger-token-*` абстракцию.
Синхронизация происходит в основном CSS файле:

```css
[data-messenger-style="material"] {
  /* Surface */
  --messenger-token-surface:                    rgb(var(--v-theme-surface));
  --messenger-token-surface-container-low:      rgb(var(--v-theme-surface-container-low));
  --messenger-token-surface-container:          rgb(var(--v-theme-surface-container));
  --messenger-token-surface-container-high:     rgb(var(--v-theme-surface-container-high));
  --messenger-token-surface-container-highest:  rgb(var(--v-theme-surface-container-highest));
  
  /* Content (on-surface) */
  --messenger-token-on-surface:         rgb(var(--v-theme-on-surface));
  --messenger-token-on-surface-variant: rgb(var(--v-theme-on-surface-variant));
  
  /* Accent */
  --messenger-token-primary:              rgb(var(--v-theme-primary));
  --messenger-token-on-primary:           rgb(var(--v-theme-on-primary));
  --messenger-token-primary-container:    rgb(var(--v-theme-primary-container));
  --messenger-token-secondary:            rgb(var(--v-theme-secondary));
  --messenger-token-secondary-container:  rgb(var(--v-theme-secondary-container));
  --messenger-token-on-secondary-container: rgb(var(--v-theme-on-secondary-container));
  
  /* System */
  --messenger-token-outline:          rgb(var(--v-theme-outline));
  --messenger-token-outline-variant:  rgb(var(--v-theme-outline-variant));
  --messenger-token-error:            rgb(var(--v-theme-error));
}
```

### 6.3 Что НЕ делать с Vuetify

- ❌ `<VCard elevation="8">` — elevation > 2 нарушает M3.
- ❌ `<VBtn color="success">` для обычных действий — только `primary`/`secondary`/`error`.
- ❌ `variant="elevated"` на карточках данных — только `tonal` или `flat`.
- ❌ Переопределять Vuetify CSS через `!important` без крайней необходимости.
- ❌ Использовать Vuetify Grid (`VRow`/`VCol`) для layout экранов — использовать flex/grid CSS напрямую.
- ❌ `<VDialog>` для Bottom Sheet — использовать `<VBottomSheet>` или кастомный `.composer-media-menu`.

---

## 7. Composer Dock — детальная спецификация

Composer (Chat) и Search Dock (остальные экраны) — единая «зона дока» (Bottom Dock Rule).

```
┌──── composer-bar / search-dock ─────────────────────────────┐
│ [attach btn] │ [text field / search field] │ [send/record btn] │
└─────────────────────────────────────────────────────────────┘
```

**CSS:**
```css
.composer-bar--dock,
.search-dock--bottom-dock {
  background:     var(--messenger-token-composer-bg);   /* surface-container-low */
  border:         1px solid var(--messenger-token-composer-border); /* outline-variant */
  border-radius:  var(--messenger-token-composer-radius); /* 28px 28px 0 0 */
  padding:        12px 12px max(12px, env(safe-area-inset-bottom));
  min-height:     64px;
  display:        flex;
  align-items:    center;
  gap:            8px;
}
```

**Правила:**
- Все dock-кнопки: 48×48px tap target, `variant="text"`, `icon`, без border/shadow.
- Поле ввода в композере: `<textarea>` без Vuetify, растёт по контенту до max 5 строк.
- Поле поиска: `<VTextField variant="solo" flat>` с `border-radius: 28px`.
- После появления keyboard поле должно оставаться visible (sticky к keyboard).

---

## 8. Пузыри сообщений

```vue
<div
  :class="[
    'message-bubble',
    message.own ? 'message-bubble--out' : 'message-bubble--in',
  ]"
>
  <div class="message-bubble__body">
    <p class="message-bubble__text">{{ message.text }}</p>
    <div class="message-bubble__meta">
      <span class="message-bubble__time">{{ formatTime(message.createdAt) }}</span>
      <MessengerIcon v-if="message.own" name="check" :size="14" />
    </div>
  </div>
</div>
```

**M3 правила форм пузырей:**
- Входящий: `primary-container` / `secondary-container` фон, `border-radius: 4px 16px 16px 16px` (нижний левый угол острый у первого пузыря серии).
- Исходящий: `primary` фон, `border-radius: 16px 4px 16px 16px` (нижний правый острый у последнего в серии).
- Одиночный: `border-radius: 16px` (full, нет хвостика).
- Максимальная ширина пузыря: 80% экрана.
- Отступ от края: 16px (margin).

---

## 9. Иконки

Использовать единый набор `MessengerIcon` com:

```vue
<MessengerIcon name="send" :size="20" />      <!-- в composer -->
<MessengerIcon name="phone" :size="24" />     <!-- в app bar -->
<MessengerIcon name="check" :size="14" />     <!-- в метке сообщения -->
```

**Правила:**
- Размеры: 14 (мета), 16 (chips/hold actions), 18 (composer), 20 (send), 24 (nav/header).
- Цвет: наследуется от `color` parents — не задавать `fill` напрямую.
- Не использовать `mdi-*` напрямую в компонентах — только через `MessengerIcon`.
- `aria-hidden="true"` для декоративных иконок.

---

## 10. Доступность (a11y)

- `aria-label` на всех icon-кнопках.
- `role="dialog" aria-modal="true"` на bottom sheets.
- `aria-label` на секциях: `aria-label="Chats section"`, `aria-label="Settings"`.
- Focus trap в открытых bottom sheets.
- Минимальный контраст текста: 4.5:1 (WCAG AA) — обеспечивается M3 color system автоматически при правильном использовании ролей.
- `prefers-reduced-motion`: все анимации в `@media (prefers-reduced-motion: reduce)` выключаются.
- `lang="ru"` в `<html>`.
- Кликабельные элементы: не span/div без role, использовать `<button>` или `role="button"` + tabindex.

---

## 11. Антипаттерны (что запрещено)

| ❌ Запрещено | ✅ Правильно |
|---|---|
| `box-shadow: 0 8px 24px rgba(0,0,0,0.5)` | M3 elevation через tonal overlay |
| `background: linear-gradient(...)` поверх surface | Чистый surface-container-* токен |
| Карточки с `border-radius: 0` внутри экрана (кроме полноэкранных) | `border-radius: medium` (12px) минимум |
| `color: #666` хардкод | `color: var(--messenger-token-on-surface-variant)` |
| `font-size: 13px` хардкод | `font-size: var(--messenger-type-body-small)` или `body-small` |
| `VCard elevation="10"` | `VCard variant="tonal"` max elevation 2 |
| Overlay с `z-index: 9999` | Стратегия z-index: nav=20, dock=21, sheet=25, overlay=30 |
| `display: none` для скрытия animation-target | `Transition` + `v-if` или `opacity/transform` |
| `!important` в component-level CSS | Только в финальном M3 override блоке в main.css |
| Поиск вверху экрана | Поиск только в bottom dock (Bottom Dock Rule) |

---

## 12. Z-Index стратегия

| Слой | Z-Index | Элемент |
|---|---|---|
| Content | 1–9 | Обычный контент, карточки |
| Sticky headers | 10–19 | `section-head--chat-header` |
| Navigation | 20 | `bottom-nav`, `search-dock--bottom-dock` |
| Composer dock | 21 | `composer-bar--dock` |
| Media menu / bottom sheet | 25 | `composer-media-menu` |
| Overlay (call, gallery) | 30 | `MessengerCallOverlay`, `MessengerSharedGallery` |
| Toast / Snackbar | 40 | `VSnackbar` |
| System modal (dialog) | 50 | `VDialog` |

---

## 13. Чеклист перед PR

- [ ] Все цвета через `--messenger-token-*` токены, не хардкод
- [ ] Контрастность ≥ 4.5:1 для всего текста
- [ ] Tap targets ≥ 48×48px
- [ ] `aria-label` на всех icon-кнопках
- [ ] Анимации через M3 easing curves
- [ ] `prefers-reduced-motion` обработан
- [ ] Bottom Dock Rule соблюдён (поиск только снизу)
- [ ] Нет `elevation > 2` на статических карточках
- [ ] `border-radius` по M3 shape system
- [ ] Нет хардкода типографики (`font-size: 14px` etc)
- [ ] Нет прямых `mdi-*` иконок — только через `MessengerIcon`
- [ ] `safe-area-inset-bottom` учтён в dock/nav padding
