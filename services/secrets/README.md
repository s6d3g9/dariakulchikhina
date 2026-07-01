# services/secrets

Layer 2 — Platform. Infisical self-hosted — единственный источник секретов.

## Что делает

- Store + rotate secrets (DB creds, API keys, JWT signing keys, certificates).
- Per-environment isolation (dev / staging / prod).
- Per-service access control.
- Audit-logged reads.
- Integration с Argo CD (secret injection at deploy).

## Deployment

- Self-hosted Infisical (Postgres backend).
- Master-key split (Shamir Secret Sharing) для root.

## Rotation schedule

- DB creds: 90 days.
- JWT signing keys: 180 days.
- External API keys: при compromise или annually.
- TLS certs: auto via Let's Encrypt + cert-manager.

## Access

- Service accounts per-deployment.
- Human access only through approval flow (4-eyes for prod).
- Dev secrets — dummy, не real.

## Integrations

- **Publishes**: `secret-rotated`, `secret-accessed`.
- **Called by**: каждый сервис при startup / periodic refresh.

## Phase

Фаза 1.
