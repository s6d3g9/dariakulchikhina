# 34. Notifications Matrix

Уведомления в v6 — централизованные через `services/notifications`. Один сервис, одна модель, одни правила. Этот документ фиксирует: какие события триггерят какие каналы, с какими приоритетами, с какими quiet-hours, как избежать spam'а.

## 1. Принципы

- **Один сервис** `notifications` (Layer 2). Сервисы публикуют events → consumer'ы notifications маршрутизируют.
- **Декларативные правила** per-event-type (не хардкод в каждом сервисе).
- **User-preferences** переопределяют defaults.
- **Policy-engine** может снижать / блокировать (quiet-hours, jurisdiction).
- **Fractal delivery**: in-app — это тот же feed / messenger entity-thread, не отдельная shell-область.

## 2. Каналы

| Channel | Urgency | Стоимость | Reach | Типичные use-cases |
|---|---|---|---|---|
| **push** | immediate | ~0 | mobile+desktop only | Message, payment, booking-alert |
| **in-app** | instant | 0 | shell open | Все interactive события |
| **email** | slow | low | everyone | Receipts, digests, account changes |
| **sms** | immediate | high | everyone | Critical auth, fraud alert |
| **voice-call** | immediate | very high | everyone | Ultimate fallback (banking fraud, crypto-theft) |
| **webhooks** | instant | 0 | dev integrations | Provider-side (внешние интеграции) |

## 3. Severity matrix

| Severity | Каналы (default) | Rate-limit | Quiet-hours respect |
|---|---|---|---|
| **critical** (fraud, auth-breach, banking SEV-1) | push + sms + email + in-app | none | **no** (override quiet) |
| **high** (payment, booking-fail, moderation action) | push + email + in-app | 5/hour | respect |
| **medium** (message, DM, comment-reply) | push + in-app | 20/hour | respect |
| **low** (like, follow, feed-item) | in-app only (digest email daily) | silent-push | respect |
| **info** (tips, tutorials, platform-news) | email digest weekly | 1/week | respect |

## 4. User-preferences

User может настроить per-category per-channel:

```
Notifications preferences:
  Messages
    DM:                push [on] / email [off] / sms [off]
    Entity-thread:     push [on] / email [digest-daily]
    Community:         in-app only
  Financial
    Payment receipt:   push [on] / email [on]
    Low balance:       push [on] / sms [on]
    Fraud alert:       [critical] — не отключается
  Subscriptions
    Renewal reminder:  push [3-days-before]
    Trial ending:      push + email
  Bookings
    Confirmation:      push + email
    Check-in reminder: push [24-hours-before]
  Social
    New follower:      in-app only
    Reaction:          off
  Platform
    Policy updates:    email required (legal)
    Tips & tutorials:  email [weekly] / [off]
```

Defaults — в таблице §3. User-preferences — overrides. Critical — **не отключаемо** (legal/security).

## 5. Event-to-notification mapping

Декларативные правила в `platform/notification-rules/*.yaml`:

```yaml
# platform/notification-rules/wallet.yaml
- event: app.daria.wallet.transfer-completed.v1
  severity: high
  title.i18n_key: wallet.notifications.transfer-completed
  body.template: "{{ amount }} {{ currency }} sent to {{ recipient.name }}"
  channels: [push, in-app]
  addresseeExpr: event.subject.userId
  deduplicationKey: "{{ event.id }}"

- event: app.daria.wallet.charge-failed.v1
  severity: critical
  title.i18n_key: wallet.notifications.charge-failed-critical
  body.template: "Charge of {{ amount }} {{ currency }} failed — action needed"
  channels: [push, sms, email, in-app]
  addresseeExpr: event.subject.userId
```

```yaml
# platform/notification-rules/subscription.yaml
- event: app.daria.subscription.trial-ending.v1
  when: "trial.daysRemaining == 3"
  severity: medium
  channels: [push, email]

- event: app.daria.subscription.renewed.v1
  severity: low
  channels: [in-app]
  # email получается в weekly digest
```

```yaml
# platform/notification-rules/messenger.yaml
- event: app.daria.messenger.message-sent.v1
  when: "not sender.isSelf AND conversation.participants has receiver"
  severity: medium
  channels: [push, in-app]
  addresseeExpr: event.subject.participants (excluding sender)
  # Default — пригашается, если receiver has mutedConversation
```

Преимущество: новый notification — просто new YAML + deploy. Никакого кода сервиса.

## 6. Quiet hours

Policy-engine определяет:

```yaml
# platform/law-profiles/RU.yaml
notifications:
  quietHours:
    default: { from: "22:00", to: "08:00" }
    override:
      - severity: critical   # critical игнорирует quiet
  weekendRules:
    sunday: { from: "22:00", to: "10:00" }    # отжим до 10 утра в воскресенье
```

