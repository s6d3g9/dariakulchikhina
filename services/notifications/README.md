# services/notifications

Layer 2 — Platform Service. Единый сервис доставки notifications через все channels (push / email / sms / in-app / webhook).

См. полную matrix: [docs/architecture-v6/34-notifications-matrix.md](../../docs/architecture-v6/34-notifications-matrix.md).

## Что делает

- Consumer events из JetStream.
- Matching rules from `platform/notification-rules/*.yaml`.
- Template rendering (MJML / text) per-language.
- User-preferences filtering.
- Policy-engine filtering (quiet hours, region).
- Deduplication + batching.
- Channel dispatch:
  - Push (FCM/APNs)
  - Email (Sendgrid / SES / self-hosted)
  - SMS (Twilio / Мегафон / Beeline)
  - Voice (Twilio rare)
  - In-app (WS push)
  - Webhooks (для third-party integrations)
- Delivery receipts + metrics.

## Не делает

- Не бизнес-логика (не решает что должно послаться).
- Не хранение сообщений (только delivery log).

## Рантайм

- TypeScript, Nitro.
- Postgres `notifications_db`:
  - `delivery_log` — all attempts
  - `user_preferences` — per-user per-category toggles
  - `templates` — rendered cache
  - `suppressions` — bouncing emails, opt-outs

## Архитектура

```
Event (JetStream)
     │
     ▼
Rules matcher (loads YAML)
     │
     ▼
Hydrator (i18n + params)
     │
     ▼
User-preferences filter
     │
     ▼
Policy-engine filter (quiet hours, region)
     │
     ▼
Dedup + batch
     │
     ▼
Channel dispatcher:
   ├── FCM (Android push)
   ├── APNs (iOS push)
   ├── Web Push (browsers)
   ├── SES / Sendgrid (email)
   ├── Twilio / ЮKassa SMS (SMS)
   ├── Twilio Voice (voice)
   └── WS / SSE (in-app)
     │
     ▼
Delivery receipt → metrics
     │
     ▼
audit-log (medium/high/critical severity)
```

## API

```
# Management
GET    /users/:id/notifications/preferences
PUT    /users/:id/notifications/preferences
GET    /users/:id/notifications/history
POST   /notifications/unsubscribe                 # from email link
POST   /notifications/suppressions                 # manual opt-out

# Internal (for other services to trigger direct — rare, prefer events)
POST   /send                                        # { userId, template, params, channels }

# Webhooks (PSP-style)
POST   /webhook/push-receipt/:provider
POST   /webhook/email-bounce/:provider
```

## Дедупликация

Per-event `deduplicationKey`. Same key + addressee + 5min → skip.

## Batching (likes, reactions)

Reactions-event → batcher → 1 notification / 5 min с count.

## Rate-limits per-user per-category

- Critical: unlimited
- High: 5/hour
- Medium: 20/hour
- Low: bundled в digest

## Integrations

- **Publishes**:
  - `app.daria.notifications.sent.v1`
  - `app.daria.notifications.delivery-failed.v1`
  - `app.daria.notifications.clicked.v1`
- **Consumes**:
  - Любые domain-events (applies rules to them)
- **Calls**:
  - `policy-engine.evaluate` (quiet hours)
  - External PSPs (FCM, SES, Twilio, etc.)

## Инварианты

- I4, I6 (own DB)
- Rules — YAML, не код (I19 for operations fractality)
- Все notifications > low-severity — в audit

## Фаза

Фаза 1 (platform core).

## Статус

Skeleton only.
