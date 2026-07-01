# services/ai-assist

Layer 3 — Domain Primitive. AI-generation + explanation для card-types.

См. [docs/architecture-v6/23-ai-assistance.md](../../docs/architecture-v6/23-ai-assistance.md).

## Что делает

- `generate` task: trip-compose, listing-draft, split-suggest, timeline-step-suggest.
- `explain` task: explain-denial, card-summary, translate.
- PII redaction перед cloud LLM calls.
- Provenance marking на outputs.
- Cost-budgeting per-user.

## Рантайм

- **Python** (FastAPI).
- LLM routing:
  - Cloud: Claude API / OpenAI (primary).
  - Self-hosted: vLLM / Ollama (fallback + PII-sensitive).
  - On-device (mobile): small models через ONNX (Phase 8+).

## API

```
POST   /generate                            # task-based generation
POST   /generate/stream                     # SSE streaming
POST   /explain                             # explain decision / state
POST   /translate                           # translation task
GET    /cost/:userId                        # budget tracking
```

## Invariants

- `provenance` field на каждом output (I18-adjacent).
- No training на user-data без opt-in.
- PII redaction obligatory pre-cloud-call.

## Integrations

- **Publishes**: `ai.generation-completed/failed`.
- **Consumed by**: card-types с `ai:` declaration.
- **Calls**: `policy-engine.evaluate` перед generation.

## Фаза

Фаза 3 (first tasks), Фаза 8+ on-device.
