# Messenger DB schema

Postgres `messenger_db`. 4 kinds conversation (dm / group / entity-thread / community) в single table.

## Tables

### `conversations`

```typescript
export const conversationKindEnum = pgEnum('conversation_kind', 
  ['dm', 'group', 'entity-thread', 'community']
)

export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  kind: conversationKindEnum('kind').notNull(),
  
  // Context (mandatory для entity-thread / community)
  contextEntityKind: varchar('context_entity_kind', { length: 64 }),
  contextEntityId: varchar('context_entity_id', { length: 128 }),
  contextEntityView: varchar('context_entity_view', { length: 16 }),  // 'instance' | 'type'
  
  // Display
  title: varchar('title', { length: 256 }),
  avatar: varchar('avatar', { length: 512 }),  // S3/CDN URL
  
  // Join policy
  joinPolicy: varchar('join_policy', { length: 32 }).notNull().default('invite-only'),
  // 'invite-only' | 'request' | 'open'
  
  // Moderation
  moderationLevel: varchar('moderation_level', { length: 16 }).notNull().default('light'),
  // 'none' | 'light' | 'strict'
  
  // E2EE (DM + private group)
  isEncrypted: boolean('is_encrypted').notNull().default(false),
  
  // Community-specific
  community: jsonb('community').$type<{
    slug: string
    description: string
    rules: string
    memberCount: number
    primaryModeratorId: string
  }>(),
  
  // Last message denormalization (для conversation list UI)
  lastMessageAt: timestamp('last_message_at', { withTimezone: true }),
  lastMessagePreview: varchar('last_message_preview', { length: 256 }),
  lastMessageSenderId: varchar('last_message_sender_id', { length: 64 }),
  
  // System
  version: bigint('version', { mode: 'number' }).notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  
  // Tags (для search / filtering)
  tags: jsonb('tags').$type<string[]>().default([]),
}, (t) => ({
  kindIdx: index('conversations_kind_idx').on(t.kind),
  contextIdx: index('conversations_context_idx').on(t.contextEntityKind, t.contextEntityId),
  lastMessageIdx: index('conversations_last_message_idx').on(t.lastMessageAt),
  communityLookupIdx: index('conversations_community_slug_idx')
    .on(sql`(community->>'slug')`)
    .where(sql`kind = 'community'`),
}))
```

### `conversation_members`

```typescript
export const memberRoleEnum = pgEnum('member_role', ['owner', 'moderator', 'member'])
export const memberStatusEnum = pgEnum('member_status', ['active', 'left', 'banned', 'pending-request'])

export const conversationMembers = pgTable('conversation_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  conversationId: uuid('conversation_id').references(() => conversations.id, { onDelete: 'cascade' }).notNull(),
  userId: varchar('user_id', { length: 64 }).notNull(),
  
  role: memberRoleEnum('role').notNull().default('member'),
  status: memberStatusEnum('status').notNull().default('active'),
  
  // Per-user settings
  muted: boolean('muted').notNull().default(false),
  mutedUntil: timestamp('muted_until', { withTimezone: true }),
  
  // Notifications preference
  notificationLevel: varchar('notification_level', { length: 16 }).notNull().default('all'),
  // 'all' | 'mentions' | 'none'
  
  // Last read — для unread counter
  lastReadMessageId: uuid('last_read_message_id'),
  lastReadAt: timestamp('last_read_at', { withTimezone: true }),
  unreadCount: bigint('unread_count', { mode: 'number' }).notNull().default(0),
  
  // Invitation
  invitedBy: varchar('invited_by', { length: 64 }),
  invitedAt: timestamp('invited_at', { withTimezone: true }),
  joinedAt: timestamp('joined_at', { withTimezone: true }),
  leftAt: timestamp('left_at', { withTimezone: true }),
  
  // Ban
  bannedBy: varchar('banned_by', { length: 64 }),
  bannedAt: timestamp('banned_at', { withTimezone: true }),
  banReason: text('ban_reason'),
  banExpiresAt: timestamp('ban_expires_at', { withTimezone: true }),
}, (t) => ({
  conversationIdx: index('members_conversation_idx').on(t.conversationId, t.status),
  userIdx: index('members_user_idx').on(t.userId, t.status),
  uniqMember: unique('uniq_conversation_user').on(t.conversationId, t.userId),
}))
```

### `messages`

