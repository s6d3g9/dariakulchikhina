# Domain: v5-quotes-estimates

## Purpose

Calculation of project costs: estimates (brief-stage) → quotes (pre-contract) → actual budget (during execution).

## Entities (v5.3)

- `Estimate` — early rough calculation.
- `Quote` — formal priced proposal к client.
- `QuoteItem` — line-items с specific costs.
- `QuoteRevision` — versioned offers.
- `QuoteApproval` — client sign-off.
- `ActualCost` — real paid-out spending.
- `CostVariance` — estimate vs actual comparison.

## Key operations

- Generate estimate from rough briefing.
- Build detailed quote (items + labor + margin).
- Revise based on feedback.
- Request client approval.
- Track actuals during execution.
- Variance analysis post-project.

## Business rules

- Quote valid for 30 days default.
- Changes > 10% require new revision + client approve.
- Actual tied к audit-log for transparency.
- Post-project variance — learning signal для future.

## Events

- `quote.created / revised / approved / rejected / expired`
- `actual-cost.recorded`
- `variance.calculated`

## External dependencies

- `designer-catalog` (item pricing).
- `contractors` (labor pricing).
- `projects` (ownership).
- `documents` (quote PDF generation).
- `wallet` (actual payments).

## v5 → v6 migration

| v5 | v6 |
|---|---|
| Estimate | pre-commitment Pattern-Card |
| Quote | `contract-deal` with status=`proposed` |
| QuoteItem | line-items (sub-entity of contract-deal) |
| QuoteRevision | versions в pattern-engine |
| QuoteApproval | human-step в timeline (client approves) |
| ActualCost | `wallet.transfers` + links to contract-deal |
| CostVariance | analytics dashboard (derived) |

### Card-type

`contract-deal` natural fit — quote is just a contract в pre-signed state.

### Templates

Studios могут publish quote-templates as reusable `pattern-template` (e.g. «typical 2-bedroom renovation quote») — creator-economy applies.

### Phase

Phase 3.

## Open questions

- AI-assist для quote-generation (based на project-brief) — candidate task.
- Cross-studio benchmarking — anonymized stats.
