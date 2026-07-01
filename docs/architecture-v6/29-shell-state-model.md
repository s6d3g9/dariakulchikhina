# 29. Shell State Model

Shell — это persistent-контейнер клиента, живущий всю сессию. Его runtime-состояние — формальный автомат, описывающий `focus`, `view`, `mode`, навигационный стек и derived UI-инварианты. Этот документ фиксирует модель, чтобы web / mobile / desktop shell'ы вели себя идентично (инвариант I19 на runtime-уровне).

## 1. Атомарные единицы состояния

```ts
type ShellState = {
  // ── Текущий фокус ───────────────────────────────────────
  focus: {
    kind: string                    // 'person-profile', 'car', 'trip-compound', …
    id: string
    view: 'instance' | 'type'
    mode?: 'consumer' | 'provider' | 'creator' | 'marketplace' | string
  }

  // ── Навигационный стек ───────────────────────────────────
  stack: FocusRef[]                 // last → current; max 20 (I ...см. ниже)

  // ── Derived (для панелей) ────────────────────────────────
  panels: {
    top: PanelState
    left: PanelState
    right: PanelState
    bottom: PanelState
  }

  // ── Session-wide ─────────────────────────────────────────
  user: { id: string; roles: string[]; region: string; locale: string; tz: string }
  device: { platform: 'web'|'ios'|'android'|'desktop'; online: boolean }
  sync: { lastAppliedEventId?: string; outboxPending: number; state: 'idle'|'syncing'|'error' }

  // ── UI-мета ──────────────────────────────────────────────
  theme: 'light' | 'dark' | 'auto' | 'high-contrast'
  dir:   'ltr' | 'rtl'
  search: { query?: string; results?: SearchResult[] }
  overlays: OverlayStack              // temporary (bottom-sheet, modal, toast)
}

type PanelState = {
  loading: boolean
  error?: ErrorCode
  data?: PanelPayload                 // типы из card-type schemas
  scrollPosition: number
  filter?: Record<string, unknown>
}
```

Всё, что есть у shell'а в памяти, — здесь. Никаких «тайных» переменных в компонентах.

## 2. Операции (actions)

Четыре канонических action'а:

| Action | Что делает | Где срабатывает |
|---|---|---|
| `focus.set(ref)` | Сменить фокус + push в stack | tap, deep-link, search-result |
| `focus.back()` | Pop stack → предыдущий focus | back-gesture, back-button |
| `focus.invert()` | Переключить `view: instance ⇄ type` для текущего focus | InversionButton |
| `focus.setMode(mode)` | Сменить `mode` текущего focus | ModeToggle |

Все остальные state-изменения — **derived**. Shell реагирует на action'ы пересчётом `panels[*]` через panel-providers card-type'а.

## 3. Жизненный цикл focus-switch (fractal)

```
user tap on search-result / panel-item / deep-link
  │
  ▼
Shell.dispatch(focus.set({kind, id, view, mode}))
  │
  ▼
state.stack.push(currentFocus); state.focus = new
state.panels = { loading:true } × 4
  │
  ▼
for each slot in [top,left,right,bottom]:
   cardTypeRegistry.lookup(kind)[view][slot]
     .prefetch(ctx) → panels[slot].data
   .component()     → rendered
  │
  ▼
Shell не размонтируется. Панели перерисовываются inline.
```

**Инвариант**: `<Shell />` root не размонтируется при focus-switch. Сменяются только панели (re-render). Acid-test T4.

## 4. Гарантии и ограничения

### G1. Idempotent actions

Повторный `focus.set(same)` — no-op. Detection: deep-equal по `{kind,id,view,mode}`.

### G2. Bounded stack

`stack.length ≤ 20`. При превышении — FIFO-drop с головы.
Повторные push одинаковых focus — schlissается (не дубликаты).

### G3. Preserve context on back

`focus.back()` восстанавливает не только focus, но и `panels[*].scrollPosition` и `filter`.
Хранятся в stack-entries.

### G4. Inversion без mount

`focus.invert()` не пушит в stack. Просто toggle `view` + re-render панелей.

### G5. Mode не меняет focus

`focus.setMode()` работает только если current card-type объявил `modes: [...]`. Не в stack.

### G6. Concurrent focus guard

Если focus.set() вызван во время loading предыдущего → предыдущий AbortController cancel, новый start.

## 5. Derivations — pure functions

```
derive.sectionsFor(state) = cardTypeRegistry[focus.kind][focus.view].sections(state.focus.id)
derive.actionsFor(state)  = applyPolicy(cardTypeRegistry[focus.kind][focus.view].actions, state.user, state.focus)
derive.timelineFor(state) = timelineEngine.ref(state.focus.id)
```

Derivation — **без побочных эффектов**. Отсюда — тестируемость.

## 6. Persistence между сессиями

Что сохраняется:

