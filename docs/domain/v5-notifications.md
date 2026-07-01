# Domain: v5-notifications

## Purpose

Studio-internal и client-facing notifications — email (project updates), in-app (new assignments), push (mobile, limited в v5).

## Entities (v5.3)

- `Notification` — record of sent.
- `NotificationTemplate` — email / in-app text.
- `NotificationSubscription` — who wants what.
- `NotificationPreference` — per-user channel preferences.
- `UnreadCounter` — in-app badge.

## Key operations

- Send notification (trigger from events).
- Mark as read.
- Manage preferences.
- Unsubscribe.

## Business rules

- Important (contract-signed) not unsubscribable.
- Per-channel preferences (email on/off, push on/off).
- Rate-limit per-user.

## Events

- `notification.sent`
- `notification.read`
- `notification.subscribed / unsubscribed`

## External dependencies

- `users` (addressee).
- All event-emitting services (triggers).
- Email provider.

## v5 → v6 migration

**Full replacement через `services/notifications` (Layer 2)**:

| v5 | v6 |
|---|---|
| Notification | delivery-log в notifications DB |
| NotificationTemplate | `platform/notification-templates/<type>/<lang>/<channel>.mjml` |
| NotificationSubscription | `user.preferences` в identity |
| NotificationPreference | per-category prefs (see `34-notifications-matrix.md`) |
| UnreadCounter | WS push updates → shell state |

### Key differences

- **YAML-defined rules** в `platform/notification-rules/*.yaml` (not code).
- **Multi-channel dispatcher** (push / email / SMS / in-app / webhooks / voice).
- **Dedup + batching + quiet-hours** (native).
- **Policy-engine filtering** per-region.
- **I18n templates** built-in.
- **Delivery receipts** (push click, email open, etc.).

### Phase

Phase 1 (basic) → Phase 2 (full matrix).

## Open questions

- Migration period: dual-send v5 and v6 comparing? (Not needed, no users.)
- External integrations (Slack / Telegram bots для studio admins) — Phase 5+.
