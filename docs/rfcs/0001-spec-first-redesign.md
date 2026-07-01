# RFC-0001: Spec-first redesign v5.3 → v6

- **Author**: Architecture Office
- **Status**: Accepted
- **Created**: 2026-04-18
- **Target**: Phase 0 initiation

## Problem

Существующая v5.3 архитектура — monolithic Nuxt app, single Postgres, HMAC-cookie auth, shared/ coupling. Не масштабируется под multi-vertical platform (travel + creator + dating + video + banking + crypto + ...).

Альтернативы:
- Grow v5 incrementally — постепенный крах под новыми verticals.
- Big-bang rewrite — классический anti-pattern, огромный risk.
- Strangler migration — стандарт при live users.

**Ключевое обстоятельство**: у проекта **нет live users**. Strangler-risk (breaking users) отсутствует.

## Proposal

**Spec-first redesign**:

1. **Документируем v5.3 domains** как спеки в `docs/domain/v5-*.md` — что делает, какие inputs/outputs, constraints.
2. **Строим v6 parallel** — чистая архитектура, новые stack (React/Expo/Tauri / TypeScript+Go+Rust+Python / per-service DBs / NATS JetStream / Temporal).
3. **Migrate domain-by-domain** в Phase 2+ на основе спек (не копирование v5-кода).
4. **Archive v5** в `_archive/v5/` после Phase 4 (когда все domains мигрированы).

Без live-traffic concerns — build fresh, reference old.

## Alternatives considered

### (a) Incremental v5 growth

**Plus**: no upfront cost.
**Minus**: architectural debt accumulates. Новые verticals будут hack'ами над existing. 2 years → technical debt insurmountable.

### (b) Big-bang rewrite

**Plus**: clean slate.
**Minus**: usual failure modes (scope creep, stale context, never-shipped).

### (c) Strangler pattern

**Plus**: industry-standard.
**Minus**: overengineered для NO live users. Double-stack complexity без traffic-risk benefits.

### (d) Fresh repo + gradual import

**Plus**: clean start.
**Minus**: loses repo-history, CI, existing tooling.

## Trade-offs

| Aspect | Verdict |
|---|---|
| Timeline | Longer than incremental (fresh build). Shorter than strangler (no dual-stack). |
| Risk | Medium. Spec-review catches most issues. |
| Team continuity | High. Existing team work на same repo, new folders. |
| Learning curve | React+RN+Tauri new. Mitigated by TypeScript-everywhere. |
| Code-reuse | Minimal physical (shared/types → contracts). Logical reuse via specs. |

## Impact

### Affected

- **All teams**.
- **Existing v5.3 features** frozen (maintenance only after Phase 1).
- **Database** — не мигрируется physically (no users anyway).
- **Repository structure** — major reorg (apps/, packages/, services/, platform/).

### Timeline

- Phase 0 (3 weeks): foundation.
- Phase 1 (6 weeks): platform core.
- Phase 2 (8 weeks): domain primitives.
- Phase 3 (10 weeks): first vertical (travel).
- Phase 4 (8 weeks): creator economy + care.
- **Total to first-vertical-in-prod**: ~35 weeks.

### Resources

- Existing team.
- Hiring target: +1 Go engineer, +1 DevOps.

## Success criteria

- End of Phase 3: travel-compound works end-to-end в shell, fractal-harness green, acid-tests T1/T4/T7/T10/T12 pass.
- End of Phase 4: authorship-royalty end-to-end (T3), creator economy demonstrably works.
- Phase 4 exit: v5.3 archived, zero feature-development in v5.

## Questions / concerns

**Q1**: What if new users come DURING Phase 2-3?
**A**: Handle через v5.3 until v6 ready. Migration flow defined (`28-migration-from-v5.md §5`).

**Q2**: How do we keep team productive if "rewrite"?
**A**: Phase 0 делает foundation work immediately useful (Turborepo, design-tokens, OpenAPI). Phase 1-2 — actual platform work producing value.

**Q3**: Won't we forget v5 intent?
**A**: Spec-docs (`docs/domain/v5-*.md`) — это mitigation. They encode intent, not implementation.

## Consensus timeline

- Draft published: 2026-04-18
- Comments open: 1 week
- Final revision: 2026-04-25
- Accepted: 2026-04-26

**Status**: Accepted. Implementation as Phase 0 начало.
