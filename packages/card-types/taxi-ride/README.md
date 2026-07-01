# packages/card-types/taxi-ride

Поездка на такси как Pattern-Card (instance) или сервис / тариф (type).

## Instance (моя поездка)

- TIMELINE: request → match → driver-incoming → pickup → ride → dropoff → payment → rating.
- Left panel: ride details, route, fare breakdown.
- Right panel: driver chat, SOS.
- Top: route stories (traffic, weather).
- Bottom: support feed.

## Type (сервис / бренд / тариф)

- Yandex / Uber / Bolt / local provider.
- Type-view: tariff catalog, coverage, reviews, community.

## Primitives

`booking` (real-time match), `location` (geofence + routing), `payments`, `wallet`, `identity`, `notifications`, `policy-engine` (age-gates для minor passengers).

## Phase

3 (basic для trip-compound), 5 (multi-provider aggregator).
