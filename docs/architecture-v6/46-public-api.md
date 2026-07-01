# 46. Public Platform API

External API для партнёров / сторонних разработчиков / интеграций. Subset от internal API, с более строгими правилами: versioning, deprecation, quotas, billing. Важный элемент **платформенной** модели — мы становимся инфраструктурой для других.

Появляется **с Фазы 5+** (когда есть spare capacity + stable internal API).

## 1. Три типа потребителей API

| Consumer | Examples | Trust level |
|---|---|---|
| **Internal apps** | shell-web / shell-mobile / admin | Full — через session JWT |
| **First-party integrations** | Bug bounty, analytics exports | Scoped API keys |
| **Third-party developers** | OAuth apps, white-label, plugin authors | OAuth + app-registration, limited scopes |

Public API — для последних двух.

## 2. Architecture

```
external client
    │
    ▼
public-api-gateway (Traefik + rate-limit)
    │
    ▼
api.daria.app/v1/*
    │
    ▼
OAuth / API-key validation
    │
    ▼
Scope-check (per-endpoint required scopes)
    │
    ▼
Internal service routing (through same gateway)
    │
    ▼
Response (JSON / OpenAPI-matched)
```

**Не exposing** прямо internal gRPC / internal events — только REST.

## 3. Versioning

- **v1 / v2 / v3** в path (`api.daria.app/v1/users/me`).
- **Breaking changes** → new major version.
- **Deprecation policy**: минимум **12 месяцев** для public API (vs 6 для internal).
- **Sunset header** в deprecated responses (`Sunset: <date>`).
- **Changelog** public (`api.daria.app/changelog`).

## 4. Authentication

### API keys (first-party / internal integrations)

- Long-lived tokens (rotatable).
- Scoped to specific endpoints.
- IP-allowlist optional.
- Usage attributed to owning org/user.

### OAuth 2.0 (third-party apps)

- Standard OAuth 2.0 с PKCE для mobile/SPA.
- Refresh tokens rotating.
- Scopes granular (`read:profile`, `read:templates`, `write:templates`, `read:wallet.balance`, …).
- Per-app branded consent screen.

### Request signing (for sensitive ops)

- HMAC-signed requests для operations типа transfer / template-publish.
- Signed with per-app secret.
- Replay-protection (nonce + timestamp).

## 5. Scope taxonomy

```
read:profile
write:profile
read:templates
write:templates.own
read:wallet.balance
read:wallet.transactions
write:wallet.transfer      # высокоsensitive; requires user consent every N ops
read:timeline.own
write:timeline.own
read:messages.own
write:messages.send
read:feed
write:feed.post
governance:report
admin:*                     # только platform admin keys, not OAuth
```

**Tiered trust**: endpoints с sensitive scopes требуют дополнительной verification (user consent dialog per-app per-year).

## 6. Rate limits

Per-app, per-user, per-endpoint:

| Plan | Req/sec | Req/day | Burst |
|---|---|---|---|
| Free / registered dev | 10 | 10,000 | 50 |
| Basic (paid) | 50 | 1,000,000 | 200 |
| Partner (verified) | 200 | 10M | 1,000 |
| Enterprise | custom | custom | custom |

Headers:
- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`
- `Retry-After` at 429

## 7. Quota billing

- **Free tier** — для dev / hobby.
- **Paid tier** — $X/month for Basic, $Y/month for Partner.
- **Overage** — charge per-1k-extra-requests or hard-block (user choice).
- **Enterprise** — custom contract.

Billing через existing `services/wallet` + platform account.

## 8. Webhooks

Apps subscribe на events для их users (с user-consent):

```
POST https://example-app.com/webhook

Headers:
  X-Daria-Signature: sha256=<hmac>
  X-Daria-Event: app.daria.authorship.royalty-distributed.v1
  X-Daria-Timestamp: 2026-05-10T12:00:00Z

Body: same CloudEvent format.
```

- Retries: +1min, +5min, +30min (max 5).
- Dead-letter если нет success — notify app-owner.
- App can replay last 7 дней via `/webhooks/replay`.

## 9. Available endpoints (subset)

```
GET    /v1/users/me
GET    /v1/users/:id                        # public profile
GET    /v1/templates                         # search/list
GET    /v1/templates/:id
POST   /v1/templates                         # create (write scope)
POST   /v1/templates/:id/fork
GET    /v1/patterns/:id                      # user's Pattern-Cards
POST   /v1/patterns                          # create
GET    /v1/timelines/:id
POST   /v1/timelines/:id/steps/:sid/submit

GET    /v1/wallet/balance
GET    /v1/wallet/transactions
POST   /v1/wallet/transfers                  # HIGH-SCOPE, user-consent-per-transfer

GET    /v1/search?q=...
GET    /v1/feed
POST   /v1/feed/posts

GET    /v1/conversations
POST   /v1/conversations/:id/messages
```

**Not exposed**: identity internals, audit-log, policy-engine, moderation internals.

## 10. Error format (standardized)

```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests. Retry in 60 seconds.",
    "traceId": "abc123",
    "docs": "https://docs.daria.app/errors/rate-limited",
    "details": { "retryAfter": 60 }
  }
}
```

Error codes are **stable** — apps can rely on them. Localized `message` — optional header `Accept-Language`.

## 11. SDKs

Publish:
- JavaScript / TypeScript (primary)
- Python
- Go
- Swift (iOS apps consuming our API)
- Kotlin (Android apps consuming our API)

Auto-generated from OpenAPI (Orval / openapi-generator). Hand-polished for ergonomics.

## 12. Developer portal

`developers.daria.app`:

- Docs с examples (curl / JS / Python).
- Interactive playground (OpenAPI Swagger UI).
- Changelog.
- Status page.
- Create / manage apps.
- Request verification / Enterprise tier.
- Community (forum / Discord).

## 13. Sandbox / staging

- `sandbox.api.daria.app` — staging environment для development.
- Test accounts, test payment methods.
- Rate-limits relaxed.
- Data segregation from prod.

## 14. App review

Перед публикацией OAuth app с sensitive scopes — **manual review**:

- App info (description, website, privacy policy).
- Screenshots of intended use.
- Data-handling questions.
- Code-sample (optional for transparency).

High-risk apps (wallet-transfer scope, direct-message-send) — enhanced review.

## 15. Abuse prevention

- Suspicious activity detection (bulk scraping, unusual patterns).
- Auto-throttle → block.
- User-revoke option easy-to-find.
- Reporting channel «This app did something wrong».

## 16. Metrics

- `api.public.requests{app, endpoint, status}`
- `api.public.latency_ms{endpoint, percentile}`
- `api.public.error-rate{code}`
- `api.public.app-installations{app}`
- `api.public.revenue{plan}` (from quota billing)
- `api.webhooks.success-rate{app}`

## 17. Антипаттерны

- ❌ Exposing internal events или sensitive endpoints publicly.
- ❌ No rate-limit → abuse.
- ❌ No app review для sensitive scopes.
- ❌ Long-lived API keys без rotation.
- ❌ Public API меняется breaking без 12-мес notice.
- ❌ Sandbox с production data.
- ❌ No SLA для paid tiers.
- ❌ No way для user revoke app access.
- ❌ OAuth без PKCE на mobile.
- ❌ Webhook retry without backoff (DDoS-ing clients).
