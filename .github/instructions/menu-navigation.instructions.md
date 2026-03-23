# Messenger — Navigation & Menu Structure

Описание строения меню, навигации и логики отображения кнопок в мобильной версии мессенджера.
Опирается на [m3-ui.instructions.md](./m3-ui.instructions.md) и [messenger.instructions.md](./messenger.instructions.md).

---

## 1. Архитектура навигации

Мессенджер использует **Single Page Architecture** — один `<MessengerAppShell>` рендерит 4 секции, переключаемых
без навигации роутера. URL остаётся `/`, активная секция хранится в `useMessengerConversationState`.

```
index.vue
  └── MessengerAppShell.vue
        ├── [активная секция]
        │     ├── MessengerChatSection        (key: 'chat')
        │     ├── MessengerChatsSection       (key: 'chats')
        │     ├── MessengerContactsSection    (key: 'contacts')
        │     └── MessengerSettingsSection    (key: 'settings')
        └── VBottomNavigation  ←  всегда видна (кроме открытой клавиатуры)
```

**Стейт:** `useMessengerConversationState.ts`
```ts
activeSection: 'chats' | 'chat' | 'contacts' | 'settings'   // default: 'chats'
activeConversationId: string | null
openConversation(id)   // → activeSection = 'chat' + activeConversationId = id
openSection(section)   // → прямое переключение
```

---

## 2. Bottom Navigation Bar — 4 пункта

### 2.1 Таблица пунктов

| # | `key` | Иконка | Метка | Назначение |
|---|---|---|---|---|
| 1 | `chats` | `chats` (24px) | Чаты | Лента всех диалогов |
| 2 | `chat` | `chat` (24px) | Чат | Активный диалог |
| 3 | `contacts` | `contacts` (24px) | Контакты | Поиск людей, invite |
| 4 | `settings` | `settings` (24px) | Настройки | Профиль, приватность |

### 2.2 Порядок отображения

```
[ Чаты ]  [ Чат ]  [ Контакты ]  [ Настройки ]
  (1)       (2)        (3)            (4)
```

Порядок фиксирован, не меняется в зависимости от состояния.

### 2.3 M3 Anatomy нав-бара

```
┌──────────────────────────────────────────────┐ ← surface-container bg
│  ╔══════════╗                                │ ← active indicator pill
│  ║  icon   ║  icon    icon    icon           │ ← 24px icons
│  ╚══════════╝                                │
│   Чаты      Чат    Контакты  Настройки       │ ← label-medium 12px
└──────────────────────────────────────────────┘
         safe-area-inset-bottom padding
```

**Размеры (M3 baseline):**
- Высота контейнера: `56px` + `env(safe-area-inset-bottom)`
- Active indicator: `64px × 32px`, `border-radius: 16px` (pill), `secondary-container` bg
- Иконка: `24px`, цвет активной — `on-secondary-container`, неактивной — `on-surface-variant`
- Метка: `font-size: 12px` (label-medium), всегда видна (не скрывать!)

### 2.4 CSS-переменные нав-бара

```css
--messenger-bottom-nav-height: 56px;
```

### 2.5 Правила видимости

| Условие | Поведение |
|---|---|
| Обычное состояние | Нав-бар виден всегда |
| Клавиатура открыта (`data-messenger-keyboard="open"`) | Нав-бар скрывается |
| Активная секция = `chat` + открыт диалог | Нав-бар остаётся (не скрывать!) |
| Звонок активен | Нав-бар скрывается, показывается `MessengerCallOverlay` |

### 2.6 Пункт `chat` — особая логика

- Если `activeConversationId === null` → пункт **затенён** (disabled), иконка `on-surface-variant`, без indicator.
- Если диалог открыт → пункт активирован.
- При нажатии на `chat` когда нет диалога — остаёмся на `chats` (не переключаться в пустой Chat).
- Badge на `chats`: показывает количество непрочитанных диалогов (если > 0).

---

## 3. Каждая секция — структура экрана

### 3.1 Chats Section

```
┌─── MessengerChatsSection ───────────────────┐
│                                             │
│  [VList]  список ChatRow-ов                 │  flex: 1, overflow-y: auto
│    ChatRow: avatar + name + preview + time  │
│    ChatRow: ...                             │
│                                             │
│  [EmptyState]  если чатов нет               │
│                         [ ✏️ FAB ]          │  ← правый нижний угол контента
├─────────────────────────────────────────────┤
│  [Папки чатов]  горизонтальный скролл       │  36px high, chip-стиль
│   [Все]  [Работа]  [Семья]  ...  [ + ]      │  ← drag-and-drop при удержании
├─────────────────────────────────────────────┤
│  [Search Dock]  ← Bottom Dock               │  pill, border-radius: 28px
│    🔍  Поиск по чатам                       │
└─────────────────────────────────────────────┘
│  [Bottom Navigation Bar]                   │  56px + safe-area
└─────────────────────────────────────────────┘
```

