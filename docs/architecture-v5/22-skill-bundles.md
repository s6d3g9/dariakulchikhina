# 22. Skill Bundles per Worker Subjectivity

Date: 2026-04-19
Scope: how Claude CLI plugins (skills + commands + agents + hooks) map onto the composer → orchestrator → workers hierarchy, so that each worker runs with only the skills relevant to its task kind.

## 1. Motivation

All CLI sessions share the same `~/.claude/plugins/` globally. Without filtering, every worker gets every skill, which bloats system prompt and biases the model toward irrelevant tools.

We want worker subjectivity: a `frontend-ui` worker sees `frontend-design` + `code-review`; a `backend-api` worker sees `security-guidance` + `feature-dev`; a `db-migration` worker does not need PDF generation, and so on.

## 2. Architecture

### 2.1 Data model

- `scripts/workrooms/skill-bundles.json` declares, per worker-kind, the list of installed plugin names.
- TASK.md frontmatter gains a `kind:` field (e.g. `kind: frontend-ui`). Optional — defaults to `default`.
- `composer` and `orchestrator` are kinds too, applied via their session slug (not TASK.md).

### 2.2 Runtime wiring

- Plugins installed once per server via `scripts/setup-skill-plugins.sh` (idempotent, safe to rerun).
- `claude-session create` gains `--kind <worker-kind>` (falls back to the slug prefix: `composer`, `orchestrator`, else `default`). Looks up the plugin list in `skill-bundles.json`.
- Per-session bundle dir is built on the fly: `~/skill-bundles/runtime/<session-slug>/` contains symlinks to the chosen plugins under `~/.claude/plugins/cache/<marketplace>/<plugin>/<version>/`.
- claude CLI is started with `--plugin-dir ~/skill-bundles/runtime/<session-slug>/`.

### 2.3 Toggle UI

**Dashboard** (`http://152.53.176.165:9090`):
- Tab pill shows the active kind (`[ui]`, `[api]`, `[db]` etc., color-coded per kind).
- Session right panel lists the bundle's plugins as rows with a live-rebuild button ("apply"). Changing the kind recreates the bundle dir and sends a PM2-style restart signal to the session.

**Messenger** (future, depends on agent-orch merges):
- Agent workspace panel "Skills" with checkboxes per plugin.
- Changes persist in `messenger_agents.config.skillBundle`.
- Bundle change triggers ingest event; core rewrites the worker's claude-session env and restarts.

## 3. Bundle catalogue (initial)

See `scripts/workrooms/skill-bundles.json`. Summary:

| Kind | Plugins |
|---|---|
| composer | code-review, feature-dev, plugin-dev, example-skills, frontend-design |
| orchestrator | feature-dev, code-review, commit-commands, plugin-dev |
| frontend-ui | frontend-design, example-skills, code-review, commit-commands |
| frontend-research | frontend-design, example-skills, document-skills |
| backend-api | code-review, feature-dev, security-guidance, commit-commands |
| backend-module | feature-dev, code-review, security-guidance, commit-commands |
| db-migration | code-review, security-guidance, commit-commands |
| messenger-realtime | feature-dev, code-review, security-guidance, commit-commands |
| tests | code-review, commit-commands |
| docs | document-skills, commit-commands |
| incident | code-review, pr-review-toolkit, security-guidance, commit-commands |
| default | code-review, commit-commands |

## 4. Implementation order

1. [done] Install plugins + add marketplaces on server.
2. [done] `scripts/setup-skill-plugins.sh` for reproducibility.
3. [done] `scripts/workrooms/skill-bundles.json` — initial mapping.
4. [todo] `claude-session create --kind <k>` — build bundle dir, add --plugin-dir.
5. [todo] TASK.md frontmatter gains `kind:`; daemon propagates to spawn_task.
6. [todo] Dashboard: kind pill on each tab + right panel bundle list.
7. [todo, depends on agent-orch] Messenger: skill toggle checkboxes in agent workspace.

## 5. Red lines

- Do NOT curate a per-skill whitelist (too fine-grained). Bundles are at plugin granularity.
- Plugins shared via marketplace (re-install must reproduce bit-for-bit). If we vendor a custom plugin later, commit it to `plugins/<name>/` in this repo and ship via `--plugin-dir`.
- Do not include `webapp-testing` or `canvas-design` in `default` — they're heavy prompts that confuse small refactors.
