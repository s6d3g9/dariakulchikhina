# 23. AI Assistance

AI в v6 — **горизонтальный примитив** (не вертикаль, не фича отдельного экрана). Как `booking` или `wallet`, он доступен любому card-type через унифицированный контракт. Четыре режима: **Generate · Rank · Moderate · Explain**.

Принцип: **AI усиливает грамматику v6, не ломает её**. AI — это ещё один `Action` в ActionBar'е, ещё один `Rank` в поиске, ещё один `Evaluator` в moderation. Никаких «AI-экранов» вне фрактальной структуры.

## 1. Четыре режима

| Режим | Что делает | Где | Примеры |
|---|---|---|---|
| **Generate** | Создаёт контент/структуру | Pattern-engine, creator tools | Сгенерировать trip-compound из «хочу в Стамбул на 3 дня», черновик описания для listing |
| **Rank** | Переупорядочивает/фильтрует | Feed, search, recommendations | Что показать в bottom-panel, в каком порядке results |
| **Moderate** | Классифицирует + предлагает действие | Moderation-ML, trust-safety | NSFW, spam, harmful, fraud-risk |
| **Explain** | Объясняет пользователю | Ошибки, denials, timeline-steps | «Почему action denied», «что делать дальше в timeline» |

## 2. Сервисы

Три отдельных Layer-3 сервиса, каждый специализирован:

| Сервис | Режим | Runtime | Модели |
|---|---|---|---|
| `services/ai-assist` | Generate + Explain | Python (FastAPI) | Claude API / локальные LLM через vLLM |
| `services/recommendations` | Rank | Python | классические (collab filtering) + LLM re-rankers |
| `services/moderation-ml` | Moderate | Python | CLIP / image-classifiers + text-classifiers + LLM |

Все три консьюмят события из JetStream, возвращают ответы через API. Никто из них **не владеет** пользовательскими данными — только обрабатывает по запросу.

## 3. Сервис ai-assist

### Unified contract

```
POST /generate
{
  "task": "trip-compose" | "listing-draft" | "split-suggest" | "timeline-step-suggest" | ...,
  "context": { userId, focus, ... },
  "input": { ... task-specific ... },
  "policyContext": { ... },    // для governance check
  "stream": true               // SSE возможен
}
→ {
  "output": { ... },
  "confidence": 0.87,
  "evidence": [...],           // на чём основано (sources)
  "costCents": 0.42            // телеметрия затрат
}
```

### Tasks (каталог)

| Task | Input | Output | Consumer |
|---|---|---|---|
| `trip-compose` | destination + dates + preferences | compound Pattern-Card graph | Фаза 3 Travel |
| `listing-draft` | photos + user-hints | описание + цена (suggest) | Фаза 4 Creator + Фаза 5 Mobility |
| `split-suggest` | template fork | предложить split-policy | Фаза 4 Creator Economy |
| `timeline-step-suggest` | текущий timeline + контекст | следующий логичный шаг | Фаза 2 Timeline |
| `intent-classify` | natural-language query | kind + action + params | Фаза 3 Search |
| `card-summary` | entity-data | короткий читабельный summary | Фаза 3 Shell |
| `explain-denial` | policy-decision | человекочитаемое объяснение | Фаза 3 Policy |
| `translate` | text + target-lang | translated | Фаза 3 I18n |

### Privacy и governance

- **Никакой training на user-data без opt-in.** Все запросы — inference, не обучение.
- **Policy-engine** вызывается до генерации: пользователь в регионе, где regulation запрещает AI-generated content, получает `distill` / `deny`.
- **PII redaction** перед отправкой в третьесторонний API — user_id → hash, имена → placeholder'ы.
- **Provenance**: каждый AI-generated output помечается `generatedBy: 'ai-assist', model: '...'`. В UI — значок «создано ИИ».
- **Evidence-chain**: на чём основан ответ (templates, user preferences, search results) — возвращается в `evidence[]`.

## 4. Сервис recommendations

### Rank-контракт

```
POST /rank
{
  "candidates": [ { id, kind, features } ],   // from retrieval layer
  "context": { userId, focus, ... },
  "objective": "engagement" | "conversion" | "safety",
  "diversityTargets": { ... },
  "policyContext": { ... }
}
→ [ { id, score, reason }, ... ]
```

### Паттерны

- **Two-tower retrieval + LLM re-rank** — на feed.
- **Collaborative filtering** — на follows / matches (Фаза 7).
- **Content-based** — на templates (форкнуть похожие).
- **Popularity + personalization blend** — на search.

### Feature store

- `services/recommendations` держит **Feast** для features.
- Обновляется consumer'ом из JetStream (behavior events).
- Доступ — только recommendations (по I6).