**Нет заголовка секции** — контент начинается сразу со списка.

**FAB `✏️`** — правый нижний угол списка (position: absolute), `color="primary"`, создать новый чат.

**Папки чатов:**
- Чип `Все` — системный, всегда первый, нельзя удалить/переместить
- Чипы пользовательских папок — горизонтальный скролл
- **Долгое нажатие** на чип → режим drag-and-drop переупорядочивания
- `[+]` справа в конце ряда → диалог создания новой папки
- Активная папка: `secondary-container` фон

**Search Dock (Bottom Dock Rule):**
- `<VTextField variant="solo" flat>` с `border-radius: 28px`, `bg-color: surface-container-high`.
- Фильтрует список чатов + папки realtime.

### 3.2 Chat Section (активный диалог)

```
┌─── MessengerChatSection ────────────────────┐
│  [Chat Header]                              │  sticky, 64px
│    ← back  [avatar + name + status]  📞 📹 │
├─────────────────────────────────────────────┤
│                                             │
│  [Message List]                             │  flex: 1, overflow-y: auto
│    scroll-padding-bottom = composer height  │
│    MessageBubble (in / out)                 │
│    ...                                      │
│                                             │
├─────────────────────────────────────────────┤
│  [Media Menu] (bottom sheet, if open)       │  z-index: 25
├─────────────────────────────────────────────┤
│  [Composer Dock]                            │  sticky bottom
│    📎 attach │ textarea │ 🎤/📨 send        │
└─────────────────────────────────────────────┘
│  [Bottom Navigation Bar]                   │  скрыт при keyboard
└─────────────────────────────────────────────┘
```

**Кнопки Chat Header (слева → справа):**
1. `←` back — `icon, variant="text"`, 48px, возвращает к `chats`
2. Аватар 36px + имя + статус (online/offline)
3. `📞` audio call — `icon, variant="text"`, 48px
4. `📹` video call — `icon, variant="text"`, 48px
5. `⋮` overflow menu — 48px (опционально: поиск по диалогу, удалить, заблокировать)

**Composer кнопки (слева → направо):**
```
[ 😊 emoji ]  [ ──── textarea (pill, 28px) ──── ]  [ 📎 attach ]  [ 🎤/➤ send ]
```
1. `😊` emoji — открывает Media Sheet на вкладке «Смайлы» (`key: 'emoji'`)
2. `textarea` — pill `border-radius: 28px`, `bg: surface-container-high`, растёт до 5 строк
3. `📎` attach — открывает **тот же** Media Sheet, но на вкладке «Фото» (`key: 'photo'`); логика идентична `😊`: нав-бар скрывается, Type TabBar занимает его место, те же 3 слоя (Gallery + Tags + Search)
4. `🎤/➤` send — **морфинг**: по умолчанию `🎤`, при наборе текста плавно → `➤`; долгое нажатие `🎤` = запись аудиосообщения

> **Правило:** кнопки `😊` и `📎` — это один компонент `<MessengerMediaSheet>`. Разница только в `initialTab`:
> - `😊` → `initialTab = 'emoji'`
> - `📎` → `initialTab = 'photo'`
> Все остальное (анимация, структура, Type TabBar вместо нав-бара) — идентично.

**Поведение при открытии клавиатуры:**
- Нав-бар **скрывается** полностью (`data-messenger-keyboard="open"`)
- Composer прилипает к верхнему краю клавиатуры
- `env(keyboard-inset-height)` или `interactive-widget: resizes-content`

**Overflow Menu (⋮ в Chat Header) — пункты:**
- Поиск по переписке
- Медиа, файлы, ссылки
- Заблокировать пользователя
- Удалить диалог

### 3.3 Contacts Section

