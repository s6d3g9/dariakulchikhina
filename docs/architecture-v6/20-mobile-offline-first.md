# 20. Mobile / Offline-First

Shell должен работать **как будто сеть — опциональная**. Пользователь открыл приложение в метро без интернета — он видит свои карточки, может листать, писать черновики, смотреть галереи, планировать timeline. Когда сеть появилась — всё синхронизировалось без диалогов.

Это не полная offline-mode (OLAP запросы, live-feeds, новые bookings — нужна сеть). Это **offline-graceful** — штатная деградация функциональности, не error state.

## 1. Инвариант (I11 повтор)

> **Отсутствие сети — штатное состояние, не ошибка. Пользователь никогда не видит `Network Error`; он видит «Синхронизируется» или «Локально — синхронизируется когда появится сеть».**

## 2. Local storage

Три хранилища на устройстве:

| Хранилище | Что | Стек |
|---|---|---|
| **SQLite** (WatermelonDB / op-sqlite) | Структурированные данные (карточки, timelines, entities) | mobile + desktop |
| **MMKV** (iOS/Android) | Key-value кэш, preferences, feature-flag результаты | mobile |
| **IndexedDB** (web) | Эквивалент SQLite на web | web |
| **File cache** (ExpoFileSystem / browser Cache API) | Медиа-превью, документы | all |

Данные per-user — в зашифрованном shard'е (DEK в secure-enclave / Keychain / WebCrypto).

## 3. Sync protocol (архитектурно)

**Event-sourced sync, eventually consistent.**

Устройство держит локальный log своих изменений (outbox) + reads-model (projections-локальные таблицы). Сервер держит полный JetStream stream'ов, плюс server-side projections.

```
Device outbox (pending)  ──────┐
                                 ▼
                           [ gateway ]
                                 ▼
                      HTTP POST /sync/push (idempotent)
                                 ▼
                       NATS JetStream (durable)
                                 │
                     ──── server projections ───
                                 │
                     consumer: device-sync-service
                                 ▼
                      SSE / WebSocket: /sync/pull
                                 ▼
                       Device applies deltas
                      (CRDT-merge for conflicts)
```

**Ключевые свойства:**
- **Outbox idempotent** — re-push не создаёт дубликатов (UUID v7 + Idempotency-Key).
- **Pull incremental** — cursor по lastAppliedEventId, никогда full-refresh.
- **Device-local events** получают `origin: device` tag; сервер применяет ту же логику, что и свои мутации.
- **Sync channel per-user** — приватный, ticket-based auth.

## 4. Conflict resolution

Не все конфликты одинаковы:

### (a) No conflict — simple append
Новое сообщение в чат, новый пост в feed, новый лайк. Серверный port сохраняет ordering, каждое событие — immutable.

### (b) Last-write-wins (LWW)
Настройки, preferences, профиль. У события есть logical clock (hybrid-logical-clock, HLC). Побеждает позднее.

### (c) CRDT-merge
Коллаборативные документы (если появятся), списки-подписки, черновик пост с мультиустройств. `@automerge/automerge` или `Yjs`.

### (d) OCC (optimistic concurrency)
Финансовые / booking / ownership мутации. У сущности `version`; клиент при push указывает expected version. Mismatch → 409, клиент повторяет merge с актуальной версией или эскалирует в диалог «твой черновик устарел».

### (e) Human-arbitration
Несовместимые правки (два человека забронировали последнее место, два пользователя отредактировали документ так, что CRDT не справляется) → помечается на устройстве как `conflict`, пользователь решает через UI.

Card-type декларирует **sync-strategy** для каждого поля/entity в `entity-provider.ts`:

```ts
export const syncStrategy: SyncStrategy = {
  'entity.car.maintenance.note': { policy: 'lww' },
  'entity.car.mileage': { policy: 'occ', server: 'authoritative' },
  'timeline.step.evidence': { policy: 'append-only' },
  'wallet.transfer': { policy: 'server-only' },   // offline-forbid
}
```

## 5. Offline-forbidden actions

Некоторые действия **не могут** быть выполнены offline:

- Wallet transfers (financial integrity).
- Bookings с ограниченным inventory.
- KYC уплод документов.
- Identity-mutations (пароль, email).
- Purchase / auction bids.

Для них UI показывает disabled-state CTA + tooltip «требуется соединение». Никогда не show-как-if-succeeded с потенциальным откатом.

## 6. Optimistic UI (для разрешённых)

Для небольшой доли действий (like, follow, post-draft, timeline-step-note) UI применяет изменение **немедленно** и кладёт в outbox. Сервер подтверждает асинхронно. При rejection — откат с mini-toast «что-то не вышло».

Реализация — через `packages/shell-core/optimistic-store`.

## 7. Media offline

- Просмотренные фото/видео кешируются на диск (LRU, quota per-app).
- Пользователь может **явно** пометить карточку «доступна offline» → скачиваются все связанные медиа.
- Thumbnails — всегда кешируются.
- Видео — только `manifest + first segment` по умолчанию; full download — по явному действию.
- Encrypted media — ключ уезжает в Keychain, не в localStorage.

