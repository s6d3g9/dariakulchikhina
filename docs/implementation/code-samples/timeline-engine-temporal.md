# Timeline-engine — TS + Temporal implementation

Полный service. Durable workflows через Temporal, 5 step kinds (auto/human/external/gate/compound).

## Structure

```
services/timeline-engine/
├── Dockerfile
├── package.json
├── src/
│   ├── index.ts                       — Nitro + Temporal worker
│   ├── config.ts
│   ├── db/
│   │   ├── client.ts
│   │   └── schema.ts
│   ├── workflows/
│   │   ├── generic-timeline.ts        — CORE workflow
│   │   └── compensate.ts              — compensating logic
│   ├── activities/
│   │   ├── auto-step.ts
│   │   ├── gate-step.ts
│   │   ├── external-step.ts
│   │   ├── update-status.ts
│   │   └── emit-event.ts
│   ├── handlers/
│   │   ├── timelines.ts               — HTTP CRUD
│   │   ├── steps.ts                   — submit human-step
│   │   └── cancel.ts
│   ├── clients/
│   │   └── policy-engine.ts
│   └── temporal/
│       ├── connection.ts
│       └── worker.ts
└── tests/
```

## src/config.ts

```typescript
import { z } from 'zod'

const ZConfig = z.object({
  port: z.coerce.number().default(8080),
  databaseUrl: z.string(),
  natsUrl: z.string(),
  temporalAddress: z.string().default('temporal:7233'),
  temporalNamespace: z.string().default('daria'),
  temporalTaskQueue: z.string().default('timeline-engine'),
  serviceToken: z.string(),
  policyEngineUrl: z.string(),
})

export function initConfig() {
  return ZConfig.parse(process.env)
}
```

## src/temporal/connection.ts

```typescript
import { Connection, Client } from '@temporalio/client'
import { Worker, NativeConnection } from '@temporalio/worker'

export async function createClient(address: string, namespace: string): Promise<Client> {
  const connection = await Connection.connect({ address })
  return new Client({ connection, namespace })
}

export async function createWorker(options: {
  address: string
  namespace: string
  taskQueue: string
  dependencies: any
}): Promise<Worker> {
  const connection = await NativeConnection.connect({ address: options.address })
  
  return Worker.create({
    connection,
    namespace: options.namespace,
    taskQueue: options.taskQueue,
    workflowsPath: require.resolve('../workflows/generic-timeline'),
    activities: {
      runAutoStep: options.dependencies.runAutoStep,
      evaluateGate: options.dependencies.evaluateGate,
      runExternalStep: options.dependencies.runExternalStep,
      runCompoundStep: options.dependencies.runCompoundStep,
      updateStepStatus: options.dependencies.updateStepStatus,
      updateTimelineStatus: options.dependencies.updateTimelineStatus,
      emitEvent: options.dependencies.emitEvent,
      runCompensate: options.dependencies.runCompensate,
    },
    maxConcurrentActivityTaskExecutions: 100,
    maxConcurrentWorkflowTaskExecutions: 100,
  })
}
```

## src/workflows/generic-timeline.ts (CORE)

