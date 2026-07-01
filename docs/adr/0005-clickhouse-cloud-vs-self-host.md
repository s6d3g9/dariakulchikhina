# ADR-0005: ClickHouse Cloud vs self-host

- **Статус**: Accepted
- **Дата**: 2026-04-18
- **Решение**: self-host до Фазы 5, ClickHouse Cloud при росте
- **Ответственный**: Platform / Data team

## Контекст

ClickHouse used для:
- Audit-log (WORM compliance-grade).
- Analytics projections.
- Observability (SigNoz backend).

Volume-прогноз: Фаза 3 ≈ 100M events/mo, Фаза 6 ≈ 10B events/mo.

## Альтернативы

### Self-host

- Полный control, cheaper на любом scale.
- Require operational expertise.

### ClickHouse Cloud

- Managed, быстрее setup.
- Expensive: $100/mo minimum, $10K+/mo на scale.

### Snowflake / BigQuery

- Enterprise-scale, но не для audit-log WORM.
- Vendor lock-in.

## Решение

- **Phase 0–4**: self-host 1 instance для Analytics + Audit.
- **Phase 5–6**: оценить migration на ClickHouse Cloud если ops становится проблемой.
- **Audit-log cluster** — всегда **self-hosted + own S3 WORM**, для regulatory reasons (data-residency).

## Revisit

Фаза 5 с metrics ops-hours / incidents.
