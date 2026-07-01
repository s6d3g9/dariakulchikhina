# 16. Search и Navigation

Как пользователь находит и перемещается между сущностями в shell'е. Две ключевые механики: **универсальный поиск** и **контекстный profile-switch**.

## 1. Универсальный поиск

Поиск — единое поле в shell'е (стандартно — верхний-центр или свайп вниз). Ищет по **всем типам сущностей одновременно**: люди, компании, товары, модули, шаблоны, места, события, модели автомобилей, породы собак, курсы, города — всё.

Результаты разбиваются по `kind` с явной семантикой:

```
«honda civic»
├─ Models           Honda Civic 2024 (type)           [auto]
│                   Honda Civic 1998 (type)           [auto]
├─ My items         Мой Civic 2019 (instance)         [auto:self]
├─ Listings         15 объявлений в городе            [marketplace]
├─ Communities      Civic Club Moscow                 [community]
├─ Templates        «ТО Civic за 3000₽» by u_123     [template]
└─ Content          42 видео, 200 фото               [media]
```

Каждый результат при тапе:

- **Entity** (человек, машина, курс, место) → **открывает её карточку в центре shell'а** с корректной инверсией: user-search → instance-view профиля, model-search → type-view модели.
- **Template** → открывает type-view template'а (marketplace-вид с кнопкой fork).
- **Content** → открывает native viewer (галерея для фото, плеер для видео).

## 2. Контекстный profile-switch

Когда пользователь открывает результат-**entity** — shell делает **контекстный switch**:

```
Было: focus = мой профиль
Стало: focus = профиль Алисы
        all 4 панели перерисовались в её контекст:
          top    = её stories/галерея
          left   = её shop/что продаёт
          right  = чат с ней
          bottom = её лента
        центр = её карточка (instance-view)
```

Вернуться → кнопка «назад» в shell'е (или свайп), стек навигации хранит лимитированную глубину (≤ 20).

**Инвариант**: profile-switch никогда не нарушает persistent-shell. Панели **перерисовываются**, shell не размонтируется.

## 3. Инверсия ⇄ внутри чужого профиля

Находясь в чужом профиле (instance Алисы), можно нажать ⇄:
- Instance-вид (Алиса как человек): чат с ней, её shop, её stories.
- Type-вид (Алиса как роль, если применимо): её публичная роль (актриса, блогер, fitness-тренер) — её фан-сообщества, её мерч-каталог, фан-контент.

Для обычного человека без публичной роли — `type-view` может быть сжат до `professional-view` (LinkedIn-like публичный).

## 4. Контекстные результаты поиска

Поиск учитывает текущий контекст shell'а:

- Если открыта карточка моего авто и ищу «масло» → в топ результатов: масла для моей модели.
- Если открыта карточка Стамбула (trip-compound) и ищу «ресторан» → в топ: рестораны в Стамбуле.
- Если открыт профиль Алисы и ищу «фото» → в топ: её фото.

Реализуется передачей `currentFocus` в query:

```
GET /search?q=масло&focus=entity:car:v_12345&view=instance
```

Search-сервис использует focus как bias в re-ranking.

## 5. Навигационный стек и deep-links

- Внутри shell'а история фокусов — lineages stack (как браузер-history, но entity-aware).
- Deep link: `daria.app/e/<entity-id>` → открывает shell с этой entity в центре.
- Deep link с режимом: `daria.app/e/<id>?view=type` → сразу в type-view.
- Shared-ссылки работают в web, mobile и desktop одинаково (universal links).

## 6. Search index

`services/search` (Meilisearch → OpenSearch) держит индексы per-kind:

| Index | Источник | Refresh |
|---|---|---|
| `users` | identity events | near-real-time |
| `templates` | pattern-engine events | near-real-time |
| `assets` | authorship-registry events | near-real-time |
| `listings` | inventory events | near-real-time |
| `places` | location (POI catalog) | daily batch |
| `car-models`, `re-objects`, `breeds`, `courses`, … | per-card-type type-catalog | daily batch |

Policy-engine фильтрует результаты **per-user, per-region** — то, что пользователь не должен видеть, исключается до выдачи.

## 7. Voice / visual search (Фаза 7+)

- Voice: stt → текст → тот же pipeline.
- Visual: пользователь фотографирует вещь → vision-model распознаёт → подставляет query.
- Голосовые и визуальные запросы проходят через тот же `/search` endpoint с дополнительным `modality` полем.

## 8. Recommendations vs Search

- **Search** — пользователь **знает**, что ищет.
- **Recommendations** — система **предлагает** (fed в bottom-panel twitter-like + top-panel stories).
- Общий retrieval-слой, разные re-rankers.
- Оба фильтруются `policy-engine`.

## 9. Accessible search

- Клавиатурная навигация: `/` открывает search, стрелки по результатам, `Enter` — открыть.
- Screen-reader: каждый результат с явным role + kind + entity-description.
- Локализация — query expansion через синонимы per-language.

## 10. Privacy и видимость

- Пользователи могут быть `private` (не индексируются публично).
- Частичная видимость (`discoverable-by-phone`, `friends-only`) через policy-engine.
- Коммерческие entity (company, product) — всегда индексируются.
- Medical/Banking/Crypto instance-данные — **никогда** не индексируются search'ем (только для владельца, через API владельца).

