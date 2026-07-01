# Timeline-engine DB schema

Postgres `timeline_db` для `services/timeline-engine`. Stores timeline state (denormalized from Temporal для fast UI queries).

## Tables

### `timelines`

```typescript
export const timelineStatusEnum = pgEnum('timeline_status', 
  ['pending', 'active', 'paused', 'completed', 'cancelled', 'failed']
)

export const timelines = pgTable('timelines', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Link to Pattern-Card (owner)
  patternId: uuid('pattern_id').notNull(),
  cardType: varchar('card_type', { length: 64 }).notNull(),
  
  // Temporal workflow link
  temporalWorkflowId: varchar('temporal_workflow_id', { length: 256 }).notNull(),
  temporalRunId: varchar('temporal_run_id', { length: 64 }),
  
  // State
  status: timelineStatusEnum('status').notNull().default('pending'),
  currentStepId: varchar('current_step_id', { length: 64 }),
  progressPct: real('progress_pct').notNull().default(0),
  
  // Owner
  ownerId: varchar('owner_id', { length: 64 }).notNull(),
  
  // Parent link (for nested compound timelines)
  parentTimelineId: uuid('parent_timeline_id').references((): any => timelines.id),
  parentSlot: varchar('parent_slot', { length: 64 }),
  
  // Metadata
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  cancelReason: text('cancel_reason'),
  
  version: bigint('version', { mode: 'number' }).notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  patternIdx: index('timelines_pattern_idx').on(t.patternId),
  ownerIdx: index('timelines_owner_idx').on(t.ownerId, t.status),
  temporalIdx: unique('timelines_temporal_idx').on(t.temporalWorkflowId),
  parentIdx: index('timelines_parent_idx').on(t.parentTimelineId),
}))
```

### `timeline_steps`

```typescript
export const stepKindEnum = pgEnum('step_kind', 
  ['auto', 'human', 'external', 'gate', 'compound']
)
export const stepStatusEnum = pgEnum('step_status',
  ['pending', 'active', 'waiting', 'done', 'failed', 'skipped', 'cancelled']
)

export const timelineSteps = pgTable('timeline_steps', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  timelineId: uuid('timeline_id').references(() => timelines.id, { onDelete: 'cascade' }).notNull(),
  
  stepId: varchar('step_id', { length: 64 }).notNull(),  // stable ID within timeline ('search', 'payment')
  kind: stepKindEnum('kind').notNull(),
  status: stepStatusEnum('status').notNull().default('pending'),
  
  title: varchar('title', { length: 256 }).notNull(),
  owner: varchar('owner', { length: 16 }).notNull().default('user'),
  // 'user' | 'counterparty' | 'system' | 'regulator'
  
  position: bigint('position', { mode: 'number' }).notNull(),  // ordering
  
  // Timing
  plannedAt: timestamp('planned_at', { withTimezone: true }),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  deadlineAt: timestamp('deadline_at', { withTimezone: true }),
  
  // Execution (per step kind)
  handler: varchar('handler', { length: 128 }),
  compensateHandler: varchar('compensate_handler', { length: 128 }),
  handlerParams: jsonb('handler_params').$type<Record<string, unknown>>(),
  handlerResult: jsonb('handler_result').$type<Record<string, unknown>>(),
  
  // For gate-kind
  gateRequirement: text('gate_requirement'),  // policy-engine expression
  gateDecision: varchar('gate_decision', { length: 16 }),  // 'allow' | 'distill' | 'deny'
  
  // For human-kind
  humanActionSpec: jsonb('human_action_spec').$type<HumanActionSpec>(),
  humanSubmittedBy: varchar('human_submitted_by', { length: 64 }),
  humanSubmittedAt: timestamp('human_submitted_at', { withTimezone: true }),
  
  // For compound-kind
  nestedTimelineId: uuid('nested_timeline_id'),
  
  // Error / retry
  retryCount: bigint('retry_count', { mode: 'number' }).notNull().default(0),
  lastError: text('last_error'),
  
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  timelineIdx: index('steps_timeline_idx').on(t.timelineId, t.position),
  stepIdx: unique('steps_unique_step').on(t.timelineId, t.stepId),
  statusIdx: index('steps_status_idx').on(t.status).where(sql`status IN ('active', 'waiting', 'failed')`),
  deadlineIdx: index('steps_deadline_idx').on(t.deadlineAt).where(sql`status IN ('active', 'waiting')`),
}))

interface HumanActionSpec {
  instructions: string
  inputSchema?: unknown  // Zod schema as JSON Schema
  approvers?: string[]   // required approvers
}
```

### `timeline_events`

