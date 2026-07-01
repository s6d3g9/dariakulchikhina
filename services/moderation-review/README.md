# services/moderation-review

Layer 6 — Governance. Human-in-the-loop queue для edge-cases.

## Что делает

- Case queue per-category per-SLA.
- Assignment rules (random / skill-based для sensitive).
- Review UI с decision options.
- Reviewer well-being tracking (rotating, limits, counselling).
- Quality control (shadow-review 10%, inter-rater agreement).

## Рантайм

- TypeScript, Postgres `moderation_review_db`:
  - `cases` (id, category, content-ref, state, assigned-to, sla-deadline)
  - `decisions` (case-id, reviewer, action, reason, timestamp)
  - `shadow_reviews` (case-id, reviewer-2, action-2) — quality control

## Queues

- CSAM — specialist-only, SLA 30 min.
- Harassment — 1h.
- NSFW-uncertain — 6h.
- Spam / quality — 24h.

## API

```
GET    /queue?category=...                  # for reviewers
POST   /cases/:id/assign
POST   /cases/:id/decide                    # action + reason
POST   /cases/:id/escalate                  # to senior
GET    /reviewer-stats/:userId              # time, accuracy, well-being
```

## Invariants

- No single reviewer decides critical case (mandatory 2-eyes for CSAM).
- Time-per-case tracked.
- Decisions audited.

## Фаза

Фаза 4.
