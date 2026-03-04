# Отчёт об ошибках — комплексный аудит фронтенда

Дата: 2025-01-XX  
Проверено: ~90 файлов, ~25 000+ строк (Vue-компоненты, страницы, layout'ы, composable'ы, middleware, shared)

---

## 1. Нереактивный URL в `useFetch` — `AdminClientProfile.vue`

**Файл:** `app/components/AdminClientProfile.vue`, строка 200  
**Серьёзность:** HIGH  
**Описание:** `useFetch` вызван со статическим шаблонным литералом `` `/api/projects/${props.slug}` `` вместо функции-геттера `() => ...`. Если компонент будет переиспользован с другим `slug` (например, при переключении проектов без перемонтирования), запрос **не обновится** — URL зафиксирован при первом вызове.  
**Воспроизведение:** Переключить проект в `admin/projects/[slug].vue` — `AdminClientProfile` продолжит показывать данные предыдущего проекта.  
**Исправление:**  
```ts
// Было:
const { data: project, pending, refresh } = await useFetch<any>(`/api/projects/${props.slug}`)
// Стало:
const { data: project, pending, refresh } = await useFetch<any>(() => `/api/projects/${props.slug}`)
```

---

## 2. Нереактивный URL в `useFetch` — `AdminDesignerCabinet.vue`

**Файл:** `app/components/AdminDesignerCabinet.vue`, строка 834  
**Серьёзность:** HIGH  
**Описание:** Аналогичная проблема — `` `/api/designers/${props.designerId}/documents` `` без обёртки в геттер. Если `designerId` изменится (выбран другой дизайнер), документы не перезагрузятся.  
**Исправление:**  
```ts
const { data: designerDocs, refresh: refreshDesignerDocs } = await useFetch<any[]>(
  () => `/api/designers/${props.designerId}/documents`,
  { default: () => [] },
)
```

---

## 3. Нереактивный URL в `useFetch` — `admin/projects/[slug].vue`

**Файл:** `app/pages/admin/projects/[slug].vue`, строки 451, 455, 460  
**Серьёзность:** HIGH  
**Описание:** Множество `useFetch` вызваны со статическим `` `/api/projects/${slug.value}` ``. В контексте страницы с `[slug]` в Nuxt 3, если пользователь перемещается между `/admin/projects/a` и `/admin/projects/b` — компонент может не быть перемонтирован, и все fetch'и останутся с прежним slug.  
**Исправление:** Обернуть все URL в функции-геттеры `() => ...` или использовать `watch` для `slug` с `refresh()`.

---

## 4. Нереактивный URL в `useFetch` — `contractor/[id]/index.vue`

**Файл:** `app/pages/contractor/[id]/index.vue`, строки 1033–1042  
**Серьёзность:** MEDIUM  
**Описание:** Все `useFetch` (contractor, work-items, staff, projects, documents) используют статическое значение `` `/api/contractors/${contractorId}` `` где `contractorId = Number(route.params.id)`. Значение `contractorId` — число, вычисленное один раз. Если маршрут изменится (крайне маловероятно в данном UI), данные не обновятся. В контексте кабинета подрядчика с фиксированным ID — риск низкий, но паттерн некорректен.  
**Исправление:** Использовать `() => ...` обёртку для URL.

---

## 5. `process.server` вместо `import.meta.server` — admin middleware

**Файл:** `app/middleware/admin.ts`, строка 3  
**Серьёзность:** MEDIUM  
**Описание:** В Nuxt 3 `process.server` корректно работает, но **не оптимизируется tree-shaking'ом**. `import.meta.server` — каноничный способ, который убирается бандлером в клиентском билде. Два других middleware (`client.ts`, `contractor.ts`) уже используют `import.meta.server` корректно — здесь несогласованность.  
**Исправление:**  
```ts
const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
```

---

## 6. `process.server` вместо `import.meta.server` — contractor page

**Файл:** `app/pages/contractor/[id]/index.vue`, строки 1269, 1283, 1545, 1553  
**Серьёзность:** MEDIUM  
**Описание:** 4 места используют `process.server` вместо `import.meta.server`. Код не будет tree-shaken из клиентского бандла. Composable `useContractorCabinet.ts`, из которого этот код дублирован, использует `import.meta.server` корректно.  
**Исправление:** Заменить все `process.server` → `import.meta.server`.

---

## 7. Некорректный паттерн парсинга дат в `AdminWorkStatus.vue`

