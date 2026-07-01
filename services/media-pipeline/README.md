# services/media-pipeline

Layer 3 — Domain Primitive. Загрузка, транскодинг, CDN, хранение медиа.

## Что делает

- Upload flow (pre-signed URLs к S3).
- Транскодинг через SaaS (Mux / Bunny) на MVP, свой pipeline при scale.
- Генерация thumbnails / previews.
- CDN-delivery (Cloudflare / Bunny).
- Watermarking для private content.
- EXIF / metadata scrubbing (privacy).
- Access-control (public / private / subscription-gated).

## Не делает

- Moderation (→ `services/moderation-ml`).
- Search (→ `services/search`).
- Ownership (→ `services/ownership-registry`).

## Рантайм

- **Language**: Go (для control-plane).
- **Storage**: S3-compat (MinIO on-prem / Wasabi / B2 / AWS S3).
- **Metadata DB**: Postgres `media_db`:
  - `media_objects` — metadata + hash + ACL
  - `transcode_jobs` — pending / processing / complete
  - `cdn_invalidation_log`

## Upload flow

```
1. Client → /media/upload/request
   Returns: { uploadUrl, mediaId, expiresAt }

2. Client → PUT <uploadUrl> (direct to S3, pre-signed)

3. S3 callback → /media/upload/complete
   ├── Validate file (type, size, hash)
   ├── EXIF-scrub (privacy)
   ├── Enqueue transcode job
   ▼
4. Transcode:
   Image → thumbnails (3 sizes) + optimized formats (webp, avif)
   Video → HLS / DASH manifest + thumbnails
   Audio → mp3 / opus variants
   ▼
5. Publish app.daria.media.uploaded.v1
   ↘ moderation-ml classifies
   ↘ search indexes (if public)
```

## CDN

- Public media → Cloudflare / Bunny CDN.
- Private → pre-signed URL (TTL 5 min default).
- Subscription-gated → verify subscription-engine + generate URL.

## Access policies

| Policy | Use | Implementation |
|---|---|---|
| `public` | Profile avatars, marketing | CDN public |
| `unlisted` | Shared-via-link | CDN with obscure URL |
| `private-owner` | Personal galleries | Pre-signed URL owner-only |
| `private-shared` | Shared with specific users | Per-user pre-signed URL |
| `subscription-gated` | Premium content | Verify sub → pre-signed |

## API

```
POST /media/upload/request
POST /media/upload/complete                  # webhook from S3
GET  /media/:id                              # metadata
GET  /media/:id/url?variant=thumbnail|full   # CDN URL
DELETE /media/:id                            # soft-delete
POST /media/:id/replace                      # new version
POST /media/:id/share                        # grant access
```

## Integrations

- **Publishes**:
  - `app.daria.media.uploaded.v1`
  - `app.daria.media.transcoded.v1`
  - `app.daria.media.deleted.v1`
  - `app.daria.media.access-granted.v1`
- **Consumes**:
  - `app.daria.moderation.ruling.v1` → takedown if blocked
- **Calls**:
  - Mux / Bunny API для transcoding
  - CDN для invalidation

## Инварианты

- I4, I6 (own DB), I11 (mobile-offline cache friendly)
- Private media **never** CDN-public cached
- EXIF stripped by default for privacy

## Фаза

Фаза 2 (MVP SaaS), Фаза 7+ own pipeline при необходимости.

## Статус

Skeleton only.
