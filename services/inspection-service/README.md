# services/inspection-service

Layer 3 — Domain Primitive. Timeline-step provider: survey / inspection / appraisal.

## Use cases

- Used-car inspection перед purchase.
- Boat survey перед покупкой яхты.
- Property inspection для real-estate.
- Art authentication.
- Home inspection для arenda.

## Что делает

- Catalog инспекторов (profile, qualifications, ratings).
- Booking инспекции (через `services/booking`).
- Report submission (structured + photos + PDF).
- Dispute integration если неточный отчёт.
- Timeline-step-handler для card-types, которые включают inspection.

## API

```
GET  /inspectors?category=&location=            # find
POST /inspections                                # schedule
POST /inspections/:id/report                    # submit
GET  /inspections/:id/report                    # retrieve
POST /inspections/:id/dispute                   # report inaccurate
```

## Integrations

- **Calls**: `booking`, `credentials-vault` (inspector cert-check), `media-pipeline`.
- **Publishes**: `inspection.scheduled/completed/disputed`.

## Used by

`car-purchase-used`, `boat-yacht-purchase`, `real-estate-*-purchase`, `collectibles-purchase`.

## Phase

Фаза 5.