```
┌─── MessengerContactsSection ────────────────┐
│  [Section Header]                           │  sticky, 56px
│    "Контакты"    [add-contact btn 48px]     │
├─────────────────────────────────────────────┤
│  [Tabs] ─────────────────────────────────── │  56px, горизонт. скролл
│   Все  │  Входящие (badge)  │  Исходящие   │
├─────────────────────────────────────────────┤
│                                             │
│  [VList]  ContactRow-ы                      │  flex: 1, overflow-y: auto
│    ContactRow: avatar + name + action btn   │
│                                             │
│  [EmptyState]  если нет контактов           │
├─────────────────────────────────────────────┤
│  [Search Dock]  ← Bottom Dock               │  sticky bottom, 64px
│    🔍  Найти пользователя                   │
└─────────────────────────────────────────────┘
│  [Bottom Navigation Bar]                   │
└─────────────────────────────────────────────┘
```

**Tabs — 3 вкладки:**

| Tab | `value` | Содержимое |
|---|---|---|
| Все | `all` | Все принятые контакты |
| Входящие | `incoming` | Запросы на добавление (badge = count) |
| Исходящие | `outgoing` | Отправленные мной запросы |

**ContactRow кнопки действия:**
- Всё (принятый): `💬` открыть чат  
- Входящий запрос: `✓` принять + `✕` отклонить
- Исходящий запрос: `✕` отменить запрос

**Search Dock:** поиск по userId / имени глобально через API, не только по локальным контактам.

### 3.4 Settings Section

**Концепция навигации: горизонтальный drill-down по дереву + поиск снизу.**

Структура Settings — двухуровневая. Верхний уровень — горизонтальный слайд-бар (ScrollableTabBar),
нижний уровень (подменю) — вертикальный скролл-список. Переход в подменю анимируется как slide-left.

```
┌─── MessengerSettingsSection ──────────────────────────┐
│                                                       │
│  ── Level 1 (root) ──────────────────────────────    │
│                                                       │
│  [Horizontal Slide TabBar]  ← горизонтальный скролл  │  48px sticky
│   ┌────────┬──────────┬───────────┬────────────────┐  │
│   │Профиль │Приватн.  │Уведомл.   │Оформл. │Аккаунт│  │  ← active = pill indicator
│   └────────┴──────────┴───────────┴────────────────┘  │
│                                                       │
│  [Settings Content]                                   │  flex:1, overflow-y:auto
│    ┌── Профиль ──────────────────────────────────┐    │
│    │  аватар + имя + username                    │    │
│    │  Имя                       [input]  →       │    │  → = drill-in (has submenu)
│    │  Фамилия                   [input]  →       │    │
│    │  Пароль                    ••••     →       │    │
│    └─────────────────────────────────────────────┘    │
│                                                       │
│  ── Level 2 (submenu, slide-left) ───────────────    │
│                                                       │
│  [Back Header]  ← + "Уведомления"                    │  56px sticky
│  [Submenu VList]                                      │  overflow-y: auto / 1 scrollbar
│    ┌──────────────────────────────────────────────┐   │
│    │  Сообщения             [switch]              │   │
│    │  Звонки                [switch]              │   │
│    │  Превью текста         [switch]              │   │
│    │  Звук уведомлений      [select]  →           │   │
│    └──────────────────────────────────────────────┘   │
│                                                       │
├───────────────────────────────────────────────────────┤
│  [Search Dock]  ← bottom, fixed above nav bar        │  48px
│   🔍  Поиск по настройкам...                          │
├───────────────────────────────────────────────────────┤
│  [Bottom Navigation Bar]                              │  56px + safe-area
└───────────────────────────────────────────────────────┘
```

**Правила горизонтального слайд-бара (TabBar):**

- Реализация: `VTabs` с `show-arrows` + `v-slot:prepend="null"`, `align-tabs="start"`, `density="compact"`
- Активная вкладка: pill indicator `secondary-container` (как в нав-баре)
- Горизонтальный скролл, без переноса, фиксирован sticky сверху (не уходит при скролле контента)
- Переключение вкладок = горизонтальный slide (как между секциями нав-бара, но внутри Settings)
- Анимация: `slide-x-transition` 150ms, направление по порядку вкладок

**Правила drill-down (подменю 2-го уровня):**

- Открывается tap по строке с иконкой `→` (chevron-right) или `VListItem` с `append-icon="mdi-chevron-right"`
- Анимация: slide-left (новый слой выезжает справа), совпадает с M3 Forward navigation
- Back Header: `VAppBar` height=56, кнопка `←` `mdi-arrow-left` + заголовок подменю
- Контент подменю: **ровно 1 вертикальный скроллбар** (overflow-y: auto), нет горизонтального
- Вложенность: максимум 2 уровня (root → submenu). Глубже не идём — разворачиваем inline
- Depth-индикатор не нужен (только 2 уровня)

**Группы настроек (Settings Groups) — структура дерева:**