```typescript
export const timelineEvents = pgTable('timeline_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  timelineId: uuid('timeline_id').references(() => timelines.id, { onDelete: 'cascade' }).notNull(),
  stepId: uuid('step_id').references(() => timelineSteps.id, { onDelete: 'cascade' }),
  
  eventType: varchar('event_type', { length: 64 }).notNull(),
  // 'started' | 'step-entered' | 'step-completed' | 'step-failed' 
  // | 'compensated' | 'completed' | 'cancelled' | 'human-action-submitted'
  // | 'gate-allowed' | 'gate-denied' | 'gate-distilled'
  
  payload: jsonb('payload').$type<Record<string, unknown>>(),
  
  userId: varchar('user_id', { length: 64 }),
  traceId: varchar('trace_id', { length: 64 }),
  
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  timelineIdx: index('timeline_events_timeline_idx').on(t.timelineId, t.createdAt),
  stepIdx: index('timeline_events_step_idx').on(t.stepId),
  typeIdx: index('timeline_events_type_idx').on(t.eventType, t.createdAt),
}))
```

### `timeline_evidence`

```typescript
export const evidenceKindEnum = pgEnum('evidence_kind',
  ['document', 'photo', 'video', 'signature', 'tx-hash', 'receipt', 'report', 'other']
)

export const timelineEvidence = pgTable('timeline_evidence', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  timelineId: uuid('timeline_id').references(() => timelines.id, { onDelete: 'cascade' }).notNull(),
  stepId: uuid('step_id').references(() => timelineSteps.id).notNull(),
  
  kind: evidenceKindEnum('kind').notNull(),
  title: varchar('title', { length: 256 }),
  
  // Reference в media-pipeline (for photos, documents, videos)
  mediaRef: varchar('media_ref', { length: 256 }),
  
  // Hash для integrity (content-addressable если нужно)
  contentHash: varchar('content_hash', { length: 64 }),
  
  // For tx-hash — on-chain reference
  onchainTx: varchar('onchain_tx', { length: 256 }),
  onchainNetwork: varchar('onchain_network', { length: 32 }),
  
  // Metadata
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  
  uploadedBy: varchar('uploaded_by', { length: 64 }).notNull(),
  uploadedAt: timestamp('uploaded_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  timelineIdx: index('evidence_timeline_idx').on(t.timelineId),
  stepIdx: index('evidence_step_idx').on(t.stepId),
}))
```

## Migration SQL

```sql
CREATE TYPE timeline_status AS ENUM ('pending', 'active', 'paused', 'completed', 'cancelled', 'failed');
CREATE TYPE step_kind AS ENUM ('auto', 'human', 'external', 'gate', 'compound');
CREATE TYPE step_status AS ENUM ('pending', 'active', 'waiting', 'done', 'failed', 'skipped', 'cancelled');
CREATE TYPE evidence_kind AS ENUM ('document', 'photo', 'video', 'signature', 'tx-hash', 'receipt', 'report', 'other');

CREATE TABLE timelines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_id uuid NOT NULL,
  card_type varchar(64) NOT NULL,
  temporal_workflow_id varchar(256) NOT NULL,
  temporal_run_id varchar(64),
  status timeline_status NOT NULL DEFAULT 'pending',
  current_step_id varchar(64),
  progress_pct real NOT NULL DEFAULT 0,
  owner_id varchar(64) NOT NULL,
  parent_timeline_id uuid REFERENCES timelines(id),
  parent_slot varchar(64),
  started_at timestamptz,
  completed_at timestamptz,
  cancel_reason text,
  version bigint NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX timelines_pattern_idx ON timelines(pattern_id);
CREATE INDEX timelines_owner_idx ON timelines(owner_id, status);
CREATE UNIQUE INDEX timelines_temporal_idx ON timelines(temporal_workflow_id);
CREATE INDEX timelines_parent_idx ON timelines(parent_timeline_id);

CREATE TABLE timeline_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timeline_id uuid NOT NULL REFERENCES timelines(id) ON DELETE CASCADE,
  step_id varchar(64) NOT NULL,
  kind step_kind NOT NULL,
  status step_status NOT NULL DEFAULT 'pending',
  title varchar(256) NOT NULL,
  owner varchar(16) NOT NULL DEFAULT 'user',
  position bigint NOT NULL,
  planned_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  deadline_at timestamptz,
  handler varchar(128),
  compensate_handler varchar(128),
  handler_params jsonb,
  handler_result jsonb,
  gate_requirement text,
  gate_decision varchar(16),
  human_action_spec jsonb,
  human_submitted_by varchar(64),
  human_submitted_at timestamptz,
  nested_timeline_id uuid,
  retry_count bigint NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX steps_timeline_idx ON timeline_steps(timeline_id, position);
CREATE UNIQUE INDEX steps_unique_step ON timeline_steps(timeline_id, step_id);
CREATE INDEX steps_status_idx ON timeline_steps(status) WHERE status IN ('active', 'waiting', 'failed');
CREATE INDEX steps_deadline_idx ON timeline_steps(deadline_at) WHERE status IN ('active', 'waiting');

CREATE TABLE timeline_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timeline_id uuid NOT NULL REFERENCES timelines(id) ON DELETE CASCADE,
  step_id uuid REFERENCES timeline_steps(id) ON DELETE CASCADE,
  event_type varchar(64) NOT NULL,
  payload jsonb,
  user_id varchar(64),
  trace_id varchar(64),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX timeline_events_timeline_idx ON timeline_events(timeline_id, created_at);
CREATE INDEX timeline_events_step_idx ON timeline_events(step_id);
CREATE INDEX timeline_events_type_idx ON timeline_events(event_type, created_at);

CREATE TABLE timeline_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timeline_id uuid NOT NULL REFERENCES timelines(id) ON DELETE CASCADE,
  step_id uuid NOT NULL REFERENCES timeline_steps(id),
  kind evidence_kind NOT NULL,
  title varchar(256),
  media_ref varchar(256),
  content_hash varchar(64),
  onchain_tx varchar(256),
  onchain_network varchar(32),
  metadata jsonb,
  uploaded_by varchar(64) NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX evidence_timeline_idx ON timeline_evidence(timeline_id);
CREATE INDEX evidence_step_idx ON timeline_evidence(step_id);
```

