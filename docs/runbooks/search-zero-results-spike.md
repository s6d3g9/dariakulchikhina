# Runbook: search-zero-results-spike

Abnormal rate of searches returning 0 results.

## Severity
**SEV-3** — UX degradation but not outage.

## What it means

`search.zero-results-rate > 20%` for 15 min.

Indicates:
- Search index broken / stale.
- Index-rebuild in progress.
- Users looking for content we don't have (possibly policy-filtered).
- Bug in query parsing.

## Investigation

```bash
# Current zero-results rate
curl search.internal/metrics | grep zero_results

# Index state
curl meilisearch.internal/indexes/<kind>/stats

# Policy filtering rate (denies)
curl policy.internal/metrics | grep 'effect="deny"'

# Sample recent zero-result queries (anonymized)
curl search.internal/analytics/zero-results?limit=20
```

## Common causes

### Stale index
Consumer lagging / stopped → index не updates.
Mitigation: check consumer lag, restart if needed, reindex.

### Policy over-filtering
Recent policy change filtering more strictly than intended.
Mitigation: review policy, adjust.

### Typo / language issue
Queries have unusual patterns (script mismatch).
Mitigation: improve synonyms, check language-detection.

### Bug in query parsing
Recent code change.
Mitigation: rollback.

### Attack (enumeration attempts)
Scraping / brute-force enumeration.
Mitigation: trust-safety evaluation, rate-limit.

## Escalation

After 1h unresolved → search-team lead.
Если spike coincides with attack signals → security on-call.
