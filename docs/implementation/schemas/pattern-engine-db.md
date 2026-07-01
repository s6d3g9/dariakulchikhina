# Pattern-engine DB schema

Postgres `pattern_db` для `services/pattern-engine`. Core concept: Pattern-Card (atomic / compound / template) с lineage graph.

## Tables

### `patterns`

Main table — все Pattern-Card'ы (атомарные, compound, templates) в одном (type-discriminated).

```typescript
import { pgTable, uuid, varchar, text, jsonb, timestamp, bigint, index, pgEnum } from 'drizzle-orm/pg-core'

export const patternKindEnum = pgEnum('pattern_kind', ['atomic', 'compound', 'template'])

export const patterns = pgTable('patterns', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  kind: patternKindEnum('kind').notNull(),
  cardType: varchar('card_type', { length: 64 }).notNull(),
  // values: 'flight-ticket' | 'trip-compound' | 'pattern-template' | ...
  
  // Owner (user / company creating this)
  ownerId: varchar('owner_id', { length: 64 }).notNull(),
  
  // Meta
  title: varchar('title', { length: 256 }).notNull(),
  summary: text('summary'),
  
  // Parameters (card-type-specific)
  params: jsonb('params').$type<Record<string, unknown>>().notNull().default({}),
  
  // Timeline reference (if has timeline)
  timelineId: uuid('timeline_id'),
  
  // Lineage (if forked from another pattern/template)
  parentId: uuid('parent_id').references((): any => patterns.id),
  lineageRelation: varchar('lineage_relation', { length: 16 }),  // 'fork' | 'materialized-from'
  lineagePath: jsonb('lineage_path').$type<string[]>(),  // denormalized ancestry [grandparent, parent]
  
  // Template-only fields
  licenseKind: varchar('license_kind', { length: 32 }),
  // 'CC0' | 'CC-BY' | 'MIT' | 'GPL' | 'Royalty-Fork' | 'Commercial-1x' | 'Commercial-Subscription' | 'Private'
  splitPolicyJson: jsonb('split_policy_json').$type<SplitPolicy>(),
  priceCents: bigint('price_cents', { mode: 'bigint' }),
  currency: varchar('currency', { length: 3 }),
  
  // Publication state
  publishedAt: timestamp('published_at', { withTimezone: true }),
  visibility: varchar('visibility', { length: 16 }).notNull().default('private'),
  // 'public' | 'unlisted' | 'private'
  
  // System
  version: bigint('version', { mode: 'number' }).notNull().default(1),  // OCC
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => ({
  ownerIdx: index('patterns_owner_idx').on(t.ownerId, t.createdAt),
  cardTypeIdx: index('patterns_card_type_idx').on(t.cardType, t.kind),
  parentIdx: index('patterns_parent_idx').on(t.parentId),
  publishedIdx: index('patterns_published_idx').on(t.publishedAt)
    .where(sql`visibility = 'public' AND kind = 'template' AND deleted_at IS NULL`),
}))

interface SplitPolicy {
  splits: Array<{ party: string, share: number }>
  forksLineageRule: 'equal' | 'geometric' | 'linear' | 'none'
  minDistributionCents: number
  dustPolicy: 'accumulate' | 'platform-fee'
  currency: string
}
```

### `pattern_children`

Для compound-патернов — hasMany(children). Each row = одна связка parent→child с binding.

```typescript
export const bindingTypeEnum = pgEnum('binding_type', 
  ['sequential', 'parallel', 'conditional', 'optional', 'replicated']
)

export const patternChildren = pgTable('pattern_children', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  parentId: uuid('parent_id').references(() => patterns.id, { onDelete: 'cascade' }).notNull(),
  childId: uuid('child_id').references(() => patterns.id, { onDelete: 'restrict' }).notNull(),
  
  slot: varchar('slot', { length: 64 }).notNull(),  // slot name within compound ('outbound' / 'accommodation' etc.)
  
  bindingType: bindingTypeEnum('binding_type').notNull(),
  bindingConfig: jsonb('binding_config').$type<BindingConfig>(),
  // { after?: string[], when?: string, count?: number, weight?: number }
  
  position: bigint('position', { mode: 'number' }).notNull(),  // ordering within parent
  
  enabled: boolean('enabled').notNull().default(true),  // для optional children
  
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  parentIdx: index('pattern_children_parent_idx').on(t.parentId, t.position),
  childIdx: index('pattern_children_child_idx').on(t.childId),
  uniqParentSlot: unique('uniq_parent_slot').on(t.parentId, t.slot),
}))

interface BindingConfig {
  after?: string[]       // sequential
  when?: string          // conditional — policy expression
  count?: number         // replicated
  weight?: number        // progress weight (default 1)
}
```

### `pattern_versions`

