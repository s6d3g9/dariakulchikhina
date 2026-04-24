# Messenger Web — стандарт UI-элементов

> Единый источник правды для кнопок, полей ввода, всплывающих окон, плашек,
> списков и токенов. Любой новый компонент или редизайн существующего обязан
> соответствовать этому каталогу. Расхождения исправляются волнами миграции
> (см. раздел «План»).

База — Vuetify 3 / Material Design 3 + theme `messengerColorSchemes.ts`. Проектные токены
живут в `app/assets/css/main.css` под префиксом `--messenger-*`. Цвета берём только из
`rgb(var(--v-theme-*))`, никогда не хардкодим hex.

---

## 1. Текущее состояние (резюме аудита)

Аудит охватил `app/widgets`, `app/features`, `app/entities/**/ui`, `app/pages` плюс
`app/assets/css/main.css`. Базис M3 в целом выдерживается (Vuetify-компоненты, токены
`--v-theme-*`), но накопились расхождения:

| Категория | Симптом расхождения |
|---|---|
| **Иконочные кнопки** | три разных размера (28 / 38 / неявный VBtn-default), четыре варианта (`text`, `tonal`, `flat`, `outlined`) для одной и той же роли |
| **Кнопки в формах** | смешение `variant="text"` и `variant="flat" color="primary"` для primary action в одном диалоге |
| **Диалоги** | разные `VCard` обёртки (`color="surface" variant="flat"` vs default), нет общего шаблона шапки/футера |
| **Chips / pills** | `border-radius: 999px` рядом с `16px` для визуально идентичных элементов |
| **Меню** | разный `density`, разный `bg-color` (одни через `surface-container-highest`, другие без), разные `location` |
| **Input** | composer-input через contenteditable + кастомный padding vs `VTextField density="compact"` в диалогах — разные высоты |
| **Карточки** | `.message-bubble`, `.new-chat-mode-card`, `.agent-system-card` — три модели surface-плашки с разными радиусами и dashed/solid бордерами |
| **Навигация** | сейчас единственная — нижний bar (после последних правок), но в CSS остались остатки rail/drawer |

Вывод: визуальный язык близок к согласованности, расхождения — в основном
«накопленный дрейф», не радикальная пересборка. Нужен явный каталог + миграция в 5 волн.

---

## 2. Принципы

1. **Один тип роли — один компонент.** Если у двух элементов одна и та же роль
   (primary action, icon-only, list item), они визуально неразличимы.
2. **Variant отражает иерархию, не вкус.**
   `flat` для primary, `tonal` для secondary, `text` для tertiary/icon, `outlined` —
   только когда нужен визуальный контур без заливки (редко).
3. **Размеры дискретны.** Только пять высот для интерактивных элементов:
   `28 / 36 / 40 / 48 / 56`. Никаких 30, 34, 38 — старые значения сводим к ближайшему.
4. **Радиусы дискретны.** Шкала: `4 / 8 / 12 / 16 / 24 / 28 / 999`. Любой
   радиус из CSS, не попадающий в шкалу, считается багом.
5. **Цвета — только токены.** `rgb(var(--v-theme-*))` или `var(--messenger-*)`.
6. **Плотности дискретны.** `default / comfortable / compact` — Vuetify-density,
   без промежуточных кастомов.
7. **Тени — три уровня.** `level-1` (hover/floating button), `level-2` (popover/menu),
   `level-3` (modal/sheet). Хардкод `box-shadow` запрещён вне токенов.
8. **Класс `.messenger-*` — для контейнеров, `.chat-header__*`, `.message-bubble__*` —
   для BEM-блоков по фичам.** Глобальные утилиты Vuetify (`.text-error`, `.mr-2`)
   допустимы.

---

## 3. Дизайн-токены

Все токены живут в `app/assets/css/main.css` (`:root`). Существующие переменные
сохраняем, недостающие добавляем в раздел `--messenger-ds-*` (design-system).

### 3.1 Радиусы

```css
--ds-radius-xs: 4px;
--ds-radius-sm: 8px;
--ds-radius-md: 12px;
--ds-radius-lg: 16px;
--ds-radius-xl: 24px;
--ds-radius-2xl: 28px;
--ds-radius-pill: 999px;
```

