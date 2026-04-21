---
kind: docs-update
---

# Template: docs-update

Architecture documentation change in `docs/architecture-v5/`. Use when a completed wave/batch requires doc sync, or for standalone doc improvements (new ADR, runbook, catalogue).

## Scope

- Update `14-refactor-roadmap.md` with the completed batch entry (date, wave, files, commit, verification, debts)
- Update `INDEX.md` if a new doc file is added or section structure changes
- Run `pnpm docs:v5:verify` and fix any reported inconsistencies
- Keep language Russian for prose; English for code, file paths, and commit messages
- New standalone docs (runbook, ADR, catalogue) get their own file and a link in INDEX.md

## Acceptance

- `pnpm docs:v5:verify` exits 0 — all 01-23 numbered docs referenced in INDEX.md
- No broken relative links (`./`, `../`) in modified files
- Roadmap entry follows the format from [§ Формат записи](../architecture-v5/14-refactor-roadmap.md): date, wave/layer, goal, files, commit, verification, debts
- ADR files follow the 5-section template: ## Контекст / ## Решение / ## Статус / ## Последствия

## Out-of-scope

- Code changes of any kind
- Changes to `09-15` target/audit docs without also updating `14-refactor-roadmap.md`
- Generating or modifying Drizzle migration files

## References

- [14 Refactor Roadmap](../architecture-v5/14-refactor-roadmap.md) — operational log format
- [INDEX.md](../architecture-v5/INDEX.md) — master navigation, must stay in sync
- [ADR Index](../architecture-v5/adr/README.md) — decision record conventions
- `pnpm docs:v5:verify` — `scripts/verify-architecture-docs.mjs`
