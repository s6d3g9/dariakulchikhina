# 42. Search Deep Dive

Спецификация `services/search`. Универсальный поиск по всем kind сущностей, fractal (результат = `<Item>`, см. `17-fractal-ux.md`), с policy-фильтрацией (`13-governance-policy.md`) и persobnalization (`23-ai-assistance.md`).

См. также: `16-search-and-navigation.md` (UX).

## 1. Архитектура retrieval

Двух-уровневый pipeline:

```
query text
    │
    ▼
[intent-classify]        ← ai-assist (kind + filters + params)
    │
    ▼
[retrieval fan-out]
 ├─► Meilisearch   (lexical, typo-tolerant)
 ├─► pgvector      (semantic, embeddings)
 ├─► Postgres FTS  (for metadata fields)
 └─► (Phase 7+) OpenSearch / Qdrant для scale
    │
    ▼
[candidates (~500-1000)]
    │
    ▼
[policy filter]          ← policy-engine batch evaluate
    │
    ▼
[recommendations re-rank] ← personalization, LLM re-ranker (top 100)
    │
    ▼
[dedup + diversity]
    │
    ▼
[results (~50)]
```

## 2. Index strategy

### Per-kind indices

| Index | Source | Refresh |
|---|---|---|
| `users` | identity events | near-real-time |
| `templates` | pattern-engine events | near-real-time |
| `communities` | messenger events | NRT |
| `assets` (photo/video/code/music) | authorship-registry events | NRT |
| `listings` (inventory items) | inventory events | NRT |
| `places` (POI catalog) | location service | daily batch |
| `car-models` / `re-objects` / `breeds` / `courses` / `books` | per card-type type-catalog | daily batch |

**Rule**: никогда не шарим один index между kind. Per-kind schema optimized.

### Field strategy в Meilisearch

```json
{
  "searchableAttributes": ["title", "summary", "tags", "author_name", "keywords"],
  "filterableAttributes": ["region", "lang", "license", "price_cents", "kind", "created_at"],
  "sortableAttributes": ["score", "created_at", "popularity"],
  "displayedAttributes": ["id", "title", "summary", "author_id", "thumbnail", "score"],
  "synonyms": { "car": ["auto", "automobile", "машина"], ... },
  "stopWords": ["the", "a", "и", "или"]
}
```

Synonyms / stopWords per-language.

## 3. Semantic embeddings

`pgvector` index in `services/recommendations`:

- **Content embeddings**: title + summary + first-N chars → 384-dim via `sentence-transformers`.
- **User embeddings**: behavior-based (recently engaged items) → same space.
- **Query embeddings**: runtime via on-CPU model (fast, <50ms).

Similarity: cosine.

**Phase 5+**: pgvector → Qdrant при > 10M vectors (см. ADR-0003).

## 4. Intent classify (AI-assisted)

Query → parsed intent:

```json
{
  "raw": "honda civic до 1млн в спб",
  "intent": { "kind": "car-listing", "filters": { "model": "honda civic", "price_lt": 1000000, "region": "spb" } },
  "confidence": 0.91
}
```

Modes:
- **Extract mode** (default) — regex + small LLM.
- **Full LLM mode** — при ambiguous.
- **Fallback** — если confidence < threshold → full-text без фильтров.

## 5. Ranking signals

### Lexical (Meilisearch)

- BM25 score (built-in).
- Typo tolerance (2 edits default).
- Prefix matching.

### Semantic (pgvector)

- Cosine similarity query ↔ content.

### Personalization

- User × content embedding similarity.
- User's recent engagement patterns.
- Social signals (friends also interacted with).

### Freshness

- `created_at` decay (e.g. exp(-days_since / 30)).

### Quality

- Completion-rate, rating, review-count, refund-rate^-1.

### Diversity penalty

- Avoid showing 5 similar items in top-10.

### Final formula (simplified)

