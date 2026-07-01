# 22. Messaging Model

Messenger в v6 — **не отдельная вертикаль**. Это горизонтальный примитив, как `booking` или `wallet`. Чаты существуют **per-entity**: «чат про мою машину», «чат сообщества BMW X5», «чат с продавцом квартиры», «чат команды проекта-ремонта». Один и тот же messenger, параметризованный контекстом.

Следствие фрактальности (инвариант I19): right-panel в shell — **всегда** чат-контекст текущей entity. Не «мои чаты вообще», а «чат про ту сущность, что сейчас в центре».

## 1. Четыре типа conversation

| Kind | Участники | Контекст entity | Пример |
|---|---|---|---|
| `dm` | 2 user'а | опционально (entity может быть фокусом) | Алиса ↔ Боб |
| `group` | N user'ов, closed | опционально | Команда ремонта квартиры |
| `entity-thread` | привязан к instance-entity | **обязательно** | «Мой BMW X5»: я + СТО + страховая + водитель |
| `community` | открытая, привязан к type-entity | **обязательно** | «BMW X5 владельцы»: все желающие |

Все четыре — **одна и та же сущность** `Conversation` с разными параметрами.

## 2. Модель Conversation

```ts
interface Conversation {
  id: string
  kind: 'dm' | 'group' | 'entity-thread' | 'community'

  // Контекст (fractal — как у любой Pattern-Card)
  context?: {
    entity: { kind: string, id: string, view: 'instance' | 'type' }
    // "entity-thread" привязан к instance, "community" к type
  }

  // Участники
  members: ConversationMember[]
  joinPolicy: 'invite-only' | 'request' | 'open'   // для community чаще 'open'

  // Визуальный контекст
  title?: string
  avatar?: string
  // Если context есть — title/avatar наследуются от entity

  // Состояние
  version: number
  lastMessageAt: Date
  deleted_at?: Date

  // Права
  permissions: ConversationPermissions   // кто может писать, приглашать, менять

  // Modération
  moderationLevel: 'none' | 'light' | 'strict'    // community — strict
  tags: string[]
}
```

## 3. Right-panel resolver

Shell показывает в right-panel **список Conversations, контекст которых совпадает с текущим entity**:

```
Открыл свою машину (entity=car:v_123, view=instance):
  Right-panel = Conversations где context.entity = {car, v_123}
  - entity-thread с СТО
  - entity-thread с страховой
  - group «моя семья + Рекс (мы делим машину)»

Инверсия ⇄ (view=type, entity=model:bmw_x5_2023):
  Right-panel = Conversations где context.entity = {bmw_x5_2023 model}
  - community «BMW X5 владельцы»
  - community «BMW X5 Москва»
  - group «приватный чат владельцев» (если приглашён)
```

Это **один и тот же код** что для машины, что для квартиры, что для курса, что для питомца. Меняется только `entity` в query.

## 4. Сервис messenger

`services/messenger` (Layer 3) — унифицированный бэкенд для всех 4 kind. На старте — **перенос существующего `messenger/core`** с расширением API.

### Что делает

- Хранит conversations + members + messages (Postgres `messenger_db`).
- Ticket-based WS auth (Zitadel выдаёт ticket, messenger потребляет из Redis).
- Cursor pagination (инвариант I9).
- Presence / typing через Redis Pub/Sub (ephemeral, не JetStream).
- Durable events через JetStream (новое сообщение, изменение состава, удаление).
- Интеграция с `moderation-ml` + `moderation-review` (инвариант I18).
- Интеграция с `policy-engine` (visibility, age-gates для community).

### API-расширение под entity-контекст

```
POST   /conversations                          { kind, context?, members, ... }
GET    /conversations?context.entity=car:v_123 # resolver для right-panel
GET    /conversations/:id/messages?cursor=...
POST   /conversations/:id/messages
POST   /conversations/:id/members
DELETE /conversations/:id/members/:userId

# community-специфичное
GET    /communities?entity=type:bmw_x5_2023    # discover
POST   /communities/:id/join                   # open / request

# presence/typing (WS/Redis)
WS /conversations/:id/stream
```

## 5. Entity-thread creation flow

Как пользователь создаёт «чат про свою машину»:

1. Открыл карточку машины → right-panel видит «нет чатов».
2. CTA в PanelFooter «Начать чат» (тот же Action-primitive, что везде).
3. Выбирает kind: `entity-thread` (по умолчанию) / `group` / `dm`.
4. Добавляет participants (суggest: СТО по геолокации, страховая из profile, семья из saved contacts).
5. Messenger создаёт Conversation с `context={car, v_123}`.
6. Right-panel перерисовывается — новый entity-thread появляется.

