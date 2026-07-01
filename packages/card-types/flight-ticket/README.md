# packages/card-types/flight-ticket

Перелёт как Pattern-Card. Первый travel-card-type, участвует в `trip-compound`.

## Два вида

### Instance (мой билет)

- HEADER: route, departure, avatar авиакомпании.
- TIMELINE: search → select → passengers → kyc-gate → payment → booking → ticketing → check-in → boarding → flight → arrival.
- SUMMARY: PNR, gate, seat.
- ACTIONS: checkin, modify, cancel.
- SECTIONS: passengers, evidence (PNR, boarding pass), fare rules.
- Panels:
  - Top: airline stories / news.
  - Left: add-ons (baggage, meal, seat upgrade, insurance).
  - Right: airline support chat + fellow-passenger group (optional).
  - Bottom: flight-status feed.

### Type (рейс / направление / модель ВС)

- HEADER: route или aircraft type.
- TIMELINE: schedule calendar.
- ACTIONS: search / book.
- SECTIONS: reviews, alternative dates, similar routes.
- Panels:
  - Top: airline official content.
  - Left: available fares / dates / classes.
  - Right: community (frequent flyers).
  - Bottom: route news / delays pattern.

## Primitives

`identity, booking, inventory (GDS), payments, credentials-vault (passport), policy-engine, escrow, notifications`.

## External integrations

- Amadeus GDS / Travelpayouts / Sabre.
- Airline direct APIs (long-tail).

## Фаза

Фаза 3 (first travel vertical).
