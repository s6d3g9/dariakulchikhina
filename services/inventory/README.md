# services/inventory

Layer 3 — Domain Primitive. Каталоги товаров / мест / единиц / ресурсов.

## Что делает

- Hierarchical catalogs (categories → items → variants).
- Stock / availability tracking.
- Pricing (может быть dynamic).
- Images / media refs.
- Attribute-based search (powers `services/search` indexing).
- Integration с booking для slot-inventory.

## Use cases

- Travel: flights, hotel rooms, tours, tickets.
- Retail: products, SKUs.
- Rental: vehicles, equipment, gear.
- Services: appointments, timeslots.

## Рантайм

- TypeScript, Postgres `inventory_db`:
  - `catalogs` (hierarchy)
  - `items` (fields per-category)
  - `variants` (size, color, specific slot)
  - `stock` (availability)
  - `pricing_rules` (dynamic)

## API

```
GET  /catalogs/:id
GET  /items?catalog=...&filter=...            # faceted search
GET  /items/:id
GET  /items/:id/availability?from=&to=        # time-based
POST /items                                    # create (seller)
PUT  /items/:id                                # update (OCC)
POST /items/:id/stock/adjustments              # inventory updates
```

## Integrations

- **Publishes**: `item-created/updated/deleted`, `stock-adjusted`.
- **Consumed by**: `search` (indexing), `booking` (availability).
- **Calls**: `media-pipeline` для item-images.

## Phase

Фаза 2.
