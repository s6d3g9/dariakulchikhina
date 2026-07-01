# Incident: <Short descriptive title>

- **Severity**: SEV-X
- **Status**: Resolved | Ongoing | Review
- **Date**: YYYY-MM-DD
- **Duration**: HH:MM UTC → HH:MM UTC (N min)
- **Incident commander**: <name>
- **Slack channel**: #incident-YYYY-MM-DD-<slug>

## Summary (TL;DR)

One-paragraph summary of what happened and impact.

## Impact

### Users affected
- N users / X% of DAU
- Specific cohorts / regions.

### Actions failed
- [Action] — failure rate / count.

### Financial impact
- N revenue lost (approx).
- Refunds / compensations issued.

### SLO impact
- Error budget burned: X%.

## Timeline

Use UTC. Every significant event.

- **HH:MM** — First alert fired (`<alert-name>`).
- **HH:MM** — On-call paged.
- **HH:MM** — IC assigned.
- **HH:MM** — Initial hypothesis: ...
- **HH:MM** — Mitigation attempted: ...
- **HH:MM** — ...
- **HH:MM** — Resolved.
- **HH:MM** — Status-page cleared.

## What happened

Technical narrative.

- System state before incident.
- Triggering change / event.
- Chain of failures.
- User-facing symptoms.

Include diagrams if useful.

## Root cause

Use 5-whys. Example:

1. Why did wallet transfers fail?
   - Because DB connection pool was exhausted.
2. Why was pool exhausted?
   - Because new query didn't close connections properly.
3. Why didn't we catch it in staging?
   - Because staging didn't run with prod load patterns.
4. Why don't we run prod-like load in staging?
   - Because we haven't set up load-testing infrastructure.
5. Why haven't we?
   - Because it was deprioritized after Phase 3 push.

Root cause = item #5 (process/priority), not #1 (code).

## What went well

- ...
- ...

## What didn't go well

- ...
- ...

## Lessons learned

- ...
- ...

## Action items

Concrete, deadlined, owned.

- [ ] [SRE] Add load-testing staging. Due: 2026-05-25. Owner: @alice.
- [ ] [Platform] Review DB connection patterns in wallet service. Due: 2026-05-15. Owner: @bob.
- [ ] [Docs] Add runbook for pool-exhaustion. Due: 2026-05-10. Owner: @carol.

## Supporting material

- Traces: [link]
- Dashboards: [link]
- Slack archive: [link]
