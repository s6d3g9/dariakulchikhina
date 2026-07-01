# services/ownership-registry

Layer 3 — Domain Primitive. Универсальный граф владения: физические + цифровые активы.

## Что делает

- Assets registry (VIN, кадастр, судовой реестр, ISBN, custom).
- Ownership transfers (sale, gift, inherit).
- Title / liens / encumbrances.
- Fractional ownership (timeshare, shares).
- Integration с authorship-registry для digital assets.

## Связь с authorship-registry

- `authorship-registry` = кто автор (first owner digital asset).
- `ownership-registry` = кто currently держит.
- Authorship ⊆ ownership.

## Рантайм

- TypeScript, Postgres `ownership_db`:
  - `assets` (id, kind, title-ref, owner-chain)
  - `ownership_transfers` (from, to, reason, at)
  - `liens` (asset_id, lienholder, amount, expires)

## API

```
POST   /assets                              # register new asset
GET    /assets/:id
GET    /assets/:id/ownership-chain          # full history
POST   /assets/:id/transfer                 # ownership change
POST   /assets/:id/liens                    # mortgage, encumbrance
DELETE /assets/:id/liens/:lid               # release
GET    /users/:id/assets                    # user's portfolio
```

## Integrations

- **Publishes**: `asset-registered`, `ownership-transferred`, `lien-created`, `lien-released`.
- **Consumes**: `payments` для escrow-on-transfer.
- **Calls**: `authorship-registry` для digital asset linkage.

## Used by

- Purchase card-types (car, real-estate, boat-yacht).
- Digital assets (photo, video, code, music).
- Subscription-as-NFT ownership-tracking.

## Фаза

Фаза 2.