**Файл:** `app/components/AdminWorkStatus.vue`, функция `isOverdue`  
**Серьёзность:** MEDIUM  
**Описание:** `isOverdue` использует `new Date(item.dateEnd)` для проверки просрочки. Однако в проекте даты часто хранятся в формате `DD.MM.YYYY` (русский формат), который `new Date()` **не парсит корректно** (результат будет `Invalid Date` или неверная дата). В contractor page аналогичный парсинг сделан вручную через регулярное выражение. Если `dateEnd` хранится как ISO `YYYY-MM-DD` — проблемы нет, но формат нигде не валидируется.  
**Исправление:** Добавить универсальную функцию парсинга даты или использовать `AppDatePicker` с `modelType: 'iso'` для всех полей дат + парсить через `parseISO`/`parseDMY`.

---

## 8. Мёртвый код — `openCreateMaster` в `admin/contractors/index.vue`

**Файл:** `app/pages/admin/contractors/index.vue`  
**Серьёзность:** LOW  
**Описание:** Функция `openCreateMaster(companyId)` определена в скрипте, но нигде не вызывается в шаблоне. Это мёртвый код, оставшийся после рефакторинга.  
**Исправление:** Удалить функцию или добавить кнопку в UI для добавления мастера в компанию.

---

## 9. `preloadNeighbors` — функция-заглушка в `GalleryLightbox.vue`

**Файл:** `app/components/GalleryLightbox.vue`, функция `preloadNeighbors`  
**Серьёзность:** LOW  
**Описание:** Функция `preloadNeighbors` зарегистрирована как watch-хендлер, но тело пустое (содержит `forEach(() => { })` — no-op). Предзагрузка соседних изображений не реализована.  
**Исправление:** Реализовать предзагрузку через `new Image().src = ...` или удалить watch и функцию.

---

## 10. Утечка body overflow при размонтировании `GalleryLightbox`

**Файл:** `app/components/GalleryLightbox.vue`, watch на `props.open`  
**Серьёзность:** MEDIUM  
**Описание:** Watch выставляет `document.body.style.overflow = 'hidden'` при открытии lightbox. Если компонент будет размонтирован до вызова `close` (например, при навигации), overflow так и останется `hidden`, заблокировав скролл всей страницы. `onUnmounted` хук есть и сбрасывает overflow, но только если lightbox ещё открыт в момент размонтирования `Teleport` может не корректно сработать при быстрой навигации.  
**Исправление:** Расширение `onUnmounted` надёжное, но стоит дополнительно сбросить overflow в `onBeforeUnmount` и убедиться, что `Teleport` не мешает hooks.

---

## 11. `useFetch` с `null`/пустой строкой вместо отмены — `contractor.vue` layout

**Файл:** `app/layouts/contractor.vue`  
**Серьёзность:** MEDIUM  
**Описание:** Когда `contractorId` не определён (пользователь не авторизован), `useFetch` получает URL вида `` `/api/contractors/undefined` `` или пустую строку, что приводит к 404-запросу на сервер. Запрос надо подавлять с помощью `enabled`/`immediate` опций или передавать `null`.  
**Исправление:**  
```ts
const contractorUrl = computed(() => contractorId ? `/api/contractors/${contractorId}` : null)
const { data } = await useFetch(contractorUrl)
```

---

## 12. `watch` на `fieldValues` в `AdminDocumentEditor.vue` создаёт бесконечный цикл

**Файл:** `app/components/AdminDocumentEditor.vue`, строка ~341  
**Серьёзность:** HIGH  
**Описание:** Строки 341–355: `watch` на `[fieldValues.value['price'], fieldValues.value['advance']]` внутри колбэка **мутирует** `fieldValues.value['advance_amount']` и `fieldValues.value['price_words']`. Это вызовет новое срабатывание вычислений. Хотя `watch` наблюдает конкретные ключи (`price`, `advance`), мутация `advance_amount` и `price_words` может вызвать каскадный рендер. Кроме того, `computeDerivedFields()` в `generateText()` тоже мутирует `fieldValues` — двойная мутация из разных мест.  
**Исправление:** Перенести логику авто-вычисления в `computed` свойства вместо мутации `fieldValues` из watch.

---

## 13. `removeRender(Number(idx))` — ненужная конвертация в `AdminConceptApproval.vue`

**Файл:** `app/components/AdminConceptApproval.vue`, строка ~62  
**Серьёзность:** LOW  
**Описание:** В шаблоне `v-for="(r, idx) in form.ca_renders"` — `idx` уже число. Обёртка `Number(idx)` избыточна, но не баг.

