# services/pattern-engine

Layer 3 — Domain Primitive. Композиция, fork, версии, template-marketplace для Pattern-Card.

См. [docs/architecture-v6/12-pattern-composition.md](../../docs/architecture-v6/12-pattern-composition.md) для спецификации.

## Что делает

- Хранит Pattern-Card'ы трёх видов: `atomic`, `compound`, `template`.
- Управляет композицией: children + bindings (sequential / parallel / conditional / optional / replicated).
- Fork operations: копия graph с lineage-ссылкой на parent.
- Publish-as-template: заморозка Pattern-Card как template с license + split-policy.
- Материализация template → instance (с подстановкой параметров пользователя).
- Интеграция с `authorship-registry` (автор, royalty) и `timeline-engine` (каждая card — свой timeline).

## Рантайм

- **Language**: TypeScript (Node).
- **State store**: Postgres `pattern_db`:
  - `patterns` (id, kind, card_type, params_json, owner)
  - `pattern_children` (parent_id, child_id, binding_json, slot)
  - `lineages` (template_id, parent_template_id, relation='fork')
  - `versions` (template_id, version, graph_json, published_at)

## API (skeleton)

```
POST   /patterns                            # create atomic or compound
GET    /patterns/:id                         # full graph
POST   /patterns/:id/add-child               # add child with binding
POST   /patterns/:id/fork                    # fork from template
POST   /patterns/:id/publish-as-template     # freeze + register authorship
GET    /templates/:id/materialize            # create instance from template
GET    /templates?kind=&author=&license=     # marketplace browsing
```

## Интеграции

- **Publishes**:
  - `app.daria.pattern.created.v1`
  - `app.daria.pattern.forked.v1`
  - `app.daria.pattern.published-as-template.v1`
  - `app.daria.pattern.materialized.v1`
  - `app.daria.pattern.child-added.v1`
- **Consumes**: —
- **Calls**:
  - `authorship-registry.publishTemplate` при publish
  - `timeline-engine.start` при materialize
  - `policy-engine.evaluate` при materialize (compound-level gates)

## Contracts

Zod в `packages/contracts-domain/pattern.ts`:
- `PatternCard`, `PatternBinding`, `PatternRef`, `LineageEdge`

## Инварианты

- I4 (event-first)
- I6 (own DB)
- I17 (patterns → audit)

## Фаза реализации

Фаза 2 (primitive). Первое боевое использование — Фаза 3 (travel-compound, первый template).

## Статус

Skeleton only.
