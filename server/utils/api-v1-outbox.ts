import type { H3Event } from 'h3'
import { getRequestHeader } from 'h3'
import { randomUUID } from 'node:crypto'

import { useDb } from '~/server/db'
import { eventOutbox } from '~/server/db/schema'
import { getApiV1RequestId } from '~/server/utils/api-v1'
import type {
  ApiV1OutboxActor,
  ApiV1OutboxAudience,
  ApiV1OutboxDeliveryTarget,
  ApiV1OutboxEmitResult,
} from '~/shared/types/api-v1'

export interface ApiV1OutboxEventInput {
  eventId?: string
  idempotencyKey?: string
  eventType: string
  eventVersion?: number
  aggregateType: string
  aggregateId: string | number
  project?: {
    id?: number | null
    slug?: string | null
  }
  actor: ApiV1OutboxActor
  audience?: ApiV1OutboxAudience
  payload?: Record<string, unknown>
  deliveryTargets?: ApiV1OutboxDeliveryTarget[]
  occurredAt?: Date | string
  correlationId?: string
  causationId?: string
}

function isEnabledFlag(value: string | undefined) {
  return ['1', 'true', 'yes', 'on'].includes((value || '').trim().toLowerCase())
}

export function isApiV1OutboxEnabled() {
  return isEnabledFlag(process.env.OUTBOX_ENABLED) || isEnabledFlag(process.env.API_V1_OUTBOX_ENABLED)
}

export function createSkippedApiV1OutboxResult(reason: string): ApiV1OutboxEmitResult {
  return {
    mode: 'best_effort',
    status: 'skipped',
    eventId: null,
    idempotencyKey: null,
    reason,
  }
}

function normalizeIsoDate(value: Date | string | undefined) {
  if (!value) return new Date()
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? new Date() : date
}

function normalizeString(value: string | undefined, fallback: string) {
  const normalized = value?.trim()
  return normalized || fallback
}

function resolveIdempotencyKey(event: H3Event, input: ApiV1OutboxEventInput, eventId: string) {
  const requestKey = getRequestHeader(event, 'x-idempotency-key')?.trim()
  if (input.idempotencyKey?.trim()) return input.idempotencyKey.trim()
  if (requestKey) return `${input.eventType}:${requestKey}`
  return eventId
}

export async function emitApiV1OutboxEvent(
  event: H3Event,
  input: ApiV1OutboxEventInput,
): Promise<ApiV1OutboxEmitResult> {
  if (!isApiV1OutboxEnabled()) {
    return createSkippedApiV1OutboxResult('outbox_disabled')
  }

  const eventId = normalizeString(input.eventId, randomUUID())
  const idempotencyKey = resolveIdempotencyKey(event, input, eventId)
  const correlationId = normalizeString(input.correlationId, getApiV1RequestId(event))

  try {
    await useDb()
      .insert(eventOutbox)
      .values({
        eventId,
        idempotencyKey,
        eventType: input.eventType,
        eventVersion: input.eventVersion || 1,
        aggregateType: input.aggregateType,
        aggregateId: String(input.aggregateId),
        projectId: input.project?.id || null,
        projectSlug: input.project?.slug || null,
        actor: input.actor,
        audience: input.audience || 'internal',
        payload: input.payload || {},
        deliveryTargets: input.deliveryTargets || [],
        status: 'pending',
        occurredAt: normalizeIsoDate(input.occurredAt),
        correlationId,
        causationId: input.causationId || null,
      })

    return {
      mode: 'best_effort',
      status: 'emitted',
      eventId,
      idempotencyKey,
    }
  } catch (error) {
    console.warn('[api-v1-outbox] best-effort emit failed', {
      eventType: input.eventType,
      aggregateType: input.aggregateType,
      aggregateId: String(input.aggregateId),
      error: error instanceof Error ? error.message : String(error),
    })

    return {
      mode: 'best_effort',
      status: 'failed',
      eventId,
      idempotencyKey,
      reason: 'insert_failed',
    }
  }
}
