---
kind: frontend-ui
---

# Template: frontend-ui

Vue component, composable, or FSD slice in `app/` or `messenger/web/`. Use for any user-facing frontend change.

## Scope

- Place new files in the correct FSD layer: `entities/` → `features/` → `widgets/` → `pages/`
- No upward imports: `entities` cannot import from `widgets/features/pages`; `widgets` cannot import from `pages`
- New composables go in `<layer>/<slice>/model/use<Name>.ts`
- New components go in `<layer>/<slice>/ui/<Name>.vue`
- `shared/types/**` or `shared/constants/**` for cross-layer contracts — never import from `server/` or `messenger/core/`
- Design tokens flow through `useDesignSystem()` / `useDesignTokenControls()` — no hardcoded CSS values
- WS auth is ticket-based: fetch ticket from `/api/chat/ws-ticket`, then open WS with `?ticket=<token>`

## Acceptance

- `pnpm exec vue-tsc --noEmit` exits 0 — no TypeScript errors
- `pnpm lint:errors` exits 0 — no FSD layer violations
- Feature works end-to-end in the browser (dev server started, golden path tested)
- No regressions in adjacent pages/widgets
- Component ≤ 500 lines; extract sub-components or composables if exceeded
- API errors use `error.code` field from the domain error wire-format (not `statusMessage`)

## Out-of-scope

- Backend business logic (use `backend-module` or `backend-api` kind)
- DB schema changes
- `cityfarm/` — out of v5 scope, do not touch

## References

- [04 Frontend Layer](../architecture-v5/04-frontend-layer.md) — FSD rules, layer map
- [10 Frontend Refactor Map](../architecture-v5/10-frontend-refactor-map.md) — component placement matrix
- [05 Architectural Patterns §5.1](../architecture-v5/05-architectural-patterns.md) — WS ticket auth
- [05 Architectural Patterns §5.8](../architecture-v5/05-architectural-patterns.md) — headless design system
- [17 Coding Standards](../architecture-v5/17-coding-standards.md) — file naming, LLM-friendly structure
