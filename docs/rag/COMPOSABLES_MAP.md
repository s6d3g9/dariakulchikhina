# COMPOSABLES_MAP — карта composables

> RAG-файл. Перед написанием нового composable или копированием логики — проверь этот файл.
> Все composables живут в `app/composables/`. Не дублируй их функциональность.

---

## 1. Дизайн-система

### `useDesignSystem` — движок токенов

**Файл:** `app/composables/useDesignSystem.ts`  
**Назначение:** Единственный источник правды для 100+ CSS design-токенов. Управляет сохранением, применением, историей (undo/redo), пресетами и экспортом.

```ts
const {
  tokens,              // Ref<DesignTokens> — текущие значения всех токенов
  set,                 // (key, value) → обновить токен + applyToDOM + save
  batchSet,            // (partial) → массовое обновление без лишних перерисовок
  reset,               // () → сбросить к DEFAULT_TOKENS
  applyPreset,         // (preset: DesignPreset) → применить один из 6 пресетов
  undo, redo,          // () → история изменений (макс. 50 шагов)
  canUndo, canRedo,    // ComputedRef<boolean>
  exportJSON,          // () → скачать tokens.json
  importJSON,          // (json: string) → загрузить из JSON
  exportCSS,           // () → скачать custom-properties.css
  initDesignSystem,    // () → load() + applyToDOM() — вызывать при монтировании
  applyToDOM,          // () → запись всех токенов на document.documentElement.style
  save, load,          // localStorage['design-tokens']
  previewPreset,       // (preset) → временно показать пресет (не сохраняет)
  confirmPreview,      // () → зафиксировать превью
  cancelPreview,       // () → отменить превью → вернуть прежние токены
  isPreviewActive,     // ComputedRef<boolean>
  customPresets,       // Ref<CustomPreset[]> — пользовательские пресеты
  loadCustomPresets,   // () → загрузить из localStorage
  saveCustomPreset,    // (name, icon?) → создать новый пресет из текущих токенов
  deleteCustomPreset,  // (id) → удалить
  renameCustomPreset,  // (id, newName) → переименовать
} = useDesignSystem()
```

**Типы:**
- `DesignTokens` — интерфейс всех токенов (кнопки, типографика, цвета, скругления, тени, анимации, сетка, glass, семантика)
- `DEFAULT_TOKENS` — значения по умолчанию
- `DesignPreset` — `{ id, label, icon, tokens: Partial<DesignTokens> }`
- `DESIGN_PRESETS[]` — 6 встроенных пресетов
- `DESIGN_CONCEPTS[]` — расширенные концептуальные пресеты
- `FONT_OPTIONS`, `BTN_SIZE_MAP`, `EASING_OPTIONS`, `TYPE_SCALE_OPTIONS` — опции для UIDesignPanel

**Правило:** Используй в `UIDesignPanel.vue`. Для простого чтения токенов в компонентах — используй `var(--token)` в CSS, не импортируй composable.

---

### `useUITheme` — цветовые темы

**Файл:** `app/composables/useUITheme.ts`  
**Назначение:** 5 цветовых тем (cloud/linen/stone/fog/parchment). Каждая тема содержит light + dark CSS vars и переопределяет glass-* / btn-* / dropdown-*.

```ts
const {
  currentTheme,   // Ref<UITheme | null> — активная тема
  applyTheme,     // (theme: UITheme) → применить + сохранить в localStorage['ui-theme']
  loadTheme,      // () → восстановить сохранённую тему
} = useUITheme()

// Все темы:
import { UI_THEMES } from '~/composables/useUITheme'
// UI_THEMES: UITheme[] = [cloud, linen, stone, fog, parchment]
```

**Тема применяется через:** атрибут `data-theme` на `<html>` + inline CSS vars на `documentElement`.  
**Персистентность:** `localStorage['ui-theme']`.  
**Плагин:** `app/plugins/ui-theme.client.ts` — восстанавливает тему **до первого paint** (anti-FOUT).

---

### `useThemeToggle` — dark / light режим

**Файл:** `app/composables/useThemeToggle.ts`  
**Назначение:** Переключатель dark/light режима. Источник: `@nuxt/color-mode`. Синхронизирует `body.dark-theme`.