| Вкладка (L1) | Пункты L1 | Подменю (L2) |
|---|---|---|
| Профиль | Аватар, Имя, Фамилия, Username, Bio | Изменить пароль → отдельная форма |
| Приватность | Посл. визит [select], Фото [select], Статус онлайн [select] | — |
| Уведомления | Сообщения, Звонки, Превью → | Звук, Вибрация, LED |
| Оформление | Тема Light/Dark/System, Цвет акцента → | Цветовая схема (список) |
| Устройства | Список активных сессий | Детали сессии → (удалить) |
| Аккаунт | Изменить email, Удалить аккаунт, Выйти | — |

**Bottom Search Dock:**

- Позиционирование: `position: sticky; bottom: 56px` (над нав-баром)
- Компонент: `VTextField`, `variant="solo-filled"`, `prepend-inner-icon="mdi-magnify"`, `density="compact"`
- `border-radius: 28px` (pill), `surface-container-high` bg
- Поиск — глобальный по всем ключам/ярлыкам настроек, фильтрует дерево живым поиском
- При активном поиске слайд-бар и drill-down скрываются, показывается flat-список результатов

---

## 4. Media Menu (Bottom Sheet) — детали

Открывается кнопкой `�` или `📎` в Composer. Это единый `bottom sheet`, не отдельная страница.

### 4.1 Общая структура Bottom Sheet

Type TabBar находится **внизу шита**, заменяя нав-бар при открытии.
Контент + поиск — выше, TabBar — фиксирован у дна.

```
┌─── composer-media-menu ──────────────────────────────┐  surface-container-low
│  ─────────────── drag handle ───────────────────────  │  4px pill, 32px top padding
│                                                       │
│  [Контент активной вкладки]                           │  flex: 1, overflow-y: auto
│    → для Смайлы/Стикеры/GIF: см. §4.2                │
│    → для Фото/Файл: picker grid                       │
│                                                       │
├───────────────────────────────────────────────────────┤
│  [Search Dock]  ← sticky                             │  48px
│   🔍  Поиск смайлов / стикеров / GIF...              │
├───────────────────────────────────────────────────────┤
│  [Type TabBar]  ← вместо нав-бара, fixed bottom      │  56px
│   😀 Смайлы  │  🎨 Стикеры  │  📷 GIF  │  🖼 Фото  │  📁 Файл │
└───────────────────────────────────────────────────────┘
                  ↑ заменяет Bottom Navigation Bar
```

**Type TabBar (нижний, вместо нав-бара):**

- Высота `56px` + `env(safe-area-inset-bottom)` — идентична нав-бару
- Фон: `surface-container` (тот же токен что у нав-бара)
- Active indicator: pill `secondary-container`, тот же M3 стиль
- Иконки с метками, всегда видны
- При закрытии шита — нав-бар возвращается обратно (плавно, 200ms)

| Иконка | `key` | Описание |
|---|---|---|
| 😀 | `emoji` | Смайлы — emoji keyboard |
| 🎨 | `stickers` | Стикеры — пакеты |
| 📷 | `gif` | GIF — анимации |
| 🖼 | `photo` | Фото/видео из галереи |
| 📁 | `file` | Файловый picker |

---

### 4.2 Смайлы / Стикеры / GIF — трёхслойная структура

Вкладки `emoji`, `stickers`, `gif` имеют **единую трёхслойную архитектуру**:

```
┌─── [активная вкладка: 😀 / 🎨 / 📷] ────────────────┐
│                                                       │
│  Layer 1 — Gallery (основной контент)                 │  flex: 1, overflow-y: auto
│  ┌────────────────────────────────────────────────┐   │
│  │  😀 😂 ❤️ 👍 😍 🔥 😭 🙏 😊 👏 …             │   │  grid 8 кол. (emoji)
│  │  [пакет «Котики»]                              │   │  ← для стикеров: группы
│  │   🐱 🐱 🐱 🐱 🐱 🐱                           │   │
│  │  [пакет «Базовые»]                             │   │
│  │   …                                            │   │
│  └────────────────────────────────────────────────┘   │
│                                                       │
│  Layer 2 — Tags / Categories                          │  горизонтальный скролл
│  ┌────────────────────────────────────────────────┐   │  48px, sticky над поиском
│  │  [Недавние] [😄Смайлы] [🐾Животные] [🍕Еда] … │   │  ← chip-bar
│  └────────────────────────────────────────────────┘   │
│                                                       │
├───────────────────────────────────────────────────────┤
│  Layer 3 — Search Dock                                │  48px
│   🔍  Поиск...                                        │
├───────────────────────────────────────────────────────┤
│  [Type TabBar]  😀  🎨  📷  🖼  📁               │  56px ← вместо нав-бара
└───────────────────────────────────────────────────────┘
```

