# Domain: v5-projects (Studio Projects)

## Purpose

Ведение интерьерных проектов студии: от первого contact клиента до сдачи объекта. Central domain v5.3 — связывает clients / contractors / sellers / warehouse / documents.

## Entities (v5.3)

| Entity | Description |
|---|---|
| `Project` | Корневая сущность: client + address + dates + status |
| `ProjectStage` | Этапы (brief, design, contract, implementation, handover) |
| `ProjectTask` | Конкретные задачи внутри stage |
| `ProjectDocument` | Договоры, сметы, акты, 3D |
| `ProjectBudget` | Смета / расходы / payments schedule |
| `ProjectContractor` | Associated contractors (electricians, builders) |
| `ProjectItem` | Materials / furniture заказанные |
| `ProjectComm` | Communication log with client |

## Key operations

- Create project (from lead → project).
- Progress through stages (brief → design → contract → build → handover).
- Manage budget (add items, track spending, payment schedule).
- Assign contractors, track их tasks.
- Generate documents (contract DOCX, estimates).
- Client-facing view (read-only for client role).

## Business rules

- Project has ONE primary client.
- Project has ONE primary designer.
- Status progression unidirectional (cannot go backward без admin).
- Budget approvals required для changes > 10%.
- All comms logged для dispute resolution.
- Soft-delete; no hard deletes (financial retention).

## Events (v5.3, to formalize in v6)

- `project.created`
- `project.stage-advanced`
- `project.budget-changed`
- `project.document-generated`
- `project.contractor-assigned`
- `project.item-added`
- `project.status-changed`

## External dependencies

- `designer-catalog` (choose materials).
- `warehouse` (inventory of materials on-site).
- `contractors` (assignment).
- `sellers` (procurement).
- `documents` (DOCX generation).
- `notifications` (client updates).

## v5 → v6 migration

### Target

`Project` → **compound Pattern-Card** в v6:

```
pattern-template: studio-project-template
  children:
    - brief-contract (sub-card-type)
    - design-phase-tasks (multiple task-cards)
    - supplier-orders (multiple order-cards)
    - contractor-assignments (multiple contract-deal cards)
    - warehouse-deliveries (multiple)
    - handover-session
```

Key mappings:

| v5 entity | v6 primitive / card-type |
|---|---|
| Project | `pattern-template` (compound) |
| ProjectStage | `timeline.steps` |
| ProjectTask | child Pattern-Card (`contract-deal` or custom) |
| ProjectDocument | `media-pipeline` + WORM-audit refs |
| ProjectBudget | сумма children-costs (derived) |
| ProjectContractor | `contract-deal` (Pattern-Card) |
| ProjectItem | `inventory` items + linked card |
| ProjectComm | `entity-thread` conversation (messenger) |

### Roles в v6

- Client — `person-profile` с scope `studio:client`.
- Designer — `person-profile` с scope `studio:designer`.
- Contractor — `person-profile` с scope `studio:contractor` + `company-profile`.

### Phase

Phase 2-3 migration.

## Open questions

- Template distribution: can one studio sell its workflow-template to другой studio? (Authorship-registry applicable.)
- Multi-project dashboard — отдельный admin-experience или просто список projects.
- Historical data: preserve v5 projects как reference или migrate?
