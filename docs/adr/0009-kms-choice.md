# ADR-0009: KMS / secrets management choice

- **Статус**: Accepted
- **Дата**: 2026-04-18
- **Решение**: Infisical для secrets, cloud-provider KMS для envelope encryption
- **Ответственный**: Security team

## Контекст

Нужно два связанных, но разных mechanism:
1. **Secrets store** — для DB creds, API keys, JWT signing (rotatable, access-audited).
2. **KMS** — для envelope encryption user-data (per-user DEKs, crypto-erase GDPR).

## Альтернативы

### HashiCorp Vault

Плюсы: industry standard, battle-tested, rich features (PKI, dynamic secrets, transit encryption).
Минусы: complex ops (HA cluster, unseal ceremony, upgrades), heavyweight, overkill для early phase.

### Infisical (self-hosted)

Плюсы: simpler ops, modern UX, per-env isolation из коробки, integrations с Argo CD / GitHub Actions.
Минусы: младше community, fewer features, limited at extreme scale.

### AWS KMS / GCP KMS

Плюсы: managed, HSM-backed, proven.
Минусы: cloud lock-in (мы multi-provider), cost per-operation.

### Mozilla SOPS + age

Плюсы: git-stored encrypted, simple.
Минусы: не runtime secret-fetch, не rotatable easily.

## Решение

**Layered approach:**

- **Secrets**: Infisical (self-hosted).
  - API keys, DB creds, external service tokens.
  - Rotation schedules.
  - Audit-logged access.
- **Envelope encryption** для user-data: cloud-provider KMS (Hetzner KMS или AWS KMS для cross-cloud).
  - DEK per-user (or per-record для medical).
  - KEK в KMS.
  - Crypto-erase на GDPR delete → destroy DEK.
- **Banking keys** (Phase 8): отдельный HSM (YubiHSM cluster or CloudHSM).
- **Crypto custody** (Phase 9): Fireblocks MPC (не собственный KMS).

## Последствия

### Положительные
- Defense-in-depth (secrets vs data-encryption separately).
- GDPR crypto-erase built-in.
- No vendor lock-in для secrets.
- Clear escalation path: Infisical → Vault если scale demands.

### Отрицательные
- Two systems to maintain.
- KMS operations cost (per-call pricing at scale).
- Infisical ops responsibility.

## Revisit

Phase 6 — if Infisical scale limits hit, evaluate Vault migration.
Phase 8 — banking HSM integration.
