# packages/card-types/hotel-room

Номер в отеле как Pattern-Card.

## Два вида

### Instance (моя бронь)

- HEADER: hotel name, dates, guests.
- TIMELINE: search → select → guests-info → payment → booking → pre-arrival → check-in → stay → check-out.
- ACTIONS: modify, cancel (per policy), extra services.
- SECTIONS: guests, evidence (voucher), fare rules.
- Panels:
  - Top: hotel gallery.
  - Left: room-upgrades, services (spa, restaurant), transfers.
  - Right: concierge chat, other guests' communities.
  - Bottom: local-area feed.

### Type (отель / сеть / класс)

- Panels:
  - Left: all rooms, facilities, sister hotels.
  - Right: hotel guests community.
  - Top: hotel brand content.
  - Bottom: reviews + updates.

## Primitives

`booking, inventory, payments, identity, policy-engine, reviews-ratings, location, subscription-engine (loyalty)`.

## External

- Booking.com Affiliate / Expedia / hotelbeds / direct APIs.

## Фаза

3.
