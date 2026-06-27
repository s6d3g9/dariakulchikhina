# Полный аудит кодовой базы: размеры, структура, бандл

**Дата:** 2026-04-07
**Цель:** Выявить чрезмерно крупные файлы, дублирование, проблемы бандла, оценить влияние на производительность и поддерживаемость.

---

## 1. Общая статистика

| Метрика | Значение |
|---|---|
| Всего .vue файлов (app/) | **126** |
| Файлов > 1 000 строк | **13** (10 %) |
| Файлов > 500 строк | **30** (24 %) |
| Файлов > 300 строк | **52** (41 %) |
| Файлов ≤ 300 строк | **74** (59 %) |
| Суммарно строк .vue | **68 812** |
| Глобальный CSS (main.css) | **9 067** строк |
| Composables (суммарно) | **9 810** строк |

> **Порог рекомендации Vue:** SFC > 400 строк — повод задуматься; > 800 — почти всегда нужно делить.

---

## 2. TOP-13 самых крупных файлов

| # | Файл | Всего | `<script>` | `<style>` | Функции | computed/watch | v-if/v-for |
|---|---|---|---|---|---|---|---|
| 1 | **UIDesignPanel.vue** | 7 851 | 2 725 | 2 678 | 154 | 63 | 152 |
| 2 | **AdminProjectControl.vue** | 5 849 | 2 283 | 2 326 | 178 | 51 | 103 |
| 3 | **AdminDesignerCabinet.vue** | 4 332 | 2 128 | 1 080 | 211 | 31 | 138 |
| 4 | **pages/admin/projects/[slug].vue** | 3 717 | 2 086 | 1 055 | 113 | 63 | 66 |
| 5 | **ClientProjectControl.vue** | 3 405 | 1 225 | 1 437 | 106 | 39 | 69 |
| 6 | **pages/contractor/[id]/index.vue** | 3 347 | 953 | 1 331 | 61 | 22 | 92 |
| 7 | **ProjectCommunicationsPanel.vue** | 2 639 | 1 406 | 861 | 92 | 26 | 44 |
| 8 | **AdminDocumentEditor.vue** | 2 595 | 1 353 | 826 | 74 | 13 | 62 |
| 9 | **layouts/admin.vue** | 1 900 | 824 | 791 | 86 | 47 | 35 |
| 10 | **AdminDocumentsSection.vue** | 1 654 | 882 | — | — | — | — |
| 11 | **AdminContractorCabinet.vue** | 1 504 | 356 | — | — | — | — |
| 12 | **AdminGallery.vue** | 1 254 | — | — | — | — | — |
| 13 | **Wipe2Renderer.vue** | 1 085 | — | — | — | — | — |

---

## 3. Крупные composables (логика уже вне компонентов)

| Файл | Строк |
|---|---|
| useDesignSystem.ts | 3 816 |
| useUITheme.ts | 1 017 |
| useContractorCabinet.ts | 786 |
| useAdminNav.ts | 743 |
| useDesignerCabinet.ts | 455 |

`useDesignSystem.ts` — ещё один кандидат на разбиение, но это отдельная тема.

---

## 4. Детальный разбор критических файлов

### 4.1 UIDesignPanel.vue — 7 851 строк 🔴🔴🔴

**Самый большой файл в проекте.** Содержит:
- 154 функции, 63 computed/watch, 152 v-if/v-for
- Массивы настроек/опций (btnStyles, archDensities, archPageEnters и ещё ~20 каталогов) — ~500 строк чистых данных
- Логику пресетов (Liquid Glass + Material3) — ~300 строк
- Tab-навигацию с 15+ вкладками — каждая вкладка рендерится inline
- Export/Import дизайнa — отдельная фича в том же файле
- 2 678 строк scoped CSS

**Проблемы:**
- HMR при редактировании — полный re-parse 8K строк → задержка > 1 сек
- Volar/vue-tsc тормозит — файл > 5K строк замедляет Language Server
- Невозможно изолированно тестировать отдельные вкладки
- Стили дублируются между вкладками

**Рекомендация (примерная декомпозиция):**
1. `DesignPanelPresets.vue` — пресеты/каталог тем
2. `DesignPanelPalette.vue` — палитра/цвета
3. `DesignPanelTypography.vue` — шрифты/типографика
4. `DesignPanelButtons.vue` — стили кнопок
5. `DesignPanelSurface.vue` — поверхности/радиусы
6. `DesignPanelAnimation.vue` — анимации/переходы
7. `DesignPanelArch.vue` — архитектурные токены
8. `DesignPanelExport.vue` — импорт/экспорт
9. Каталоги опций → вынести в `shared/constants/design-options.ts`
10. Общая shell-обёртка остаётся в `UIDesignPanel.vue` (~300-400 строк)

