# services/recommendations

Layer 3 — Domain Primitive. ML re-ranking для feed, search, marketplace.

## Что делает

- User embeddings (behavior-based).
- Content embeddings (text / images / behavior).
- Re-ranking candidates based on personalization.
- Feed assembly (for-you algorithm).
- Cold-start strategies (see `45-cold-starts.md`).

## Рантайм

- **Python** (FastAPI).
- Feature store: **Feast**.
- Inference: **ONNX Runtime** (fast) / **PyTorch** (training).
- Vector store: pgvector (→ Qdrant per ADR-0003).

## API

```
POST   /rank                                # re-rank candidates
POST   /feed/for-you                       # personalized feed
POST   /similar                             # find similar to item
POST   /embed                               # generate embedding
```

## Integrations

- **Consumes**: `app.daria.*.*` для behavior signals.
- **Called by**: `services/search`, `services/feed`, `services/messenger`.

## Фаза

Фаза 2 (skeleton + classical), Фаза 7+ full ML stack.