```typescript
export const messageKindEnum = pgEnum('message_kind', [
  'text', 'media', 'pattern-card-ref', 'system', 'reply', 'reaction-update'
])

export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  conversationId: uuid('conversation_id').references(() => conversations.id, { onDelete: 'cascade' }).notNull(),
  senderId: varchar('sender_id', { length: 64 }).notNull(),
  
  kind: messageKindEnum('kind').notNull().default('text'),
  
  // Content (encrypted если is_encrypted = true в conversation)
  content: text('content'),
  contentEncrypted: customType<{ data: Buffer }>({
    dataType() { return 'bytea' },
  })('content_encrypted'),
  
  // Attachments (в media-pipeline refs)
  attachmentsJson: jsonb('attachments_json').$type<Attachment[]>().default([]),
  
  // Embedded Pattern-Card reference (§8 of 22-messaging-model)
  patternCardRef: jsonb('pattern_card_ref').$type<{
    patternId: string
    cardType: string
    title: string
    thumbnailUrl?: string
  }>(),
  
  // Reply-to
  replyToMessageId: uuid('reply_to_message_id').references((): any => messages.id),
  
  // Reactions (denormalized — low cardinality за reactions)
  reactions: jsonb('reactions').$type<Record<string, string[]>>().default({}),
  // { "👍": ["u_1", "u_2"], "❤️": ["u_3"] }
  
  // Edit history
  editedAt: timestamp('edited_at', { withTimezone: true }),
  editedContent: jsonb('edited_content').$type<Array<{ content: string; editedAt: string }>>(),
  
  // Moderation
  flagged: boolean('flagged').notNull().default(false),
  flagCount: bigint('flag_count', { mode: 'number' }).notNull().default(0),
  hidden: boolean('hidden').notNull().default(false),
  redactedAt: timestamp('redacted_at', { withTimezone: true }),
  redactedBy: varchar('redacted_by', { length: 64 }),
  redactionReason: varchar('redaction_reason', { length: 64 }),
  
  // System
  clientMessageId: varchar('client_message_id', { length: 128 }),  // dedup ключ от клиента
  traceId: varchar('trace_id', { length: 64 }),
  
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  deletedBy: varchar('deleted_by', { length: 64 }),
}, (t) => ({
  conversationIdx: index('messages_conversation_idx').on(t.conversationId, t.createdAt),
  senderIdx: index('messages_sender_idx').on(t.senderId, t.createdAt),
  clientIdx: index('messages_client_idx').on(t.clientMessageId)
    .where(sql`client_message_id IS NOT NULL`),
  replyIdx: index('messages_reply_idx').on(t.replyToMessageId)
    .where(sql`reply_to_message_id IS NOT NULL`),
  flaggedIdx: index('messages_flagged_idx').on(t.conversationId, t.createdAt)
    .where(sql`flagged = true AND hidden = false`),
}))

interface Attachment {
  mediaRef: string  // reference to media-pipeline
  kind: 'image' | 'video' | 'audio' | 'document' | 'link-preview'
  title?: string
  thumbnail?: string
  size?: number
  mime?: string
}
```

### `blocks`

User-to-user blocks.

```typescript
export const blocks = pgTable('blocks', {
  id: uuid('id').primaryKey().defaultRandom(),
  blockerId: varchar('blocker_id', { length: 64 }).notNull(),
  blockedId: varchar('blocked_id', { length: 64 }).notNull(),
  reason: varchar('reason', { length: 64 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqBlock: unique('uniq_block').on(t.blockerId, t.blockedId),
  blockerIdx: index('blocks_blocker_idx').on(t.blockerId),
  blockedIdx: index('blocks_blocked_idx').on(t.blockedId),
}))
```

### `reports`

Content/user reports for moderation.

```typescript
export const reports = pgTable('reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  reporterId: varchar('reporter_id', { length: 64 }).notNull(),
  
  // Target
  targetKind: varchar('target_kind', { length: 32 }).notNull(),  // 'message' | 'user' | 'conversation'
  targetId: varchar('target_id', { length: 128 }).notNull(),
  
  // Category
  category: varchar('category', { length: 32 }).notNull(),
  // From moderation taxonomy (33-content-moderation)
  
  description: text('description'),
  evidence: jsonb('evidence').$type<Record<string, unknown>>(),
  
  // State
  status: varchar('status', { length: 16 }).notNull().default('open'),
  // 'open' | 'investigating' | 'resolved' | 'dismissed'
  
  // Resolution (link к moderation-review)
  moderationCaseId: uuid('moderation_case_id'),
  
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
}, (t) => ({
  reporterIdx: index('reports_reporter_idx').on(t.reporterId, t.createdAt),
  targetIdx: index('reports_target_idx').on(t.targetKind, t.targetId),
  statusIdx: index('reports_status_idx').on(t.status),
}))
```

### `typing_indicators` (optional — ephemeral, can be Redis only)

Если нужна persistent запись (для debugging):

Actually — НЕ хранить в Postgres. Only Redis Pub/Sub (ephemeral):

```typescript
// services/messenger/src/typing.ts
async function setTyping(userId: string, conversationId: string) {
  const key = `typing:${conversationId}:${userId}`
  await redis.setex(key, 5, '1')  // 5s TTL
  await redis.publish(`conversation.${conversationId}.typing`, JSON.stringify({ userId, at: Date.now() }))
}

async function getTypingUsers(conversationId: string): Promise<string[]> {
  const keys = await redis.keys(`typing:${conversationId}:*`)
  return keys.map(k => k.split(':')[2])
}
```

## Core operations

### sendMessage