**Слои (описание):**

| Слой | Компонент | Поведение |
|---|---|---|
| 1 — Gallery | `VVirtualScroll` / css grid | Основной контент. Прокручивается вертикально. Прокрутка якорит к выбранному тегу (Layer 2). |
| 2 — Tags | `VChipGroup`, горизонтальный скролл | Категории/пакеты. Sticky прямо над Search Dock. Tap → скролл галереи к разделу. Активный chip — `secondary-container`. |
| 3 — Search | `VTextField.composer-search-field` | Sticky внизу sheet. Визуально идентична строке ввода сообщения composer (pill 28px, border, surface-container-high, 48px). Только placeholder меняется. Поиск фильтрует галерею живым поиском. При наборе Layer 2 (теги) скрывается, Gallery показывает результаты flat-списком. |

**Правила галереи:**

- **Все галереи контента (emoji, стикеры, GIF, фото) используют единый grid `4` колонки** — плиточный layout.
- **Emoji:** grid `4` колонки, tappable cells, no-border
- **Стикеры:** grid `4` колонки, размер 80px, с заголовком пакета над группой
- **GIF:** grid `4` колонки, aspect-ratio по оригиналу, lazy-load
- **Фото:** grid `4` колонки, aspect-ratio 1:1
- **Файл:** вертикальный список (не grid)
- **Фото / Файл:** та же трёхслойная структура (Gallery + Categories + Search), см. §4.2.1
- Недавно использованные — первая секция в каждой вкладке

---

#### 4.2.1 Вкладки «Фото» и «Файл» — структура (аналог §4.2)

Вкладки `photo` и `file` используют **ту же трёхслойную архитектуру**, но Layer 2 — не теги эмодзи, а **категории файлов**.

```
┌─── [активная вкладка: 🖼 Фото / 📁 Файл] ────────────┐
│                                                       │
│  Layer 1 — Gallery (сетка файлов/фото)               │  flex: 1, overflow-y: auto
│  ┌────────────────────────────────────────────────┐   │
│  │  [Недавние]                                    │   │  заголовок секции
│  │  🖼 🖼 🖼 🖼  (превью 4 кол., aspect 1:1)      │   │
│  │  [Документы]                                   │   │
│  │  📄 файл.pdf   23 KB                           │   │  список, не grid
│  │  📝 заметка.doc  5 KB                          │   │
│  │  [Аудио]                                       │   │
│  │  🎵 трек.mp3   3:42                            │   │
│  └────────────────────────────────────────────────┘   │
│                                                       │
│  Layer 2 — File Categories                            │  горизонтальный скролл
│  ┌────────────────────────────────────────────────┐   │  48px, sticky над поиском
│  │  [Все] [🖼 Фото] [🎬 Видео] [📄 Документы]    │   │  ← chip-bar
│  │  [🎵 Аудио] [📦 Архивы] [🔗 Ссылки]          │   │
│  └────────────────────────────────────────────────┘   │
│                                                       │
├───────────────────────────────────────────────────────┤
│  Layer 3 — Search Dock                                │  48px
│   🔍  Поиск файлов...                                 │
├───────────────────────────────────────────────────────┤
│  [Type TabBar]  😀  🎨  📷  🖼  📁               │  56px ← вместо нав-бара
└───────────────────────────────────────────────────────┘
```

**Категории файлов (Layer 2 chip-bar):**

| Chip | Фильтрует |
|---|---|
| Все | Всё из галереи устройства + загруженные |
| 🖼 Фото | `image/*` |
| 🎬 Видео | `video/*` |
| 📄 Документы | `application/pdf`, `doc`, `docx`, `xls`, `ppt`, … |
| 🎵 Аудио | `audio/*` |
| 📦 Архивы | `zip`, `rar`, `tar`, `gz` |
| 🔗 Ссылки | Медиа-превью из буфера / clipboard |

**Правила галереи фото (grid):**

- 4 колонки, `aspect-ratio: 1/1`, без отступов между ячейками
- Видео — badge `▶ 0:42` поверх превью (bottom-left)
- Выбранный файл — overlay `✓` `primary-container` tint + border 2px `primary`
- Мультиселект: можно выбрать несколько, кнопка `Отправить (N)` появляется вместо Search Dock

**Правила списка документов/аудио:**