## 8. Sync UI affordances

- Persistent sync-indicator в shell-header (синхронизируется / done / error + retry).
- Per-entity sync-state badge (локально / синхронизировано / конфликт).
- Offline-banner при потере сети (auto-dismiss при восстановлении).
- Outbox queue viewer в settings (пользователь видит, что зависло).

## 9. Mobile специфика

- **Background sync** (iOS BGAppRefreshTask, Android WorkManager) — раз в 30 мин, если в outbox есть что-то или pull accumulated.
- **Push-to-sync** — silent push с `trigger: sync-now` от сервера для срочных обновлений (chat-message, booking-confirmation).
- **Battery-awareness**: в low-power — реже, только критичное.
- **Network-aware**: на cellular — только thumbs + text; WiFi — тащим медиа.

## 10. Desktop специфика (Tauri)

- Полноценный background sync без OS-ограничений.
- Используется как primary — всё приложение доступно полностью offline.
- Отдельное место для «большого» медиа-кэша.

## 11. Web специфика

- Service Worker + IndexedDB + Cache API.
- **PWA**-совместимость (Next.js `next-pwa`).
- Background Sync API (ограниченно) для outbox flush.
- Ограничения IndexedDB quota — активная eviction старых данных.

## 12. Security в offline-режиме

- Локальная БД зашифрована; ключ — в secure-enclave.
- Приложение в lock-state → ключи zeroed, БД недоступна без био/pin.
- Session JWT на устройстве — max 24h; после — re-login required.
- Audit-log: offline-действия получают `offline: true` флаг, подтверждение сервером фиксируется двумя отдельными audit-записями.

## 13. Fractal-UX и offline

Грамматика из `17-fractal-ux.md` остаётся неизменной. Offline-состояние — это:

- Не отдельный экран, а **status-badge** в HEADER CardView.
- Не блокировка жестов, а `distill` некоторых actions.
- Не «диалог ошибки», а inline-секция «синхронизация».

Offline — это Mode-подобное состояние, не отдельная UI-ветка.

## 14. Sync protocol — message format

Все sync-сообщения используют единый envelope:

```json
{
  "syncVersion": "1.0",
  "deviceId": "dev_abc123",
  "userId": "u_xyz456",
  "sentAt": "2026-05-10T12:00:00.123Z",
  "payload": { /* ... see below */ }
}
```

### Push (device → server)

Outbox flush. Device отправляет batch изменений:

```json
{
  "syncVersion": "1.0",
  "deviceId": "dev_abc123",
  "userId": "u_xyz456",
  "sentAt": "2026-05-10T12:00:00.123Z",
  "payload": {
    "type": "push",
    "operations": [
      {
        "opId": "op_uuid_v7_1",
        "origin": "device",
        "idempotencyKey": "user-note-car-maintenance-{carId}-{timestamp}",
        "target": { "entity": "car:v_123", "field": "maintenance.notes" },
        "operation": "append",
        "value": "Changed oil 2026-05-10",
        "hlc": "2026-05-10T12:00:00.123Z-dev_abc123-0001",
        "expectedVersion": 42
      },
      {
        "opId": "op_uuid_v7_2",
        "origin": "device",
        "idempotencyKey": "post-draft-{userId}-{timestamp}",
        "target": { "entity": "post:new", "field": "*" },
        "operation": "create",
        "value": { "kind": "text", "content": "..." },
        "hlc": "2026-05-10T12:00:01.456Z-dev_abc123-0002"
      }
    ]
  }
}
```

Server response:

```json
{
  "syncVersion": "1.0",
  "ack": [
    { "opId": "op_uuid_v7_1", "status": "applied", "newVersion": 43 },
    { "opId": "op_uuid_v7_2", "status": "applied", "serverId": "post_xyz" }
  ],
  "conflicts": []
}
```

Или если conflict:

```json
{
  "ack": [
    { "opId": "op_uuid_v7_1", "status": "conflict", "currentVersion": 45, "serverValue": "..." }
  ]
}
```

Device обрабатывает: CRDT-merge / LWW / human-arbitrate.

### Pull (server → device)

Incremental через SSE / WS:

```json
{
  "syncVersion": "1.0",
  "payload": {
    "type": "pull",
    "cursor": { "lastAppliedEventId": "evt_12345" },
    "events": [
      {
        "eventId": "evt_12346",
        "at": "2026-05-10T12:05:00Z",
        "source": "/services/feed",
        "operation": "create",
        "target": { "entity": "post:xyz_789" },
        "value": { /* ... */ }
      },
      {
        "eventId": "evt_12347",
        "at": "2026-05-10T12:06:00Z",
        "source": "/services/wallet",
        "operation": "update",
        "target": { "entity": "wallet:u_xyz456", "field": "balance" },
        "value": { "currency": "USD", "amount": 1250.50 }
      }
    ]
  }
}
```