```typescript
import {
  proxyActivities,
  defineSignal,
  setHandler,
  condition,
  sleep,
  log,
  workflowInfo,
  continueAsNew,
  ApplicationFailure,
} from '@temporalio/workflow'

import type * as activities from '../activities'

const {
  runAutoStep,
  evaluateGate,
  runExternalStep,
  runCompoundStep,
  updateStepStatus,
  updateTimelineStatus,
  emitEvent,
  runCompensate,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '30 minutes',
  retry: {
    initialInterval: '1s',
    backoffCoefficient: 2,
    maximumInterval: '1h',
    maximumAttempts: 5,
  },
})

// === Signals ===
export const submitHumanStepSignal = defineSignal<[{ stepId: string; data: unknown; submittedBy: string }]>('submitHumanStep')
export const cancelSignal = defineSignal<[{ reason: string; cancelledBy: string }]>('cancel')
export const pauseSignal = defineSignal('pause')
export const resumeSignal = defineSignal('resume')

// === Workflow input ===
export interface TimelineWorkflowInput {
  timelineId: string
  ownerId: string
  patternId: string
  cardType: string
  steps: StepDef[]
  completion: { on: string }
}

export interface StepDef {
  id: string
  kind: 'auto' | 'human' | 'external' | 'gate' | 'compound'
  title: string
  owner: 'user' | 'counterparty' | 'system' | 'regulator'
  position: number
  handler?: string
  compensateHandler?: string
  handlerParams?: Record<string, unknown>
  gateRequirement?: string
  humanActionSpec?: {
    instructions: string
    timeoutSeconds?: number
    approvers?: string[]
  }
  nestedTimelineId?: string
  deadlineSeconds?: number
}

// === Workflow ===
export async function timelineWorkflow(input: TimelineWorkflowInput): Promise<void> {
  log.info('Timeline starting', { timelineId: input.timelineId })

  let cancelled = false
  let cancelReason: string | undefined
  let cancelledBy: string | undefined
  let paused = false
  const humanSubmissions = new Map<string, { data: unknown; submittedBy: string }>()

  // Register signal handlers
  setHandler(cancelSignal, (payload) => {
    cancelled = true
    cancelReason = payload.reason
    cancelledBy = payload.cancelledBy
  })
  setHandler(pauseSignal, () => { paused = true })
  setHandler(resumeSignal, () => { paused = false })
  setHandler(submitHumanStepSignal, (payload) => {
    humanSubmissions.set(payload.stepId, { data: payload.data, submittedBy: payload.submittedBy })
  })

  // Emit started event
  await emitEvent({
    type: 'app.daria.timeline.started.v1',
    timelineId: input.timelineId,
    data: { ownerId: input.ownerId, patternId: input.patternId, stepCount: input.steps.length },
  })

  const completedSteps: string[] = []

  try {
    for (const step of input.steps) {
      if (cancelled) {
        await handleCancellation(input, completedSteps, cancelReason!, cancelledBy!)
        return
      }

      // Wait if paused
      if (paused) {
        await condition(() => !paused || cancelled, '7 days')
        if (cancelled) {
          await handleCancellation(input, completedSteps, cancelReason!, cancelledBy!)
          return
        }
      }

      // Mark step active
      await updateStepStatus({
        timelineId: input.timelineId,
        stepId: step.id,
        status: 'active',
        startedAt: new Date().toISOString(),
      })
      await emitEvent({
        type: 'app.daria.timeline.step-entered.v1',
        timelineId: input.timelineId,
        data: { stepId: step.id, kind: step.kind, owner: step.owner },
      })

      try {
        let result: unknown = undefined

        switch (step.kind) {
          case 'auto':
            result = await runAutoStep({
              timelineId: input.timelineId,
              stepId: step.id,
              handler: step.handler!,
              params: step.handlerParams ?? {},
            })
            break

          case 'gate': {
            const decision = await evaluateGate({
              timelineId: input.timelineId,
              stepId: step.id,
              requirement: step.gateRequirement!,
              ownerId: input.ownerId,
            })

            if (decision.effect === 'deny') {
              throw new ApplicationFailure(
                `Gate denied: ${decision.reason}`,
                'GATE_DENIED',
                false,  // non-retryable
              )
            }
            result = decision
            break
          }

          case 'human': {
            const timeout = step.humanActionSpec?.timeoutSeconds ?? 30 * 24 * 3600  // default 30 days
            
            await emitEvent({
              type: 'app.daria.timeline.human-step-waiting.v1',
              timelineId: input.timelineId,
              data: {
                stepId: step.id,
                instructions: step.humanActionSpec?.instructions,
                approvers: step.humanActionSpec?.approvers,
              },
            })

            // Wait для signal или timeout
            const submitted = await condition(
              () => humanSubmissions.has(step.id) || cancelled,
              `${timeout} seconds`,
            )

            if (cancelled) {
              await handleCancellation(input, completedSteps, cancelReason!, cancelledBy!)
              return
            }

            if (!submitted) {
              // Timeout — mark failed
              throw new ApplicationFailure(
                `Human step timeout after ${timeout}s`,
                'HUMAN_STEP_TIMEOUT',
                false,
              )
            }

            result = humanSubmissions.get(step.id)
            break
          }

          case 'external':
            result = await runExternalStep({
              timelineId: input.timelineId,
              stepId: step.id,
              handler: step.handler!,
              params: step.handlerParams ?? {},
              deadlineSeconds: step.deadlineSeconds ?? 3600,
            })
            break

          case 'compound':
            result = await runCompoundStep({
              timelineId: input.timelineId,
              parentStepId: step.id,
              nestedTimelineId: step.nestedTimelineId!,
            })
            break
        }

        // Mark step done
        await updateStepStatus({
          timelineId: input.timelineId,
          stepId: step.id,
          status: 'done',
          completedAt: new Date().toISOString(),
          result,
        })
        await emitEvent({
          type: 'app.daria.timeline.step-completed.v1',
          timelineId: input.timelineId,
          data: { stepId: step.id, kind: step.kind, result },
        })

        completedSteps.push(step.id)
      } catch (err) {
        await updateStepStatus({
          timelineId: input.timelineId,
          stepId: step.id,
          status: 'failed',
          lastError: (err as Error).message,
        })
        await emitEvent({
          type: 'app.daria.timeline.step-failed.v1',
          timelineId: input.timelineId,
          data: { stepId: step.id, kind: step.kind, error: (err as Error).message },
        })

        // Compensate в reverse order
        await runCompensationChain(input, completedSteps)
        
        // Mark timeline failed
        await updateTimelineStatus({
          timelineId: input.timelineId,
          status: 'failed',
        })
        await emitEvent({
          type: 'app.daria.timeline.failed.v1',
          timelineId: input.timelineId,
          data: { failedStepId: step.id, error: (err as Error).message },
        })

        throw err
      }
    }

    // All steps done
    await updateTimelineStatus({
      timelineId: input.timelineId,
      status: 'completed',
      completedAt: new Date().toISOString(),
    })
    await emitEvent({
      type: 'app.daria.timeline.completed.v1',
      timelineId: input.timelineId,
      data: { completedAt: new Date().toISOString() },
    })

  } catch (err) {
    log.error('Timeline failed', { error: err })
    throw err
  }
}

async function handleCancellation(
  input: TimelineWorkflowInput,
  completedSteps: string[],
  reason: string,
  cancelledBy: string,
) {
  await runCompensationChain(input, completedSteps)
  
  await updateTimelineStatus({
    timelineId: input.timelineId,
    status: 'cancelled',
    cancelReason: `${reason} (by ${cancelledBy})`,
  })
  await emitEvent({
    type: 'app.daria.timeline.cancelled.v1',
    timelineId: input.timelineId,
    data: { reason, cancelledBy, completedSteps },
  })
}

async function runCompensationChain(input: TimelineWorkflowInput, completedSteps: string[]) {
  const toCompensate = [...completedSteps].reverse()
  
  for (const stepId of toCompensate) {
    const stepDef = input.steps.find(s => s.id === stepId)
    if (!stepDef?.compensateHandler) continue

    try {
      await runCompensate({
        timelineId: input.timelineId,
        stepId,
        handler: stepDef.compensateHandler,
        params: stepDef.handlerParams ?? {},
      })
      await emitEvent({
        type: 'app.daria.timeline.compensated.v1',
        timelineId: input.timelineId,
        data: { stepId, compensateHandler: stepDef.compensateHandler },
      })
    } catch (err) {
      log.error('Compensate failed — escalating to disputes', { stepId, error: err })
      await emitEvent({
        type: 'app.daria.timeline.compensation-failed.v1',
        timelineId: input.timelineId,
        data: { stepId, error: (err as Error).message },
      })
      // Don't throw — continue compensation
    }
  }
}
```

