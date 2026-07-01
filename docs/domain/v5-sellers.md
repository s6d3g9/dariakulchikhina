# Domain: v5-sellers

## Purpose

Поставщики (B2B) — контрагенты, у которых studio purchases materials / furniture / services. Перекрывается с `designer-catalog` (sellers catalog their items там), но `sellers` — это про отношения (контракты, payments, terms).

## Entities (v5.3)

- `Seller` — компания с реквизитами, contact, terms.
- `SellerContact` — people inside seller.
- `SellerAgreement` — contract с terms (net-X, discount).
- `PurchaseOrder` — order к seller'у.
- `SellerInvoice` — billing from seller.
- `SellerPayment` — our payment outgoing.
- `SellerRating` — внутренняя оценка performance.

## Key operations

- CRUD sellers.
- Create PO (из project или separately).
- Track PO lifecycle (sent → confirmed → shipped → received).
- Match invoices к POs.
- Pay according to agreement terms.
- Rate seller performance (timeliness, quality).

## Business rules

- Seller must be verified перед first PO.
- Payments only после invoice match.
- Discounts calculated от agreement.
- Soft-delete sellers (retain history).

## Events

- `seller.onboarded`
- `purchase-order.created / confirmed / shipped / received`
- `seller-invoice.received / matched / paid / disputed`

## External dependencies

- `projects` (PO часто linked к project).
- `warehouse` (received items).
- `documents` (PO PDF, invoice).
- `wallet` / `payments` (payment).

## v5 → v6 migration

| v5 | v6 |
|---|---|
| Seller | `company-profile` with provider-mode |
| SellerContact | `person-profile` linked to company |
| SellerAgreement | `contract-deal` (Pattern-Card template) |
| PurchaseOrder | `contract-deal` instance with timeline |
| SellerInvoice | `invoice` (sub-entity in contract-deal) + media-pipeline |
| SellerPayment | `wallet.transfer` + audit |
| SellerRating | `reviews-ratings` (provider-side) |

### Card-type

`contract-deal` is the natural fit — purchase orders are just time-bound commercial contracts.

### Phase

Phase 3-4.

## Open questions

- Seller-marketplace для studios (cross-studio sharing seller catalog) — future feature.
- B2B payments через wallet vs external bank transfer — TBD.
