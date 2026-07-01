# Phase 0 / Week 1 / Tuesday: Git + CI skeleton

Цель: базовый CI pipeline, который запускается на каждый PR и блокирует merge при errors.

## Шаг 1: Git hooks установка

Скопировать существующие hooks (v5.3 has `.githooks/`):

```bash
# Verify hooks directory exists
ls .githooks/
# post-commit  pre-commit  ...

# Ensure hooks installed
git config core.hooksPath .githooks
```

Verify auto-sync работает:
```bash
git commit --allow-empty -m "test: git hooks working"
# Should auto-push если branch has upstream
```

## Шаг 2: Branch protection на main

Через GitHub UI или CLI:

```bash
gh api repos/:owner/:repo/branches/main/protection \
  --method PUT \
  --field required_status_checks[strict]=true \
  --field required_status_checks[contexts][]='validate' \
  --field required_status_checks[contexts][]='test-unit' \
  --field required_status_checks[contexts][]='build-services' \
  --field enforce_admins=false \
  --field required_pull_request_reviews[required_approving_review_count]=1 \
  --field required_pull_request_reviews[dismiss_stale_reviews]=true \
  --field restrictions=null
```

Или руками:
- Settings → Branches → Add rule `main`
- Require status checks: `validate`, `test-unit`, `build-services`
- Require PR approval (1 reviewer minimum)
- Require signed commits (recommended)

## Шаг 3: GitHub Actions базовый workflow

Create `.github/workflows/ci.yml` — минимальный MVP (полный из `docs/implementation/ci-workflows/ci-main.yml` позже в Week 3):

```yaml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  validate:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Install
        run: pnpm install --frozen-lockfile

      - name: Lint errors
        run: pnpm lint:errors

      - name: Typecheck
        run: pnpm turbo:typecheck

      - name: Docs verify
        run: pnpm docs:v5:verify
```

## Шаг 4: CODEOWNERS

Create `.github/CODEOWNERS`:

```
# Default — любой PR требует arch-office review пока team maly
*       @arch-office

# Platform / Infrastructure
/services/identity/            @platform-identity @arch-office
/services/wallet/              @platform-ledger @arch-office
/services/gateway/             @platform-infra
/services/events/              @platform-event-bus
/platform/                     @infra-platform

# Domain primitives
/services/pattern-engine/      @domain-platform
/services/timeline-engine/     @domain-platform
/services/booking/             @domain-platform
/services/authorship-registry/ @domain-platform
/services/ownership-registry/  @domain-platform
/services/subscription-engine/ @domain-platform

# Governance
/services/policy-engine/       @security @compliance
/services/audit-log/           @security @compliance
/platform/law-profiles/        @compliance
/platform/policies/            @compliance

# Card-types
/packages/card-types/          @arch-office

# Shell + UI
/apps/shell-web/               @shell-team
/apps/shell-mobile/            @shell-team
/packages/shell-core/          @shell-team
/packages/shell-panels/        @shell-team
/packages/ui-react/            @shell-team @design-system
/packages/ui-native/           @shell-team
/packages/design-tokens/       @design-system

# Events + contracts
/packages/events/              @platform-event-bus @arch-office
/packages/contracts-platform/  @platform
/packages/contracts-domain/    @domain-platform
/packages/contracts-governance/ @security @compliance

# Tooling
/scripts/codegen/              @dx-team
/.github/                      @dx-team @arch-office

# Architecture / docs
/docs/architecture-v6/         @arch-office
/docs/adr/                     @arch-office
/docs/rfcs/                    @arch-office
/docs/playbooks/               @dx-team @arch-office
/docs/runbooks/                @sre-team
/docs/implementation/          @arch-office
```

Team names — placeholders. Заменить на реальные GitHub team handles по мере hiring.

## Шаг 5: PR template

Create `.github/pull_request_template.md`:

```markdown
## Summary

<!-- 1-2 sentences: what and why -->

## Related

<!-- Links to ADR, RFC, issues, or spec docs -->

## Changes

<!-- Bullet points of what's done -->

## Invariant impact

Does this PR touch architectural invariants (I1-I23)?

- [ ] None (cosmetic / internal change)
- [ ] Maintains existing invariants
- [ ] Introduces new invariant (ADR attached)
- [ ] Requires waiver (ADR attached)

## Test plan

- [ ] Unit tests added/updated
- [ ] Integration tests (if cross-service)
- [ ] Fractal-harness (if card-type)
- [ ] Contract test (if public API)
- [ ] Manual verification steps:

## Checklist

- [ ] CI green
- [ ] Docs updated (if scope > bug fix)
- [ ] Changelog entry (if user-facing)
- [ ] Related tracker-ticket linked
```