```yaml
# platform/law-profiles/IL.yaml
notifications:
  shabbat: { from: "friday-18:00", to: "saturday-21:00" }     # special
```

User может override (wider / narrower).

## 7. Deduplication

Каждое notification имеет `deduplicationKey`:

- Same key + addressee + 5 min window → skip.
- Применяется к burst'ам (1000 likes на пост — ONE notification с количеством, не 1000).

Для batching (likes/reactions aggregating):

```yaml
- event: app.daria.feed.reaction-added.v1
  severity: low
  batching:
    window: 5m
    template: "{{ count }} people reacted to your post"
```

## 8. Digest

Для low-severity + user-pref='digest':

- Daily digest — 1 email/push в назначенное время (9:00 user-tz default).
- Weekly digest — воскресенье 10:00.
- Content: summary, top items, CTA открыть app.

Digest-assembly — cron Temporal workflow, pulls events за period.

## 9. Delivery guarantees

- **In-app**: best-effort (WS → stored if WS offline → delivered on reconnect).
- **Push**: best-effort (FCM/APNs — не гарантирует 100%).
- **Email**: at-least-once (queue + retries).
- **SMS**: at-least-once (PSP retries + manual fallback).

Для critical — multi-channel redundancy (push + email + sms — если один упал, другие доходят).

## 10. Delivery receipt

- Push: delivery confirmed / clicked через FCM/APNs callbacks.
- In-app: receipt при рендере (WS ack).
- Email: open-tracking (if allowed), click-tracking.
- SMS: delivery receipt от провайдера.

Метрики:
- `notifications.delivery.success_rate{channel}`
- `notifications.click_rate{category,channel}`
- `notifications.unsubscribe_rate{category}`

## 11. Unsubscribe / preferences flow

- Каждое email имеет `unsubscribe` link (legal в EU/US).
- Unsubscribe — per-category, не global (если global — теряем важные).
- UI: settings → notifications → per-channel per-category toggles (см. §4).

## 12. Spam prevention

- **Rate-limit per-user**: no more than X/hour in category (см. §3).
- **Burst detection**: if user суddenly gets 50+ notifications in 5 min — throttle, auto-digest.
- **Deliverability**: email sender reputation monitored, problem addresses → suspended.
- **SMS cost control**: critical-only unless user opted-in to more.

## 13. Internationalization

- Templates в `platform/notification-templates/<category>/<lang>/<channel>.mjml` (or plain text).
- Language detected от `user.locale`.
- Fallback: user-lang → region-default → English.
- Tokens в templates (Mustache-like): `{{ amount }}`, `{{ recipient.name }}`, etc.
- Числа / даты — через Intl на рендер (`25-internationalization.md`).

## 14. Architecture

```
Event (JetStream)
       │
       ▼
 [notification-rules matcher]    ← YAML configs
       │
       ▼
   [hydrator]                    ← resolves i18n, params, addressee
       │
       ▼
  [user-preferences filter]
       │
       ▼
  [policy-engine filter]         ← quiet-hours, region-specific
       │
       ▼
  [dedup + batch]
       │
       ▼
  [channel-dispatcher]
      ├── push  → FCM/APNs
      ├── email → Sendgrid/SES
      ├── sms   → Twilio/Мегафон
      ├── in-app → WS / store for later
      └── voice → Twilio (rare)
       │
       ▼
  [delivery receipts] → SigNoz metrics
       │
       ▼
  [audit-log]                     (medium/high/critical)
```

## 15. Special cases

### Fraud alert (banking)

Multi-channel + явный user-response required:
- push + sms + email + voice-call одновременно.
- Response needed: «я», «не я».
- Timeout (без ответа) → блок карты, уведомление compliance.

### Crypto-theft

- Max-severity.
- Channel redundancy.
- Voice-call to registered phone.
- Compliance-team notified.

### Identity / KYC

- High severity (account changes — password, email, 2FA).
- Multi-channel (email + sms).
- Delay 24h для reversal (если user сам сменил и не хочет — click undo).

### Birthday / anniversary (social)

- Low severity, opt-in only.
- Digest-friendly.
- Pre-composed from user-data (no LLM в real-time).

## 16. Антипаттерны

- ❌ Сервис отправляет push напрямую через FCM (обходя notifications).
- ❌ Hardcoded notification text в сервисе.
- ❌ Не-dedup'нутый burst уведомлений.
- ❌ Quiet-hours ignored для всего.
- ❌ Blanket unsubscribe, убирающий legal emails.
- ❌ SMS как default для low-severity (cost explode).
- ❌ Критичные уведомления только one-channel — нет redundancy.
- ❌ Digest без unsubscribe-option.
