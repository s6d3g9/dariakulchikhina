# Domain: v5-work-status

## Purpose

Централизованный workflow-state tracker для tasks в studio projects. Простейший domain — часто natural fit к timeline-engine.

## Entities (v5.3)

- `WorkStatus` — enum ({draft, in-progress, review, blocked, done, cancelled}).
- `WorkItem` — что в работе (project-task / contractor-assignment / purchase-order).
- `StatusTransition` — history log (from → to, who, when, reason).
- `BlockingReason` — why stuck.

## Key operations

- Set status on WorkItem (restrictions on transitions).
- Log reason для blocked / cancelled.
- Query history.
- Dashboard: сколько items per status.
- Alerts: items stuck > N days.

## Business rules

- State-machine (configurable):
  ```
  draft → in-progress
  in-progress → review
  in-progress → blocked
  blocked → in-progress
  review → done
  review → in-progress  (reject)
  any → cancelled
  ```
- Reasons required для transitions to blocked / cancelled.
- Audit: cannot hide history.

## Events

- `work-status.changed`
- `work-item.blocked`
- `work-item.completed`
- `work-item.cancelled`

## External dependencies

- Any domain using WorkItems (projects, contractors, purchase-orders).
- `audit-log`.
- `notifications` (alerts on stuck).

## v5 → v6 migration

### Target: native timeline-engine

**Natural fit**: WorkStatus = TimelineStep state. Не требует отдельного card-type.

Mapping:
| v5 | v6 |
|---|---|
| WorkItem | TimelineStep |
| WorkStatus | TimelineStep.status |
| StatusTransition | TimelineStep events |
| BlockingReason | TimelineStep evidence / event-payload |

### Code path

- Every Pattern-Card's timeline uses this semantics by default.
- No dedicated service needed — timeline-engine handles.
- `pattern-engine` compounds могут aggregate child-status для parent-status.

### UI

- Parent CardView — timeline widget (fractal).
- Tap step → details + transitions history.

### Phase

Phase 2. **This domain disappears** — consumed by timeline-engine. Post-migration: no `services/work-status`.

## Open questions

- Some v5 state-machines иrregular (некоторые verticals own special states) — maintain custom per-card-type timelines with regular contracts.
- Dashboard aggregation — built-in timeline-engine queries или отдельный analytics-view.