---

## 14. `removeFile(Number(idx))` — аналогично в `AdminSiteSurvey.vue`

**Файл:** `app/components/AdminSiteSurvey.vue`, шаблон  
**Серьёзность:** LOW  
**Описание:** Такой же паттерн с `Number(idx)`, где `idx` уже число.

---

## 15. Отсутствие обработки ошибок при `save()` в нескольких компонентах

**Файл:** Несколько компонентов (AdminConceptApproval, AdminFirstContact, AdminToRContract)  
**Серьёзность:** MEDIUM  
**Описание:** Функция `save()` в `AdminConceptApproval.vue` не обёрнута в `try/catch` — при ошибке сети промис отклоняется без уведомления пользователя. Аналогично в `AdminFirstContact.vue` и `AdminToRContract.vue`. В отличие от них, `AdminSmartBrief.vue` и `AdminSiteSurvey.vue` используют `try/finally` корректно.  
**Исправление:** Обернуть все `save()` в try/catch с уведомлением пользователя.

---

## 16. Дублирование логики: contractor page vs `useContractorCabinet`

**Файл:** `app/pages/contractor/[id]/index.vue` (~2893 строк) vs `app/composables/useContractorCabinet.ts` (713 строк)  
**Серьёзность:** MEDIUM (maintainability risk, не runtime баг)  
**Описание:** Страница contractor/[id]/index.vue **дублирует** практически всю бизнес-логику из `useContractorCabinet.ts`: CRUD задач, загрузку фото, комментарии, управление документами, checklist этапов. `AdminContractorCabinet.vue` корректно использует composable. Любые будущие правки в логике придётся делать в двух местах — высокий риск рассинхронизации.  
**Исправление:** Рефакторить `contractor/[id]/index.vue` для использования `useContractorCabinet`.

---

## 17. `ClientPageContent.vue` — watchers на `selections`/`textAnswers`/`numberAnswers` вызывают save при загрузке

**Файл:** `app/components/ClientPageContent.vue`  
**Серьёзность:** MEDIUM  
**Описание:** `watch(selections, scheduleSave, { deep: true })` запускается сразу после `loadSelections()` присваивает значения из API. Хотя есть `suppressSave` флаг, в `loadSelections` он выставляется синхронно, а `nextTick` + `suppressSave = false` может раниться **после** того как deep watcher уже поставил save в очередь. Потенциально при каждом открытии страницы данные перезаписываются на сервер своей же копией.  
**Исправление:** Использовать `{ flush: 'post' }` для watchers или `watchEffect` с `flush: 'sync'` для `suppressSave`.

---

## 18. `today` — константа, кэшированная при инициализации в `AppDatePicker.vue`

**Файл:** `app/components/AppDatePicker.vue`, строка ~100  
**Серьёзность:** LOW  
**Описание:** `const today = new Date()` вычисляется один раз при монтировании модуля. Если приложение остаётся открытым более суток (SPA-режим), «Сегодня» будет подсвечивать вчерашнюю дату. Аналогично `goToday()` перейдёт к устаревшей дате.  
**Исправление:** Вычислять `new Date()` при каждом вызове `goToday()` и в computed `calCells`.

---

## 19. `GalleryFilterBar.vue` — `onOutsideClick` закрывает dropdown при клике в любую кнопку сортировки

**Файл:** `app/components/GalleryFilterBar.vue`  
**Серьёзность:** LOW  
**Описание:** Слушатель `onOutsideClick` на `document` будет закрывать `sortOpen` при **любом** клике, даже по самой кнопке сортировки, хотя кнопка тоже переключает `sortOpen`. Это создаёт гонку: кнопка делает `sortOpen = !sortOpen` (открывает), затем `onOutsideClick` тут же делает `sortOpen = false` (закрывает). Dropdown может мигать.  
**Причина:** Кнопка сортировки использует `@click.stop` для самого dropdown, но не для `gfb-sort-btn`.  
**Исправление:** Добавить `@click.stop` на `.gfb-sort-btn` или проверять `e.target` в `onOutsideClick`.

---

## 20. Memory leak — `AppDatePicker.vue` не убирает listener из `window.scroll` (capture)

**Файл:** `app/components/AppDatePicker.vue`  
**Серьёзность:** LOW  
**Описание:** Listener'ы добавляются в `onMounted` и убираются в `onBeforeUnmount` — это корректно. Однако используется `window.addEventListener('scroll', calcPosition, true)` (capture mode), и `window.removeEventListener('scroll', calcPosition, true)` в unmount — совпадают, проблемы нет. Проверка подтверждена — баг **отсутствует**.