## src/activities/auto-step.ts

```typescript
import { Context } from '@temporalio/activity'
import { httpClient } from '../clients/http'

export async function runAutoStep(params: {
  timelineId: string
  stepId: string
  handler: string   // e.g. 'wallet.transfer' или 'booking.createHold'
  params: Record<string, unknown>
}): Promise<unknown> {
  Context.current().log.info('runAutoStep', { handler: params.handler })

  // Parse handler — format: <service>.<action>
  const [serviceName, action] = params.handler.split('.')
  
  const serviceUrl = SERVICE_URLS[serviceName]
  if (!serviceUrl) throw new Error(`Unknown service: ${serviceName}`)

  // Idempotent call
  const idempotencyKey = `${params.timelineId}-${params.stepId}`
  const traceId = Context.current().info.parent?.workflowId ?? ''
  
  const response = await httpClient.post(`${serviceUrl}/${action}`, {
    ...params.params,
    idempotencyKey,
    traceId,
  }, {
    headers: {
      'Authorization': `Bearer ${process.env.SERVICE_TOKEN}`,
      'Idempotency-Key': idempotencyKey,
    },
  })

  return response.data
}

const SERVICE_URLS: Record<string, string> = {
  wallet: process.env.WALLET_URL!,
  payments: process.env.PAYMENTS_URL!,
  booking: process.env.BOOKING_URL!,
  authorship: process.env.AUTHORSHIP_URL!,
  notifications: process.env.NOTIFICATIONS_URL!,
  subscription: process.env.SUBSCRIPTION_URL!,
}
```