Никакого отдельного экрана «создать чат в разделе машин». Всё — в существующей грамматике панелей.

## 6. Community flow

- Community привязан к **type** (модель машины, порода собаки, ЖК, курс).
- При открытии type-view entity — right-panel показывает доступные communities.
- Пользователь видит список, join-поликс, участников.
- Join → автоматический subscriber для уведомлений о сообщениях по дефолтным правилам (mute-able).
- Community может иметь модераторов (роль, связанная с authorship для владельцев type — автор template-а курса модерирует community своего курса).

## 7. Messages и fractal anatomy

Сообщение — тот же `Item` из фрактальной грамматики (см. `17-fractal-ux.md` §2):

- **Identity** — отправитель (avatar + name + role-badge).
- **Status** — отправлено / доставлено / прочитано / отредактировано.
- **Timeline** — timestamp (часть item'а).
- **Stream** — вложенные media / quote / reply-to.
- **Actions** — reply / react / forward / report (тот же ActionBar).
- **Evidence** — файлы, ссылки на Pattern-Card (система может вложить карточку в сообщение).
- **Inversion** — не применимо к сообщению (оно атомарно).

## 8. Вложение Pattern-Card в сообщение

Уникальная для v6 фича: любой message может содержать **ссылку на Pattern-Card**, которая рендерится inline как мини-превью:

```
«Смотри какой маршрут нашёл: [📍 Стамбул-3дня by Алиса ★4.8 Royalty-Fork]»
```

Тап по вложению → switch в shell-центре на эту Pattern-Card (фрактально — тот же profile-switch из `16-search-and-navigation.md`).

## 9. Moderation per-conversation-kind

| Kind | Moderation level | Примеры правил |
|---|---|---|
| `dm` | none (+ recipient blocks) | recipient может блокировать, отчёт формирует case |
| `group` | light | spam, harmful, CSAM — ML + reports |
| `entity-thread` | light | то же + policy-engine правила по context entity |
| `community` | strict | ML + human-review на первые-N сообщений нового участника |

Policy-engine определяет, может ли пользователь писать / читать / создавать (KYC level, age, regional law).

## 10. E2EE для чувствительных conversations

Унаследовано из v5.3 `services/communications-service`:
- DM и приватные group'ы — E2EE по умолчанию (X3DH + double ratchet).
- Entity-thread и community — **не E2EE** (moderation должна видеть).
- Вызовы / WebRTC — всегда E2EE через communications-service.

Пользователь видит badge «🔒 E2EE» в HEADER conversation.

## 11. Уведомления (связь с notifications-service)

Messenger публикует события в JetStream, `services/notifications` ловит и маршрутизирует:

- Push (FCM/APNs) — для mobile.
- Email / SMS — для fallback.
- In-app — через WS.

Приоритет и частота — user-preferences + `policy-engine` (некоторые регионы запрещают push ночью, quiet-hours).

## 12. Messenger-data в data-architecture

- Postgres `messenger_db`:
  - `conversations`, `conversation_members`, `messages`, `message_attachments`, `blocks`, `reports`
- Redis: presence, typing, ws-tickets, rate-limits.
- S3: media-attachments (through `media-pipeline`).
- JetStream: `app.daria.messenger.*` durable events.
- Нет кросс-сервисного JOIN (инвариант I6).

## 13. Интеграции

- **Publishes**:
  - `app.daria.messenger.conversation-created.v1`
  - `app.daria.messenger.message-sent.v1`
  - `app.daria.messenger.member-joined.v1`
  - `app.daria.messenger.member-left.v1`
  - `app.daria.messenger.message-redacted.v1`
- **Consumes**:
  - `app.daria.governance.policy-evaluated.v1` — для community-visibility
  - `app.daria.moderation.ruling.v1` — для редактирования/удаления
- **Calls**:
  - `identity.verifyUser` при join
  - `policy-engine.evaluate` при создании community

## 14. Фрактальность messenger (I19+)

- Conversation — использует тот же `CardView` с 6 секциями (при полном открытии).
- Message — тот же `Item`.
- Right-panel со списком чатов — тот же `PanelView` с 3 секциями.
- Жесты — те же 6 канонических.
- Создание чата — через `ActionBar` в PanelFooter, не отдельный flow.

## 15. Антипаттерны

- ❌ Отдельный «messenger-app» с своим shell'ом. Messenger — это панель и API, не приложение.
- ❌ Chat без context привязки к entity, когда entity logically нужна.
- ❌ Скрытые чаты (не видны в resolver'е) для бизнес-логики — используй events + messaging правильно.
- ❌ Уникальный UI для «чата про машину» vs «чата про квартиру».
- ❌ Прямой доступ messenger к чужим БД (booking, wallet) — только через events или API.
