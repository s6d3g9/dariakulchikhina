# Runbooks

Procedural responses to **alerts**. Отличаются от playbooks (для типовых задач) и post-mortems (для прошедших incidents).

Каждый alert-rule в `platform/observability/alerts/*.yaml` обязан иметь связанный runbook.

## Format

`<alert-name>.md` — совпадает с alert id.

```markdown
# Runbook: <alert-name>

## Severity
<SEV-1 | SEV-2 | SEV-3>

## What the alert means
<One paragraph>

## Dashboards
- Link to SigNoz dashboard X

## Immediate actions (in order)
1. ...
2. ...

## Investigation
...

## Common causes
- cause 1 → mitigation
- ...

## Escalation
Who, when.
```

## Существующие runbooks

| Alert | Severity | Runbook |
|---|---|---|
| `wallet-transfer-failure-rate` | SEV-1 | [wallet-transfer-failure-rate.md](wallet-transfer-failure-rate.md) |
| `audit-log-write-failure` | SEV-1 | [audit-log-write-failure.md](audit-log-write-failure.md) |
| `policy-evaluate-latency` | SEV-2 | [policy-evaluate-latency.md](policy-evaluate-latency.md) |
| `timeline-dead-step` | SEV-2 | [timeline-dead-step.md](timeline-dead-step.md) |
| `dlq-accumulation` | SEV-2 | [dlq-accumulation.md](dlq-accumulation.md) |
| `identity-login-failure-rate` | SEV-2/1 | [identity-login-failure-rate.md](identity-login-failure-rate.md) |
| `messenger-ws-connection-spike` | SEV-2 | [messenger-ws-connection-spike.md](messenger-ws-connection-spike.md) |
| `search-zero-results-spike` | SEV-3 | [search-zero-results-spike.md](search-zero-results-spike.md) |

## Обязательность

- Каждый SEV-1 / SEV-2 alert **не имеет** deploy permission без runbook.
- Runbook review — часть alert-creation PR.
- Runbook обновляется после каждого incident.