## src/activities/gate-step.ts

```typescript
import { Context } from '@temporalio/activity'
import { httpClient } from '../clients/http'

export async function evaluateGate(params: {
  timelineId: string
  stepId: string
  requirement: string  // policy expression: e.g. 'kyc.level>=2'
  ownerId: string
}): Promise<{ effect: 'allow' | 'distill' | 'deny'; reason?: string }> {
  Context.current().log.info('evaluateGate', { requirement: params.requirement })

  // Load user context
  const user = await httpClient.get(`${process.env.IDENTITY_URL}/v1/users/${params.ownerId}`, {
    headers: { 'Authorization': `Bearer ${process.env.SERVICE_TOKEN}` },
  })

  // Parse requirement into policy-engine action
  const decision = await httpClient.post(`${process.env.POLICY_ENGINE_URL}/v1/evaluate`, {
    user: {
      id: user.data.id,
      age: user.data.age,
      roles: user.data.roles,
      kyc: { level: user.data.kycLevel },
      credentials: user.data.credentials ?? [],
    },
    region: {
      code: user.data.region,
      tz: user.data.timezone ?? 'UTC',
      language: user.data.language ?? 'en',
    },
    action: {
      type: 'timeline.gate',
      resource: params.requirement,
    },
    time: {
      utc: new Date().toISOString(),
    },
  })

  return decision.data
}
```

## src/activities/external-step.ts

```typescript
import { Context } from '@temporalio/activity'
import { ApplicationFailure } from '@temporalio/common'

export async function runExternalStep(params: {
  timelineId: string
  stepId: string
  handler: string
  params: Record<string, unknown>
  deadlineSeconds: number
}): Promise<unknown> {
  // External step — typically вызов third-party API (GDS, PSP, etc.)
  // Или wait for external callback event
  
  const deadline = Date.now() + params.deadlineSeconds * 1000

  while (Date.now() < deadline) {
    try {
      // ... call external
      const result = await callExternalService(params.handler, params.params)
      return result
    } catch (err: any) {
      if (err.retriable) {
        // Activity will retry (Temporal manages)
        throw err
      }
      // Non-retriable failure
      throw new ApplicationFailure(err.message, err.code, false)
    }
  }

  throw new ApplicationFailure('EXTERNAL_STEP_TIMEOUT', 'EXTERNAL_TIMEOUT', false)
}
```

## src/activities/update-status.ts

