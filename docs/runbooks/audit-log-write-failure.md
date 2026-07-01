# Runbook: audit-log-write-failure

Audit log writes failing.

## Severity
**SEV-1** — any failure = regulatory risk (audit-log is WORM compliance-grade).

## What it means

`rate(errors{service="audit-log"}[1m]) > 0`. ANY failure triggers SEV-1.

## Immediate actions

1. **Isolate**: don't lose events. Pause consumers that would publish new events if можно (не обязательно).
2. Check ClickHouse cluster health.
3. Check S3 cold-tier access (WORM).
4. Notify security + compliance immediately.

## Investigation

```bash
# Audit-log service
kubectl logs -l app=audit-log --since 10m | grep error

# ClickHouse health
curl clickhouse.internal:8123/ping
# Check disk space
curl clickhouse.internal:8123/ --data 'SELECT * FROM system.disks'

# S3 cold-tier
aws s3 ls s3://audit-log-cold-tier/ --summarize | tail -5
```

## Common causes

### ClickHouse full
Disk full — writes blocked.
Mitigation: provision storage immediately; cold-tier archive old.

### ClickHouse replica split-brain
Partition during write.
Mitigation: force primary election; validate integrity.

### S3 access revoked
IAM / creds issue.
Mitigation: rotate creds; verify access.

### Schema incompatibility
Recent event-schema change broke parser.
Mitigation: revert schema change (see `38-event-schema-governance.md`).

## Risk management

If we **cannot** write audit events:
- **Never drop events** — buffer locally (disk queue), retry indefinitely.
- **Notify compliance** — lost events may require regulator report.
- **Preserve evidence** — logs of WHICH events couldn't be written.

## Escalation

**IMMEDIATELY**:
- Security on-call.
- CTO.
- CFO (if financial events affected).
- Compliance officer.

## Post-incident (mandatory)

- Compliance review: do we need to report to regulator?
- Review: did we lose any events? (hash-chain integrity check).
- Plan: prevent reoccurrence.
