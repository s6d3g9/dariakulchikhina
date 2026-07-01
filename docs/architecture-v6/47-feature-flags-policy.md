# 47. Feature Flags Policy

Feature flags (GrowthBook self-hosted) — critical tool в v6. Дисциплина обязательна, иначе flags становятся вечным tech-debt. Этот документ фиксирует lifecycle, правила naming'а, ownership, cleanup.

## 1. Четыре типа флагов

| Тип | Назначение | Expected lifetime |
|---|---|---|
| **Release flag** | Rollout новой feature постепенно | ≤ 2 недели |
| **Experiment flag** | A/B / multi-variant test | ≤ 8 недель |
| **Ops flag** | Kill-switch / runtime config | permanent |
| **Permission flag** | Per-user / per-cohort access | medium |

Правило: **release и experiment flags обязательно удаляются после выполнения цели**. Ops и permission — permanent с ревизией.

## 2. Naming convention

`<type>.<domain>.<feature>` — consistent, searchable.

```
release.booking.instant-confirm
release.shell.new-inversion-animation
experiment.marketplace.ranking-v2
experiment.onboarding.shorter-flow
ops.wallet.circuit-breaker-enabled
ops.payments.fallback-to-secondary-psp
permission.banking.beta-access
permission.crypto.early-adopter
```

CI: reject PR с flag name not matching pattern.

## 3. Flag lifecycle

### Release flag

```
1. Create flag (off by default)
2. Deploy code с if(flag) check
3. Enable for internal team → verify
4. 1% roll-out → monitor
5. 10% → 50% → 100%
6. Verify metrics stable
7. Remove code + delete flag (within 2 weeks)
```

**CI enforcement**: flag detected в code > 4 weeks → warning → fail.

### Experiment flag

```
1. Create flag + pre-registered metrics plan (see 39-analytics-metrics)
2. Deploy with experiment-framework integration
3. Enroll users (stable hash)
4. Run until criteria met (p<0.01, 30 days max, guardrails ok)
5. Declare winner
6. Roll out winner to 100%
7. Remove losing-variant code + delete flag
```

### Ops flag

```
1. Create с clear purpose («kill-switch for wallet-circuit-breaker»)
2. Documented owner + default state
3. Annual review — still needed?
4. If yes — keep, document why.
5. If no — remove.
```

### Permission flag

```
1. Create для cohort gating (beta, early-adopter)
2. Used till vertical goes GA
3. Convert to permanent scope or remove
```

## 4. Ownership

Каждый flag обязан иметь:

- **Owner** (user / team).
- **Purpose** (one-liner).
- **Expected removal date** (release/experiment only).
- **Metrics to watch** (what tells us to enable/disable).

Без этих полей — CI rejects flag creation.

## 5. Deployment

- **Targeting rules** — в GrowthBook UI (cohort / rollout / country / device).
- **Changes через UI** — audit trail automatic.
- **Sensitive flags** (ops / financial) — require 2 people approval in GrowthBook.
- **Staged release**: dev → staging → prod, each with separate flag state.

## 6. Anti-patterns

- ❌ **Flag-бомбы** — 100+ флагов в одной feature (complexity).
- ❌ **Nested flags** — `flag1 && flag2 && flag3` — невозможно следить.
- ❌ **Zombie flags** — flag остался после feature готова.
- ❌ **Flag как toggle для business-logic** (VIP-only) — это permission, не flag.
- ❌ **Hardcoded default** в коде, игнорирующий flag — нарушает runtime control.
- ❌ **Flag для security-critical decisions** (auth bypass) — security-audit required.
- ❌ **Flipping ops flag без runbook'а** — что если что пойдёт не так?

## 7. Metrics

- `flags.count{type}` total active.
- `flags.staleness{flag,age_days}` — для release/experiment.
- `flags.evaluation.latency_ms` — SLO < 5ms.
- `flags.change.count_per_week` — частота flips.

Alert: any release/experiment flag > 6 weeks → SEV-2 (cleanup required).

## 8. CI Integration

```yaml
# .github/workflows/flags-check.yml
jobs:
  flags-check:
    - scan for flags matching pattern
    - cross-check с GrowthBook API
    - fail if:
      - code has flag not in GrowthBook
      - GrowthBook has flag not in code (zombie)
      - release/experiment flag age > 4 weeks without removal ticket
```

## 9. Flag + policy-engine boundaries

Flag ≠ policy-engine decision:

- **Flag** — binary/percentage, technical, owned by dev team.
- **Policy-engine** — legal / compliance, owned by compliance, declarative YAML.

Нельзя использовать flag для legal gating — тот же кусок кода для EU и US с разным behaviour должен быть policy-engine, не flag.

## 10. Integration в card-types

Card-type может использовать flags для:
- Gradual feature rollout (new panel design).
- Experiment для UX.

Card-type **не должен**:
- Иметь deep nesting флагов.
- Использовать flag вместо policy-engine для access control.

## 11. Documentation

`docs/flags.md` — live document:
- All active flags.
- Owners + purpose.
- Removal dates.
- Auto-generated из GrowthBook API раз в день.

## 12. GrowthBook targeting rules — examples

### Simple boolean rollout

```yaml
id: release.shell.new-inversion-animation
type: boolean
default: false
rules:
  - condition:
      user.internal: true       # beta-testers first
    value: true
  - condition:
      percentRollout: 10         # 10% of all users
    value: true
  - fallback:
      value: false
```

