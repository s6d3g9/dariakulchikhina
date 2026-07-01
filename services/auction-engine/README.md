# services/auction-engine

Layer 3 — Domain Primitive. Bidding / reserve-price / anti-sniping / clearing.

## Что делает

- Create auction (seller → item → reserve → end-time).
- Accept bids (incremental с validation).
- Anti-sniping (auto-extend если bid в last N sec).
- Price clearing at end (highest valid bid).
- Integrate с escrow (buyer funds hold) + ownership-registry (title transfer).
- Proxy bidding (max-bid secret, auto-increment).

## Рантайм

- TypeScript / Go (для low-latency bid processing).
- Postgres `auction_db`:
  - `auctions` (id, item-ref, reserve, end-time, state)
  - `bids` (auction-id, bidder, amount, timestamp)
  - `clearings` (auction-id, winner, final-price)

## Auction types

- **English** (ascending, public) — default.
- **Dutch** (descending) — Phase 7+.
- **Sealed-bid** — Phase 7+.
- **Vickrey** (second-price sealed) — Phase 9+.

## API

```
POST /auctions                                # create
GET  /auctions/:id
POST /auctions/:id/bids                       # new bid
GET  /auctions/:id/bids                       # history
POST /auctions/:id/cancel                     # seller before first bid
GET  /auctions?status=open&category=...       # browse
```

## Anti-abuse

- Min bid increment enforced.
- Shill-bidding detection (seller-linked accounts bidding own item).
- Payment-verified bidders для expensive auctions.

## Integrations

- **Publishes**: `auction-created/bid-placed/closed/cleared`.
- **Calls**: `escrow-service.fund`, `ownership-registry.transfer`, `payments.charge`.

## Used by

`auction-listing` card-type (поверх любого purchase-type). `collectibles-purchase` primarily.

## Phase

Фаза 5.
