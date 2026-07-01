# services/credentials-vault

Layer 2 — Platform Service. Хранение верифицированных документов и лицензий пользователей: водительские, IYT/ICC, PADI, медицинские допуски, родословные, вакцинации, образовательные сертификаты.

## Что делает

- Store verified credentials (uploaded + reviewed).
- Expose attestation API для policy-engine gates.
- Integrate с issuer-authorities (GOST, PADI, IYT) где API доступно.
- KYC flow integration с Sumsub / Onfido.
- Encryption at rest (envelope с per-user DEK).
- Expiry tracking + reminders.

## Рантайм

- TypeScript, Nitro.
- Postgres `credentials_db` (encrypted fields).
- S3 private bucket для original documents.

## API

```
POST   /credentials                                # upload для verification
GET    /credentials/:id
GET    /users/:id/credentials?kind=...
POST   /credentials/:id/verify                     # trigger verification
GET    /credentials/:id/attestation               # for policy-engine
DELETE /credentials/:id                           # user-initiated erase
```

## Integrations

- **Publishes**: `app.daria.credentials.verified.v1`, `credentials.expired.v1`, `credentials.revoked.v1`.
- **Consumed by**: `policy-engine` (gate checks).

## Инварианты

- I6, I7 (identity-first), I19 privacy.
- Medical credentials — отдельный encryption scope.

## Фаза

Фаза 1.