```ts
const {
  isDark,      // ComputedRef<boolean>
  setTheme,    // (mode: 'light' | 'dark') → изменить + сохранить
  toggleTheme, // () → переключить текущий режим
} = useThemeToggle()
```

**Класс на <html>:** `html.dark` (Nuxt color-mode).  
**Класс на <body>:** `body.dark-theme` (через plugin `dark-sync.client.ts`).

---

## 2. Данные галереи

### `useGallery` — управление галереей

**Файл:** `app/composables/useGallery.ts`  
**Назначение:** Загрузка, CRUD, фильтрация, сортировка, пакетные операции и lightbox для галереи.

```ts
const {
  items,              // Ref<GalleryItem[]>
  loading, error,     // Ref<boolean>, Ref<string>

  // Фильтры
  search, activeTag,
  viewMode,           // Ref<GalleryViewMode>: 'masonry' | 'grid' | 'list'
  sortField,          // Ref<GallerySortField>
  sortDir,            // Ref<GallerySortDir>
  filteredItems,      // ComputedRef<GalleryItem[]>

  // Batch-режим
  batchMode, selectedIds, selectedCount,
  toggleBatchMode, toggleSelect, selectAll, deselectAll,
  batchDelete, batchTag, batchToggleFeatured,

  // Lightbox
  lightboxIndex, lightboxOpen, lightboxItem,
  openLightbox, closeLightbox, lightboxNext, lightboxPrev,

  // CRUD
  load,               // () → GET /api/gallery?category=
  create,             // (data) → POST /api/gallery
  update,             // (id, data) → PATCH /api/gallery/:id
  remove,             // (id) → DELETE /api/gallery/:id
  reorder,            // (ids[]) → PATCH /api/gallery/reorder
  toggleFeatured,     // (id) → переключить is_featured
} = useGallery(category)  // category: Ref<string> | string
```

**Используется в:** `AdminGallery.vue`, страницах `gallery/*.vue`.

---

## 3. Кабинеты

### `useContractorCabinet` — кабинет подрядчика

**Файл:** `app/composables/useContractorCabinet.ts`  
**Назначение:** Вся бизнес-логика кабинета подрядчика — загрузка профиля, задач, штата, документов, финансов, портфолио. 11 секций.

```ts
const cabinet = useContractorCabinet(contractorId) // Ref<number | null>
// Возвращает состояние и методы для каждой из 11 секций:
// dashboard, tasks, staff, contacts, passport, requisites,
// documents, specialization, finances, portfolio, settings
```

**Константы (экспортируются из файла):**
- `PAYMENT_METHOD_OPTIONS` — способы оплаты
- `DOC_CATEGORIES` — категории документов
- `STATUSES` — статусы подрядчика
- `ROLE_GROUPS` — группы ролей
- `WORK_GROUPS` — группы работ

**Используется в:** `contractor/[id]/index.vue`, `AdminContractorCabinet.vue`.

---

### `useDesignerCabinet` — кабинет дизайнера

**Файл:** `app/composables/useDesignerCabinet.ts`  
**Назначение:** Бизнес-логика кабинета дизайнера — услуги, пакеты, подписки, документы, проекты, профиль.

```ts
const cabinet = useDesignerCabinet(designerId) // Ref<number | null>
```

**Используется в:** `AdminDesignerCabinet.vue`.

---

## 4. AI

### `useAiDocument` — AI-генерация документов

**Файл:** `app/composables/useAiDocument.ts`  
**Назначение:** Интеграция с Gemma 3 27B (и другими LLM) для генерации, улучшения и рецензирования документов. Поддерживает SSE-стриминг.

```ts
const {
  aiLoading,          // Ref<boolean>
  aiError,            // Ref<string>
  aiAction,           // Ref<'generate' | 'improve' | 'review' | ''>
  aiProgress,         // Ref<string> — статус для пользователя
  aiElapsed,          // Ref<number> — секунды
  aiTokenCount,       // Ref<number>
  aiTruncated,        // Ref<boolean> — достигнут max_tokens
  aiReviewNotes,      // Ref<AiReviewNote[]>
  aiCitations,        // Ref<LegalCitation[]>

  streamDocument,     // (action, payload, onToken) → boolean — стриминговый запрос
  reviewDocument,     // (payload) → AiReviewNote[] — обычный запрос (review)
  abortAi,            // () → отменить текущий запрос
  clearReview,        // () → очистить aiReviewNotes
  clearCitations,     // () → очистить aiCitations
} = useAiDocument()
```

