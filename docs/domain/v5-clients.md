# Domain: v5-clients

## Purpose

Клиенты studio (B2C) — те, для кого ведётся project. Contact info, project history, communication log, preferences.

## Entities (v5.3)

- `Client` — person или company.
- `ClientAddress` — delivery / project location.
- `ClientPreference` — style preferences.
- `ClientCommunication` — email / phone / in-app log.
- `ClientRating` — studio's internal assessment.
- `ClientPortalAccess` — read-only view of их projects.

## Key operations

- Client onboarding (lead → client).
- Maintain contact info (GDPR: user-editable, erasable).
- Log communications.
- Link к projects.
- Client portal: read-only project view, approval workflow (budget / design changes).

## Business rules

- One client — один primary contact.
- GDPR erase support.
- Client portal scoped к их projects only.
- Marketing consent separate from service-consent.

## Events

- `client.onboarded / updated`
- `client.communication-logged`
- `client.approved-change` / `client.rejected-change`
- `client.ported-out` (GDPR portability)
- `client.erased` (GDPR erase)

## External dependencies

- `projects` (primary relation).
- `notifications` (communications).
- `audit-log`.

## v5 → v6 migration

| v5 | v6 |
|---|---|
| Client (person) | `person-profile` с scope `studio:client:<studio-id>` |
| Client (company) | `company-profile` + primary-contact person |
| ClientAddress | part of profile |
| ClientPreference | user-preferences (profile attributes) |
| ClientCommunication | `messenger` conversation (entity-thread) |
| ClientRating | `reviews-ratings` (provider-side, internal) |
| ClientPortalAccess | `permissions` on project Pattern-Card |

### Note

Client-portal в v6 — это просто **normal shell с permissions**. Client tap'ет на project → видит read-only view. Не отдельный app.

### Phase

Phase 3.

## Open questions

- Client-side multi-studio accounts — one identity across multiple studios.
- Client data portability при studio-switch — GDPR-required.
