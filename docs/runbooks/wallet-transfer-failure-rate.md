# Runbook: wallet-transfer-failure-rate

Rate of failed wallet transfers exceeds threshold.

## Severity
**SEV-1** — financial integrity.

## What it means

Alert triggered when `rate(errors{service="wallet",op="transfer"}[5m]) > 0.001` (> 1 error per 1000 successful transfers per minute).

This is critical because:
- May indicate data-integrity issue в ledger.
- Money может not be flowing correctly.
- User impact: failed payments / royalty distributions / refunds.

## Dashboards

- [Wallet Service Overview](placeholder-signoz-url)
- [Wallet Transfer Dashboard](placeholder-signoz-url)
- [Financial Audit Stream](placeholder-signoz-url)

## Immediate actions (in order)

### 1. Stop the bleeding (within 5 min)

```bash
# Enable circuit-breaker
curl -X POST -H 'Authorization: Bearer $ADMIN_TOKEN' \
  https://feature-flags.daria.internal/flags/ops.wallet.circuit-breaker-enabled/enable
```

Это блокирует new transfers, но не cancels in-flight.

### 2. Assess scope (within 10 min)

- Какие transfer-types failing?
- Какие users affected?
- Is TigerBeetle healthy? (check health-check)
- Is Postgres healthy? (для ledger pre-Phase 6)

### 3. Communicate

- Status-page update.
- Slack #incidents channel.
- If impact > 100 users or > $10k frozen → phone-page exec.

## Investigation

```bash
# Check recent error samples
kubectl logs -l app=wallet --since 10m | grep -i error | head -50

# Check ledger health
curl wallet.internal/health/deep

# Check TigerBeetle connection (если Phase 6+)
curl wallet.internal/health/tigerbeetle

# Check DB connection pool
curl wallet.internal/metrics | grep pool
```

## Common causes

### DB connection exhausted
Symptom: many errors same time, connection-timeout.
Mitigation: increase pool size, restart pod(s) с leak.

### TigerBeetle partition
Symptom: specific-side failures.
Mitigation: Raft status check, promote replica if needed.

### Invalid transfer inputs (bug in caller)
Symptom: errors on specific transfer-types.
Mitigation: feature-flag каллер сервиса off, fix code, redeploy.

### Insufficient funds (data issue)
Symptom: specific users, specific amounts.
Mitigation: reconciliation audit, restore from backup if corrupted.

### Currency-conversion service down
Symptom: cross-currency transfers failing.
Mitigation: fix FX-rate service, fallback to cached rate.

## Escalation

- **After 15 min, no resolution**: on-call platform-lead.
- **After 30 min**: CTO + CFO.
- **Any suspected data-integrity issue**: security on-call IMMEDIATELY.

## Post-mortem requirements

SEV-1 financial — post-mortem mandatory within 72h. Must include:
- Full ledger audit (count rows, sum balances).
- Affected user list.
- Reconciliation plan.
- Compliance notification status.

## Prevention

- Tighten monitoring thresholds.
- Add specific assertion tests в CI для transfer-integrity.
- Improve reconciliation-job to run more frequently.