Template versions history. Fork references specific version.

```typescript
export const patternVersions = pgTable('pattern_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  patternId: uuid('pattern_id').references(() => patterns.id).notNull(),
  version: bigint('version', { mode: 'number' }).notNull(),
  
  // Full snapshot of pattern at this version
  snapshot: jsonb('snapshot').$type<Record<string, unknown>>().notNull(),
  
  // Child graph snapshot
  childrenSnapshot: jsonb('children_snapshot').$type<Array<Record<string, unknown>>>(),
  
  // Who + why
  authoredBy: varchar('authored_by', { length: 64 }).notNull(),
  commitMessage: text('commit_message'),
  
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  patternVersionIdx: unique('uniq_pattern_version').on(t.patternId, t.version),
  createdAtIdx: index('pattern_versions_created_idx').on(t.createdAt),
}))
```

### `lineage_edges`

Denormalized lineage for fast ancestor queries. Filled on fork.

```typescript
export const lineageEdges = pgTable('lineage_edges', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  ancestorId: uuid('ancestor_id').references(() => patterns.id).notNull(),
  descendantId: uuid('descendant_id').references(() => patterns.id).notNull(),
  
  depth: bigint('depth', { mode: 'number' }).notNull(),  // direct parent = 1
  
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  ancestorIdx: index('lineage_ancestor_idx').on(t.ancestorId, t.depth),
  descendantIdx: index('lineage_descendant_idx').on(t.descendantId, t.depth),
  uniqEdge: unique('uniq_lineage_edge').on(t.ancestorId, t.descendantId),
}))
```

Позволяет получить всех предков за O(log n) через:
```sql
SELECT * FROM lineage_edges WHERE descendant_id = $1 ORDER BY depth;
```

## Migration SQL

```sql
CREATE TYPE pattern_kind AS ENUM ('atomic', 'compound', 'template');
CREATE TYPE binding_type AS ENUM ('sequential', 'parallel', 'conditional', 'optional', 'replicated');

CREATE TABLE patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind pattern_kind NOT NULL,
  card_type varchar(64) NOT NULL,
  owner_id varchar(64) NOT NULL,
  title varchar(256) NOT NULL,
  summary text,
  params jsonb NOT NULL DEFAULT '{}'::jsonb,
  timeline_id uuid,
  parent_id uuid REFERENCES patterns(id),
  lineage_relation varchar(16),
  lineage_path jsonb,
  license_kind varchar(32),
  split_policy_json jsonb,
  price_cents bigint,
  currency varchar(3),
  published_at timestamptz,
  visibility varchar(16) NOT NULL DEFAULT 'private',
  version bigint NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX patterns_owner_idx ON patterns(owner_id, created_at);
CREATE INDEX patterns_card_type_idx ON patterns(card_type, kind);
CREATE INDEX patterns_parent_idx ON patterns(parent_id);
CREATE INDEX patterns_published_idx ON patterns(published_at) 
  WHERE visibility = 'public' AND kind = 'template' AND deleted_at IS NULL;

-- Template должен иметь license (валидируется в code, но partial check):
ALTER TABLE patterns ADD CONSTRAINT check_template_has_license 
  CHECK (kind != 'template' OR license_kind IS NOT NULL);

CREATE TABLE pattern_children (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL REFERENCES patterns(id) ON DELETE CASCADE,
  child_id uuid NOT NULL REFERENCES patterns(id) ON DELETE RESTRICT,
  slot varchar(64) NOT NULL,
  binding_type binding_type NOT NULL,
  binding_config jsonb,
  position bigint NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX pattern_children_parent_idx ON pattern_children(parent_id, position);
CREATE INDEX pattern_children_child_idx ON pattern_children(child_id);
CREATE UNIQUE INDEX uniq_parent_slot ON pattern_children(parent_id, slot);

-- Prevent cycles (check в app, но DB-level для strong guarantee)
ALTER TABLE pattern_children ADD CONSTRAINT check_no_self_ref CHECK (parent_id != child_id);

CREATE TABLE pattern_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_id uuid NOT NULL REFERENCES patterns(id),
  version bigint NOT NULL,
  snapshot jsonb NOT NULL,
  children_snapshot jsonb,
  authored_by varchar(64) NOT NULL,
  commit_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uniq_pattern_version ON pattern_versions(pattern_id, version);
CREATE INDEX pattern_versions_created_idx ON pattern_versions(created_at);

CREATE TABLE lineage_edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ancestor_id uuid NOT NULL REFERENCES patterns(id),
  descendant_id uuid NOT NULL REFERENCES patterns(id),
  depth bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX lineage_ancestor_idx ON lineage_edges(ancestor_id, depth);
CREATE INDEX lineage_descendant_idx ON lineage_edges(descendant_id, depth);
CREATE UNIQUE INDEX uniq_lineage_edge ON lineage_edges(ancestor_id, descendant_id);
```

