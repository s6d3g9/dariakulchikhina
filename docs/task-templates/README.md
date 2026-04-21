# Task Templates

These are canonical TASK.md templates for the composer → orchestrator → workers pipeline. Copy the template that matches your `kind:` value and fill the placeholders. Each template embeds acceptance criteria, architectural guardrails, and references to the v5 docs relevant to that task type.

## Templates

| File | Kind Hint | When to Use |
|------|-----------|-------------|
| `feature.md` | `frontend-ui`, `backend-api`, `backend-module`, `messenger-realtime`, `frontend-research` | Adding user-facing functionality, new endpoints, or integrations across frontend/backend/realtime layers. |
| `bug.md` | `backend-api`, `frontend-ui`, `messenger-realtime`, `incident` | Fixing a reported defect with reproduction steps, root cause analysis, and minimal fix scope. |
| `refactor.md` | `backend-module`, `frontend-ui` (primarily) | Extracting, splitting, renaming, or moving a cohesive code unit without changing behavior. |
| `tests.md` | `tests` | Adding or extending test suites to improve coverage, protect invariants, or prevent regressions. |
| `db-migration.md` | `db-migration` | Drizzle schema change (new table, column, index, FK). Required before any backend-api/backend-module task that depends on the schema change. |
| `backend-api.md` | `backend-api` | New or updated HTTP endpoint in `server/api/**`. Thin handler delegating to service. |
| `backend-module.md` | `backend-module` | Service + repository layer work inside `server/modules/<domain>/`. Business logic and persistence split. |
| `frontend-ui.md` | `frontend-ui` | Vue component, composable, or FSD slice in `app/` or `messenger/web/`. |
| `docs-update.md` | `docs-update` | Architecture doc sync after a completed wave, new ADR, runbook, or catalogue entry. |

## How TASK.md flows

```
pending/*.md  →  claude-queue-daemon  →  workroom + claude-session
                                              │
                                    done/ ←─ auto-push ← branch
```

1. **Author (composer)** writes a TASK.md file in `~/state/pending/` with frontmatter (`kind`, `id`, `base_branch`, etc.) and task detail sections (Context, Scope, Acceptance, Notes).
2. **Queue daemon** polls `pending/` for new tasks, extracts the `kind:` field, and spawns a workroom with skill-bundle matching (see [§22 Skill Bundles](../architecture-v5/22-skill-bundles.md)).
3. **Worker (Claude Code session)** receives the TASK.md, executes the scope, and commits per logical step.
4. **Final commit** deletes TASK.md, pushing the branch to `done/` and origin automatically (via git hooks).
5. **Composer reviews** the committed work in the messenger UI or via PR.

## Frontmatter fields

- `id`: Unique task ID (e.g., `feature-20260419-project-filter`). Used to track dependencies and cross-reference in logs.
- `kind`: Worker subjectivity; determines skill bundle (plugins, commands, agents) loaded into the session. See [§22 Skill Bundles](../architecture-v5/22-skill-bundles.md).
- `model`: Claude model variant (`haiku`, `sonnet`, `opus`). Defaults to `sonnet`.
- `base_branch`: Git branch to branch from. Defaults to `main`.
- `priority`: Integer 1–100. Composer uses this to order the queue.
- `auto_push`: Boolean. If `true`, commits are auto-pushed and hooks run; if `false`, worker must push manually.
- `depends_on`: Optional list of task IDs this blocks on (e.g., `["feature-20260419-auth-types"]`).

## Daemon source and orchestration docs

- **Daemon:** `scripts/claudequeue/claude-queue-daemon.sh` — polls `pending/`, parses frontmatter, spawns sessions.
- **Agent orchestration:** [docs/architecture-v5/21-agent-orchestration.md](../architecture-v5/21-agent-orchestration.md) — detailed architecture of the composer-orchestrator-workers hierarchy, WS tree stream, run logs.
- **Skill bundles:** [docs/architecture-v5/22-skill-bundles.md](../architecture-v5/22-skill-bundles.md) — how `kind:` maps to plugin lists per worker, dashboard UI, and configuration.

## Editing a template

To update a template:
1. Edit the `.md` file in this directory.
2. Commit the change: `docs(task-templates): update <template> — [reason]`.
3. The daemon will use the new version for subsequent spawns.

Templates are meant to evolve as the project's conventions solidify. Feedback from workers (blockers, edge cases, missing references) should be incorporated back.
