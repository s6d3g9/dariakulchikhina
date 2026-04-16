# Server Audit Report

Date: 2026-04-16
Scope: CRM `server/api/**`, `server/modules/projects/**` and current projects hot-path service layer.

## N+1 Audit
- `server/api/projects/index.get.ts` + `server/utils/projects.ts` `listProjectsWithTaskStats()` audited.
- Result: no per-project follow-up queries in list path; aggregation is handled in one grouped query over `projects` + `workStatusItems`.
- `server/api/projects/[slug]/work-status.get.ts` + `server/utils/projects.ts` `getProjectWorkStatusBySlug()` audited.
- Result: no per-item comment/photo fetch loop in read path; counts are loaded in two grouped queries by `projectId`.
- High-risk write loop in `replaceProjectWorkStatus()` is a transactional write path, not an N+1 read-path regression.

## Body Validation Audit
- Searched `server/api/**` for `readBody(`, `readRawBody(`, and raw `event.context.body` usage.
- Result: no remaining direct body parsing in API routes.
- Existing write routes already use `readValidatedNodeBody(...)` with Zod schemas.

## Prepared Hot Paths
- Added `.prepare()` to projects list hot path in `server/utils/projects.ts` (`projects_list_with_task_stats_v5`).
- Added `.prepare()` to slug-resolution/project-detail queries in `server/utils/projects.ts`.
- Added `.prepare()` to work-status item and aggregated counts queries in `server/utils/projects.ts`.

## Conclusion
- `projects list` and `work-status` hot paths are now explicitly prepared.
- No unresolved API body-validation gaps were found in current `server/api/**`.
- No actionable N+1 read-path issue was found in the audited project list and work-status routes.
