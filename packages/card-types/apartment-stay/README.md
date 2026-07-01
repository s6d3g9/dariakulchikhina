# packages/card-types/apartment-stay

Apartment / vacation rental (Airbnb-style). Two kinds inside one card-type: short-let + long-let (determined by duration parameter).

## Instance (моя бронь)

- TIMELINE: search → select → guests → payment → booking → host-contact → check-in → stay → check-out → rating.
- Left: amenities, add-ons, nearby services.
- Right: host chat, property-residents community.
- Top: property gallery.
- Bottom: neighborhood feed.

## Type (объект / район / market)

- View: apartment specs, all availability, reviews, neighborhood info.
- Left: similar properties, host's other listings.
- Right: host follow, neighborhood community.

## Primitives

`booking, inventory, payments, escrow (damage deposit), reviews-ratings, policy-engine, identity, location`.

## External

Booking.com / Airbnb / local aggregators / direct host integrations.

## Phase

3 (short-let MVP), 5 (long-let with financing).
