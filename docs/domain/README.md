# Domain Specs

Formalized domain-knowledge, изолированный от implementation. Используется для:

- v5.3 → v6 migration (`28-migration-from-v5.md`).
- Onboarding новых engineers to vertical-specific logic.
- AI-assist context (when generating code).
- Legal / compliance references.

## Categories

- `v5-*.md` — existing v5.3 domains (to migrate в v6).
- `v6-*.md` — v6 vertical specs, used by card-types.
- `shared-*.md` — cross-domain concepts (e.g. OCC, soft-delete).

## Format per-file

```markdown
# Domain: <name>

## Purpose
Что этот domain решает.

## Entities
Main objects, relationships.

## Key operations
CRUD + domain-specific.

## Business rules
Invariants, constraints.

## Events
What this domain publishes.

## External dependencies
Other services it talks to.

## v5 → v6 migration
For v5- domains: mapping to v6 primitives / card-types.

## Open questions
What's unclear / undecided.
```

## Существующие specs

### v5.3 studio domains (полный набор для migration)

| Spec | Область | Maps to v6 |
|---|---|---|
| [v5-projects.md](v5-projects.md) | Studio projects | compound `pattern-template` |
| [v5-designer-catalog.md](v5-designer-catalog.md) | Material/supplier catalog | `inventory` + `catalog-item` card-type |
| [v5-work-status.md](v5-work-status.md) | Workflow states | `timeline-engine` (absorbed) |
| [v5-sellers.md](v5-sellers.md) | B2B suppliers | `company-profile` + `contract-deal` |
| [v5-warehouse.md](v5-warehouse.md) | Physical warehouse | `inventory` + `warehouse-item` |
| [v5-documents.md](v5-documents.md) | Document generation | `media-pipeline` + timeline-step |
| [v5-clients.md](v5-clients.md) | B2C clients | `person-profile` + permissions |
| [v5-contractors.md](v5-contractors.md) | Contractors | `person-profile` + `contract-deal` |
| [v5-quotes-estimates.md](v5-quotes-estimates.md) | Pricing | `contract-deal` versions |
| [v5-admin-settings.md](v5-admin-settings.md) | Studio settings | distributed (design-tokens / feature-flags / policies / company-profile) |
| [v5-users.md](v5-users.md) | Studio users | `services/identity` (Zitadel) |
| [v5-notifications.md](v5-notifications.md) | Notifications | `services/notifications` |

**v5 studio полностью покрыт** (12/12 domains). Migration work Phase 2-3 работает по этим спекам.

### v6 vertical specs (future)

Появляются по мере launch новых verticals.
