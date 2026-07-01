# RFCs (Requests for Comments)

Preceedence для крупных изменений:

```
Idea → RFC → discussion → revise → accept/reject → implementation → ADR
```

## Когда нужен RFC

- New service / vertical / card-type seеding > 2 weeks work.
- Architectural shift.
- Cross-team change.
- Rethinking existing invariant.
- Non-trivial performance/cost change.
- Rethink data-model.

## Когда RFC НЕ нужен

- Bug fix.
- Additive-only change.
- Small feature (< 1 week).
- Тех-debt cleanup.

## Format

`NNNN-<slug>.md`:

```markdown
# RFC-NNNN: <Title>

- **Author**: <team + name>
- **Status**: Draft | In review | Accepted | Rejected | Superseded by RFC-MMMM
- **Created**: YYYY-MM-DD
- **Target**: <phase / milestone>

## Problem

Что болит? Кого?

## Proposal

What we propose. Include diagrams если помогут.

## Alternatives considered

What else, why not.

## Trade-offs

Cost / complexity / risk.

## Impact

- Affected services / teams.
- Timeline estimate.
- Resource needs.

## Success criteria

How will we measure if this was right decision?

## Questions / concerns

Known unknowns.

## Consensus timeline

- Draft published: DATE
- Comments open: 1-2 weeks
- Final revision: DATE
- Decision by: DATE
```

## Процесс

1. Author opens PR с новым RFC в статусе `Draft`.
2. Notify relevant teams — Slack post, weekly eng-meeting mention.
3. Review period **минимум 1 week** (major: 2-3 weeks).
4. Revisions based on feedback.
5. Decision: accept / reject / revise.
6. If accepted → implementation PR.
7. После implementation → ADR captures final design.

## Существующие RFC

| № | Title | Status |
|---|---|---|
| [0001](0001-spec-first-redesign.md) | Spec-first redesign v5.3 → v6 | Accepted |

RFC'ы появляются по мере необходимости больших решений.