---

### 4.2 AdminProjectControl.vue — 5 849 строк 🔴🔴

**Второй по размеру.** Содержит:
- 178 функций — больше, чем в любом другом файле
- Модуль управления проектом с 12+ подмодулями (overview, sprints, tasks, timeline, governance, team, scope, risks, communication, budget)
- Inline канбан и фазовая доска
- 2 326 строк CSS

**Проблемы:**
- Монолитная бизнес-логика: спринты, таски, governance, team — всё в одном реактивном графе
- 51 computed — пересчёт cascade при любом изменении
- Два child-компонента (AdminProjectKanban, AdminProjectPhaseBoard), но основная логика — в родителе

**Рекомендация:**
1. `ControlSprintManager.vue` — CRUD спринтов + статусы
2. `ControlTaskBoard.vue` — задачи + drag
3. `ControlTimeline.vue` — таймлайн/ганттоподобный вид
4. `ControlGovernance.vue` — governance / team / roles
5. `ControlBudgetScope.vue` — бюджет и скоуп
6. Composable `useProjectControl.ts` — вынести reactive state + save/load
7. Shell `AdminProjectControl.vue` → ~400 строк

---

### 4.3 AdminDesignerCabinet.vue — 4 332 строк 🔴🔴

- 211 функций (МАКСИМУМ в проекте)
- Кабинет дизайнера: профиль, портфолио, документы, связанные клиенты, проекты, услуги, цены
- Уже есть `useDesignerCabinet.ts` (455 строк), но основная масса — всё равно в компоненте

**Рекомендация:**
1. `DesignerProfile.vue` — профиль + специализации
2. `DesignerPortfolio.vue` — портфолио/галерея
3. `DesignerDocuments.vue` — документы
4. `DesignerServices.vue` — услуги/прайс
5. `DesignerLinkedEntities.vue` — клиенты/проекты
6. Shell `AdminDesignerCabinet.vue` → ~300 строк

---

### 4.4 pages/admin/projects/[slug].vue — 3 717 строк 🔴

- Страница проекта: оркестрирует 20+ секций (брифинг, контакт, обмеры, ТЗ, мудборд, чертежи, спецификации и т. д.)
- 2 086 строк script — из них ~1 200 строк — маппинг данных для Wipe2 (wipe2EntityData computed)
- 63 computed/watch

**Проблемы:**
- Wipe2 маппинг — гигантский computed (строки 710–1230+) целиком в файле страницы
- Дублирование логики секций между [slug].vue и ClientProjectControl

**Рекомендация:**
1. `useWipe2ProjectMapper.ts` → composable для маппинга wipe2 данных (~500 строк экономии)
2. Секции навигации → уже есть `useAdminNav.ts`, но UI-переключатель секций можно выделить
3. Остаток → ~800 строк (приемлемо для page-компонента)

---

### 4.5 ClientProjectControl.vue — 3 405 строк 🟠

- Зеркало AdminProjectControl для клиента
- 1 437 строк CSS (42 % файла — стили!)
- 106 функций

**Рекомендация:**
1. Общие стили → вынести в main.css или общий SCSS-partial
2. Функции, дублирующие AdminProjectControl → composable `useControlShared.ts`
3. Клиентские секции → отдельные компоненты

---

### 4.6 pages/contractor/[id]/index.vue — 3 347 строк 🟠

- 1 331 строк CSS (40 % — стили)
- Уже есть `useContractorCabinet.ts`, но UI всё в одном файле
- 92 v-if/v-for — сложное условное дерево

**Рекомендация:**
1. Секции кабинета подрядчика → отдельные компоненты
2. CSS → вынести общие паттерны в main.css

---

### 4.7 ProjectCommunicationsPanel.vue — 2 639 строк 🟠

- 92 функции, 1 406 строк script
- Вся логика коммуникаций: каналы, сообщения, SSE, фильтры

**Рекомендация:**
1. `useCommunications.ts` composable → state + SSE подписка
2. `CommunicationMessageList.vue` — рендер сообщений
3. `CommunicationChannelSwitcher.vue` — переключатель каналов

---

### 4.8 AdminDocumentEditor.vue — 2 595 строк 🟠

- 74 функции, WYSIWYG-подобный редактор
- 826 строк CSS

