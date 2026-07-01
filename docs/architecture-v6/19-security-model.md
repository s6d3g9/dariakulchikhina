# 19. Security Model

Security — не слой, а сквозное свойство. Этот документ фиксирует: threat-model, защита данных в транзите и на диске, authN/authZ, secrets, ключи wallet/crypto, PII, medical, инцидент-respons.

Принцип: **defense in depth** (ни одна защита не гарантирует, каждый следующий уровень подстраховывает предыдущий) + **least privilege** (каждый сервис/человек имеет минимум прав).

## 1. Threat-model (STRIDE per-слой)

| Threat | Против чего | Митигация |
|---|---|---|
| **Spoofing** | Identity | Zitadel JWT + JWKS, WebAuthn для чувствительных действий |
| **Tampering** | Messages / Data | mTLS в mesh, подписи событий, WORM-audit |
| **Repudiation** | Financial / Governance | Audit-log WORM, cryptographic timestamps |
| **Information disclosure** | PII / medical / banking | Encryption at rest, RBAC, redaction |
| **Denial of Service** | Public surfaces | Cloudflare WAF, rate-limit, circuit breakers |
| **Elevation of privilege** | Admin paths | MFA, session-timeouts, separate admin domain |

## 2. Крупнейшие риски (по слоям)

| Слой | Главный риск | Last-line defense |
|---|---|---|
| Shell (клиент) | XSS, clickjacking, supply-chain | CSP strict, SRI, subresource integrity, code-signing |
| Gateway | DDoS, bad bots | Cloudflare + Traefik rate-limit |
| Identity | Account takeover | Zitadel MFA, WebAuthn, anomaly detection |
| Wallet / TigerBeetle | Ledger manipulation | TigerBeetle formal verification + audit reconciliation |
| Crypto custody | Key compromise | Fireblocks MPC → own HSM (позже) |
| Banking ledger | Insider access | Отдельный кластер VPC, 4-eyes principle, session recording |
| Media pipeline | Privacy violations | Private bucket, presigned URL, watermarking |
| Identity data | KYC leak | Encryption (KMS envelope), access логгируется |

## 3. Authentication

- **Primary**: Zitadel OIDC — JWT с 15-мин TTL + refresh-token.
- **MFA**: обязательна для KYC L2+, банка, крипто.
- **WebAuthn** / passkeys — рекомендовано для всех.
- **Passwordless** по умолчанию (email-link / SMS / OTP).
- **Session rotation** при elevation (нормальный логин → admin-режим = новая сессия с step-up MFA).
- **Device binding** — crypto-key pair в secure-enclave на mobile (Фаза 7+).

Запрещено:
- ❌ Custom password flow в обход Zitadel.
- ❌ Basic auth.
- ❌ JWT в localStorage (только httpOnly cookie + BFF).
- ❌ Long-lived tokens (> 24h).

## 4. Authorization

Два слоя:

1. **Identity scopes** (из Zitadel) — `shell:*`, `domain:*`, `governance:admin`, ...
2. **Policy-engine** — runtime решения (see `13-governance-policy.md`): allow / distill / deny по action + context.

Серверная проверка **всегда** дублирует клиентскую (клиент = UX, сервер = security — инвариант I8).

Специфические роли:
- **User** — default.
- **Creator** — получает royalty, может публиковать templates.
- **Provider** — компания/специалист, продаёт услуги.
- **Moderator** — доступ к moderation-review очередям.
- **Admin** — платформенные операции.
- **Security** — доступ к audit-log, secret rotation, incident-response.
- **Finance** — доступ к reconciliation reports, не к инстанс-data.
- **Compliance** — read-only ко всему для регулятора-ответов.

## 5. Data classification

Четыре уровня, разные правила шифрования и доступа:

| Class | Пример | Encryption at rest | Access pattern |
|---|---|---|---|
| **Public** | Type-catalogs, public templates, feed-public | — | Анонимный |
| **User-private** | Profile, messages, timelines | AES-256 (DB-level TDE) | Owner + explicit grantees |
| **Sensitive** | KYC docs, медкарта, photo-verification | AES-256 + envelope KMS per-user | Strict RBAC + audit |
| **Regulated** | Wallet tx, crypto keys, banking records | HSM / TigerBeetle + WORM | 4-eyes, full audit |

## 6. Encryption

- **Transit**: TLS 1.3 везде. Internal mesh — mTLS (с Фазы 6+).
- **At rest**: Postgres TDE, ClickHouse encrypted volumes, S3 SSE-KMS.
- **Envelope encryption** для user-specific данных: per-user DEK, KEK в KMS. Удаление DEK → crypto-erase данных пользователя.
- **Private media**: S3 private bucket + presigned URL (TTL 5 мин), watermark для preview.
- **Passwords**: не наши — Zitadel отвечает (Argon2id).

## 7. Secrets management

- **Infisical** (self-hosted) — единственный источник.
- **Никакие секреты** в git, в Dockerfile ARG, в docker-compose.yml (только `${VAR}` референсы).
- **Rotation**: DB creds — каждые 90 дней, JWT signing keys — 180 дней, API keys внешних сервисов — при compromise.
- **Access audit**: каждый `secret.read` логируется в audit-log.
- **Dev vs prod**: разные Infisical workspaces. Dev-секреты — dummy values.