### Fairness

- Per-user diversity targets: не показывать 10 одинаковых.
- Exposure balance: новые авторы получают baseline-траффик.
- Regional adjustment: policy-engine применяется в re-ranker'е.

## 5. Сервис moderation-ml

### Moderate-контракт

```
POST /classify
{
  "item": { kind: 'text' | 'image' | 'video' | 'audio', data | url },
  "context": { userId, conversationId, cardType, ... }
}
→ {
  "labels": [ { label: 'nsfw', score: 0.94 }, ... ],
  "action": 'allow' | 'review' | 'block',
  "reasons": [...]
}
```

### Pipeline

1. ML-классификация (CLIP / detectron / text-LLM).
2. Threshold check.
3. При неуверенности → эскалация в `moderation-review` (human).
4. Решение → event `app.daria.moderation.ruling.v1`.

### Cost discipline

- Pre-filter: простые heuristics (regex, hash-match известного контента) до LLM.
- Batch-inference для feed-ranking.
- Caching: одни и те же assets не классифицируются дважды.

## 6. AI в card-types (фрактально)

Card-type может **декларировать** AI-capabilities:

```ts
export default defineCardType({
  kind: 'trip-compound',
  ai: {
    generate: { task: 'trip-compose' },
    summarize: { task: 'card-summary' },
  },
  // ...
})
```

Shell автоматически добавляет CTA «Сгенерировать черновик» в ActionBar и «Краткое описание» в HEADER. Никакого vertical-specific UI для AI. Если у card-type нет `ai:` — ничего не показывается.

## 7. User control

Пользователь в settings управляет:
- **AI-suggestions**: on / on-with-confirmation / off.
- **AI-generated content visibility**: show all / show only human / show blended.
- **Training opt-in**: явное согласие на анонимизированный training (default off).
- **Data retention**: сколько prompts/outputs хранится для debugging (default 30 дней).

## 8. Observability для AI (I18 + specific)

Дополнительно к стандартным метрикам:
- `ai.request.cost_cents{task, model}` — бюджетирование.
- `ai.request.latency_ms{task, model}` — p50/95/99.
- `ai.request.rejected_by_policy{reason}` — сколько отфильтровано.
- `ai.output.confidence{task}` — распределение.
- `ai.moderation.override_rate{label}` — human переопределил ML.

Бюджет per-day / per-user configurable, защита от runaway cost.

## 9. Model registry

`packages/ai-models-registry/` (в будущем — отдельный сервис):
- Каталог моделей: name, version, provider, context-window, pricing.
- Routing-rules: какая модель для какого task.
- Fallback-chains: если primary down → secondary.
- A/B-эксперименты: 10% траффика на новую модель.

## 10. On-device AI (будущее)

Для privacy-sensitive задач (medical, banking):
- On-device inference на mobile (Core ML / ONNX Runtime).
- Малые модели для intent-classify, translate, summarize.
- Переход туда в Фазе 8+ (banking), когда появится bandwidth.

## 11. Интеграции

- **Publishes**:
  - `app.daria.ai.generation-completed.v1`
  - `app.daria.ai.generation-failed.v1`
  - `app.daria.moderation.ruling.v1`
  - `app.daria.recommendations.updated.v1`
- **Consumes**:
  - `app.daria.*.*` — тренировочные сигналы для feature store
  - `app.daria.governance.policy-evaluated.v1` — кеш решений
- **Calls**:
  - `policy-engine.evaluate` перед generation
  - `audit-log` через events

## 12. Фазы

- **Фаза 2**: `recommendations` skeleton (classical), `moderation-ml` skeleton.
- **Фаза 3**: `ai-assist` для `trip-compose`, `intent-classify`, `card-summary`, `explain-denial`.
- **Фаза 4**: `split-suggest`, `listing-draft`, full moderation pipeline (NSFW + harmful для фото).
- **Фаза 7**: full recommendations stack (social + video), live re-ranking.
- **Фаза 8+**: on-device AI, privacy-preserving training.

## 13. Антипаттерны

- ❌ AI-экран «Chat with AI» как отдельная вертикаль. AI — action в существующих панелях.
- ❌ Скрытый AI без provenance-маркировки.
- ❌ Обучение на user-data без opt-in.
- ❌ Отправка PII в третьесторонний API без redaction.
- ❌ AI-generated royalty отчисления — автором считается генератор промпта (пользователь), но license строго `CC0` или `CC-BY-AI`.
- ❌ AI без бюджет-контроля на уровне user + platform.
- ❌ Vertical-specific AI-сервисы (travel-ai, dating-ai). Один `ai-assist`.