---

## 21. `AdminMaterials.vue` — `dirty` flag не используется

**Файл:** `app/components/AdminMaterials.vue`  
**Серьёзность:** LOW  
**Описание:** `dirty` ref выставляется через `markDirty()` при каждом изменении, но нигде не используется (нет guard'а при уходе со страницы, нет визуального индикатора). Мёртвый state.  
**Исправление:** Добавить `onBeforeRouteLeave` guard или удалить `dirty`.

---

## 22. `AppAddressInput.vue` — глобальные стили не scoped

**Файл:** `app/components/AppAddressInput.vue`, строки 130+  
**Серьёзность:** LOW  
**Описание:** `.aai-list`, `.aai-item`, `.aai-title`, `.aai-sub` определены в `<style>` (глобальном блоке, не scoped). Это необходимо из-за Teleport, но классы с префиксом `aai-` минимизируют риск конфликтов. Рекомендуется уникальный префикс или `:global()` внутри scoped.

---

## 23. `AdminDocumentEditor.vue` — `buildPaymentTable` генерирует невалидный advPct

**Файл:** `app/components/AdminDocumentEditor.vue`, функция `buildPaymentTable`  
**Серьёзность:** LOW  
**Описание:** `const remPct = vals['advance'] ? String(100 - parseFloat(vals['advance'].replace('%','').replace(',','.')) || 50) : '50'` — оператор `||` имеет приоритет выше `String()` ожидания. Если `advance = "50%"`, то `100 - 50 = 50`, `50 || 50 = 50` — OK. Но если `advance = "100%"`, то `100 - 100 = 0`, `0 || 50 = 50` — **неверно**, остаток будет 50% вместо 0%.  
**Исправление:**  
```ts
const advPctNum = parseFloat((vals['advance'] || '50').replace('%', '').replace(',', '.'))
const remPct = isNaN(advPctNum) ? '50' : String(100 - advPctNum)
```

---

## 24. `numberToWords` — неверное склонение для некоторых чисел

**Файл:** `app/components/AdminDocumentEditor.vue`, функция `numberToWords`  
**Серьёзность:** LOW  
**Описание:** Функция `THOUS_SFX` проверяет `n >= 11 && n <= 14` для определения суффикса «тысяч», но `n` — это количество тысяч (0–999), а проверка должна быть на двузначный остаток `n % 100`. Для `n = 111` (111 тысяч): `n % 10 = 1`, и функция вернёт «тысяча» вместо «тысяч». Нужно: `const r10 = n % 10; const r100 = n % 100; if (r100 >= 11 && r100 <= 14) return 'тысяч'`.  
**Исправление:** Использовать `n % 100` вместо `n` в проверке 11-14.

---

## 25. Отсутствие валидации `contractorId` — `contractor/[id]/index.vue`

**Файл:** `app/pages/contractor/[id]/index.vue`, строка 1031  
**Серьёзность:** MEDIUM  
**Описание:** `const contractorId = Number(route.params.id)` — если `id` не число (например, строка), `contractorId` станет `NaN`, и все `useFetch` запросы пойдут на `/api/contractors/NaN`, возвращая 404/500. Нет проверки `isNaN`.  
**Исправление:**  
```ts
const contractorId = Number(route.params.id)
if (isNaN(contractorId)) {
  throw createError({ statusCode: 400, statusMessage: 'Invalid contractor ID' })
}
```

---

## Сводка

| Серьёзность | Количество |
|---|---|
| CRITICAL | 0 |
| HIGH | 4 |
| MEDIUM | 9 |
| LOW | 12 |
| **Итого** | **25** |

### HIGH-приоритет (исправить в первую очередь):
1. Нереактивные URL в `useFetch` (#1, #2, #3) — данные не обновляются при смене проекта/дизайнера
2. Бесконечный/каскадный watch в `AdminDocumentEditor.vue` (#12)

### MEDIUM-приоритет:
3. `process.server` → `import.meta.server` (#5, #6)
4. Парсинг дат (#7)
5. `useFetch` с невалидным URL в contractor layout (#11)
6. `suppressSave` race condition в `ClientPageContent.vue` (#17)
7. Отсутствие валидации `contractorId` (#25)
8. Отсутствие error handling в save() (#15)
9. Дублирование логики contractor (#16)