```typescript
import { db } from '../db/client'
import { timelines, timelineSteps } from '../db/schema'
import { eq } from 'drizzle-orm'

export async function updateStepStatus(params: {
  timelineId: string
  stepId: string
  status: string
  startedAt?: string
  completedAt?: string
  lastError?: string
  result?: unknown
}): Promise<void> {
  await db.update(timelineSteps)
    .set({
      status: params.status as any,
      startedAt: params.startedAt ? new Date(params.startedAt) : undefined,
      completedAt: params.completedAt ? new Date(params.completedAt) : undefined,
      lastError: params.lastError,
      handlerResult: params.result ?? undefined,
      updatedAt: new Date(),
    })
    .where(and(
      eq(timelineSteps.timelineId, params.timelineId),
      eq(timelineSteps.stepId, params.stepId),
    ))
}

export async function updateTimelineStatus(params: {
  timelineId: string
  status: string
  completedAt?: string
  cancelReason?: string
}): Promise<void> {
  await db.update(timelines)
    .set({
      status: params.status as any,
      completedAt: params.completedAt ? new Date(params.completedAt) : undefined,
      cancelReason: params.cancelReason,
      updatedAt: new Date(),
    })
    .where(eq(timelines.id, params.timelineId))
}
```

## src/handlers/timelines.ts

```typescript
import { defineEventHandler, readBody, createError } from 'h3'
import { Client } from '@temporalio/client'
import { db } from '../db/client'
import { timelines, timelineSteps } from '../db/schema'
import { v7 as uuidv7 } from 'uuid'

export function timelinesHandlers(deps: { temporalClient: Client }) {
  return {
    // POST /timelines
    create: defineEventHandler(async (event) => {
      const body = await readBody(event)
      
      const timelineId = uuidv7()
      const workflowId = `timeline-${timelineId}`

      // 1. Persist timeline + steps в Postgres
      await db.transaction(async (tx) => {
        await tx.insert(timelines).values({
          id: timelineId,
          patternId: body.patternId,
          cardType: body.cardType,
          temporalWorkflowId: workflowId,
          ownerId: body.ownerId,
          status: 'pending',
        })
        
        await tx.insert(timelineSteps).values(
          body.steps.map((step: any, idx: number) => ({
            timelineId,
            stepId: step.id,
            kind: step.kind,
            status: 'pending',
            title: step.title,
            owner: step.owner ?? 'user',
            position: idx,
            handler: step.handler,
            compensateHandler: step.compensate,
            handlerParams: step.params,
            gateRequirement: step.gate?.require,
            humanActionSpec: step.human,
          }))
        )
      })

      // 2. Start Temporal workflow
      await deps.temporalClient.workflow.start('timelineWorkflow', {
        workflowId,
        taskQueue: 'timeline-engine',
        args: [{
          timelineId,
          ownerId: body.ownerId,
          patternId: body.patternId,
          cardType: body.cardType,
          steps: body.steps,
          completion: body.completion,
        }],
        workflowIdReusePolicy: 'REJECT_DUPLICATE',
      })

      return { timelineId, workflowId, status: 'pending' }
    }),

    // GET /timelines/:id
    get: defineEventHandler(async (event) => {
      const id = event.context.params?.id
      
      const timeline = await db.query.timelines.findFirst({
        where: eq(timelines.id, id!),
      })
      if (!timeline) throw createError({ statusCode: 404 })

      const steps = await db.query.timelineSteps.findMany({
        where: eq(timelineSteps.timelineId, id!),
        orderBy: [asc(timelineSteps.position)],
      })

      return { ...timeline, steps }
    }),

    // POST /timelines/:id/steps/:stepId/submit
    submitHumanStep: defineEventHandler(async (event) => {
      const timelineId = event.context.params?.id
      const stepId = event.context.params?.stepId
      const body = await readBody(event)
      const userId = event.context.auth?.userId

      const timeline = await db.query.timelines.findFirst({
        where: eq(timelines.id, timelineId!),
      })
      if (!timeline) throw createError({ statusCode: 404 })

      // Send signal to Temporal workflow
      const handle = deps.temporalClient.workflow.getHandle(timeline.temporalWorkflowId)
      await handle.signal('submitHumanStep', {
        stepId: stepId!,
        data: body.data,
        submittedBy: userId!,
      })

      return { accepted: true }
    }),

    // POST /timelines/:id/cancel
    cancel: defineEventHandler(async (event) => {
      const timelineId = event.context.params?.id
      const body = await readBody(event)
      const userId = event.context.auth?.userId

      const timeline = await db.query.timelines.findFirst({
        where: eq(timelines.id, timelineId!),
      })
      if (!timeline) throw createError({ statusCode: 404 })

      const handle = deps.temporalClient.workflow.getHandle(timeline.temporalWorkflowId)
      await handle.signal('cancel', {
        reason: body.reason ?? 'user-requested',
        cancelledBy: userId!,
      })

      return { cancelling: true }
    }),

    // GET /users/:userId/timelines
    listUserTimelines: defineEventHandler(async (event) => {
      const userId = event.context.params?.userId
      const status = getQuery(event).status as string | undefined

      const where = status
        ? and(eq(timelines.ownerId, userId!), eq(timelines.status, status as any))
        : eq(timelines.ownerId, userId!)

      const items = await db.query.timelines.findMany({
        where,
        orderBy: [desc(timelines.createdAt)],
        limit: 50,
      })

      return { items }
    }),
  }
}
```