```
score = 0.35 * semantic_cosine
      + 0.25 * lexical_bm25_normalized
      + 0.15 * personalization
      + 0.10 * freshness
      + 0.10 * quality
      - 0.05 * diversity_penalty
```

Final top-100 через LLM re-ranker (AI-assist task `re-rank-search`) — возвращает top-50 с explanation per-item.

## 6. Policy filter

**Critical**: перед re-ranker — policy-engine batch evaluate removes/masks results.

Batch API `/policy/evaluate/batch`:
```json
{
  "actions": [
    { "action": "search.show", "resource": { "kind": "template", "id": "tpl_123" } },
    ...
  ]
}
```

Results filtered:
- `deny` → removed entirely.
- `distill` → mask fields / warn tag.
- `allow` → passes through.

## 7. Contextual (focus-aware) boosts

Если user ищет внутри контекста (focus = entity):

- Open car profile, search «масло» → boost masла для этой модели.
- Open trip-compound Istanbul, search «restaurant» → boost рестораны в Stambul.

Implemented как additional scoring term based on `focus.kind` + `focus.id` tags.

## 8. Voice search (Phase 7+)

Pipeline:

```
mic audio → STT (Whisper-local или cloud)
         → same /search?q=<transcript> endpoint
         → optional: voice-response TTS
```

On-device Whisper preferred для privacy.

## 9. Visual search (Phase 7+)

Pipeline:

```
user photo → CLIP embedding (on-device or server)
          → search by embedding similarity в assets/listings
          → results
```

Examples:
- Photo of sneakers → find similar listings.
- Photo of dog → find breed.
- Photo of dish → find recipe.

## 10. Search as Pattern-Card

`search` — это mode инверсии shell'а. Focus = `{kind: 'search', id: <query-hash>, view: 'instance'}`. Панели:

- Top: saved-searches / search-history.
- Left: filters (kind / region / lang / price).
- Right: suggestions / refinements.
- Bottom: related-feed.
- Center: results grid.

Фрактально.

## 11. Privacy

- PII не индексируется (только publicly-visible).
- Medical / banking instance-data — **никогда** в search.
- Per-user search-history — encrypted per-user, не shared.
- Aggregate query-popularity — anonymized, used for ranking / trend-detection.

## 12. Performance targets

| Metric | Target |
|---|---|
| End-to-end latency p95 | < 300ms |
| Lexical retrieval | < 50ms |
| Semantic retrieval | < 100ms |
| Policy batch filter | < 30ms |
| LLM re-rank top-100 | < 150ms |
| Cold start (new query) | < 500ms |
| Cache hit | < 50ms |

## 13. Caching strategy

- Query-level cache: identical query + user-context → Redis, 5 min TTL.
- User-embedding cache: hourly refresh.
- Personalization-features cache: 10 min.
- Popular queries — pre-computed daily, served immediately.

## 14. Trend detection

Для ranking / notifications:

- Rolling 1h / 24h / 7d query-volume per term.
- Sudden spike detection (z-score > 3) → trending.
- Published как `app.daria.search.trending-updated.v1` event.

## 15. Метрики

- `search.query.count{kind,region,language}`
- `search.latency_ms{stage}` (intent / retrieval / policy / rerank / total)
- `search.result.click_rate` (user clicked at least one result)
- `search.result.position_clicked` (avg click position — lower = better)
- `search.zero-results-rate` (queries with no results — product signal)
- `search.refinement-rate` (user immediately refines — query-understanding issue)
- `search.cost.llm_rerank_cents` — AI-cost budget

## 16. Антипаттерны

- ❌ Single giant index для всех kind.
- ❌ Server-side filter «for security» вместо policy-engine.
- ❌ Cache personalized result без user-key.
- ❌ LLM re-rank каждого query (cost explode) — только top-N.
- ❌ Ранжирование по popularity без fairness (rich-get-richer).
- ❌ Voice-search sending audio в cloud без user-consent.
- ❌ Search без query-analytics (не улучшается).
- ❌ Cached stale private-data.
