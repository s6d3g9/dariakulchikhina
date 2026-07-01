# 50. Release Management

Как релизим код в prod: versioning, release trains, hotfix policy, deprecation communications. Дисциплина, чтобы масштабная платформа оставалась предсказуемой.

## 1. Release cadence

| Component | Cadence | Type |
|---|---|---|
| **Platform services** (backend) | Continuous (per-PR after CI) | Rolling through Argo CD |
| **Shell-web** | Continuous | Atomic deploy (Next.js) |
| **Shell-mobile** (Expo OTA) | Weekly | OTA updates (JS bundle) |
| **Shell-mobile** (native) | Monthly | App Store / Play Store |
| **Shell-desktop** | Monthly | Tauri auto-update |
| **Public API** | Quarterly | Major / minor versions |
| **Card-types (packages)** | Per-PR | Package-version bumps via changesets |

## 2. Versioning

### Semantic versioning (semver)

Applied к:
- `packages/*` — npm-style versions.
- Public API — path-based v1/v2/v3.
- Services images — image:major.minor.patch.

### Internal services — deploy-centric

Services don't have «version» как такое — они continuously-deployed. Identified by commit-SHA + timestamp + deployment-id в SigNoz.

## 3. Release trains

Large coordinated releases:

- **Monthly shell release**: coordinated mobile + desktop + новые card-types.
- **Quarterly platform release**: DB migrations, breaking-ish changes dual-deployed.
- **Phase-gate release**: milestones из `02-phases.md`.

## 4. Pre-release stages

```
Developer PR → CI green → Merge to main
  │
  ▼
Dev environment (auto, on every merge)
  │
  ▼
Staging (auto, after CI)
  │
  ▼
Canary (10% prod traffic, monitored)
  │
  ▼
Gradual roll-out (25% → 50% → 100% over hours/days for big changes)
  │
  ▼
Full prod
```

## 5. Canary criteria

Перед переходом с canary на gradual:

- [ ] Error rate canary ≤ error rate control × 1.2.
- [ ] p95 latency ≤ control × 1.1.
- [ ] No spike в alert-rate.
- [ ] Custom business-metric regression checks.

If any fail → auto-rollback via Argo CD.

## 6. Hotfix policy

### Definition

- **Hotfix** = urgent fix for production-affecting issue (SEV-1 / SEV-2).
- Bypasses некоторые processes, но **не** skipsт CI.

### Flow

```
Issue reported / detected
  ▼
Incident started
  ▼
Fix branch from main
  ▼
PR-review (minimum 1 reviewer)
  ▼
CI runs
  ▼
Fast-track deploy (canary 30 min → 100%)
  ▼
Post-mortem required
```

### What hotfixes skip

- Feature-flag rollout gradual (если fix — kill-switch).
- Lower-priority reviews.
- Non-critical tests (только related).

### What hotfixes DON'T skip

- CI (tests + linter).
- Signed commits.
- At least 1 review.
- Audit-log.
- Post-mortem.

## 7. Feature flags как release-tool

Large feature releases — **always** behind feature flag:

1. Deploy code dark (flag off).
2. Enable for internal team.
3. 1% → 10% → 50% → 100% based on metrics.
4. Remove flag code after 100% stable.

Лучше, чем branches / deploys:
- Instant rollback без redeploy.
- Per-user targeting (beta).
- A/B framework ready.

## 8. Deprecations

### Timeline

- **Minor change**: 30 days notice.
- **Major breaking**: 90 days minimum.
- **Public API**: 12 months minimum (см. `46-public-api.md`).

### Communication

- Changelog entry.
- Email to affected users / integrators.
- In-app banner (for user-facing).
- Deprecation warning in logs / API responses (`Sunset: <date>` header).
- Post в status-page.

## 9. Release notes

Каждый release (monthly shell / quarterly platform) — public release-notes:

```markdown
# Release 2026.05

## Новое
- ...

## Улучшения
- ...

## Исправления
- ...

## Устарело
- ...

## Известные проблемы
- ...

[Full changelog: link]
```

Published на `docs.daria.app/releases`.

## 10. Coordination

- **Freeze windows** for major events (Black Friday, holidays) — no non-critical releases.
- **Release calendar** public для integrators.
- **Release stand-up** monthly (all leads).

## 11. Rollback

- **Argo CD rollback** по одной команде к previous version.
- **DB migrations** — reversible если возможно; если нет — forward-only с documented pre-deploy-state.
- **Event schema changes** — breaking→dual-publish (см. `38-event-schema-governance.md`).

## 12. Mobile app store releases

Specific constraints:
- Apple review 1-7 days.
- Google Play review 1-3 days.
- Mandatory update mechanism (критический security).
- OTA updates через Expo covers most cases (без store re-review).

Policy: major features через OTA, structural changes через store release.

## 13. Metrics

- `releases.deployment-frequency` (per service).
- `releases.lead-time` (commit → prod).
- `releases.change-failure-rate` (deployments causing incident).
- `releases.mttr` (incident → resolution).

DORA metrics — industry standard. Target: elite (frequent, fast, reliable).

## 14. Антипаттерны

- ❌ Big-bang releases раз в полгода.
- ❌ Hotfix без post-mortem.
- ❌ Feature flag permanent → zombie.
- ❌ Release notes только internally — users должны знать.
- ❌ Store release без OTA fallback для critical fixes.
- ❌ Manual deploy bypassing Argo CD.
- ❌ No canary — straight to 100%.
- ❌ Release на Friday evening без on-call coverage.