## Шаг 6: Issue templates

Create `.github/ISSUE_TEMPLATE/bug.yml`:

```yaml
name: Bug report
description: Report a production or staging bug
labels: [bug]
body:
  - type: markdown
    attributes:
      value: |
        Please include trace-id if you have one (from SigNoz).
  - type: dropdown
    id: severity
    attributes:
      label: Severity
      options:
        - SEV-5 (info)
        - SEV-4 (cosmetic)
        - SEV-3 (minor, has workaround)
        - SEV-2 (major, degraded functionality)
        - SEV-1 (critical, outage/data-loss)
    validations:
      required: true
  - type: input
    id: trace-id
    attributes:
      label: Trace ID
      description: From SigNoz, if available
  - type: textarea
    id: what-happened
    attributes:
      label: What happened
    validations:
      required: true
  - type: textarea
    id: expected
    attributes:
      label: Expected behavior
    validations:
      required: true
  - type: textarea
    id: reproduce
    attributes:
      label: Steps to reproduce
    validations:
      required: true
```

Create `.github/ISSUE_TEMPLATE/feature.yml`:

```yaml
name: Feature request
description: New feature or vertical
labels: [feature]
body:
  - type: dropdown
    id: scope
    attributes:
      label: Scope
      options:
        - Small (existing card-type enhancement)
        - Medium (new card-type, existing primitives)
        - Large (new primitive or cross-service)
        - Huge (new vertical, RFC required)
  - type: textarea
    id: problem
    attributes:
      label: Problem
      description: Что болит у пользователя или бизнеса
  - type: textarea
    id: proposal
    attributes:
      label: Proposed solution
  - type: textarea
    id: alternatives
    attributes:
      label: Alternatives considered
  - type: checkboxes
    id: invariants
    attributes:
      label: Invariant compliance
      options:
        - label: I1 — horizontal-only services
        - label: I19 — fractal UX grammar preserved
        - label: Other invariants preserved
```

## Шаг 7: Dependabot

Create `.github/dependabot.yml`:

```yaml
version: 2
updates:
  # npm ecosystem
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: weekly
    open-pull-requests-limit: 5
    groups:
      minor-patch:
        applies-to: version-updates
        update-types: [minor, patch]
      security:
        applies-to: security-updates
        update-types: [major, minor, patch]

  # GitHub Actions
  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: weekly
```

## Шаг 8: Test CI запуск

Создать dummy PR:

```bash
git checkout -b test/ci-skeleton
echo "# Test CI" > scratch.md
git add scratch.md
git commit -m "test: verify CI runs"
git push
gh pr create --title "Test: CI skeleton" --body "Testing CI pipeline"
```

Watch CI runs на GitHub Actions tab. Ожидается:
- `validate` job passes (lint, typecheck, docs).
- Total time ≤ 5 min.

После — close / revert PR:
```bash
gh pr close --delete-branch
```

## Шаг 9: Commit config

```bash
git checkout phase-0/monorepo-setup
git add .github/ .githooks/
git commit -m "ci: bootstrap GitHub Actions + CODEOWNERS + templates"
```

## Checklist — Tuesday done

- [ ] `.github/workflows/ci.yml` passes на test PR
- [ ] Branch protection включена на main
- [ ] `.github/CODEOWNERS` покрывает все paths
- [ ] PR template loads при creation
- [ ] Issue templates работают (bug + feature)
- [ ] Dependabot настроен
- [ ] Git hooks auto-push работает
- [ ] Test PR merged (и CI прошёл)

## Troubleshooting

### CI fails on `pnpm install`
- Проверить что `pnpm-lock.yaml` committed.
- Добавить `--no-frozen-lockfile` временно если lock outdated.

### Branch protection не применяется
- Requires admin permissions.
- Can only be configured after first push to main.

### CODEOWNERS ignored
- GitHub требует team handles валидных.
- Use individual user handles (@stasilin) initially, switch to teams when teams created.

## Next

Wednesday: docker-compose full — `02-docker-compose-full.md` (уже написано).