## src/index.ts (entrypoint)

```typescript
import { createApp, toNodeListener, defineEventHandler } from 'h3'
import { createServer } from 'node:http'
import { initConfig } from './config'
import { createClient, createWorker } from './temporal/connection'
import { timelinesHandlers } from './handlers/timelines'
import * as activities from './activities'
import { initTracing } from './tracing'

async function main() {
  await initTracing('timeline-engine')
  const config = initConfig()

  // Temporal client + worker
  const temporalClient = await createClient(config.temporalAddress, config.temporalNamespace)
  
  const worker = await createWorker({
    address: config.temporalAddress,
    namespace: config.temporalNamespace,
    taskQueue: config.temporalTaskQueue,
    dependencies: activities,
  })
  worker.run().catch(err => {
    console.error('Worker crashed', err)
    process.exit(1)
  })
  console.log('Temporal worker running')

  // HTTP server
  const app = createApp()
  const handlers = timelinesHandlers({ temporalClient })
  
  app.use('/v1/timelines', handlers.create, { match: { method: 'POST' } })
  app.use('/v1/timelines/:id', handlers.get, { match: { method: 'GET' } })
  app.use('/v1/timelines/:id/steps/:stepId/submit', handlers.submitHumanStep, { match: { method: 'POST' } })
  app.use('/v1/timelines/:id/cancel', handlers.cancel, { match: { method: 'POST' } })
  app.use('/v1/users/:userId/timelines', handlers.listUserTimelines, { match: { method: 'GET' } })
  
  app.use('/health/live', defineEventHandler(() => ({ status: 'ok' })))

  const server = createServer(toNodeListener(app))
  server.listen(config.port, () => {
    console.log(`timeline-engine listening on :${config.port}`)
  })
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
```

## Tests (integration с Temporal test server)