### Region-based rollout

```yaml
id: release.shell.new-navigation
type: boolean
default: false
rules:
  - condition:
      user.region: { $in: ["US", "CA"] }   # enable в US/CA first
      percentRollout: 50                    # 50% of those
    value: true
  - fallback:
      value: false
```

### Multi-variant experiment

```yaml
id: experiment.marketplace.ranking-v2
type: experiment
assignmentSeed: "marketplace-rank-exp-1"   # stable across sessions
variants:
  - key: control
    weight: 0.50
    value: { algorithm: "v1-current" }
  - key: new-algo
    weight: 0.50
    value: { algorithm: "v2-engagement-boost" }

# Guardrails
guardrails:
  - metric: moderation-action-rate
    direction: "no-increase"
    threshold: 0.10
  - metric: search-zero-results-rate
    direction: "no-increase"
    threshold: 0.15

# Primary metric
primary: template-conversion-rate
direction: increase
sampleSize: 10000
stopAt: { p: 0.01, maxDuration: 30d }
```

### Ops kill-switch

```yaml
id: ops.wallet.circuit-breaker-enabled
type: boolean
default: false                  # normally off
rules:
  - fallback: false
# Manual flip при incident. Audit-logged.
```

### Permission / beta-access

```yaml
id: permission.banking.beta-access
type: boolean
default: false
rules:
  - condition:
      user.betaCohort: { $contains: "banking-beta-2026q2" }
    value: true
  - condition:
      user.isEmployee: true
    value: true
  - fallback: false
```

## 13. Flag evaluation в коде

```ts
// packages/sdk-platform/flags.ts
import { FeatureFlags } from '@daria/sdk-platform'

// В card-type или service
async function renderPanel(user, context) {
  const useNewAnimation = await FeatureFlags.isEnabled(
    'release.shell.new-inversion-animation',
    { user, context }
  )
  
  return useNewAnimation ? <NewInversion /> : <OldInversion />
}

// Experiment
const variant = await FeatureFlags.getVariant(
  'experiment.marketplace.ranking-v2',
  { user }
)

if (variant === 'new-algo') {
  return rankWithEngagementBoost(candidates)
} else {
  return rankWithV1(candidates)
}
```

Evaluation p99 < 5ms via cached рулы.

## 14. Progressive rollout playbook

Standard 5-step release rollout:

```
Step 1: Deploy code, flag OFF for all.
   ↓ verify no regressions, SigNoz green
Step 2: Enable for internal team (10-20 users).
   ↓ observe 24h, no negative signals
Step 3: 1% random rollout (non-employees).
   ↓ observe 48h, metrics stable
Step 4: 10% → 50% over 2 days.
   ↓ continuous monitoring
Step 5: 100% rollout. Start 4-week cleanup timer.
   ↓ 4 weeks later
Step 6: Remove code + delete flag (CI-enforced reminder).
```

Any step может be reverted если metrics деградируют.

## 15. A/B experiment playbook

```
Pre-registration:
- [ ] Metrics plan (primary + secondary + guardrails) written
- [ ] Sample size calculated (statistical power)
- [ ] Stop criteria pre-agreed (p < 0.01 OR 30 days)
- [ ] Review by data team

Setup:
- [ ] Flag created в GrowthBook с assignmentSeed
- [ ] Variants defined (2-4 max)
- [ ] Guardrail metrics configured
- [ ] Monitoring dashboard prepared

Running:
- [ ] Ramp-up gradually (10% → 50%)
- [ ] Daily-check first week
- [ ] Sample Ratio Mismatch auto-alert
- [ ] Weekly full-report

Stop conditions (any triggers stop):
- Primary metric significantly better (p < 0.01) → scale winner
- Any guardrail crossed threshold → stop immediately
- 30 days reached → stop, analyze
- External event invalidates (big news, holiday)

Post-experiment:
- [ ] Winner rolled to 100% (separate release flag)
- [ ] Loser variant code removed
- [ ] Experiment flag deleted
- [ ] Write-up в docs/experiments/YYYY-MM-DD-<slug>.md
- [ ] Learnings shared (brown-bag)
```

## 16. Flag removal safely

```
Before removal:
- [ ] Flag at 100% для 2+ weeks
- [ ] Metrics stable (no regressions)
- [ ] Code path simplified (no dead branches)

Removal PR:
- [ ] Remove flag check из code
- [ ] Keep "new" branch, delete "old"
- [ ] Update tests
- [ ] Flag deleted from GrowthBook

Verification:
- [ ] Deploy works
- [ ] No runtime errors referencing missing flag
```

**Never**: remove flag while some users still на old code path (checking flag → false for them). Always 100% rollout сначала.

## 17. Flag naming audit

CI-enforced pattern:

```js
// scripts/ci/flag-lint.js
const PATTERN = /^(release|experiment|ops|permission)\.[a-z]+\.[a-z-]+$/

for (const flagName of allFlags) {
  if (!PATTERN.test(flagName)) {
    throw new Error(`Invalid flag name: ${flagName}`)
  }
  
  // Additional checks:
  if (flagName.startsWith('release.') || flagName.startsWith('experiment.')) {
    const age = Date.now() - flag.createdAt
    if (age > 4 * 7 * 24 * 3600 * 1000) {
      warn(`Flag ${flagName} is ${ageDays}d old. Clean up!`)
    }
  }
}
```
