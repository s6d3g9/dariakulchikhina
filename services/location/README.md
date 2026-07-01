# services/location

Layer 2 — Platform Service. Geo-поиск, маршруты, geofence, POI catalog.

## Что делает

- POI catalog (countries, cities, streets, venues).
- Geo-search (radius, polygon, by-name).
- Routing (A → B via mode: walking / driving / transit).
- Geofence events (enter / exit для car-sharing / bike-rental).
- Reverse geocoding (lat/lng → address).
- Distance / duration matrices.

## Data sources

- OpenStreetMap (primary, free).
- Yandex Maps API (Russia).
- Google Maps API (premium/fallback).

## Рантайм

- **Language**: Go (fast + low memory для geo calculations).
- Storage: PostGIS extension в Postgres `location_db`.
- Cache: Redis для hot queries.

## API

```
GET  /places?q=...&near=lat,lng            # search
GET  /places/:id                            # detail
POST /route                                 # from-to routing
POST /geocode                               # lat,lng → address
POST /reverse-geocode
POST /distance-matrix                       # N-to-M
GET  /places/:id/boundaries                 # polygon
POST /geofence                              # register fence (for rental / food-del)
GET  /geofence/:id/events?user=             # enter/exit events
```

## Used by

Mobility card-types (`taxi-ride`, `bike-rental`, `kick-scooter-rental`), travel (`apartment-stay`, `hotel-room` для near-by), food-delivery, feed (location-filter), search.

## Integrations

- **Publishes**: `geofence-entered/exited`.
- **Calls**: External map APIs.

## Phase

Фаза 2 (basic POI + routing) → Фаза 5 (geofence + analytics).