## 8. Wallet keys & crypto custody

| Ресурс | Где хранится | Access |
|---|---|---|
| JWT signing key | Infisical KMS | Only identity service |
| Wallet internal transfer key | TigerBeetle internal (не exposed) | Only wallet service |
| Crypto custody keys | Fireblocks MPC (Фаза 9 MVP) → HSM cluster | Signing через Fireblocks API |
| User crypto keys (non-custodial) | Никогда не у нас | User device |
| On-chain author wallet | User-owned, опционально custodial через Fireblocks | User / platform |

**Инвариант**: ни один человеческий оператор не имеет приватного ключа в plain form. Всё — через MPC / HSM / hardware-signing.

## 9. PII protection

- **Collection minimization**: спрашиваем только то, что нужно для текущего KYC-level.
- **Pseudonymization**: в analytics / recommendations — user_id_pseudo = hash(user_id, salt_per_env).
- **Right to be forgotten (GDPR)**:
  - Удаление DEK → crypto-erase приватных данных.
  - Cascade через event-sourcing: `app.daria.identity.user-erased.v1` → consumer'ы делают compensating erase.
  - Финансовые данные сохраняются (регуляторка), но анонимизируются после retention-period.
  - Auth-trail удаления — в audit-log WORM.

## 10. Medical data (Фаза 4 — care/wellness)

Отдельный режим, более строгий:

- Отдельная schema, отдельный KMS-key.
- Доступ — только владелец + явно добавленные врачи.
- Не индексируется search'ем.
- Не попадает в general recommendations.
- Retention — 10+ лет (юрисдикционное).
- Шифрование per-record, не per-schema.

## 11. Financial / banking security (Фаза 8+)

- Отдельный k8s cluster в отдельном VPC.
- Отдельный CA для mTLS.
- Session recording для admin operations.
- 4-eyes approval на операции > threshold.
- Отдельный security team ревьюит все изменения.
- PCI DSS — через PSP (не мы храним PAN).
- FSMA / AML — через BaaS партнёра + Sumsub integration.

## 12. Anti-fraud / trust-safety

`services/trust-safety` collecting:
- Device fingerprinting (cross-session stable hash)
- Behavior anomalies (ML)
- VPN / proxy detection (для financial actions)
- Velocity checks (5 регистраций с одного IP за 10 мин = подозрительно)
- Cross-account correlations
- Photo-verification (liveness)

Риск-score за каждой action'ой → policy-engine учитывает в decision.

## 13. Supply-chain security

- **Lock-files** в repo (pnpm-lock.yaml, Cargo.lock, go.sum) — проверяются в CI.
- **SBOM** (Software Bill of Materials) генерируется для каждого Docker image.
- **Image signing** — cosign, проверка в Argo CD perщев.
- **Dependabot / Renovate** — автоматический apply security-updates.
- **License compliance** — сканируется CI, запрещены GPL в proprietary code (если применимо).
- **`pnpm audit`** в CI — high/critical фейлит пайплайн.

## 14. Admin surface isolation

- Админка — отдельный домен (`admin.daria.app`), не `/admin/*` на основном.
- Отдельная аутентификация, обязательная WebAuthn + IP-allowlist.
- Session TTL 15 мин.
- Все действия — в audit-log с full request/response capture.
- Никаких direct DB shell'ов в prod для dev'ов — только через read-only BI tool с RBAC.

## 15. Incident-response security-path

Дополнительно к `18-observability-ops.md §9`:

- **Security SEV-1**: compromised key, leaked PII, active breach — отдельный флоу.
- Немедленная ротация потенциально компрометированных секретов.
- Включение enhanced audit (capture всех request bodies на 24 часа).
- Уведомление пользователей — в течение 72 часов (GDPR).
- Уведомление регуляторов — per-юрисдикция.
- External forensics consultant — на retainer.

## 16. Security testing

- **SAST** в CI (Semgrep, CodeQL).
- **DAST** (ZAP) — в staging, еженедельно.
- **Penetration test** — внешний, раз в год + перед банком (Фаза 8).
- **Bug bounty** — через HackerOne после Фазы 7 (есть реальные пользователи).
- **Security review** — обязательное для любого изменения, затрагивающего identity / wallet / crypto / medical.

## 17. Антипаттерны

- ❌ Передавать user-id в URL для приватных действий (должно быть в authenticated context).
- ❌ Хранить пароли / токены в БД.
- ❌ Один `super-admin` аккаунт на всё.
- ❌ Проверка прав только на клиенте.
- ❌ `eval()`, динамический require / import с user-input.
- ❌ Prepared statements — не используемые (SQL-инъекция).
- ❌ Открытый JMX / debugger / profiler порт в prod.
- ❌ `ALL PRIVILEGES` у DB-юзера сервиса.
- ❌ Hardcoded secrets «временно».
- ❌ Логирование JWT / секретов в traces.