**Рекомендация:**
1. Toolbar → `DocumentEditorToolbar.vue`
2. Preview → `DocumentEditorPreview.vue`
3. Логика сохранения → composable

---

### 4.9 layouts/admin.vue — 1 900 строк 🟡

- Layout не должен содержать бизнес-логику
- 86 функций, 47 computed/watch — многовато для layout

**Рекомендация:**
1. Sidebar логика → уже есть `AdminNestedNav.vue`, проверить что не дублируется
2. Topbar → отдельный компонент
3. Layout → ~400 строк максимум

---

## 5. Влияние на производительность

### 5.1 Dev-время (DX)

| Проблема | Затронутые файлы | Влияние |
|---|---|---|
| Медленный HMR | Все файлы > 3K строк | +1-3 сек на каждую правку |
| Volar/TSC тормозит | UIDesignPanel, AdminProjectControl | Autocomplete задержка, TS errors delay |
| Трудно найти нужный код | Файлы с 150+ функциями | Потеря времени разработчика |
| Merge-конфликты | Файлы > 2K строк при командной работе | Гарантированные конфликты |

### 5.2 Runtime (Пользователь)

| Проблема | Затронутые файлы | Влияние |
|---|---|---|
| Overhead реактивности | 50+ computed в одном scope | Каскадный пересчёт при любом изменении |
| Bundle size | CSS дублирование | +50-100KB лишних стилей |
| Initial parse time | Файлы > 5K строк | Заметно на мобильных устройствах |
| Code splitting | Inline-логика вместо lazy import | Больше JS в initial bundle |

### 5.3 Maintainability

| Проблема | Влияние |
|---|---|
| 211 функций в одном файле | Невозможно понять ответственность компонента |
| Смешение UI + бизнес-логики | Нельзя переиспользовать логику |
| 152 v-if в UIDesignPanel | Огромный DOM-tree, трудно дебажить |
| Стили > 2K строк | Специфичность и каскад выходят из-под контроля |

---

## 6. Приоритеты рефакторинга

| Приоритет | Файл | Строк | Сложность рефакторинга | Выигрыш |
|---|---|---|---|---|
| 🔴 P0 | UIDesignPanel.vue | 7 851 | Средняя (вкладки → компоненты) | Огромный: DX + runtime |
| 🔴 P0 | AdminProjectControl.vue | 5 849 | Высокая (shared state) | Огромный: DX |
| 🔴 P1 | AdminDesignerCabinet.vue | 4 332 | Средняя (секции → компоненты) | Большой |
| 🔴 P1 | [slug].vue | 3 717 | Средняя (wipe2 → composable) | Большой |
| 🟠 P2 | ClientProjectControl.vue | 3 405 | Средняя | Средний |
| 🟠 P2 | contractor/[id]/index.vue | 3 347 | Средняя | Средний |
| 🟠 P2 | ProjectCommunicationsPanel.vue | 2 639 | Средняя | Средний |
| 🟠 P2 | AdminDocumentEditor.vue | 2 595 | Средняя | Средний |
| 🟡 P3 | admin.vue (layout) | 1 900 | Низкая | Умеренный |
| 🟡 P3 | AdminDocumentsSection.vue | 1 654 | Низкая | Умеренный |

---

## 7. Дополнительные находки

### main.css — 9 067 строк
Монолитный CSS-файл. Рекомендуется разделить на:
- `base.css` — reset, inheritance, form controls
- `glass.css` — glass-surface, glass-card, glass-input
- `admin.css` — admin layout, sidebar, nav
- `cabinet.css` — cabinet/entity patterns
- `components.css` — dropdown, date-picker, status badges

### useDesignSystem.ts — 3 816 строк
Самый большой composable. Содержит все дизайн-токены + логику применения. Кандидат на разбиение на `useDesignTokens`, `useDesignPresets`, `useDesignExport`.

### Messenger (отдельно)
- MessengerProjectActionsPanel.vue — **3 923** строк
- MessengerChatSection.vue — **2 853** строк
- MessengerChatsSection.vue — **1 556** строк

Те же проблемы в подпроекте messenger/web/.

---

## 8. Анализ серверного кода

### 8.1 Размеры server/

| Слой | Файлов | Суммарно строк | Самый большой |
|---|---|---|---|
| server/api/ | ~60 | 6 868 | `ai/document-stream.post.ts` (530) |
| server/utils/ | 14 | 5 455 | `project-governance.ts` (2 075) |
| server/middleware/ | 5 | 379 | `01-rate-limit.ts` (168) |
| server/plugins/ | 4 | 178 | `cache-policy.ts` (70) |
| server/db/ | 2 | 526 | `schema.ts` (511) |