### Heartbeat (liveness)

Every 30s if no other traffic:

```json
{
  "syncVersion": "1.0",
  "deviceId": "dev_abc123",
  "payload": { "type": "heartbeat", "outboxSize": 3 }
}
```

### Resync (cold-start / corruption)

Device requests full state:

```json
{
  "payload": {
    "type": "resync",
    "reason": "cold-start" | "corruption" | "user-triggered",
    "scope": ["my-entities", "subscriptions", "active-timelines"]
  }
}
```

Server responds batch (paginated for large users).

## 15. Conflict resolution — concrete examples

### Example 1: LWW (last-write-wins)

Setting: user-preferences timezone.

```
Device A (T=100): setTimezone("Europe/Moscow")  HLC: 100-A-01
Device B (T=101): setTimezone("America/NY")     HLC: 101-B-01

Server receives both. HLC comparison: 101-B-01 > 100-A-01.
Winner: Device B's value.

Device A on pull receives: timezone=America/NY, version=2.
Device A's value discarded без UI (silent).
```

### Example 2: OCC (optimistic concurrency)

Setting: wallet.balance (non-overlapping mutations require server check).

```
Device A (T=100, version=42): subtract 50 (buy subscription)
Device B (T=100, version=42): subtract 30 (buy coffee)

Server applies A first: balance=950, version=43.
Server receives B с expectedVersion=42 → mismatch.

Response to Device B: conflict, currentVersion=43, actualBalance=950.

Device B retries с version=43: applies subtract 30, final balance=920.
Both ops succeeded но sequentially.
```

### Example 3: Append-only (no conflict possible)

Setting: timeline step evidence.

```
Device A adds evidence {photo1}
Device B adds evidence {photo2}

Server applies both (append-only). No conflict.
All evidence visible.
```

### Example 4: CRDT merge

Setting: draft post (two devices editing).

```
Device A edits text: "Hello world, I went..."
Device B edits text: "Hello world. It was..."

Server does CRDT merge (Automerge / Yjs).
Result: "Hello world, I went / It was..."
(CRDT preserves both; user sees merged result with diff markers).

User can finalize.
```

### Example 5: Human arbitration

Setting: two devices booked last room.

```
Device A: book slot_XYZ (time=100)
Device B: book slot_XYZ (time=100)

Server booking primitive: OCC check → first wins.
Device A gets ACK.
Device B gets conflict.

Device B UI: «This slot was taken. Choose alternative: [Similar slots] or [Cancel]».
User decides.
```

## 16. Storage quotas per-platform

| Platform | SQLite quota | MMKV / KV | Media cache | Total budget |
|---|---|---|---|---|
| iOS (Expo) | Unlimited* | ~10MB practical | Per-app quota | Managed by iOS |
| Android (Expo) | Unlimited* | ~10MB practical | User-expandable | Managed by Android |
| Web (IndexedDB) | 50% of free disk (quota) | — | Cache API (separate) | ~1-10GB typical |
| Desktop (Tauri) | Unlimited | — | File system access | ~10GB recommended |

*Unlimited ≠ performant. Keep индивидуальный user state < 200MB для production-quality UX.

### Eviction policy

LRU-based (least-recently-used):
- **Hot**: last-opened 7d, keep always.
- **Warm**: last-opened 7-30d, evict under pressure.
- **Cold**: > 30d, auto-evict.

User can manually pin entities «для offline».

## 17. Background sync lifecycle

### iOS

```
User opens app → foreground-sync runs.
User backgrounds app → sync stops.
iOS may trigger BGAppRefreshTask (every ~30 min if allowed).
  ↓
App wakes briefly (30 sec budget):
  - Drain outbox.
  - Pull pending events (max 50).
  - Update local state.
  - Suspend.
```

### Android

```
WorkManager задача (Coroutine Worker) scheduled каждые 30 min.
  ↓
Expedited work в critical cases (push-to-sync trigger).
  ↓
Same flow: drain outbox, pull events, update.
```

### Web (PWA)

```
Service Worker + Background Sync API (limited browser support).
  ↓
Alternatively: sync on Visibility change (tab-focus).
  ↓
Push Notifications могут also trigger sync.
```

### Desktop (Tauri)

```
Full background mode — sync runs continuously.
Native process survives app-minimize.
Better offline experience.
```

## 18. Антипаттерны

- ❌ Показывать `Network Error` → пользователь не понимает, что делать.
- ❌ Полная перезагрузка данных при каждом sync (только inкриментальный).
- ❌ Хранить credentials в plain-text даже в local DB.
- ❌ Блокировать UI пока идёт sync — всё асинхронно.
- ❌ Использовать HTTP polling для sync — только SSE / WS / push.
- ❌ Разные sync-стратегии на iOS vs Android vs web — один протокол.
- ❌ «Локальные» изменения, которые сервер не видит (всё, что меняется, — через outbox).
- ❌ Позволять offline wallet / booking / KYC.
