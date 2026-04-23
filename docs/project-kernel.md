# Project Kernel — Multi-Agent Orchestration Rules

> Canonical rules for the Composer → Orchestrator → Worker hierarchy.
> Every session that starts for a project inherits these constraints.

## Tier Map

| Tier | Role | Model | Effort | Max parallel |
|------|------|-------|--------|-------------|
| 0 | **Composer** | opus | high | 1 per project |
| 1 | **Orchestrator** | sonnet | medium | 2 per project |
| 2 | **Worker** | see kind table | see kind table | 3 total, 1 for db-migration |

## Worker Kind → Model/Effort Table

| Kind | Model | Effort | Max | Notes |
|------|-------|--------|-----|-------|
| frontend-ui | sonnet | medium | 2 | Vue, FSD, widgets |
| frontend-research | haiku | low | 3 | UX analysis, read-only |
| backend-api | sonnet | medium | 2 | Nitro handlers, Zod contracts |
| backend-module | sonnet | medium | 2 | DDD modules |
| db-migration | sonnet | medium | **1** | High risk — never run 2 at once |
| messenger-realtime | sonnet | medium | 1 | WS, Fastify, E2EE |
| tests | haiku | low | 3 | Unit/smoke |
| docs | haiku | low | 3 | Runbooks, READMEs |
| lint-ratchet | haiku | low | 4 | Fix lint errors only |
| incident | opus | high | 1 | Production triage |
| default | sonnet | medium | 2 | Fallback |

## Delegation Protocol

### Composer → Orchestrator (complex tasks)
```
claude-session send orchestrator "TASK: <what> | SCOPE: <files/modules> | EFFORT: low|medium|high | CONTEXT: <minimum context>"
```

### Composer → Worker (atomic tasks)
```
claude-session create <kind>-<slug> --workroom <wr> --model <model> --effort <effort> \
  --prompt "TASK: <what> | CONTEXT: <only the files needed>"
```

### Orchestrator → Worker
```
claude-session create <kind>-<slug> --workroom <wr> --model <model> --effort <effort> \
  --prompt "TASK: <what> | CONTEXT: <specific files only, not full project>"
```

## Token Budget Rules

1. **Narrow context** — pass only the files/functions needed for the task, not the whole repo.
2. **effort=low** for everything that doesn't require multi-step reasoning (research, search, lint).
3. **haiku** for read-only analysis, docs, tests generation.
4. **sonnet** for implementation and refactoring.
5. **opus** only for architecture decisions and production incidents.
6. **Check concurrency** before spawning: `claude-session list | grep running`
7. **Never start db-migration worker if one is already running** — check explicitly.
8. **Workers must commit and exit** — they are not persistent. Composer and orchestrators are persistent.

## Context Passing Pattern

Bad (too broad):
```
--prompt "TASK: fix the auth bug | CONTEXT: see the whole server/ directory"
```

Good (narrow):
```
--prompt "TASK: fix JWT expiry check | CONTEXT: server/utils/auth.ts:45-80, server/api/auth/login.post.ts"
```

## Cache Efficiency

The Claude `--print` mode used by `claude-cli-reply.ts` benefits from prompt caching when:
- The system prompt is identical across requests to the same agent.
- Project context (injected via CLAUDE.md or first-turn message) stays stable.

To maximize cache hits:
- Keep agent system prompts stable (no dynamic timestamps/IDs).
- Pass project context as the **first user message**, not in system prompt.
- Workers that do similar tasks (e.g. multiple lint-ratchet runs) share cache automatically.

## Spawn Checklist (before creating a new worker)

- [ ] Is an existing worker already handling this scope? (`claude-session list`)
- [ ] Is the kind correct for the task?
- [ ] Is context narrowed to specific files?
- [ ] Is effort appropriate (don't use high for simple tasks)?
- [ ] db-migration limit not exceeded?
- [ ] Total running workers ≤ 3?
