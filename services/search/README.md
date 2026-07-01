# services/search

Layer 2 — Platform Service. Универсальный поиск по всем kind сущностей.

См. полную спеку: [docs/architecture-v6/42-search-deep-dive.md](../../docs/architecture-v6/42-search-deep-dive.md).

## Что делает

- Принимает text query + context.
- Два-уровневый retrieval:
  - **Meilisearch** — lexical, typo-tolerant.
  - **pgvector** (→ Qdrant в scale) — semantic.
- Policy filtering через `policy-engine`.
- Personalization + re-rank через `services/recommendations`.
- Contextual boosting (focus-aware).
- Voice / visual search (Phase 7+).

## Не делает

- Moderation indexing (→ moderation-ml).
- Business-logic specific ranking (делегирует recommendations).

## Рантайм

- **Language**: TypeScript.
- **Engines**:
  - Meilisearch (MVP, Phase 2)
  - pgvector (MVP)
  - OpenSearch + Qdrant (Phase 7+ scale)

## Индексы (per-kind)

- `users`, `templates`, `communities`, `assets`, `listings`, `places`, `car-models`, `re-objects`, `breeds`, `courses`, `books`.

Refresh: near-real-time consumer из JetStream.

## API

```
POST /search
{
  query: "honda civic spb",
  context?: { userId, focus, region, language },
  filters?: { kind, priceMax, tags, ... },
  pagination: { cursor, limit }
}
→ {
  results: SearchResult[],
  facets: { kind: { car-listing: 15, ... }, region: { ... } },
  nextCursor?: string,
  intent?: ClassifiedIntent        // от intent-classify
}

POST /search/voice                            # audio → STT → search
POST /search/visual                           # image → CLIP → search
POST /search/trending                         # trending queries
```

## Performance targets

- p95 latency < 300ms.
- cache-hit < 50ms.

## Integrations

- **Consumes**:
  - Почти все `app.daria.*` events — для реиндексации.
  - `app.daria.governance.policy-evaluated.v1` — кеш решений.
- **Calls**:
  - `policy-engine.evaluate/batch`
  - `recommendations.rank`
  - `ai-assist.intent-classify` + `re-rank-search`

## Инварианты

- I6 (own DB) — индексы обновляются через events, не прямым DB-доступом.
- I8 — policy filtering всегда применяется.

## Phase

Фаза 2 (MVP Meilisearch + pgvector).

## Статус

Skeleton only.
