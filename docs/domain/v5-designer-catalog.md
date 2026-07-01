# Domain: v5-designer-catalog

## Purpose

Централизованный catalog материалов / мебели / furniture / fixtures для studio designers. Poставщики обновляют listings; designers выбирают для projects.

## Entities (v5.3)

| Entity | Description |
|---|---|
| `Category` | Hierarchical (wall-finishes → paints → ...) |
| `Supplier` | Компания-поставщик |
| `SupplierBrand` | Бренд supplier'а |
| `CatalogItem` | SKU с атрибутами, images, price, specs |
| `CatalogItemVariant` | Size/color/options |
| `CatalogItemImage` | S3-stored |
| `SupplierCatalog` | Per-supplier view |
| `PriceList` | Update-able pricing |

## Key operations

- CRUD по items (supplier portal).
- Search (по category, attributes, price, brand).
- Favorites (designer сохраняет items).
- Price updates (supplier обновляет).
- Delivery-info (availability, lead-time, terms).
- Image galleries (per-item, multi-angle).

## Business rules

- Items visible только если supplier verified.
- Price changes retain history (for audit, не только current).
- Soft-delete items; don't remove history.
- Designer can create custom items if не in catalog (с note).

## Events

- `catalog-item.created`
- `catalog-item.updated`
- `catalog-item.price-changed`
- `catalog-item.availability-changed`
- `supplier.verified`

## External dependencies

- `sellers` (overlapping; sellers sell to catalog, supplier verifies).
- `warehouse` (real stock tracking).
- `media-pipeline` (images).
- `search` (индексация items).

## v5 → v6 migration

### Target

Natural fit:

| v5 entity | v6 primitive / card-type |
|---|---|
| Category | `inventory.catalogs` (hierarchy) |
| Supplier | `company-profile` (provider-mode) |
| SupplierBrand | `company-profile` with role (type-view) |
| CatalogItem | `inventory.items` + search-indexed |
| CatalogItemVariant | `inventory.variants` |
| CatalogItemImage | `media-pipeline` refs |
| PriceList | `inventory.pricing_rules` |

### Card-type creation

`packages/card-types/catalog-item/`:
- **Instance view**: item detail, availability, variants, supplier contact.
- **Type view**: category overview, all items в category, market trends.
- Primitives: `inventory`, `search`, `media-pipeline`, `company-profile`, `reviews-ratings`.

### Marketplace integration

Items → marketplace (in v6):
- Search indexed.
- Reviews by designers who used them.
- Ranking signals (quality, usage, supplier rating).

Item-templates (design-pattern вокруг category) — opportunity для `pattern-template` creator-economy.

### Phase

Phase 2-3.

## Open questions

- Supplier-API integration: pull prices в real-time или batch?
- Cross-supplier comparison — structured comparison view или only search.
- Custom items (designer-created) — marketplace-listable или internal-only.
