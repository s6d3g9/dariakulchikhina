# Domain: v5-warehouse

## Purpose

Физический warehouse студии — хранит items, доставленные от sellers, до установки в project objects. Tracking stock, assignments, delivery / pickup.

## Entities (v5.3)

- `WarehouseLocation` — физическое место (главный склад, выездные).
- `StockItem` — конкретная единица (SKU + lot + serial).
- `StockMovement` — история (received / assigned / moved / damaged / returned).
- `ProjectAssignment` — item assigned к project.
- `DeliveryTask` — доставка на объект.
- `InventoryCount` — periodic reconciliation.

## Key operations

- Receive goods (from seller PO → stock).
- Assign to project (reservation).
- Move between locations.
- Damage report / return.
- Physical inventory count (reconcile with system).
- Delivery scheduling к object.

## Business rules

- Cannot assign more чем в stock.
- Movements auditable (who moved what when).
- Damaged items flagged before disposal.
- Annual reconciliation mandatory.

## Events

- `stock.received / assigned / moved / damaged / returned`
- `delivery-task.scheduled / completed`
- `inventory-count.completed / discrepancy-found`

## External dependencies

- `designer-catalog` / `sellers` (incoming stock).
- `projects` (assignments).
- `contractors` (pickup для installation).

## v5 → v6 migration

| v5 | v6 |
|---|---|
| WarehouseLocation | `company-profile` (studio's own location) |
| StockItem | `inventory.items` with location-attribute |
| StockMovement | events + audit-log |
| ProjectAssignment | link Pattern-Card (project) to inventory-item |
| DeliveryTask | Pattern-Card (logistics-task) with timeline |
| InventoryCount | Pattern-Card (audit-task) + timeline |

### Card-type proposals

- `warehouse-item` — per-stock-item instance view with history.
- Compound assignment-to-project — через pattern-engine.

### Phase

Phase 3 (after inventory primitive solid).

## Open questions

- Multi-studio shared warehouse — Phase 6+ feature.
- RFID / barcode integration — hardware TBD.
