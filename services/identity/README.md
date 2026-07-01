# services/identity

Layer 2 — Platform Service. Zitadel self-hosted как единый IdP для всего v6.

## Что делает

- Выдаёт JWT + refresh tokens (OIDC).
- Управляет users, orgs, projects, scopes, MFA, WebAuthn/passkeys.
- Issues WS-tickets для мессенджера и live-каналов.
- Экспортирует JWKS для валидации JWT другими сервисами.
- Поддерживает scopes: `shell:*`, `domain:*`, `governance:*`, role-based.
- Интеграция с `credentials-vault` (KYC, лицензии, сертификаты).

## Рантайм

- **Product**: Zitadel (self-hosted).
- **Language**: Go (внутренний Zitadel).
- **State store**: Postgres `identity_db` (внутренняя схема Zitadel).
- **Deployment**: docker / k8s в `platform/`.

## Scopes (каталог)

```
shell:read                 # базовое чтение shell-API
shell:write                # посты, сообщения, лайки

domain:pattern:read
domain:pattern:write
domain:booking:book
domain:wallet:transfer     # требует MFA + KYC L2
domain:authorship:publish

governance:admin           # платформенные операции
governance:moderation      # доступ к очередям
governance:compliance      # read-only compliance

system:service-to-service  # internal только
```

## API (через Zitadel native)

- OIDC endpoints: `/oauth/authorize`, `/oauth/token`, `/.well-known/openid-configuration`, `/.well-known/jwks.json`
- Admin API: управление orgs/users/scopes
- Actions API: кастомные хуки на signup / login (выдача WS-тикетов)

## WS ticket flow

```
Client (authenticated) → GET /ws-ticket (identity)
identity → Redis SET ws_ticket:<token> user_id=... EX 30
Client → WS handshake with ticket=<token>
messenger/core → Redis GETDEL ws_ticket:<token>
    → ok → upgrade WS with user_id
    → expired/missing → 401
```

Инвариант: никакой сервис кроме identity не выдаёт ws-tickets. Никто кроме messenger/core не потребляет их.

## Интеграции

- **Publishes**:
  - `app.daria.identity.user-registered.v1`
  - `app.daria.identity.user-logged-in.v1`
  - `app.daria.identity.mfa-enrolled.v1`
  - `app.daria.identity.session-revoked.v1`
  - `app.daria.identity.user-erased.v1` (GDPR)
- **Consumed by** (как JWT-validator):
  - Gateway (Traefik plugin)
  - Каждый сервис (middleware)

## Инварианты

- I7 (identity-first)
- I17 (все identity-events в audit)
- I19 (scopes — данные, не код)

## Фаза реализации

Фаза 1 (Platform core). Миграция с HMAC-cookie v5.3 — через feature-flag + cohort.

## Статус

Skeleton + Zitadel конфиг. Реальная миграция — Фаза 1.