| Поле | Persistence | Source |
|---|---|---|
| `focus` | last-session (restore on re-open) | localStorage/Keychain |
| `stack` | **не** сохраняется (fresh на каждый старт) | — |
| `user`, `device` | из identity + OS | refetch on start |
| `panels[*].scrollPosition` | per-entity locally | SQLite/MMKV |
| `theme`, `dir`, locale | user-preferences | identity |
| `sync` | persistent outbox | SQLite/MMKV |
| `overlays` | очищаются при старте | — |

**Cold start restore**: пользователь вернулся — shell открывает last focus. Если offline — из local data. Acid-test T12.

## 7. Multi-tab / multi-device sync

### Web (tabs)

- `BroadcastChannel('daria-shell')` — tabs синхронизируют `focus` (опционально, по user-preference).
- По-умолчанию: tabs независимы; если user явно включает sync — tabs синхронизируются.

### Multi-device

- `focus` **не** синхронизируется между устройствами (разный контекст).
- `sync.lastAppliedEventId` — per-device.
- User-preferences (theme, locale, lang) — реплицируются через identity.

## 8. Deep-links

URL-схема shell'а:

```
https://daria.app/e/<kind>/<id>?view=<instance|type>&mode=<mode>
https://daria.app/e/car/v_12345                          # instance по умолчанию
https://daria.app/e/car/bmw_x5_2023?view=type
https://daria.app/e/course/react-mastery?view=type&mode=marketplace
https://daria.app/s/<search-query>                       # поиск
https://daria.app/c/<conversation-id>                    # прямой чат (fractal: focus становится conversation)
```

- Deep-link = `focus.set()`-action для начального state.
- URL отражает только `focus` (не stack), чтобы link был stable.
- Optional query-params: `?focus=section-shop` — auto-scroll к секции.
- Universal links: один и тот же URL ведёт на ту же страницу во всех платформах (mobile deep-link / desktop protocol handler / web-URL).

## 9. Panel-resolver lifecycle

Когда меняется focus, каждая панель проходит 4 фазы:

1. **Resolve**: по `(focus, slot)` → card-type → panel-provider.
2. **Prefetch**: data fetching (HTTP / SDK) + policy-check (`policy-engine.evaluate`).
3. **Render**: lazy `import()` компонента + hydration.
4. **Subscribe**: open WS / SSE для live-updates.

Unmount (при новом focus) → закрывает WS, отменяет fetch, сохраняет scroll.

## 10. Error boundaries

Каждая панель — своя error-boundary. Падение одной панели не валит shell:

- Top-panel упала → показывается «не удалось загрузить истории, попробуй позже» в footer.
- Center (CardView) упал → показывается recovery-state с retry + report-bug.
- Ошибка resolver'а (unknown card-type) → fallback на generic view + alert в SigNoz.

## 11. Overlays — временные слои

Модалы / bottom-sheets / toasts — отдельный stack `overlays`:

```ts
type OverlayStack = Array<{
  id: string
  kind: 'modal' | 'bottom-sheet' | 'toast' | 'confirm' | 'picker'
  content: OverlayContent
  dismissOn?: 'tap-outside' | 'explicit' | 'timeout'
}>
```

**Ограничения**:
- Overlays не меняют `focus`.
- Overlay над overlay ok (nested picker inside modal).
- `Escape` / back-gesture закрывает top-of-stack overlay, **не** focus.back().

## 12. Panel-contents — универсальный data-contract

Panel-provider возвращает `PanelPayload`:

```ts
type PanelPayload = {
  sections: Array<{
    kind: 'stream' | 'grid' | 'list' | 'chart'
    items: Item[]
    empty?: EmptyState
    loadMore?: Cursor
  }>
  header?: PanelHeader
  footer?: PanelFooter
}
```

Shell/ui-react рендерит payload через `<PanelStream>` (один код на все card-types, см. инвариант I20). Card-type не определяет рендер; только payload.

## 13. Observability для shell-state

Каждый action эмитит event в SigNoz:

```
shell.action{kind=focus.set, from=<kind>, to=<kind>, latency_ms, user}
shell.action{kind=focus.invert, ...}
shell.panel-resolved{slot=left, kind=car, view=instance, duration_ms, errorless=true}
```

Позволяет строить user-journey-maps и находить «дыры» (панели, которые медленно грузятся).

## 14. Testing

`packages/testing/shell-harness`:
- Unit-тесты reducer'а (actions → state transitions).
- Contract-тесты panel-resolver'а (card-type × slot × view = payload).
- Integration: открыть shell → 4 focus-switch'а → без errors → все панели hydrated.

Fractal-harness (I19) — отдельно, проверяет структуру UI. Shell-harness — поведение state machine.

## 15. Антипаттерны

- ❌ Компоненты имеют свой useState для "focus-related" данных — всё должно быть в shell-state.
- ❌ focus-switch с unmount'ом shell'а или layout'а.
- ❌ Push в stack без дедупликации.
- ❌ Mode как отдельная ось навигации (push в stack). Mode — view-property.
- ❌ Overlays, меняющие focus без явного `focus.set()`.
- ❌ Разные URL-схемы deep-link на разных платформах.
- ❌ Sync focus между устройствами автоматически (disable by default).
