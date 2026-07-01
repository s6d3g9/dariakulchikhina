# Runbook: timeline-dead-step

Timeline steps stuck в failed state without progression.

## Severity
**SEV-2** — user-facing (their processes frozen).

## What it means

`count(timeline_step_status="failed", age > 1h) > 10` — многие timelines застряли.

## Immediate actions

1. Identify affected timeline-type (look at labels).
2. Check Temporal worker health.
3. Check integrations health (external APIs не падают?).

## Investigation

```bash
# Temporal Web UI
open http://temporal.internal:8080/namespaces/daria/workflows

# Failed workflow listing
temporal workflow list --query 'ExecutionStatus="Failed"'

# Specific workflow history
temporal workflow describe --workflow-id <id>
```

## Common causes

### External dependency down
E.g. GDS для travel timelines.
Mitigation: retry with backoff; implement circuit-breaker; notify users if prolonged.

### Worker crashing
Check pod logs + memory pressure.
Mitigation: restart workers, investigate memory leak.

### Handler bug
Recent deploy introduced error.
Mitigation: rollback recent deploy.

### Non-idempotent handler (I16 violation)
Retries produce errors.
Mitigation: make handler idempotent, manually resume stuck workflows.

### Policy-engine denies inside gate
User KYC regressed, gate now fails.
Mitigation: review per-user.

## Resume workflow

```bash
temporal workflow signal --workflow-id <id> --name retry
# or cancel and let user restart
temporal workflow cancel --workflow-id <id>
```

## Escalation

After 1h with > 50 stuck timelines → engineering manager.