- `VList`, `VListItem`: иконка типа файла (48px) + имя + размер/длительность + дата
- Tap → отправить сразу (single select), для мультиселекта — long-press

**Search Dock (Layer 3) для файлов:**

- Поиск по имени файла, live-фильтрация
- При наборе Layer 2 (категории) скрывается, галерея переходит в flat-режим

**Search Dock (Layer 3):**

- `VTextField` с классом `composer-search-field` — визуально идентичен строке ввода сообщения; меняется только placeholder
- `border-radius: 28px`, bg `surface-container-high`, border `outline-variant`, height 48px
- Параметры VTextField: `variant="solo-filled"`, `flat`, `rounded="xl"`, `bg-color="surface-container-high"`. НЕ использовать `density="compact"`
- Поиск: emoji — по названию (`:fire:`, `огонь`), стикеры — по тегам пакета, GIF — через API (Tenor/Giphy)
- При фокусе sheet расширяется до `90dvh`, клавиатура не скрывает поле

---

### 4.3 Правила Bottom Sheet

- `border-radius: 28px 28px 0 0`
- Открытие: `transform: translateY(0)` с `350ms cubic-bezier(0.05, 0.7, 0.1, 1)`
- При открытии: Bottom Navigation Bar **скрывается** (fade-out 150ms), sheet анимируется снизу
- Type TabBar внутри шита визуально занимает то же место, что нав-бар — `bottom: 0`, `height: 56px + safe-area`
- Закрытие шита → нав-бар возвращается (fade-in 200ms)
- Высота контента (выше TabBar): `50dvh` по умолчанию, свайп вверх → `90dvh`
- Закрытие: свайп вниз, нажатие вне области, `Escape`

---

## 5. Overflow / Context Menus

### 5.1 Long-press на сообщении (Message Actions)

```
[ 👍 ]  [ ❤️ ]  [ 😂 ]  [ 😮 ]  [ 😢 ]   ← Quick reactions (5 emoji)
─────────────────────────────────────────
  Ответить
  Переслать
  Копировать текст
  Редактировать     ← только для своих + < 48ч
  Удалить           ← danger
```

**Реализация:** `VMenu` с `activator="parent"`, открытый по `long-press` (500ms) или right-click.

### 5.2 Long-press на чате в Chats List

```
  Закрепить / Открепить
  Отметить прочитанным
  Архивировать
  Удалить             ← danger
```

### 5.3 Overflow ⋮ в Chat Header

```
  Поиск в переписке
  Медиа и файлы
  ──────────────
  Заблокировать
  Удалить диалог      ← danger
```

**Правила Context Menu:**
- `VMenu` без `VList` поверх контента — использовать `VList` внутри.
- `border-radius: 12px` (medium M3 shape).
- `bg-color: surface-container-high`.
- Danger пункты: `color="error"`, разделены `<VDivider>` от обычных.
- Min ширина: 180px, max 280px.
- Закрывается при `click outside`, `Escape`, выборе пункта.

---

## 6. Tabs внутри секций — правила

Используются в:
- **Contacts**: Все / Входящие / Исходящие
- **Media Menu**: Смайлы / Стикеры / GIF / Фото / Файл
- *(опционально)* **Chat Info**: Медиа / Файлы / Ссылки

**M3 правила для Tabs:**
```vue
<VTabs
  v-model="tab"
  bg-color="surface-container"
  color="primary"
  density="compact"
  class="section-tabs"
>
  <VTab value="all">Все</VTab>
  <VTab value="incoming">
    Входящие
    <VBadge v-if="count" :content="count" color="error" inline />
  </VTab>
  <VTab value="outgoing">Исходящие</VTab>
</VTabs>
```

- Высота: 48px (compact).
- Active indicator: 3px линия `primary` снизу.
- Горизонтальный скролл при overflow — обязателен.
- Кнопки одинаковой ширины (`grow` если 2–3 таба).
- Фон: `surface-container` (не прозрачный).

---

## 7. Chips как альтернатива Tabs

В Media Menu используются **filter chips** вместо Tabs для выбора категории:

```vue
<div class="media-menu-chips">
  <VChip
    v-for="cat in categories"
    :key="cat.key"
    :variant="activeCat === cat.key ? 'flat' : 'tonal'"
    :color="activeCat === cat.key ? 'secondary' : undefined"
    size="small"
    @click="activeCat = cat.key"
  >
    {{ cat.icon }}  {{ cat.label }}
  </VChip>
</div>
```

```css
.media-menu-chips {
  display: flex;
  gap: 8px;
  padding: 8px 16px;
  overflow-x: auto;
  scrollbar-width: none;         /* скроллбар скрыт */
  white-space: nowrap;
}
```