**API:** `POST /api/ai/document-stream`  
**Поддерживаемые модели:** `gemma3:27b`, `qwen3:4b`, `claude-3-5-haiku-20241022` и др. (передаётся в `payload.aiModel`)  
**Используется в:** `AdminDocumentEditor.vue`.

---

## 5. UI-утилиты

### `useSidebarActive` — keep-alive sidebar guard

**Файл:** `app/composables/useSidebarActive.ts`  
**Назначение:** Возвращает `active: Ref<boolean>`, который `true` когда страница монтирована/активирована и `false` при деактивации (keep-alive). Нужен для `<Teleport :disabled="!sidebarActive">`.

```ts
const sidebarActive = useSidebarActive()
// Используй в <Teleport to="#admin-sidebar-portal" :disabled="!sidebarActive">
```

**Используется в:** каждой странице admin-раздела с телепортируемым sidebar.

---

### `useStatusColor` — цвет по статусу

**Файл:** `app/composables/useStatusColor.ts`  
**Назначение:** Вычисляет CSS-цвет по значению поля статуса. Заменяет повторяющийся `statusColor computed` в Admin*-фазных компонентах.

```ts
const statusColor = useStatusColor(
  form,            // Record<string, any> | Ref<Record<string, any>>
  'lead_status',   // поле в form
  {                // кастомная карта (опционально, расширяет дефолтную)
    contacted: 'blue',
    meeting: 'yellow',
    qualified: 'green',
    declined: 'red',
  }
)
// → ComputedRef<string> — CSS-цвет
```

**Используется в:** Admin*-компонентах с цветными статусами.

---

### `useTimestamp` — метка «сохранено в HH:MM»

**Файл:** `app/composables/useTimestamp.ts`  
**Назначение:** Хелпер для показа времени последнего сохранения. Заменяет 8+ дублированных паттернов `savedAt`.

```ts
const { savedAt, touch, clear } = useTimestamp()
// touch() — зафиксировать текущее время («сохранено в 14:32»)
// clear() — очистить метку
// savedAt — Ref<string>
```

**Паттерн использования:**
```ts
async function save() {
  await $fetch('/api/...', { method: 'PATCH', body: form.value })
  timestamp.touch()
}
```

---

### `useUpload` — загрузка файлов

**Файл:** `app/composables/useUpload.ts`  
**Назначение:** Загрузка файла на сервер (`POST /api/upload`). Заменяет 5+ дублей FormData-логики.

```ts
const { uploading, uploadError, upload } = useUpload()

// upload(file: File) → Promise<string | null>
// Возвращает URL загруженного файла или null при ошибке
```

**API:** `POST /api/upload` → `{ filename: string }` → URL = `/uploads/${filename}`

---

## 6. Правила использования composables

| Задача | Composable | Не делай |
|--------|-----------|----------|
| Сохранить/сбросить design-токены | `useDesignSystem()` | Писать в `documentElement.style` напрямую |
| Применить тему cloud/linen/... | `useUITheme()` | Менять CSS vars в localStorage вручную |
| Переключить dark/light | `useThemeToggle()` | Менять `html.dark` классом напрямую |
| Работа с галереей | `useGallery(category)` | Писать `$fetch('/api/gallery')` в компоненте |
| Кабинет подрядчика | `useContractorCabinet(id)` | Дублировать логику загрузки секций |
| Кабинет дизайнера | `useDesignerCabinet(id)` | Повторять API-вызовы в компоненте |
| AI в редакторе документов | `useAiDocument()` | Писать `fetch('/api/ai/...')` в компоненте |
| Sidebar в keep-alive странице | `useSidebarActive()` | Использовать `onMounted`/`onUnmounted` для Teleport |
| Цвет статуса | `useStatusColor(form, field)` | Писать `computed(() => form.status === 'x' ? 'red' : 'green')` |
| Метка «сохранено» | `useTimestamp()` | Дублировать `savedAt = ref('')` + `new Date()` |
| Загрузить файл | `useUpload()` | Писать FormData + $fetch самостоятельно |
