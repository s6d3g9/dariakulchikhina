# services/feature-flags

Layer 2 — Platform. GrowthBook self-hosted.

См. [docs/architecture-v6/47-feature-flags-policy.md](../../docs/architecture-v6/47-feature-flags-policy.md) для policy.

## Что делает

- Flag evaluation API (<5ms SLO).
- Experiments framework (A/B, multi-variant).
- Targeting rules (cohort, percentage, attribute-based).
- Analytics integration (GrowthBook → ClickHouse).
- Audit trail (who flipped what, когда).

## Deployment

- Self-hosted GrowthBook (Postgres + Redis).
- SDK для TS / Python / Go / Swift / Kotlin.

## Integration в services

```ts
import { FeatureFlags } from '@daria/sdk-platform'

if (await FeatureFlags.isEnabled('release.booking.instant-confirm', user)) {
  // new code
} else {
  // old code
}
```

## Naming

Enforced в CI: `<type>.<domain>.<feature>` pattern. См. 47 §2.

## API

```
GET  /flags/:name/evaluate?user=...          # evaluation
GET  /flags                                   # list (audit)
POST /flags                                   # create (with required metadata)
PUT  /flags/:name                             # flip
DELETE /flags/:name                           # cleanup
GET  /flags/audit?date=...                    # change history
```

## Phase

Фаза 1.
