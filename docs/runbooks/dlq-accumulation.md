# Runbook: dlq-accumulation

Event consumer DLQ growing.

## Severity
**SEV-2** — downstream services lagging / missing events.

## What it means

`jetstream_consumer_pending{stream="durable-domain"} > 1000 for 10m`.

Events are not being processed / rejected. Downstream state diverges from primary.

## Immediate actions

1. Identify affected consumer (label in metric).
2. Check consumer health.
3. Check recent event-schema changes (possibly breaking?).

## Investigation

```bash
# NATS CLI
nats stream info durable-domain
nats consumer info durable-domain <consumer-name>

# Sample stuck events
nats consumer next durable-domain <consumer-name> --count 5 --raw

# Check DLQ stream
nats stream info durable-domain-dlq
```

## Common causes

### Consumer bug
Handler crashes on specific event shape.
Mitigation: fix bug, reprocess DLQ after.

### Schema breaking change
Producer published event that consumer can't parse.
Mitigation: check `38-event-schema-governance.md` process; either rollback producer или update consumer.

### External dependency timeout
Handler calls external service that's down.
Mitigation: pause consumer until dependency restored.

### Rate overload
Producer spike → consumer can't keep up.
Mitigation: scale consumer replicas, optimize handler.

## DLQ replay

После fix:

```bash
nats consumer reset durable-domain <consumer-name>
# Events from DLQ re-processed
```

Carefully: ensure idempotency otherwise double-processing.

## Escalation

После 2h или > 10K pending → SRE lead.