**Правила Chips-меню:**
- Высота чипа: 32px.
- `border-radius: full` (pill).
- Активный чип: `secondary-container` bg, `on-secondary-container` text.
- Горизонтальный скролл без видимого скроллбара.
- Чипы не переносятся на следующую строку — только скролл.
- Tap target: padding делает активную область ≥ 44px по высоте.

---

## 8. Логика переключений — схема

```
 START
   │
   ▼
[CHATS] ←──────────────────────────┐
   │  tap ChatRow                  │
   ▼                               │
[CHAT] (openConversation)          │
   │  tap ←back / tap [Чаты] nav   │
   └────────────────────────────────┘

[CHATS] / [CHAT]
   │  tap [Контакты] nav
   ▼
[CONTACTS]
   │  tap ContactRow (чат)
   ▼
[CHAT] (openConversation)

[любая секция]
   │  tap [Настройки] nav
   ▼
[SETTINGS]
```

**Правило back в Chat:**
- Кнопка `←` в Chat Header → `openSection('chats')`.
- Аппаратная кнопка Back (Android) → то же.
- Нажатие на пункт `Чаты` в нав-баре из Chat → переход в `chats` (не закрывает диалог, диалог остаётся в стейте).

---

## 9. Состояния нав-бара при разных условиях

| Условие | Нав-бар | Активный пункт |
|---|---|---|
| `activeSection = 'chats'` | Виден | `chats` |
| `activeSection = 'chat'`, нет диалога | Виден | нет (disabled `chat`) |
| `activeSection = 'chat'`, есть диалог | Виден | `chat` |
| Keyboard открыта | **Скрыт** | — |
| Overlay (звонок) | **Скрыт** | — |
| Media Menu открыто | Виден, за sheet | `chat` |
| Bottom Sheet (любой) | Виден, за sheet | — |

---

## 10. Файловая структура (навигация и меню)

```
messenger/web/app/
  composables/
    useMessengerSections.ts          ← определение 4 секций (key, title, icon)
    useMessengerConversationState.ts ← activeSection, activeConversationId, методы
  components/messenger/
    MessengerAppShell.vue            ← рут компонент: VBottomNavigation + секции
    MessengerChatsSection.vue        ← экран Chats
    MessengerChatSection.vue         ← экран Chat (диалог)
    MessengerContactsSection.vue     ← экран Contacts
    MessengerSettingsSection.vue     ← экран Settings
    MessengerComposerBar.vue         ← composer dock (attach, input, send/record)
    MessengerMediaMenu.vue           ← bottom sheet с tabs/chips (emoji, stickers, ...)
    MessengerMessageBubble.vue       ← пузырь сообщения
    MessengerChatRow.vue             ← строка чата в списке
    MessengerContactRow.vue          ← строка контакта
```

---

## 11. Пузыри сообщений — спецификация

**Форма:** без хвостиков, `border-radius: 16px` равномерно, чистый современный стиль.

| Тип | Выравнивание | Фон | Максимальная ширина |
|---|---|---|---|
| Входящий | Слева | `secondary-container` | 80% экрана |
| Исходящий | Справа | `primary-container` | 80% экрана |

**Метаданные внутри пузыря** (правый нижний угол):
- Время: `label-small`, `on-surface-variant`
- Статус (только у исходящих): `✓` отправлено / `✓✓` серые=доставлено / `✓✓` `primary`=прочитано

**Long-press на пузыре:**
```
┌─── над пузырём ─────────────────────────────────────────┐
│  [ 👍 ]  [ ❤️ ]  [ 😂 ]  [ 😮 ]  [ 😢 ]  [ ➕ ]       │  ← реакции
└─────────────────────────────────────────────────────────┘
  [ сам пузырь остаётся на месте, фон затемняется scrim ]
┌─── под пузырём ─────────────────────────────────────────┐
│ [ ↩ Ответить ] [ ↗ Переслать ] [ 📋 Копировать ] [ ✏️ ] [ 🗑 ] │
│ ←─────── горизонтальный скролл действий ──────────────── │
└─────────────────────────────────────────────────────────┘
```
- Скрим закрывает весь экран кроме пузыря + меню
- `➕` открывает full emoji picker
- `🗑 Удалить` — `error` цвет, крайний справа
- Закрывается тапом на scrim

---

## 12. ChatRow — спецификация строки чата

