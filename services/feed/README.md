# services/feed

Layer 3 — Domain Primitive. Twitter-lite + stories + reels. Bottom-panel и top-panel shell'а.

## Что делает

- Posts (text / image / video / composite).
- Stories (24h ephemeral).
- Reels (short video).
- Following graph (user subscribes to source).
- Timeline assembly (who sees what).
- Feed entry points: personal / following / discover / for-you / entity-specific.

## Не делает

- Recommendations re-ranking (→ `services/recommendations`).
- Moderation (→ `services/moderation-ml`).
- Media storage (→ `services/media-pipeline`).

## Рантайм

- **Language**: TypeScript.
- **Storage**:
  - Postgres `feed_db` — hot posts, recent.
  - ScyllaDB (Фаза 7+) — social-graph + fan-out для scale.

## Data model

```ts
type Post = {
  id: string
  authorId: UserId
  kind: 'text' | 'image' | 'video' | 'composite' | 'story' | 'reel'
  content: PostContent
  context?: { entity: { kind, id } }       // «пост про мою машину»
  visibility: 'public' | 'followers' | 'private' | 'community'
  tags: string[]
  reactions: Reaction[]
  repliesCount: number
  createdAt: Timestamp
  expiresAt?: Timestamp                      // for stories
  // ...
}
```

## Feed assembly

### Personal feed (bottom-panel when focus=self)

- Fan-out-on-write: когда post создан, copy в feed followers (hot path).
- Pull-model для long-tail.
- Hybrid: fan-out for top N followers, pull for rest.

### Entity-specific feed (bottom-panel when focus=other-entity)

- Query: posts с context.entity matching + public.

### Type-view feed

- Query: posts tagged с type-entity + public + official-channel-derived.

### Trending / discover

- Aggregated signals через recommendations + manual curation.

## Stories

- 24h TTL (configurable).
- Seen-status per-viewer.
- Reactions / replies become DMs.

## Reels (Phase 7+)

- Short-form vertical video.
- Swipe-next feed.
- Recommendations-heavy (не chronological).

## API

```
POST   /posts                              # create
GET    /posts/:id
DELETE /posts/:id
POST   /posts/:id/reactions
GET    /posts/:id/replies
POST   /posts/:id/replies

GET    /users/:id/feed?kind=personal|entity|type
GET    /users/:id/stories

POST   /follow
DELETE /follow/:targetId
GET    /users/:id/following
GET    /users/:id/followers
```

## Integrations

- **Publishes**:
  - `app.daria.feed.post-created.v1`
  - `app.daria.feed.post-deleted.v1`
  - `app.daria.feed.reaction-added.v1`
  - `app.daria.feed.followed.v1`
  - `app.daria.feed.story-created.v1`
  - `app.daria.feed.story-expired.v1`
- **Consumes**:
  - `app.daria.moderation.ruling.v1` (takedown)
  - `app.daria.identity.user-erased.v1` (GDPR cascade)
- **Calls**:
  - `media-pipeline.getUrl` для рендеринга attachments
  - `policy-engine.evaluate` при show/post
  - `recommendations.rank` для discover-feed

## Инварианты

- I4, I6, I9 (OCC), I10 (monetized feeds тоже через authorship-registry)
- Stories auto-expire через Temporal workflow

## Используется

Bottom-panel и top-panel shell'а для всех card-types. `person-profile`, `company-profile`, `community`, `pattern-template` — первичные пользователи.

## Фаза

Фаза 2 (базовый feed) → Фаза 7 (stories + reels + ScyllaDB).

## Статус

Skeleton only.
