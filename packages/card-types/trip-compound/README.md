# packages/card-types/trip-compound

**Композитная** Pattern-Card: поездка из flight + transfer + hotel + restaurants + activities. Эталонный compound.

См. [docs/architecture-v6/12-pattern-composition.md](../../docs/architecture-v6/12-pattern-composition.md).

## Два вида

### Instance (моя поездка)

- HEADER: destination + dates + party.
- TIMELINE: master-timeline сводный из children (planning → …9+ вех… → return home).
- SUMMARY: budget, days count, party.
- ACTIONS: start / pause / publish-as-template / clone.
- SECTIONS:
  - Children grid (mini-cards с статусами)
  - Documents (evidence from child timelines)
  - Journal / photos
  - Expenses breakdown
- Panels:
  - Top: destination stories (user-generated + official).
  - Left: nested-suggestions (activities, alternatives).
  - Right: travel-buddies chat + operator-chats.
  - Bottom: destination-specific feed.

### Type (template-view когда trip → pattern-template)

- Marketplace mode для sharing / fork'а.
- Lineage graph visible.

## Primitives

`pattern-engine` (core), `timeline-engine`, plus все primitives использованные children (inherited).

## Children card-types

Любые atomic travel-cards: flight-ticket, hotel-room, taxi-ride, apartment-stay, restaurant-booking, event-ticket, car-rental-short, и т.д.

## Фаза

3. Эталон composition.
