# services/observability

Layer 2 — Platform. SigNoz-based observability stack.

См. [docs/architecture-v6/18-observability-ops.md](../../docs/architecture-v6/18-observability-ops.md) для полной спеки.

## Что включено

- **SigNoz** (self-hosted OpenTelemetry backend).
- **ClickHouse** — хранилище (backend для SigNoz).
- **OpenTelemetry Collector** — per-service agent.
- **Dashboards** — шаблонные (см. 18 §6).
- **Alerts** — Prometheus-style rules.
- **Runbooks** — в `docs/runbooks/<alert>.md`.

## Deployment

- Фаза 0: docker-compose.
- Фаза 6: managed k8s deployment.
- **Shared ClickHouse** с audit-log возможно (одна БД, разные tables + access).

## Service → telemetry

Каждый сервис эмитит:
- Traces через OTLP (port 4317/4318).
- Metrics через OTLP metrics.
- Structured logs через OTLP logs.
- Business events (domain-specific) — публикуются в JetStream, consumer пишет в ClickHouse.

## Access control

- All engineers — read access.
- PII-sensitive traces — отдельный RBAC (medical, banking).
- Export — audit-logged.

## Phase

Фаза 0 (config skeleton), Фаза 1 (MVP production).
