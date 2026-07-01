# packages/card-types/car

Автомобиль — многофункциональный card-type. Instance = моя машина (purchase-new / purchase-used / long-rental / subscribed). Type = модель.

## Instance — 3 sub-kinds через одну card-type

1. **owned** (purchased) — моя машина в собственности.
2. **rented-long** — долгосрочная аренда.
3. **subscribed** — car-subscription.

Runtime-determined by ownership-registry lookup.

## Instance view (моя Civic)

- HEADER: VIN-shortened, model, year, mileage.
- TIMELINE:
  - purchase: search → select → financing → inspection (used) → purchase → ownership-transfer.
  - ownership ongoing: maintenance-schedule (oil-change, ТО, inspections), insurance-renewals, registration.
- SUMMARY: budget spent, fuel efficiency, next ТО.
- Left: service-shops, fuel-tracker, parts-catalog для my model, insurance upgrades.
- Right: chats — СТО, strakhovaya, co-driver (family), rental clients if I rent out.
- Top: gallery (my car photos, dash-cam captures, before/after service).
- Bottom: journal (maintenance entries, mileage updates, cost-tracking).

## Type view (Honda Civic 2023 — модель)

- HEADER: model + year + brand.
- SUMMARY: specs (HP, mpg, class, prices).
- Left: dealers, parts catalog (generic for model), aftermarket tuning shops.
- Right: owner communities (global / local), fan forums.
- Top: official brand content + user-generated (reviews, drives).
- Bottom: model news + recall info.

## Primitives

`ownership-registry` (VIN, title), `financing-service` (loan / lease), `booking` (rental), `subscription-engine` (car-sub), `inspection-service` (used-purchase), `credentials-vault` (driver's license category), `payments`, `wallet`, `insurance-integration`.

## Phase

5 (purchase + short-term rental + subscription).