### 3.2 Высоты интерактивных элементов

```css
--ds-height-xs: 28px;   /* dense icon-btn в bubble controls */
--ds-height-sm: 36px;   /* compact button, chip */
--ds-height-md: 40px;   /* default input, text-button */
--ds-height-lg: 48px;   /* primary action, list item */
--ds-height-xl: 56px;   /* nav drawer item, FAB-small, header chip */
```

### 3.3 Отступы

```css
--ds-space-1: 4px;
--ds-space-2: 8px;
--ds-space-3: 12px;
--ds-space-4: 16px;
--ds-space-5: 20px;
--ds-space-6: 24px;
```

Внутренний padding кнопок и chip'ов = `var(--ds-space-3) var(--ds-space-4)`. Между
иконкой и текстом — `var(--ds-space-2)`.

### 3.4 Тени

```css
--ds-elevation-1: 0 1px 2px rgba(var(--v-theme-scrim), 0.08),
                  0 1px 3px rgba(var(--v-theme-scrim), 0.06);
--ds-elevation-2: 0 4px 8px rgba(var(--v-theme-scrim), 0.10),
                  0 2px 4px rgba(var(--v-theme-scrim), 0.08);
--ds-elevation-3: 0 12px 28px rgba(var(--v-theme-scrim), 0.18),
                  0 4px 8px rgba(var(--v-theme-scrim), 0.10);
```

### 3.5 Анимация

Уже есть `--messenger-motion-duration-{short,standard}` и
`--messenger-motion-easing-emphasized-decelerate`. Сохраняем, на новых компонентах
используем только их.

---

## 4. Каталог типов элементов

Каждый тип = (1) когда применять, (2) канонический Vuetify-компонент, (3) обязательные
атрибуты, (4) запрещённые альтернативы.

### 4.1 Кнопки

| Тип | Применение | Компонент | Variant / Color | Высота | Радиус |
|---|---|---|---|---|---|
| `button.primary` | главное действие в форме / диалоге | `VBtn` | `variant="flat"` `color="primary"` | `lg` (48) | `lg` (16) |
| `button.secondary` | вторичное действие рядом с primary | `VBtn` | `variant="tonal"` | `lg` (48) | `lg` (16) |
| `button.tertiary` | «Отмена», text-link | `VBtn` | `variant="text"` | `md` (40) | `md` (12) |
| `button.danger` | удаление, отказ от звонка | `VBtn` | `variant="flat"` `color="error"` | `lg` (48) | `lg` (16) |
| `button.icon` | действие на иконке (header, composer, message controls) | `VBtn icon` | `variant="text"` | `md` (40) | pill (999) |
| `button.icon-dense` | иконка в плотном контексте (bubble controls hover) | `VBtn icon size="small"` | `variant="text"` | `xs` (28) | pill |
| `button.fab` | floating action (новый чат, прокрутка вниз) | `VBtn` | `variant="flat"` `color="primary-container"` | `xl` (56) | `lg` (16) |
| `button.chip` | переключатель папки/режима | кастомный `<button>` или `VChip` | `variant="tonal"` | `sm` (36) | pill |
| `button.segmented` | элемент сегмент-контрола (нижний bar) | кастомный `<button>` | text + индикатор-pill | `lg` (48) | `sm` (8) |

**Запрещено:**
- `variant="elevated"` (М3 от него ушёл, у нас тоже не нужен).
- `variant="outlined"` — только если есть документированная причина (редкий toggle).
- Свой `box-shadow` поверх `VBtn`. Тень — через `--ds-elevation-*`.

**Текущие классы и куда их свести:**

| Текущий класс | Переезжает в |
|---|---|
| `.composer-btn--leading`, `.composer-btn--inside` | `button.icon` |
| `.message-action-btn` | `button.icon-dense` |
| `.chat-header__icon-btn` | `button.icon` |
| `.chats-fab` | `button.fab` |
| `.messenger-nav-btn` | `button.segmented` |
| `.chats-folder-chip`, `.chats-submenu-chip`, `.caps-chip`, `.aidev-chip` | `button.chip` |
| `.hold-actions__icon-btn` (28px) | `button.icon-dense` |

### 4.2 Поля ввода