```typescript
async function sendMessage(params: {
  conversationId: string
  senderId: string
  kind: 'text' | 'media' | 'pattern-card-ref'
  content?: string
  attachments?: Attachment[]
  patternCardRef?: any
  replyToMessageId?: string
  clientMessageId: string  // dedup
  traceId?: string
}): Promise<Message> {
  return db.transaction(async (tx) => {
    // 1. Dedup via client-message-id
    const existing = await tx.query.messages.findFirst({
      where: eq(messages.clientMessageId, params.clientMessageId),
    })
    if (existing) return existing

    // 2. Verify sender is member
    const member = await tx.query.conversationMembers.findFirst({
      where: and(
        eq(conversationMembers.conversationId, params.conversationId),
        eq(conversationMembers.userId, params.senderId),
        eq(conversationMembers.status, 'active'),
      ),
    })
    if (!member) throw new Error('NOT_A_MEMBER')

    // 3. Rate-limit
    const recentCount = await tx.select({ count: sql`count(*)` })
      .from(messages)
      .where(and(
        eq(messages.senderId, params.senderId),
        eq(messages.conversationId, params.conversationId),
        gt(messages.createdAt, sub(new Date(), { seconds: 10 })),
      ))
      .then(r => Number(r[0].count))
    if (recentCount >= 10) throw new Error('RATE_LIMITED')

    // 4. Load conversation для E2EE decision
    const conv = await tx.query.conversations.findFirst({
      where: eq(conversations.id, params.conversationId),
    })

    // 5. Insert message
    const [message] = await tx.insert(messages).values({
      conversationId: params.conversationId,
      senderId: params.senderId,
      kind: params.kind,
      content: conv?.isEncrypted ? null : params.content,
      contentEncrypted: conv?.isEncrypted ? Buffer.from(params.content ?? '') : null,
      // ^ в E2EE case content encrypted client-side и передан как bytes
      attachmentsJson: params.attachments,
      patternCardRef: params.patternCardRef,
      replyToMessageId: params.replyToMessageId,
      clientMessageId: params.clientMessageId,
      traceId: params.traceId,
    }).returning()

    // 6. Update conversation
    await tx.update(conversations)
      .set({
        lastMessageAt: message.createdAt,
        lastMessagePreview: conv?.isEncrypted ? null : params.content?.slice(0, 256),
        lastMessageSenderId: params.senderId,
        version: conv!.version + 1,
      })
      .where(eq(conversations.id, params.conversationId))

    // 7. Increment unread counters для other members
    await tx.update(conversationMembers)
      .set({
        unreadCount: sql`unread_count + 1`,
      })
      .where(and(
        eq(conversationMembers.conversationId, params.conversationId),
        ne(conversationMembers.userId, params.senderId),
        eq(conversationMembers.status, 'active'),
      ))

    // 8. Publish event
    await publishEvent('app.daria.messenger.message-sent.v1', {
      conversationId: params.conversationId,
      conversationKind: conv?.kind,
      contextEntity: conv?.contextEntityKind
        ? { kind: conv.contextEntityKind, id: conv.contextEntityId! }
        : undefined,
      messageId: message.id,
      senderId: params.senderId,
      sentAt: message.createdAt.toISOString(),
      contentType: params.kind,
      hasAttachments: !!params.attachments?.length,
      isEncrypted: !!conv?.isEncrypted,
      replyToMessageId: params.replyToMessageId,
    })

    return message
  })
}
```

### Unread counter maintenance

```typescript
async function markAsRead(params: {
  conversationId: string
  userId: string
  uptoMessageId: string
}) {
  await db.update(conversationMembers)
    .set({
      lastReadMessageId: params.uptoMessageId,
      lastReadAt: new Date(),
      unreadCount: 0,
    })
    .where(and(
      eq(conversationMembers.conversationId, params.conversationId),
      eq(conversationMembers.userId, params.userId),
    ))
}
```

### Resolver: conversations для entity context

Used by right-panel shell resolver (см. `22-messaging-model.md §3`):

```typescript
async function conversationsForEntity(params: {
  userId: string
  entityKind: string
  entityId: string
  view: 'instance' | 'type'
}): Promise<Conversation[]> {
  const memberships = db.$with('my_memberships').as(
    db.select({ conversationId: conversationMembers.conversationId })
      .from(conversationMembers)
      .where(and(
        eq(conversationMembers.userId, params.userId),
        eq(conversationMembers.status, 'active'),
      ))
  )

  return db.with(memberships)
    .select()
    .from(conversations)
    .where(and(
      eq(conversations.contextEntityKind, params.entityKind),
      eq(conversations.contextEntityId, params.entityId),
      isNull(conversations.deletedAt),
      or(
        // Direct member
        inArray(conversations.id, db.select({ id: memberships.conversationId }).from(memberships)),
        // Open community
        and(
          eq(conversations.kind, 'community'),
          eq(conversations.joinPolicy, 'open'),
        ),
      ),
    ))
    .orderBy(desc(conversations.lastMessageAt))
    .limit(50)
}
```
