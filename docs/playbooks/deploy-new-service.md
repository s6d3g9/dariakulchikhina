# Playbook: deploy-new-service

Пошагово выкатить новый `services/<name>/` в prod (Phase 6+ через Argo CD).

## Prereq

- [ ] Service — horizontal primitive (I1).
- [ ] Contracts в `packages/contracts-<layer>/`.
- [ ] Events в `packages/events/domains/<name>/`.
- [ ] Runbooks для ожидаемых alerts.
- [ ] README с integrations detail.

## Шаги

### 1. Scaffold

```bash
pnpm create service <name> --layer <2|3|6> --runtime <ts|go|python|rust>
```

Создаёт:
- `services/<name>/` с package.json, src/, Dockerfile, README.
- `packages/contracts-<layer>/<name>.ts` skeleton.
- DB-migration templates.
- Helm chart template.

### 2. Implement

- Business logic.
- API endpoints (OpenAPI generated).
- Event publishers / consumers.
- Idempotency + OCC где применимо (I9, I16).

### 3. Schemas и миграции

- Drizzle schemas (если TS) → `services/<name>/src/db/`.
- `pnpm db:generate` → SQL миграция.
- Review SQL carefully (особенно cross-tenant).

### 4. Observability

Каждый сервис обязан эмитить (I18):
- RED metrics (rate/errors/duration).
- Standard span names.
- Structured JSON logs.
- Business events в JetStream.

Создай Dashboard используя Standard Service Dashboard template.

### 5. Runbooks

`docs/runbooks/<service>-<alert>.md` — для каждого planned alert.

### 6. CI integration

- Unit tests.
- Contract tests (против OpenAPI).
- Integration test через docker-compose.

### 7. Deployment manifests

- `platform/k8s/<name>/` — Helm chart.
- Argo CD application spec.
- HPA (horizontal pod autoscaler) rules.
- NetworkPolicy (ingress / egress).
- Resource limits (requests + limits).

### 8. Secrets

- Secrets в Infisical под `services/<name>`.
- No hardcoded.
- Rotation schedule.

### 9. Deploy

```
1. PR merged → CI builds image + signs (cosign)
2. Argo CD detects → deploys to staging
3. Smoke-tests pass
4. Manual approval в Argo
5. Deploy to prod (canary 10% → 50% → 100%)
6. Monitor metrics first 24h
```

### 10. Post-deploy

- [ ] Update `docs/architecture-v6/07-layered-architecture.md` если новый entry.
- [ ] Update `services/README.md` каталог.
- [ ] CODEOWNERS обновлён.
- [ ] Team-topology (`26`) updated если owner-squad новый.

## Rollback

- Argo CD rollback к previous version.
- Compensating-migrations если db-schema changed.
- Audit-log запись.

## Common mistakes

- ❌ No health endpoint.
- ❌ No readiness probe.
- ❌ Secrets в Dockerfile / k8s manifest plain.
- ❌ No resource limits → OOM cluster.
- ❌ No NetworkPolicy → exposed unintentionally.
- ❌ Forgot to register в services/README.md.
- ❌ No runbook для production alerts.