| Тип | Применение | Компонент | Variant / Density | Высота |
|---|---|---|---|---|
| `input.text` | поле в форме / диалоге | `VTextField` | `variant="outlined"` `density="comfortable"` | `lg` (48) |
| `input.textarea` | многострочное в форме | `VTextarea` | `variant="outlined"` `density="comfortable"` `auto-grow` | растёт |
| `input.search` | поиск секции, поиск в чате | `VTextField` | `variant="solo-filled"` `density="compact"` `prepend-inner-icon="mdi-magnify"` | `md` (40) |
| `input.composer` | composer-сообщение (главный) | кастомный `<textarea>` / contenteditable | через `--messenger-dock-*` токены | min `md` (40), grows |
| `input.select` | выбор из списка | `VSelect` | `variant="outlined"` `density="comfortable"` | `lg` (48) |
| `input.autocomplete` | поиск + выбор | `VAutocomplete` | те же атрибуты что `input.select` | `lg` (48) |

**Запрещено:**
- `variant="underlined"` (Vuetify default) — не используем нигде.
- Кастомный border вокруг `VTextField` (есть случаи в диалогах — переписать).
- `density="compact"` для главного диалогового поля — слишком тесно для тапа.

**Тонкость composera:** `input.composer` остаётся кастомным из-за contenteditable
для iOS-фикса; стандартизация — на уровне токенов высоты и радиуса (`--ds-radius-xl` =
21px → округляем до 24px при следующей ревизии composera).

### 4.3 Всплывающие окна и оверлеи

| Тип | Применение | Компонент | Параметры |
|---|---|---|---|
| `popup.menu` | контекстное меню (overflow, model picker) | `VMenu` | `location="bottom end"` `offset="8"` `:close-on-content-click="true"` (если нет вложенных state) |
| `popup.tooltip` | подсказка по hover | `VTooltip` | `location="bottom"` `:open-delay="400"` |
| `popup.snackbar` | toast-уведомление | `VSnackbar` | `location="bottom"` `timeout="4000"` |
| `popup.dialog` | модальная форма / подтверждение | `VDialog` + `VCard` | `max-width="480"` (form) или `"360"` (confirm), `scrollable` если контент длинный |
| `popup.bottom-sheet` | мобильный action-sheet | `VBottomSheet` + `VCard` | `inset` |
| `popup.panel` | floating panel composer'а (aidev, search, project actions) | кастомный `<div>` с `position: absolute` | radius `lg`, тень `level-2`, backdrop-blur |
| `popup.sheet` | большой docked sheet (call analysis, agent workspace) | кастомный `<aside>` | radius `lg` сверху, тень `level-3` |
| `popup.header-sheet` | расширение верхней капсулы вниз (модель / мониторинг / overflow в шапке) | кастомный `<section>`, anchored к `.chat-header` | см. § 4.3.1 |

**Запрещено:**
- Свой backdrop / scrim — только через `VDialog`/`VOverlay` или unified `--ds-scrim`.
- `VMenu` с `location` отличным от `bottom *` или `top *` (сложнее предсказать).

**Канонический VList внутри VMenu:**

```vue
<VList density="comfortable" nav bg-color="surface-container-highest">
  <VListItem v-for="...">...</VListItem>
</VList>
```

`bg-color="surface-container-highest"` обязателен — это даёт нужный M3-elevation
на тёмной теме.

#### 4.3.1 `popup.header-sheet` — расширение верхней капсулы

Используется только для триггеров, живущих внутри `.chat-header` (правый кластер:
**модель / мониторинг / overflow** + аналогичные будущие). Не использовать как
универсальный popup — для коротких списков остаётся `popup.menu`.

**Геометрия и стыковка**

- Sheet — отдельный `<section>` сразу после `.chat-header` в DOM, с тем же
  `width` и горизонтальным `padding`, что и шапка (наследует `--messenger-shell-padding-x`).
- Outer radius sheet'а в открытом состоянии: верхние углы `0`, нижние —
  `var(--ds-radius-2xl)` (28). У шапки в этот момент нижние углы анимируются
  с `2xl` в `0` (`radius-flip`), верхние остаются `2xl`. На закрытии — обратный
  flip синхронно с высотой.
