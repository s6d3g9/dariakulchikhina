# services/policy-engine

Layer 6 — Governance. Runtime policy evaluation: allow / distill / deny по geo / age / KYC / credentials / jurisdiction.

См. [docs/architecture-v6/13-governance-policy.md](../../docs/architecture-v6/13-governance-policy.md) для полной спецификации.

## Что делает

- Принимает `evaluate(context) → decision`: card-types, timeline-engine gate-шаги, feed, search, API middleware.
- Загружает `law-profiles/*.yaml` и `policies/*.yaml` из Git (через Argo CD).
- Компилирует политики в WASM (OPA Wasm) для p99 < 5ms.
- Возвращает `allow` / `distill (mask, replace, require)` / `deny (reason)`.
- Публикует каждое решение в audit-log.
- Batch-evaluate для списков (feed / search).

## Рантайм

- **Language**: TypeScript (wrapper) + Rego (policies) + OPA Wasm (exec).
- **State store**: In-memory WASM-compiled policies; file-watcher перезагружает при update.
- **Audit sink**: JetStream stream `financial-audit` через consumer to ClickHouse.

## API (skeleton)

```
POST   /evaluate                           # single decision
POST   /evaluate/batch                     # массив actions
GET    /policies                            # list of loaded
GET    /policies/:id                        # source + version
GET    /law-profiles/:region                # current profile
POST   /policies/reload                     # ops-only, triggers Argo CD refresh
```

## Контекст запроса

```ts
interface PolicyContext {
  user:   { id, age?, roles, kyc: { level }, credentials: Credential[] }
  region: { code, tz, language, lawProfile }
  action: { type, resource, meta }
  time:   { utc, local, hour, dayOfWeek }
  device: { platform, countryFromIP, vpnDetected }
  entity?: { kind, id, ownerId, tags }
  policyTags: string[]
}
```

## Resolution rules

- Decision precedence: `deny > distill > allow`.
- Multiple distill-masks — **union**.
- Все matching reasons возвращаются пользователю.

## Интеграции

- **Publishes**:
  - `app.daria.governance.policy-evaluated.v1` (каждое решение)
  - `app.daria.governance.law-profile-updated.v1` (при релоаде)
- **Consumed by** (как API):
  - Все card-type panels (distill-маски).
  - `timeline-engine` (gate-шаги).
  - `feed` и `search` (фильтрация).
  - gateway + middleware (authorize).

## Contracts

Zod в `packages/contracts-governance/policy.ts`:
- `PolicyContext`, `PolicyDecision`, `LawProfile`, `DistillMask`

## Performance

- p99 evaluate < 5ms.
- Batch evaluate: 100 items < 30ms.
- Policy reload — hot, без downtime.

## Инварианты

- I8 (runtime governance, not code-branches)
- I17 (audit every decision)
- I18 (governance через hooks, consumers не знают про policies)

## Фаза реализации

Фаза 2 (MVP), боевая нагрузка — с Фазы 3 (первая вертикаль) и далее.

## Статус

Skeleton only.
