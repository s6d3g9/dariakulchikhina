# Server Audit Report

Date: 2026-04-16
Scope: CRM `server/api/**` and `server/modules/projects/**`.

## N+1 Audit
- `server/modules/projects/projects.service.ts` `listProjectRecords()` audited.
- Result: no per-project follow-up queries in list path; aggregation is handled in one grouped query over `projects` + `workStatusItems`.
- `server/modules/projects/project-work-status.service.ts` `listProjectWorkStatus()` audited.
- Result: no per-item comment/photo fetch loop in read path; counts are loaded in two grouped queries using `inArray(itemIds)`.
- High-risk write loop in `replaceProjectWorkStatus()` is a transactional write path, not an N+1 read-path regression.

## Body Validation Audit
- Searched `server/api/**` for `readBody(`, `readRawBody(`, and raw `event.context.body` usage.
- Result: no remaining direct body parsing in API routes.
- Existing write routes already use `readValidatedNodeBody(...)` with Zod schemas.

## Prepared Hot Paths
- Added `.prepare()` to project list hot path in `server/modules/projects/projects.service.ts`.
- Added `.prepare()` to project-id-by-slug resolution in `server/modules/projects/project-work-status.service.ts`.
- Added `.prepare()` to work-status item assertion and work-status list query in `server/modules/projects/project-work-status.service.ts`.

## Conclusion
- `projects list` and `work-status` hot paths are now explicitly prepared.
- No unresolved API body-validation gaps were found in current `server/api/**`.
- No actionable N+1 read-path issue was found in the audited project list and work-status routes.