- Высота: `clamp(160px, content, 60vh)`. На mobile с открытой клавиатурой —
  `clamp(160px, content, calc(100dvh - var(--messenger-keyboard-offset, 0px) - 96px))`.
- Тень: `--ds-elevation-2`. Backdrop — полупрозрачный `--v-theme-scrim` `0.32`
  поверх остального `messenger-workspace`, без блюра (блюр оставляем для composer
  panels, чтобы header-sheet не «съел» производительность на mobile).
- Tone: фон `rgb(var(--v-theme-surface-container-highest))`, у шапки в этот
  момент остаётся `secondary-container` — это и есть «тот же контур, другой цвет»,
  про который договаривались.

**Состояние и переключение**

- Sheet хранит активный триггер (`'model' | 'monitor' | 'overflow' | null`).
  В шапке у активного триггера-кнопки visual-state `--active` (tonal-фон,
  тот же что в существующих `--active` правилах).
- Открытие нового триггера, когда sheet уже открыт другим:
  **content cross-fade** (180ms), высота анимируется только к новой
  `content-height`, **не сворачиваем в 0** между триггерами.
- Повторный клик по активному триггеру → close (полная анимация: радиус-flip
  на шапке, height → 0, удаление из DOM по `transitionend`).

**Закрытие**

- Click по backdrop, `Escape`, swipe-up на mobile.
- Открытие звонка / incoming call — закрывает sheet принудительно (звонок
  имеет приоритет на header-плашке).
- Переход в другую секцию через нижний bar — закрывает sheet.

**A11y**

- `<section role="dialog" aria-modal="false" aria-labelledby="...">` —
  `aria-modal="false"`, потому что sheet не блокирует чат полностью
  (звонки и realtime-события продолжают идти).
- Триггер-кнопки получают `aria-expanded` и `aria-controls` на id sheet'а.
- Focus trap не делаем (sheet не модальный); первый интерактивный
  элемент получает focus при открытии.

**Запрещено**

- Открывать sheet НЕ из `.chat-header`. Если нужен такой же визуальный
  эффект из другой плашки — это другой тип, обсуждаем отдельно.
- Параллельно открывать `popup.menu` поверх sheet'а — sheet сам должен
  содержать любые нужные дочерние списки.
- Выходить за горизонтальные границы шапки. Sheet всегда строго той же
  ширины, что родительская капсула.

### 4.4 Плашки / карточки / surface-блоки

| Тип | Применение | Компонент | Радиус | Бордер |
|---|---|---|---|---|
| `surface.card` | карточка в списке (template, agent, mode) | `VCard variant="tonal"` | `lg` (16) | none |
| `surface.card-outlined` | карточка-«призрак» (placeholder, drag target) | `VCard variant="outlined"` | `lg` (16) | dashed `--v-theme-outline-variant` |
| `surface.bubble` | сообщение в чате | кастомный `<div>` | `lg` (16) с асимметрией | none |
| `surface.plate` | заметная плашка-секция (header, dock) | кастомный `<header>`/`<div>` | `2xl` (28) для capsule, `lg` (16) для остальных | none |
| `surface.banner` | информационный banner | `VAlert variant="tonal"` | `md` (12) | none |
| `surface.callout` | quote / reply / forwarded relation | кастомный `<div>` | `sm` (8) с акцент-бордером слева | left-only solid |

**Текущие классы:**

| Класс | Тип |
|---|---|
| `.message-bubble` | `surface.bubble` |
| `.message-relation-card` | `surface.callout` |
| `.new-chat-mode-card`, `.new-chat-system-template`, `.agent-system-card` | `surface.card` (выровнять радиусы на `lg`) |
| `.chat-header`, `.composer-shell`, `.search-dock` | `surface.plate` |

### 4.5 Списки и пункты

| Тип | Применение | Компонент | Высота |
|---|---|---|---|
| `list.row` | строка чата / контакта | кастомный `<button>` | `xl` (56) или больше при с двумя строками текста |
| `list.menu-item` | пункт VMenu / drawer | `VListItem density="comfortable"` | `lg` (48) |
| `list.menu-item-dense` | пункт компактного списка (settings) | `VListItem density="compact"` | `md` (40) |
| `list.section-head` | sticky-заголовок секции | кастомный `<header>` | `xl` (56) |