**Обычное состояние:**
```
[ 🟣 аватар 48px ]  [ Имя контакта (bold)           ]  [ 14:32        ]
                    [ Превью последнего сообщения... ]  [ 🔴 3 (badge) ]
```
- Высота строки: min 72px (two-line M3)
- Превью: 2 строки, `body-medium`, `on-surface-variant`, обрезается `ellipsis`
- Время: `label-small`, `on-surface-variant`
- Badge: `error` цвет, только при непрочитанных > 0

**Long-press на строке — раскрываются кнопки во всю ширину плашки:**
```
┌──────────────────────────────────────────────────────────┐
│   [  📞 Позвонить  ]  [  📹 Видеозвонок  ]  [  🗑 Удалить  ]  │
└──────────────────────────────────────────────────────────┘
```
- Кнопки занимают всю ширину строки, распределены равномерно (flex)
- `🗑 Удалить`: `color="error"`, требует подтверждения
- Закрывается тапом вне строки или повторным long-press

---

## 13. Анимации переходов — спецификация

**Переключение секций через нав-бар:**
- Тип: **Slide horizontal**
- Направление: по порядку пунктов (Чаты=1, Чат=2, Контакты=3, Настройки=4)
  - Переход вправо (к большему номеру): новая секция едет справа → центр
  - Переход влево (к меньшему номеру): новая секция едет слева → центр
- Длительность: `200ms`
- Easing: `cubic-bezier(0.2, 0, 0, 1)` (M3 standard)

```css
/* enter справа */
.section-enter-active { transition: transform 200ms cubic-bezier(0.2, 0, 0, 1); }
.section-enter-from-right { transform: translateX(100%); }

/* enter слева */
.section-enter-from-left { transform: translateX(-100%); }

/* exit */
.section-leave-active { transition: transform 200ms cubic-bezier(0.2, 0, 0, 1); }
.section-leave-to-right { transform: translateX(-100%); }
.section-leave-to-left { transform: translateX(100%); }
```

**Другие анимации:**
| Элемент | Анимация | Длительность |
|---|---|---|
| Media Sheet открытие | `translateY(100%)` → `translateY(0)` | 350ms decelerate |
| Media Sheet закрытие | `translateY(0)` → `translateY(100%)` | 200ms accelerate |
| Нав-бар скрытие (keyboard) | `translateY(0)` → `translateY(100%)` | 200ms accelerate |
| Нав-бар появление | `translateY(100%)` → `translateY(0)` | 250ms decelerate |
| Кнопка 🎤→➤ (морфинг) | opacity + scale cross-fade | 150ms standard |
| ChatRow long-press раскрытие | `scaleY(0)` → `scaleY(1)` | 200ms standard |
| Long-press пузырь scrim | opacity `0` → `0.5` | 200ms standard |

---

## 14. CSS-классы навигации

```css
/* Bottom Navigation Bar */
.bottom-nav                    /* контейнер VBottomNavigation */
.bottom-nav__item              /* один пункт */
.bottom-nav__item--active      /* активный пункт */
.bottom-nav__icon              /* иконка 24px */
.bottom-nav__label             /* метка 12px */
.bottom-nav__indicator         /* active indicator pill */

/* Section Dock (Bottom Dock) */
.search-dock--bottom-dock      /* поиск в Chats / Contacts */
.composer-bar--dock            /* composer в Chat */

/* Tabs */
.section-tabs                  /* VTabs контейнер */

/* Media Menu */
.composer-media-menu           /* bottom sheet контейнер */
.media-menu-chips              /* строка chip-фильтров */
.media-menu-content            /* прокручиваемый контент вкладки */

/* Context Menu */
.ctx-menu                      /* VMenu content wrapper */
.ctx-menu__item                /* строка меню */
.ctx-menu__item--danger        /* danger цвет */
```

---

## 15. Чеклист: добавление нового пункта навигации

> **Важно:** 4 пункта нав-бара — жёстко зафиксированы. Не добавлять 5-й без явного решения.
> При необходимости нового раздела — вложить его в Settings или сделать sub-section существующего.

Если всё же нужно добавить:
- [ ] Добавить в `useMessengerSections.ts` новый `{ key, title, icon }`
- [ ] Создать `Messenger{Name}Section.vue`
- [ ] Добавить ветку в `v-if/v-show` в `MessengerAppShell.vue`
- [ ] Добавить иконку в `MessengerIcon.vue`
- [ ] Обновить тип `activeSection` в `useMessengerConversationState.ts`
- [ ] Следовать структуре экрана: Header + Content + Bottom Dock (если нужен)
- [ ] Bottom Dock Rule: поиск/фильтр в доке, не в header
