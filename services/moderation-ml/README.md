# services/moderation-ml

Layer 3 — Domain Primitive. ML-classification для контента.

## Что делает

- Classify images / text / video / audio по taxonomy (см. `33-content-moderation.md`).
- Return labels + confidence + recommended action.
- Batch API для feed-filtering.
- Pre-filter (heuristic) → ML → escalate to human-review.

## Модели

- **Text**: classifier fine-tuned multilingual.
- **Images**: CLIP + NSFW-detector + harm-classifier.
- **Video**: frame-sampling + audio-classification.
- **Audio**: NSFW-speech + specific-phrase detection.

## Рантайм

- Python (FastAPI + PyTorch / ONNX).
- No persistent DB (stateless classifier service).
- Caching через Redis (content-hash → classification result).

## API

```
POST /classify                           # one item
POST /classify/batch                     # multiple
POST /classify/text
POST /classify/image                     # url or binary
POST /classify/video                     # async, returns job-id
```

## Performance

- Text p95 < 100ms.
- Image p95 < 300ms.
- Video — async, per-minute of content.

## Integrations

- **Publishes**: `app.daria.moderation.classification-completed.v1`.
- **Consumed by**: feed, messenger, media-pipeline, marketplace.
- **Calls**: (none; pure inference).
- **Hands off to**: `moderation-review` если confidence uncertain.

## Фаза

Фаза 2 (text + image basic), Фаза 7+ (video + audio full).
