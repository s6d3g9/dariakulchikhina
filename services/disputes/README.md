# services/disputes

Layer 3 — Domain Primitive. Универсальный арбитраж: commerce refunds, authorship claims, moderation appeals, rental damages.

## Что делает

- Open disputes (reporter, target, category).
- Collect evidence (automatic + from parties).
- Route в appropriate review (auto / human / escalate).
- Make ruling.
- Trigger compensating actions.

## Use cases

- Purchase dispute (product not as described).
- Subscription refund request.
- Chargeback defense (evidence pack for PSP).
- Copyright claim (`similar-by-scheme` detection).
- Moderation appeal.
- Rental damage-deposit ruling.

## Рантайм

- TypeScript, Postgres `disputes_db`:
  - `cases` (id, category, parties, state)
  - `evidence` (case_id, kind, ref, from)
  - `rulings` (case_id, decision, reason, by)

## Resolution paths

| Category | Typical path |
|---|---|
| Refund request | auto-review (policy) → ruling |
| Copyright claim | human-review → take-down / keep |
| Damage claim | party evidence + auto-analysis → ruling |
| Moderation appeal | senior reviewer → uphold / overturn |

## API

```
POST   /cases                                # open
GET    /cases/:id
POST   /cases/:id/evidence                   # add
POST   /cases/:id/respond                    # counter-party
POST   /cases/:id/rule                       # moderator decision
GET    /users/:id/cases                      # active disputes
```

## Integrations

- **Publishes**: `case-opened/updated`, `ruling-made`.
- **Consumed by**: escrow-service, authorship-registry, subscription-engine, moderation-review, payments (для chargeback defense).

## Фаза

Фаза 2 (basic), Фаза 4+ full.