## Temporal workflow shape

Timeline-engine wraps Temporal. Workflow signature:

```typescript
// services/timeline-engine/src/workflows/genericTimeline.ts
import { proxyActivities, defineSignal, setHandler, condition } from '@temporalio/workflow'
import type * as activities from './activities'

const { runAutoStep, evaluateGate, runExternalStep, runCompoundStep } = 
  proxyActivities<typeof activities>({ startToCloseTimeout: '10 minutes' })

export const submitHumanStepSignal = defineSignal<[{ stepId: string, data: unknown }]>('submitHumanStep')
export const cancelSignal = defineSignal('cancel')

export async function timelineWorkflow(input: {
  timelineId: string
  steps: TimelineStepDef[]
}): Promise<void> {
  let cancelled = false
  let humanSubmissions: Record<string, unknown> = {}

  setHandler(cancelSignal, () => { cancelled = true })
  setHandler(submitHumanStepSignal, (payload) => {
    humanSubmissions[payload.stepId] = payload.data
  })

  for (const step of input.steps) {
    if (cancelled) {
      await compensateFrom(step.id, input.steps)
      return
    }

    await updateStepStatus(input.timelineId, step.id, 'active')

    try {
      switch (step.kind) {
        case 'auto':
          await runAutoStep(input.timelineId, step)
          break
        case 'gate':
          const decision = await evaluateGate(input.timelineId, step)
          if (decision === 'deny') {
            await updateStepStatus(input.timelineId, step.id, 'cancelled')
            await compensateFrom(step.id, input.steps)
            return
          }
          break
        case 'human':
          await condition(() => humanSubmissions[step.id] !== undefined, '30 days')
          if (!humanSubmissions[step.id]) {
            await updateStepStatus(input.timelineId, step.id, 'failed')
            await compensateFrom(step.id, input.steps)
            return
          }
          break
        case 'external':
          await runExternalStep(input.timelineId, step)
          break
        case 'compound':
          await runCompoundStep(input.timelineId, step)
          break
      }
      await updateStepStatus(input.timelineId, step.id, 'done')
    } catch (err) {
      await updateStepStatus(input.timelineId, step.id, 'failed')
      await compensateFrom(step.id, input.steps)
      throw err
    }
  }

  await updateTimelineStatus(input.timelineId, 'completed')
}

async function compensateFrom(failedStepId: string, steps: TimelineStepDef[]) {
  // Reverse order, skip failed step
  const completed = steps.slice(0, steps.findIndex(s => s.id === failedStepId)).reverse()
  for (const step of completed) {
    if (step.compensateHandler) {
      try {
        await runAutoStep(...)  // run compensate handler
      } catch (err) {
        // Escalate to disputes
      }
    }
  }
}
```

## Key queries

```typescript
// Active timelines for user (для right-panel / status-view)
db.query.timelines.findMany({
  where: and(
    eq(timelines.ownerId, userId),
    inArray(timelines.status, ['active', 'pending']),
  ),
  with: { steps: { orderBy: [asc(timelineSteps.position)] } },
})

// Find stuck steps (for alert timeline-dead-step)
db.select()
  .from(timelineSteps)
  .where(and(
    eq(timelineSteps.status, 'failed'),
    lt(timelineSteps.updatedAt, sub(new Date(), { hours: 1 })),
  ))

// Load evidence chain for step (for audit-view)
db.query.timelineEvidence.findMany({
  where: eq(timelineEvidence.stepId, stepId),
  orderBy: [desc(timelineEvidence.uploadedAt)],
})
```

## Integration с pattern-engine

Timeline created when Pattern-Card instanciated (materialized from template). Flow:

```
1. pattern-engine.materialize() creates pattern record + emits pattern.materialized event
2. timeline-engine consumer:
   - Reads pattern's associated timeline-spec (from card-type definition)
   - Creates timeline + steps records
   - Starts Temporal workflow with timeline-id
3. Workflow drives steps through lifecycle
4. Each step emits events to:
   - timeline_events table (local)
   - JetStream (for downstream consumers)
   - audit-log (via governance hook)
```
