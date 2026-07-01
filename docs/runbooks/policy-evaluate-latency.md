# Runbook: policy-evaluate-latency

`policy-engine.evaluate` p99 latency exceeds 10ms.

## Severity
**SEV-2** — widespread UX degradation (policy called on almost every request).

## What it means

`histogram_quantile(0.99, policy_evaluate_duration) > 10ms` for 5 min.

Impact: каждое HTTP-request / search / feed-load — slower by ≥ 10ms. User-perceived slowdown.

## Dashboards

- [Policy Engine Overview](placeholder)
- [Service Dependency Latencies](placeholder)

## Immediate actions

1. Check policy-engine health: CPU / memory / Wasm cache status.
2. Check recent policy deployments (`platform/policies/` commits).
3. If spike post-deploy → consider rollback.

## Investigation

```bash
# Check per-policy latency
curl policy.internal/metrics | grep policy_evaluate_duration

# Check Wasm compilation cache
curl policy.internal/debug/cache-stats

# Check evaluation volume (maybe spike)
curl policy.internal/metrics | grep rate
```

## Common causes

### Complex policy deployed
Recent `policies/*.yaml` change has inefficient expressions.
Mitigation: revert or optimize policy (pre-compute attributes).

### Attribute enrichment slow
Policy requires fetching user-attributes from another service (cold).
Mitigation: cache attributes aggressively (Redis).

### Volume spike
Traffic surge overwhelming capacity.
Mitigation: scale up pods, add caching for common decisions.

### Wasm cache miss
Policies reloaded → cold cache.
Mitigation: verify hot-reload is actually hot; pre-warm cache.

## Escalation

After 30 min unresolved → platform-lead.