```typescript
// tests/workflows.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { TestWorkflowEnvironment } from '@temporalio/testing'
import { Worker } from '@temporalio/worker'
import { timelineWorkflow } from '../src/workflows/generic-timeline'
import * as activities from '../src/activities'

describe('timelineWorkflow', () => {
  let testEnv: TestWorkflowEnvironment

  beforeAll(async () => {
    testEnv = await TestWorkflowEnvironment.createLocal()
  })

  afterAll(async () => {
    await testEnv.teardown()
  })

  it('happy path — all steps complete sequentially', async () => {
    const mockActivities = {
      runAutoStep: vi.fn().mockResolvedValue({ ok: true }),
      evaluateGate: vi.fn().mockResolvedValue({ effect: 'allow' }),
      runExternalStep: vi.fn().mockResolvedValue({ ok: true }),
      runCompoundStep: vi.fn().mockResolvedValue({ ok: true }),
      updateStepStatus: vi.fn(),
      updateTimelineStatus: vi.fn(),
      emitEvent: vi.fn(),
      runCompensate: vi.fn(),
    }

    const worker = await Worker.create({
      connection: testEnv.nativeConnection,
      taskQueue: 'test',
      workflowsPath: require.resolve('../src/workflows/generic-timeline'),
      activities: mockActivities,
    })

    await worker.runUntil(async () => {
      const handle = await testEnv.client.workflow.start(timelineWorkflow, {
        workflowId: 'test-wf-1',
        taskQueue: 'test',
        args: [{
          timelineId: 'tl-1',
          ownerId: 'u-1',
          patternId: 'p-1',
          cardType: 'test',
          steps: [
            { id: 's1', kind: 'auto', title: 'Step 1', owner: 'system', position: 0, handler: 'noop.noop' },
            { id: 's2', kind: 'gate', title: 'Gate', owner: 'system', position: 1, gateRequirement: 'kyc.level>=1' },
            { id: 's3', kind: 'auto', title: 'Step 3', owner: 'system', position: 2, handler: 'noop.noop' },
          ],
          completion: { on: 's3.done' },
        }],
      })

      await handle.result()
    })

    expect(mockActivities.runAutoStep).toHaveBeenCalledTimes(2)
    expect(mockActivities.evaluateGate).toHaveBeenCalledTimes(1)
    expect(mockActivities.updateTimelineStatus).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'completed' })
    )
  })

  it('gate deny → compensate + fail', async () => {
    const mockActivities = {
      runAutoStep: vi.fn().mockResolvedValue({ ok: true }),
      evaluateGate: vi.fn().mockResolvedValue({ effect: 'deny', reason: 'KYC_INSUFFICIENT' }),
      // ... others
      updateStepStatus: vi.fn(),
      updateTimelineStatus: vi.fn(),
      emitEvent: vi.fn(),
      runCompensate: vi.fn(),
    }

    // Execute timeline с gate in middle
    const handle = await testEnv.client.workflow.start(timelineWorkflow, {
      workflowId: 'test-wf-2',
      taskQueue: 'test',
      args: [{
        timelineId: 'tl-2',
        ownerId: 'u-2',
        steps: [
          { id: 's1', kind: 'auto', handler: 'booking.hold', compensateHandler: 'booking.release', ... },
          { id: 's2', kind: 'gate', gateRequirement: 'kyc.level>=2' },
          { id: 's3', kind: 'auto' },
        ],
        // ...
      }],
    })

    await expect(handle.result()).rejects.toThrow(/GATE_DENIED/)
    
    // Verify compensate was called for s1
    expect(mockActivities.runCompensate).toHaveBeenCalledWith(
      expect.objectContaining({ stepId: 's1', handler: 'booking.release' })
    )
  })

  it('human step timeout → fail + compensate', async () => {
    // Use test time-skip для fast-forward
    await testEnv.sleep('31 days')
    // ...
  })

  it('cancellation via signal → compensate chain', async () => {
    const handle = await testEnv.client.workflow.start(timelineWorkflow, { ... })
    
    await handle.signal('cancel', { reason: 'user-change-mind', cancelledBy: 'u-1' })
    
    await handle.result()
    
    expect(mockActivities.runCompensate).toHaveBeenCalled()
    expect(mockActivities.updateTimelineStatus).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'cancelled' })
    )
  })
})
```

## Deployment

- Temporal server — отдельно (docker-compose уже поднимает).
- timeline-engine service — 2+ replicas.
- Workers scale горизонтально (pool-based task-queue).
- Events published to NATS JetStream `durable-domain`.

## Monitoring

- Temporal Web UI (`http://localhost:8080`) — see all running workflows.
- SigNoz dashboards:
  - `timeline.workflow.duration` histogram per-card-type.
  - `timeline.step.duration{kind}` histogram.
  - `timeline.step.failed_total{kind}` counter.
  - `timeline.gate.denied_total{reason}` counter.
  - `timeline.compensation.executed_total` counter.
- Alerts — см. `docs/runbooks/timeline-dead-step.md`.

## Metrics emitted

- `timeline_created_total{card_type}`
- `timeline_completed_total{card_type}`
- `timeline_cancelled_total{card_type,reason}`
- `timeline_failed_total{card_type,failed_step_id}`
- `timeline_step_duration_seconds{card_type,step_kind}`
- `timeline_compensation_total{success}`