**Вывод:** API-эндпоинты компактные (< 150 строк), проблем нет. Единственный проблемный файл — `project-governance.ts` (2 075 строк, 40+ функций). Рекомендуется разбить на:
- `governance-normalizers.ts` — 15 функций нормализации
- `governance-participants.ts` — build/merge/sort participants
- `governance-queries.ts` — DB-запросы + safe wrappers
- `project-governance.ts` — оркестратор (~300 строк)

### 8.2 Shared types/constants/utils

| Файл | Строк | Проблема |
|---|---|---|
| shared/types/catalogs.ts | 1 062 | Все каталоги в одном файле |
| shared/utils/project-control.ts | 1 054 | Функции + константы + паттерны вместе |
| shared/types/designer.ts | 550 | Типы + шаблоны услуг + zod-схемы |
| shared/utils/communications-e2ee.ts | 394 | Норм |

**Рекомендация:** `catalogs.ts` → разбить по домену (client-catalogs, contractor-catalogs, project-catalogs). `project-control.ts` → отделить defaults/labels от бизнес-функций.

---

## 9. Анализ бандла (production build)

### 9.1 Суммарный размер

| Тип | Raw | Gzip (оценка) |
|---|---|---|
| **JS (все чанки)** | 2.0 MB | ~400 KB |
| **CSS (все чанки)** | 1.1 MB | ~150 KB |
| **Итого** | **3.1 MB** | **~550 KB** |

### 9.2 Крупнейшие JS-чанки

| Чанк | Raw | Gzip | Содержимое |
|---|---|---|---|
| D6KJDd6A.js | 403 KB | 103 KB | admin/project/control — основной чанк |
| Dd7FdGvR.js | 341 KB | 111 KB | UIDesignPanel + кабинеты сущностей |
| BQbEQG2A.js | 262 KB | 63 KB | admin layout + общие модули |
| Dc0dJ8Om.js | 131 KB | — | подрядчик/клиент |
| N9XgHkyA.js | 123 KB | — | — |

**Проблемы:**
- **Dd7FdGvR.js (341 KB)** — весь UIDesignPanel + кабинеты загружаются одним чанком. При декомпозиции каждая вкладка дизайн-панели станет отдельным lazy-чанком
- **D6KJDd6A.js (403 KB)** — AdminProjectControl целиком. При разбиении на модули (спринты, таймлайн, governance) каждый станет lazy-loaded

### 9.3 Крупнейшие CSS-чанки

| Чанк | Raw | Gzip | Содержимое |
|---|---|---|---|
| entry.css | **458 KB** | 57 KB | main.css (9K строк) → загружается ВСЕГДА |
| _slug_.css | 209 KB | 30 KB | Страница проекта |
| admin.css | 117 KB | — | Layout admin |
| project-governance.css | 67 KB | — | Governance стили |

**Проблема:** `entry.css` (458 KB raw) загружается на КАЖДОЙ странице, включая login. Содержит стили для всех кабинетов, всех компонентов. При разбиении main.css + выносе scoped-стилей из монолитных компонентов → entry.css уменьшится до ~100-150 KB.

### 9.4 Code Splitting

| Проблема | Статус |
|---|---|
| `defineAsyncComponent` / dynamic import | ❌ **Не используется нигде** |
| `lazy: true` в definePageMeta | ❌ Не используется |
| Lazy компоненты (Nuxt `Lazy` prefix) | ❌ Не используется |

**Вывод:** Вся декомпозиция сейчас — только на уровне маршрутов (автоматический code splitting Nuxt по страницам). Внутри страниц нет ленивой загрузки. Для UIDesignPanel, AdminProjectControl и других тяжёлых компонентов это означает, что 100 % JS загружается сразу, даже если пользователь никогда не откроет конкретную вкладку.

---

## 10. CSS-дублирование

### 10.1 Доля CSS в крупных компонентах

| Файл | CSS строк | % от файла |
|---|---|---|
| Wipe2Renderer.vue | 569 | **52 %** |
| AdminGallery.vue | 617 | **49 %** |
| ClientProjectControl.vue | 1 437 | **42 %** |
| client/[slug]/index.vue | 400 | 42 % |
| AdminSmartBrief.vue | 385 | 42 % |
| layouts/admin.vue | 791 | **41 %** |
| AdminProjectControl.vue | 2 326 | 39 % |
| contractor/[id]/index.vue | 1 331 | 39 % |
| UIDesignPanel.vue | 2 678 | 34 % |