## Fork operation — concrete

```typescript
async function forkTemplate(params: {
  templateId: string
  forkerId: string
  forkTitle?: string
}): Promise<{ newTemplateId: string }> {
  return db.transaction(async (tx) => {
    // 1. Load source template
    const source = await tx.query.patterns.findFirst({
      where: eq(patterns.id, params.templateId),
    })
    if (!source) throw new Error('TEMPLATE_NOT_FOUND')
    if (source.kind !== 'template') throw new Error('NOT_A_TEMPLATE')

    // 2. Check license allows forking
    const LICENSE_FORK_OK = ['CC0', 'CC-BY', 'CC-BY-SA', 'MIT', 'GPL', 'Royalty-Fork']
    if (!LICENSE_FORK_OK.includes(source.licenseKind!)) {
      throw new Error(`LICENSE_FORBIDS_FORK: ${source.licenseKind}`)
    }

    // 3. Create new pattern as template
    const newLineagePath = [...(source.lineagePath ?? []), source.id]
    
    const [forked] = await tx.insert(patterns).values({
      kind: 'template',
      cardType: source.cardType,
      ownerId: params.forkerId,
      title: params.forkTitle ?? `Fork of ${source.title}`,
      summary: source.summary,
      params: source.params,  // copy params (can edit later)
      parentId: source.id,
      lineageRelation: 'fork',
      lineagePath: newLineagePath,
      licenseKind: source.licenseKind,  // must inherit (or stricter)
      splitPolicyJson: source.splitPolicyJson,  // inherit default
      visibility: 'private',  // user must explicitly publish
    }).returning()

    // 4. Deep-copy children (with new child patterns)
    const children = await tx.query.patternChildren.findMany({
      where: eq(patternChildren.parentId, source.id),
      orderBy: [asc(patternChildren.position)],
    })

    for (const childRef of children) {
      // Recursively copy child pattern
      const newChildId = await forkSinglePattern(tx, childRef.childId, params.forkerId)
      
      await tx.insert(patternChildren).values({
        parentId: forked.id,
        childId: newChildId,
        slot: childRef.slot,
        bindingType: childRef.bindingType,
        bindingConfig: childRef.bindingConfig,
        position: childRef.position,
        enabled: childRef.enabled,
      })
    }

    // 5. Populate lineage_edges (denormalized)
    await tx.insert(lineageEdges).values({
      ancestorId: source.id,
      descendantId: forked.id,
      depth: 1,
    })
    // Копируем источника's ancestors
    const ancestorEdges = await tx.select()
      .from(lineageEdges)
      .where(eq(lineageEdges.descendantId, source.id))
    
    for (const edge of ancestorEdges) {
      await tx.insert(lineageEdges).values({
        ancestorId: edge.ancestorId,
        descendantId: forked.id,
        depth: edge.depth + 1,
      })
    }

    // 6. Register в authorship-registry (через HTTP/event)
    await publishEvent('app.daria.pattern.forked.v1', {
      forkerId: params.forkerId,
      sourceTemplateId: source.id,
      newTemplateId: forked.id,
      lineageDepth: newLineagePath.length,
    })

    return { newTemplateId: forked.id }
  })
}
```

## Query patterns

```typescript
// Get template + children for rendering
const template = await db.query.patterns.findFirst({
  where: eq(patterns.id, templateId),
  with: {
    children: {
      with: { child: true },  // join
      orderBy: [asc(patternChildren.position)],
    },
  },
})

// Get all ancestors of a template (for royalty distribution)
const ancestors = await db.select({
  id: patterns.id,
  ownerId: patterns.ownerId,
  licenseKind: patterns.licenseKind,
  splitPolicyJson: patterns.splitPolicyJson,
  depth: lineageEdges.depth,
})
  .from(lineageEdges)
  .innerJoin(patterns, eq(patterns.id, lineageEdges.ancestorId))
  .where(eq(lineageEdges.descendantId, templateId))
  .orderBy(asc(lineageEdges.depth))
// → returns [direct-parent, grandparent, ...]

// Marketplace browsing
const trendingTemplates = await db.select()
  .from(patterns)
  .where(and(
    eq(patterns.kind, 'template'),
    eq(patterns.visibility, 'public'),
    isNull(patterns.deletedAt),
    gt(patterns.publishedAt, sub(new Date(), { days: 30 })),
  ))
  .orderBy(desc(patterns.publishedAt))
  .limit(50)
```

## Constraints

- Template must have `license_kind` (DB check).
- Non-self-reference в children (DB check).
- Template deletion — cascade children (but restricted if used в active compounds).
- Version bump on every template edit.
