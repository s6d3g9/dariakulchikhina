# Domain: v5-contractors

## Purpose

Подрядчики (installers, electricians, plumbers, painters, builders). Студия assigns contractors для work stage.

## Entities (v5.3)

- `Contractor` — person / small team / company.
- `ContractorSpecialty` — categories (electrical, plumbing, finishing).
- `ContractorAgreement` — terms (per-hour / per-project / fixed).
- `ContractorTask` — что делает в project.
- `ContractorEvaluation` — post-task rating.
- `ContractorPayment` — settlement.
- `ContractorLicense` — verified qualifications.

## Key operations

- Register contractor.
- Verify licenses.
- Assign к project-tasks.
- Track task progress.
- Evaluate after task done.
- Settle payment.

## Business rules

- License verification required перед assignment (per-specialty).
- Tasks have defined scope / budget.
- Evaluations tied к task completion.
- Payments via agreement terms.

## Events

- `contractor.registered / verified / suspended`
- `contractor-task.assigned / started / completed / rejected`
- `contractor-payment.released`

## External dependencies

- `projects` (primary scope).
- `credentials-vault` (licenses).
- `wallet` (payments).
- `reviews-ratings`.

## v5 → v6 migration

| v5 | v6 |
|---|---|
| Contractor | `person-profile` или `company-profile` с provider-mode |
| ContractorSpecialty | profile attributes / tags |
| ContractorAgreement | `contract-deal` Pattern-Card template |
| ContractorTask | `contract-deal` instance + timeline |
| ContractorEvaluation | `reviews-ratings` |
| ContractorPayment | `wallet.transfer` + `escrow-service` (для risk-mgmt) |
| ContractorLicense | `credentials-vault` |

### Pattern

Contractor-assignment = instance of `contract-deal` template с:
- Timeline (assigned → started → milestones → completed → paid).
- Escrow hold (studio releases after task evaluation).
- Credentials gate (license check before assign).

### Phase

Phase 3-4.

## Open questions

- Marketplace для contractors (cross-studio) — future.
- Trust-scoring across studios — privacy implications.
