# services/messenger

Layer 3 — Domain Primitive. Унифицированный real-time messaging: 4 kinds (dm / group / entity-thread / community).

См. полную спеку: [docs/architecture-v6/22-messaging-model.md](../../docs/architecture-v6/22-messaging-model.md).

## Статус

**Migrating-in-from** `messenger/core` (v5.3 legacy directory). Phase 2 — перенос с обновлением API под entity-context.

`services/communications-service/` (E2EE WebRTC signaling) остаётся отдельным сервисом.

## Что делает

- Conversations 4 kinds (`dm / group / entity-thread / community`).
- Messages (text / media / pattern-card-ref / system).
- WS-ticket auth (через Zitadel).
- Cursor pagination (I9).
- Presence / typing через Redis Pub/Sub (ephemeral).
- Durable events в JetStream.
- E2EE для DM / private-group, plain-text (moderation-accessible) для entity-thread / community.

## Рантайм

- TypeScript (Nitro).
- Postgres `messenger_db`: conversations, conversation_members, messages, message_attachments, blocks, reports.
- Redis: presence, typing, ws-tickets (from identity), rate-limits.
- S3 через `media-pipeline` для attachments.

## API (skeleton)

```
POST   /conversations                             # создать {kind, context?, members}
GET    /conversations?context.entity=car:v_123   # resolver для right-panel
GET    /conversations/:id/messages?cursor=...     # cursor pagination
POST   /conversations/:id/messages
POST   /conversations/:id/members
DELETE /conversations/:id/members/:userId
GET    /communities?entity=type:bmw_x5_2023      # discover
POST   /communities/:id/join

WS /conversations/:id/stream                      # real-time (requires ws-ticket)
```

## Integrations

- **Publishes**: `conversation-created/member-joined/member-left`, `message-sent/redacted`.
- **Consumes**: `governance.policy-evaluated` (community-visibility), `moderation.ruling` (redact).
- **Calls**: `identity.verifyUser` при join, `policy-engine.evaluate` при community create, `media-pipeline.getUrl` для attachments.

## Инварианты

- I4, I6, I9 (cursor), I11 (offline-first resilient).
- WS-ticket одноразовый (GETDEL atomic).
- E2EE — для DM / private-group only (moderation invariant).

## Фаза

Фаза 2 (migration из `messenger/core`).
