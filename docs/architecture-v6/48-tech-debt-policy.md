# 48. Tech Debt Policy

Тех-долг в платформе масштабу v6 — неизбежен. Важно: **управляем осознанно**. Этот документ фиксирует: категории долга, как идентифицируется, как приоритизируется, бюджет payback'а.

## 1. Четыре категории долга

| Категория | Пример | Consequence |
|---|---|---|
| **Deliberate-prudent** | «Запустим с pgvector, Qdrant при scale» | Осознанный trade-off, задокументирован в ADR |
| **Deliberate-reckless** | «Просто ship'им, рефактор потом» | Accepted под deadline, требует ticket immediate |
| **Inadvertent-prudent** | «Тогда мы не знали про X» | Найдено в post-mortem / audit |
| **Inadvertent-reckless** | «Скопипастили из Stack Overflow» | Найдено в review — блокер merge'а |

См. Martin Fowler's Technical Debt Quadrant.

## 2. Discovery mechanisms

### Автоматический

- **Linter**: deprecated APIs, TODO/FIXME comments count.
- **Test coverage** baseline drop.
- **Cyclomatic complexity** warnings.
- **Bundle size** growth.
- **CI slowness** (> 10 min → flag).
- **Dependency outdated**: Dependabot / Renovate.

### Человеческий

- **Post-mortem** action-items.
- **Code review** flagged («OK for now, but...»).
- **Retro**: «что замедлило нас эту неделю?».
- **SRE-ops reports**: frequent firefighting = debt indicator.

### Tagged в коде

```ts
// @tech-debt: replace with TigerBeetle in Phase 6 (see ADR-0007)
// @tech-debt-deadline: 2026-09-01
// @tech-debt-owner: platform-ledger-team
```

Linter scans → tickets auto-created.

## 3. Classification

Каждый debt item получает:

- **Impact**: low / medium / high / critical.
- **Effort**: small (< 1 day) / medium (1-5 days) / large (> 1 sprint).
- **Urgency**: next sprint / this quarter / this year / opportunistic.
- **Category**: above 4 categories.

## 4. Tracking

- Tech-debt items — в том же tracker, что и feature work (метка `tech-debt`).
- Отдельный dashboard «Debt by category / team / age».
- **Debt aging** — ticket open > 6 месяцев → alert team lead.
- **Debt velocity** — сколько добавлено vs закрыто per-sprint.

## 5. Budget

**Правило**: минимум **20% sprint-capacity** на debt-paydown (feature:debt = 4:1).

- High-impact debt — приоритет regardless of % budget.
- Если feature-pressure слишком велик → ADR «we're taking on X debt for Y reason, will pay back by Z».

Refactor-sprints каждые 3 месяца — whole-team focus на debt.

## 6. What NOT to pay back

Некоторый debt — ok **нести**:

- **Proven architectural choices** (Turborepo vs Nx), не debt.
- **Opt-in migrations** (pgvector → Qdrant при scale), не debt till reached threshold.
- **Optimization potential** без actual pain — don't optimize prematurely.

## 7. «Broken-window» rule

Если видишь small debt while working poblizhe — **исправь здесь же** (< 5 min). Broken windows беcконтрольно накапливаются.

## 8. Pay-back strategies

### Strangler (for large legacy)

- New code в parallel.
- Old code gradually used less.
- Remove when unused.

### Big-bang rewrite

- Rarely правильный ответ.
- Only когда spec-first (e.g. v5.3 → v6 migration, `28-migration-from-v5.md`).

### Hammock-driven

- Small incremental cleanups с feature work.
- Don't wait for «refactor sprint».

### Flag-gated refactor

- New version behind feature flag.
- Roll out gradually.
- Remove old code when flag = 100%.

## 9. Specific categories в v6

### Architectural debt

- Сервис накапливает responsibilities > expected.
- Cross-service coupling (I6 violations).
- Action: split sevice / extract primitive.

### Code quality debt

- File > 500 lines (soft limit).
- Function > 120 lines.
- Cyclomatic > 15.
- Action: refactor when next touched.

### Dependencies debt

- Outdated > 6 months.
- Security vulnerabilities.
- Action: Dependabot auto-PRs.

### Documentation debt

- Outdated docs / missing.
- Action: `docs:v6:verify` CI check.

### Operational debt

- Missing runbook.
- Missing monitor.
- Missing backup-test.
- Action: checklist per-service «production-ready».

## 10. Reporting

Monthly «Tech Health Report»:

- Debt items added vs closed.
- Top 10 oldest.
- Budget adherence (% spent on debt).
- Flagship debt project progress.

Shared с exec team, помогает обосновать budget.

## 11. Incentive

- Engineer-lvl goal: «close ≥ 1 debt-ticket per sprint».
- Team-lvl goal: «not grow debt monthly».
- Contrary to «features-only» culture.

## 12. Анти-паттерны

- ❌ **Debt = shame**. Culture, где debt hidden — worse, чем debt acknowledged.
- ❌ **Backlog бомба** — 2000 debt-tickets без prioritization.
- ❌ **Refactor-only-sprints без continuous maintenance**.
- ❌ **«Clean code» dogmatism** — нафиг не перепишем работающее без measurable impact.
- ❌ **Optimization без metrics** — «это медленно» без p99-measurement.
- ❌ **Comment в коде `// TODO: fix this`** без ticket — ignored forever.
- ❌ **Tech debt как blocker для feature-sprint** — не-urgent debt паркуется.