### 4.6 Бейджи и индикаторы

| Тип | Применение | Компонент |
|---|---|---|
| `badge.count` | непрочитанные / number on icon | `VBadge` (overlap) или `<span>` |
| `badge.status` | host-badge, secret-marker, pinned | `VChip size="x-small" label` или кастомный pill |
| `indicator.dot` | online / typing / unread | `<span>` `width: 8 height: 8 radius: pill` |
| `indicator.pill` | анимированный фон активного nav-item | `<div>` с transform-translate |

### 4.7 Навигация

Сейчас единственный canonical — `messenger-bottom-nav`. Левый rail и постоянный
drawer удалены, мобильный modal-drawer удалён в последнем коммите. Если потребуется
вернуть второй уровень навигации (вложенные секции), он реализуется через
`section-tabs` в шапке секции, не через rail.

---

## 5. План миграции (волны)

Каждая волна — отдельный PR, мерджим только когда визуальный регресс отсутствует.
Перед каждой волной — `git diff` снимок, после — `pnpm exec vue-tsc --noEmit` и
`pnpm lint:errors`.

| Волна | Содержание | Файлы (масштаб) |
|---|---|---|
| **W1. Токены** | Добавить `--ds-*` переменные в `main.css`. Не менять компоненты, только подложить токены. | `main.css` |
| **W2. Кнопки** | Свести все иконочные кнопки к `button.icon` / `button.icon-dense`. Удалить `.composer-btn--*`, `.message-action-btn`, `.hold-actions__icon-btn` дубли стилей. | `main.css`, `MessengerChatComposerDock.vue`, `MessengerMessageThread.vue`, `MessengerChatHeader.vue` (~10 файлов) |
| **W3. Диалоги и меню** | Единый шаблон `VDialog` (max-width, шапка, футер). Все `VMenu` через canonical `VList` (`density="comfortable" nav bg-color="surface-container-highest"`). | `ProjectCreateDialog.vue`, `ProjectConfigTabs.vue`, `AgentPicker.vue`, `MessengerCallAnalysisPanel.vue` (~6 файлов) |
| **W4. Поля ввода** | Все `VTextField` / `VTextarea` в формах → `variant="outlined" density="comfortable"`. Поиск → `variant="solo-filled" density="compact"`. Composer не трогаем (отдельная микро-волна). | `ProjectConfigTabs.vue`, `ProjectCreateDialog.vue`, поиск в секциях |
| **W5. Surface / chips** | Свести радиусы карточек на шкалу. Chips: pill для toggle-state, иначе радиус по шкале. Проверить, что нет hardcoded `border-radius: 17px`/`21px`/`30px` вне токенов. | `main.css`, ~15 файлов с inline `style` |

Дополнительно после волн — тех-долг:
- удалить мёртвые классы (rail/drawer остатки в `main.css`);
- свести 3 типа shadow-хардкодов к `--ds-elevation-*`;
- оформить Storybook-каталог (или MDX внутри `app/widgets/_styleguide/`) c живым превью каждого типа.

---

## 6. Что не входит в стандарт

- **Composer textarea** (contenteditable iOS-fix) остаётся кастомным
  до отдельной мини-волны после W5.
- **Agent workspace sheet** (clamp height, backdrop-blur) — самостоятельный
  оверлей с уникальной механикой; стандартизуем только тень и радиус.
- **Графовые элементы** (`agent-graph-*`) — отдельный уровень визуализации;
  правила про токены применяются, но не каталог типов.

---

## 7. Контрольный чек-лист для PR

Перед мерджем PR, который меняет UI, убедиться:

- [ ] нет hardcoded hex-цветов вне `vuetify.options.ts` / `theme/`;
- [ ] все `border-radius` — из шкалы `--ds-radius-*`;
- [ ] все интерактивные высоты — из `--ds-height-*`;
- [ ] кнопки используют variant из таблицы § 4.1, а не свободный набор;
- [ ] `VMenu` содержит `VList` с canonical-атрибутами (§ 4.3);
- [ ] нет нового кастомного класса там, где есть стандартный тип;
- [ ] `pnpm exec vue-tsc --noEmit` и `pnpm lint:errors` зелёные.
