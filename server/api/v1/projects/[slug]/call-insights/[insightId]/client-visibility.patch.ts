import { eq } from 'drizzle-orm'
import { z } from 'zod'

import { useDb } from '~/server/db'
import { projects } from '~/server/db/schema'
import { createApiV1Envelope } from '~/server/utils/api-v1'
import { createSkippedApiV1OutboxResult, emitApiV1OutboxEvent } from '~/server/utils/api-v1-outbox'
import { requireAdmin } from '~/server/utils/auth'
import { readValidatedNodeBody } from '~/server/utils/body'
import { ensureHybridControl } from '~/shared/utils/project/project-control'
import type { ApiV1ProjectCallInsightClientVisibility, ApiV1ProjectRef } from '~/shared/types/api-v1'

const BodySchema = z.object({
  clientVisible: z.boolean(),
})

function safeString(value: unknown, maxLength = 500) {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, maxLength)
}

function safeDate(value: Date | string | null | undefined) {
  if (value instanceof Date) return value
  if (typeof value === 'string') {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) return parsed
  }
  return new Date()
}

function createProjectRef(project: {
  id: number
  slug: string
  title: string
  status: string
  projectType: string
  updatedAt: Date | string | null
}): ApiV1ProjectRef {
  const updatedAt = project.updatedAt instanceof Date
    ? project.updatedAt.toISOString()
    : safeString(project.updatedAt, 80)

  return {
    id: project.id,
    slug: project.slug,
    title: project.title,
    status: project.status,
    projectType: project.projectType,
    updatedAt,
  }
}

export default defineEventHandler(async (event) => {
  const admin = requireAdmin(event)
  const slug = getRouterParam(event, 'slug')
  const insightId = getRouterParam(event, 'insightId')
  if (!slug || !insightId) {
    throw createError({ statusCode: 400, statusMessage: 'Project slug and insightId are required' })
  }

  const body = await readValidatedNodeBody(event, BodySchema)
  const db = useDb()
  const [project] = await db
    .select({
      id: projects.id,
      slug: projects.slug,
      title: projects.title,
      status: projects.status,
      projectType: projects.projectType,
      pages: projects.pages,
      profile: projects.profile,
      updatedAt: projects.updatedAt,
    })
    .from(projects)
    .where(eq(projects.slug, slug))
    .limit(1)

  if (!project) {
    throw createError({ statusCode: 404, statusMessage: 'Project not found' })
  }

  const profile = project.profile && typeof project.profile === 'object'
    ? project.profile as Record<string, unknown>
    : {}
  const control = ensureHybridControl(profile.hybridControl, project)
  const existingInsight = control.callInsights.find(insight => insight.id === insightId)
  if (!existingInsight) {
    throw createError({ statusCode: 404, statusMessage: 'Call insight not found' })
  }
  const previousClientVisible = existingInsight.clientVisible === true
  const hasVisibilityChange = previousClientVisible !== body.clientVisible

  const updatedAt = hasVisibilityChange ? new Date() : safeDate(project.updatedAt)
  const nextControl = hasVisibilityChange
    ? ensureHybridControl({
        ...control,
        callInsights: control.callInsights.map((insight) => {
          if (insight.id !== insightId) return insight
          return {
            ...insight,
            clientVisible: body.clientVisible,
          }
        }),
        lastSyncAt: updatedAt.toISOString(),
      }, project)
    : control
  const updatedInsight = nextControl.callInsights.find(insight => insight.id === insightId)
  if (!updatedInsight) {
    throw createError({ statusCode: 500, statusMessage: 'Updated call insight could not be serialized' })
  }

  if (hasVisibilityChange) {
    await db
      .update(projects)
      .set({
        profile: {
          ...profile,
          hybridControl: nextControl,
        } as any,
        updatedAt,
      })
      .where(eq(projects.slug, slug))
  }

  const outbox = !hasVisibilityChange
    ? createSkippedApiV1OutboxResult('no_visibility_change')
    : await emitApiV1OutboxEvent(event, {
        eventType: 'project.report_visibility_changed',
        eventVersion: 1,
        aggregateType: 'hybrid_call_insight',
        aggregateId: updatedInsight.id,
        project: {
          id: project.id,
          slug: project.slug,
        },
        actor: {
          type: 'admin',
          id: admin.userId,
          role: 'admin',
          displayName: 'Studio OS',
        },
        audience: body.clientVisible ? 'client' : 'internal',
        deliveryTargets: ['activity_feed', 'messenger', 'audit'],
        idempotencyKey: `call-insight-client-visibility:${project.slug}:${updatedInsight.id}:${body.clientVisible}`,
        payload: {
          project: {
            id: project.id,
            slug: project.slug,
            title: project.title,
          },
          insight: {
            id: updatedInsight.id,
            title: updatedInsight.title,
            tone: updatedInsight.tone,
            previousClientVisible,
            clientVisible: updatedInsight.clientVisible === true,
          },
        },
      })

  const data: ApiV1ProjectCallInsightClientVisibility = {
    project: createProjectRef({
      ...project,
      updatedAt,
    }),
    insight: {
      id: updatedInsight.id,
      title: updatedInsight.title,
      summary: updatedInsight.summary,
      tone: updatedInsight.tone,
      clientVisible: updatedInsight.clientVisible === true,
      updatedAt: updatedAt.toISOString(),
    },
    outbox,
  }

  return createApiV1Envelope(event, data, {
    revision: `call-insight-client-visibility:${project.slug}:${updatedInsight.id}:${data.insight.clientVisible}:${updatedAt.toISOString()}`,
  })
})