> Суммарно ~12 000 строк scoped CSS в крупных компонентах.

### 10.2 Повторяющиеся CSS-правила

| Свойство | Самое частое значение | Повторов |
|---|---|---|
| gap | 8px | **168** |
| gap | 10px | 128 |
| gap | 6px | 127 |
| gap | 12px | 103 |
| border-radius | 999px | 62 |
| border-radius | 0 | 53 |
| border-radius | 50% | 51 |
| padding | 16px | 23 |

**Вывод:** Одни и те же spacing-values повторяются сотни раз между файлами. При переносе на CSS custom properties / утилитарные классы можно убрать тысячи строк.

---

## 11. Layout admin.vue — 24 data-запроса

Layout `admin.vue` (1 900 строк) выполняет **24 useFetch / $fetch вызова**:
- 7 списочных запросов (projects, clients, contractors, designers, sellers, linked-*)
- 6 mutation-запросов (link/unlink)
- Notifications polling
- Project data loading

**Проблемы:**
- Layout — это shell, он не должен содержать data fetching и бизнес-логику
- 86 функций и 47 computed — это store-уровень, не layout
- Все данные загружаются при любой навигации внутри admin/

**Рекомендация:**
1. `useAdminStore.ts` (Pinia) — все data-запросы, linked entities, mutations
2. `AdminTopBar.vue` — поиск + тема + logout
3. `AdminSidebarShell.vue` — sidebar wrapper + portal
4. `admin.vue` → ~200 строк (подключает store, рендерит shell)

---

## 12. Итоговая сводка

### Масштаб проблемы

| Зона | Проблемных файлов | Суммарно строк | % от total |
|---|---|---|---|
| Vue > 1K строк | 13 | 42 000 | 61 % vue |
| CSS в scoped | — | 12 000 | 17 % vue |
| Composables > 500 | 4 | 5 800 | 59 % composables |
| Server utils > 500 | 2 | 2 760 | 51 % server utils |
| Shared > 500 | 4 | 3 060 | 39 % shared |
| main.css | 1 | 9 067 | — |
| **entry.css (бандл)** | 1 | **458 KB** | всегда загружается |

### Ранжированные рекомендации

| # | Действие | Сложность | Выигрыш | Затронуто |
|---|---|---|---|---|
| 1 | Разбить UIDesignPanel на tab-components | Средняя | **Огромный**: HMR, бандл, DX | 7 851 → 8×400 |
| 2 | Разбить AdminProjectControl на модули | Высокая | **Огромный**: бандл, lazy load | 5 849 → 6×500 |
| 3 | Вынести data из admin.vue в Pinia store | Средняя | **Большой**: разделение ответственности | 1 900 → 200 + store |
| 4 | Разбить main.css на тематические файлы | Низкая | **Большой**: entry.css -70% | 9 067 → 5×1 500 |
| 5 | AdminDesignerCabinet → секции | Средняя | Большой | 4 332 → 6×400 |
| 6 | Wipe2 маппинг из [slug].vue → composable | Низкая | Средний | -1 200 строк |
| 7 | Добавить Lazy-компоненты / defineAsyncComponent | Низкая | Средний: бандл -30% | Все тяжёлые |
| 8 | CSS spacing → custom properties | Средняя (объём) | Средний: -2K строк CSS | Все компоненты |
| 9 | project-governance.ts → 4 файла | Низкая | Умеренный | 2 075 → 4×500 |
| 10 | catalogs.ts → по доменам | Низкая | Умеренный | 1 062 → 4×250 |

### Оценка общего состояния

```
Здоровье кодовой базы:  ██████░░░░  6/10

Сильные стороны:
  ✅ API-эндпоинты компактные (< 150 строк)
  ✅ Есть composables (логика частично вынесена)
  ✅ Shared types структурированы
  ✅ Middleware/plugins маленькие и чистые
  ✅ DB schema одним файлом — нормально для этого масштаба

Слабые стороны:
  ❌ 13 монолитных .vue файлов (топ-3 = 18K строк)
  ❌ Нет lazy loading компонентов вообще
  ❌ entry.css 458 KB загружается на каждой странице
  ❌ Layout содержит 24 data-запроса
  ❌ 543 повторения одного gap-значения в scoped CSS
  ❌ Бизнес-логика (CRUD, save) встроена в UI-компоненты
```
