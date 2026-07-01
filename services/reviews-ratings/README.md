# services/reviews-ratings

Layer 3 — Domain Primitive. Универсальные отзывы и рейтинги для любых сущностей (templates, providers, people, places, assets).

## Что делает

- Post review (text + rating 1-5).
- **Only verified reviewers** (purchase / use / interaction доказан).
- Moderation integration (spam, harassment).
- Aggregate ratings (weighted avg, recency-biased).
- Response from reviewed-party.
- Helpfulness votes.

## Рантайм

- TypeScript, Postgres `reviews_db`:
  - `reviews` (id, author, target, rating, text, verified-source-ref, state)
  - `responses` (review-id, response-text, author)
  - `helpfulness` (review-id, voter, vote)
  - `aggregates` — materialized stats per-target

## Anti-abuse

- Verified-purchase/use check перед submitting.
- Rate-limit: 1 review per user per target.
- Trust-safety signals flag brigading.
- Moderation-ml на каждый submit.

## API

```
POST   /reviews                              # submit (verify first)
GET    /reviews/:id
GET    /targets/:id/reviews?sort=recent|helpful&rating=...
POST   /reviews/:id/responses                 # target responds
POST   /reviews/:id/helpful                   # vote
POST   /reviews/:id/report                    # flag
DELETE /reviews/:id                           # user-initiated (own)
```

## Integrations

- **Publishes**: `review-posted/updated/deleted`.
- **Consumed by**: `search` (ranking), `marketplace` (quality signal), `recommendations`.
- **Calls**: `moderation-ml`, `trust-safety`, `audit-log`.

## Phase

Фаза 2.
