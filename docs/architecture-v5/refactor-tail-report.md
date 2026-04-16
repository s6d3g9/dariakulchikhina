# Architecture-v5 Refactor Tail Report

Date: 2026-04-16
Scope: CRM app tail cleanup and compat bridge closure.

## Moved
- No additional file moves were required in this closure wave.
- Tail cleanup was completed via bridge path normalization and deterministic non-VFS truncation passes.

## Deleted
- No new deletions in this final closure batch.
- Earlier empty compat stub deletions remain documented in migration status/history.

## Modified
- app/composables/* bridge exports: normalized away malformed patterns (`~~/app/entities/*` and `app/composables/~~/*`).
- app/entities/design-system/model/useDesignSystem.ts: normalized internal re-exports to relative paths.
- app/entities/design-system/model/useDesignSystem.runtime.ts: normalized local imports to relative paths.
- app/entities/design-system/model/useUITheme.ts: explicit local import for `useDesignSystem`.
- server/utils/project-governance.ts: strict typing fixes for sanitized `core`, assignment insert payload, and `participantId` narrowing.

## Remaining
- Intentional app-level alias import remains:
  - `app/components/ProjectCommunicationsPanel.vue` imports `~~/app/composables/useProjectCommunicationsBootstrap`.
- This import is valid and not a malformed compat bridge pattern.

## Validation
- Deterministic local clone validation command: `pnpm exec nuxi typecheck`.
- Result: exit code 0 (`TC_REPEAT3_EXIT=0`).

## Notes
- VFS overlay behavior can rehydrate legacy tails for some large files during delete/add cycles.
- Final physical truncation and strict validation should continue to be executed on deterministic local filesystem clones.