## 11. Фрактальность results-view

Поисковый результат — это тот же `<Item>` (Identity + Status + Meta + Action), что и в любой панели (см. `17-fractal-ux.md` §1). Пользователь не учится «новому» способу взаимодействия с результатами:

- Tap → profile-switch (как при тапе в любой panel).
- Long-press → контекстное меню (share, subscribe, report — те же, что везде).
- Swipe по результату → quick-actions (add-to-list, save, book — если card-type их объявил).

`<SearchResults>` — один компонент, kind результата меняется через данные `Item`, не через новый layout.

## 12. Search UX states

Search interaction — это state machine. Каждое состояние имеет чёткий UI и переходы:

```
┌─ IDLE (not open) ──┐
│                    │ tap search-bar / "/" keyboard
│                    ▼
│              ┌─ FOCUS (empty) ─┐
│              │  shows:         │
│              │  - recent       │
│              │  - suggested    │
│              │  - trending     │
│              │                 │ type query
│              │                 ▼
│              │  ┌─ TYPING ──────┐
│              │  │  live results │
│              │  │  debounced    │
│              │  │  200ms        │
│              │  │               │ tap result
│              │  │               ▼
│              │  │       ┌─ TRANSITION ─┐
│              │  │       │  focus.set() │
│              │  │       │  panels load │
│              │  │       │  < 300ms     │
│              │  │       │              │
└──────────────┴──┴───────┴──────────────┘
                ▲                        │
                └─ back gesture ─────────┘
```

## 13. Navigation stack deep-dive

Shell-stack детали (см. `29-shell-state-model.md §4`):

```ts
interface StackEntry {
  focus: { kind, id, view, mode }
  panels: { top, left, right, bottom: PanelState }   // scroll positions
  timestamp: Date
  source: 'search' | 'panel-tap' | 'deep-link' | 'inversion' | 'back'
}

const stack: StackEntry[] = []   // FIFO, max 20
```

**Переходы**:
- `tap-entity` → push current, set new focus.
- `back` → pop, restore previous (including scroll).
- `inversion ⇄` — **не** push (меняет только `view` текущего focus).
- `mode-toggle` — **не** push (меняет только `mode`).
- `deep-link` → replace stack с single entry (fresh entry).

**Edge case**: если user pушит 20+ entries, drop head (oldest). Back-button начинает no-op после end of stack.

## 14. Deep-link schema (полный)

Шаблон: `https://daria.app/<resource>/<id>[?query]`.

| Resource | Pattern | Example |
|---|---|---|
| Entity | `/e/<kind>/<id>` | `/e/car/v_12345` |
| Entity (type view) | `/e/<kind>/<id>?view=type` | `/e/car/bmw_x5_2023?view=type` |
| Search results | `/s/<query>` | `/s/honda%20civic` |
| Conversation | `/c/<conv-id>` | `/c/conv_abc123` |
| Pattern-card | `/p/<pattern-id>` | `/p/trip_istanbul_2026` |
| Template | `/t/<template-id>` | `/t/tpl_istanbul_3d` |
| Playbook from AI | `/ai/<session-id>` | `/ai/ai_xyz` |

**Query params**:
- `view=instance|type` — override default view.
- `mode=<mode>` — override default mode.
- `focus=<section-id>` — auto-scroll to section.

**Universal links**:
- iOS: `.well-known/apple-app-site-association` с matching paths.
- Android: `assetlinks.json` с digest.
- Web: SSR handles всё (Next.js).

## 15. Search query log и analytics

Каждый query эмитит event:

```json
{
  "queryId": "q_abc",
  "userId": "u_123",
  "raw": "honda civic spb",
  "parsed": { "kind": "car-listing", "filters": {...} },
  "resultCount": 12,
  "latencyMs": 187,
  "modality": "text",
  "policyFiltered": 3,
  "resultsShown": 9,
  "context": { "focus": "person:u_123" }
}
```

Uses (по GDPR-compliance):
- Улучшение ranking (aggregate, pseudonymized user).
- Zero-result monitoring (`search.zero-results-rate` alert).
- Trend detection (popular queries per-region).
- Anti-abuse (enumeration attacks via unusual patterns).

**Never**: logging raw query с PII long-term. Retention: 90 дней identifiable → pseudonymized 2 year.

## 16. Антипаттерны

- ❌ Отдельный search per-vertical (car-search, hotel-search, …). Один universal search.
- ❌ Open modal для каждого entity при тапе результата. Всегда — smooth switch в shell'е.
- ❌ Игнорировать policy-engine в выдаче.
- ❌ Хранить search-state в URL как единственный источник — shell-history важнее.
- ❌ Использовать search для админ-запросов к БД (для этого OpenSearch, не Meilisearch).
- ❌ Вводить свой layout для «особого» типа результатов — нарушение I20.
- ❌ Deep-link resolves к 404 для deleted-entity — должен redirect + show context.
- ❌ Save user raw-queries indefinitely — GDPR violation.
- ❌ Search без debounce — wastes compute.
- ❌ Stack push на every inversion — fills up immediately.
