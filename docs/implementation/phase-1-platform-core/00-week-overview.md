# Phase 1: Platform Core — week-by-week overview

4-6 недель. Цель: все 12 Layer 2 services deployed и integrated. После — Phase 2 domain primitives может начаться.

Team: 5-8 чел (1 tech-lead, 2 BE TS, 1 BE Go, 1 DevOps/SRE, 1 Security, 1 QA, 1 part-time PM).

## Prereq

- Phase 0 complete (см. `../phase-0-foundation/00-week-overview.md §checklist`).
- All infra работает (`pnpm dev:infra` passes).
- Team onboarded.
- CODEOWNERS configured.

## Week 1: Identity

| День | Задача | Deliverable |
|---|---|---|
| Mon | Zitadel setup | `services/identity/` with docker-compose, admin user, first org |
| Tue | Scopes + roles | Scopes taxonomy loaded, default roles configured |
| Wed | Registration flow | Email-link magic registration works |
| Thu | Passkey setup | WebAuthn registration + auth works |
| Fri | WS-ticket flow | Ticket issuance + Redis store + 30s TTL |

## Week 2: Gateway + Events

| День | Задача | Deliverable |
|---|---|---|
| Mon | Traefik setup | `services/gateway/` with dynamic config |
| Tue | JWT introspect | All routes validate Zitadel JWT |
| Wed | Rate-limit + CORS | Per-user / per-IP rate-limits working |
| Thu | NATS JetStream prod | 3-node cluster + streams + consumers |
| Fri | Integration test | E2E: register user → JWT → call through gateway → event в JetStream |

## Week 3: Payments + Wallet

| День | Задача | Deliverable |
|---|---|---|
| Mon | Wallet Postgres + migrations | `wallet_db` with accounts/transfers/holds/journal |
| Tue | Wallet service (Go) | CRUD + transfer logic |
| Wed | Payments service (TS) | PSP router (Stripe + ЮKassa) |
| Thu | Reconciliation job | Daily Temporal workflow |
| Fri | E2E payment test | Test charge → wallet transfer → event chain |

## Week 4: Notifications + Credentials-vault

| День | Задача | Deliverable |
|---|---|---|
| Mon | Notifications service | Push (FCM) + email (Sendgrid) + in-app WS |
| Tue | Notification rules YAML | Event → channel matcher working |
| Wed | Credentials-vault | Encrypted storage + verification flow |
| Thu | Sumsub integration | KYC L1/L2 upload + async callback |
| Fri | Integration | Event → notification → user receives |

## Week 5: Supporting services

| День | Задача | Deliverable |
|---|---|---|
| Mon | Secrets (Infisical) | Self-hosted + service-account access |
| Tue | Feature-flags (GrowthBook) | Self-hosted + evaluation SDK |
| Wed | Search (Meilisearch basic) | Per-kind indexes + populate-from-events |
| Thu | Location (Go) | POI catalog + nearest-neighbor query |
| Fri | Observability — all services | Every service sends traces |

## Week 6: Phase 1 exit + hardening

| День | Задача | Deliverable |
|---|---|---|
| Mon | Security audit | Threat-model review all L2 services |
| Tue | Load testing (k6) | Confirm baseline targets |
| Wed | Runbooks drill | Practice SEV-1/SEV-2 scenarios |
| Thu | Docs update | All service READMEs + playbooks |
| Fri | Phase 1 exit review | Checklist + go/no-go для Phase 2 |

## Phase 1 exit-criteria

**Services:**
- [ ] Identity: user can register, login (passkey or magic-link), receive JWT
- [ ] Gateway: routes validate JWT, applies rate-limits
- [ ] Events: 2 streams active (durable-domain, financial-audit), consumers work с idempotency
- [ ] Payments: charge → PSP → webhook → wallet
- [ ] Wallet: transfers ACID, reconciliation daily
- [ ] Notifications: multi-channel dispatch через YAML rules
- [ ] Credentials-vault: KYC L1/L2 flows
- [ ] Secrets: Infisical holds all prod creds
- [ ] Feature-flags: evaluation < 5ms
- [ ] Search: 3 indexes populated
- [ ] Location: POI queries работают
- [ ] Observability: все services send traces, dashboards populated

**End-to-end flows:**
- [ ] User registers → JWT issued → events в JetStream → audit captures
- [ ] User makes test charge → PSP callback → wallet updated
- [ ] User enables MFA → scope updated → future actions require MFA
- [ ] KYC L2 uploaded → webhook → user.kyc_level=2 → gates unblocked

**Quality:**
- [ ] 70%+ test coverage на Layer 2 services
- [ ] SigNoz dashboards для каждого service
- [ ] Runbooks для 6 alerts
- [ ] DR-drill passed (restore from backup)

**Go/No-Go к Phase 2**:
- Platform stable под baseline load
- Team ready для domain primitives
- Phase 2 backlog prioritized
