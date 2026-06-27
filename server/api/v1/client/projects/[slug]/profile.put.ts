import { eq } from 'drizzle-orm'
import { z } from 'zod'

import { useDb } from '~/server/db'
import { projects } from '~/server/db/schema'
import { createApiV1Envelope } from '~/server/utils/api-v1'
import {
  createApiV1ClientProjectProfileDto,
  getApiV1ClientProfileRejectedKeys,
  sanitizeApiV1ClientProfilePatch,
} from '~/server/utils/api-v1-client-profile'
import { requireAdminOrClient } from '~/server/utils/auth'

const Body = z.object({
  profile: z.record(
    z.string().max(200),
    z.union([z.string().max(10_000), z.number(), z.boolean(), z.null()]),
  ).default({}),
}).strict()

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Project slug is required' })
  }

  requireAdminOrClient(event, slug)

  const body = await readValidatedNodeBody(event, Body)
  const rejectedKeys = getApiV1ClientProfileRejectedKeys(body.profile)

  if (rejectedKeys.length) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Profile contains read-only or unknown fields',
      data: { fields: rejectedKeys },
    })
  }

  const db = useDb()
  const [current] = await db
    .select({
      id: projects.id,
      slug: projects.slug,
      title: projects.title,
      status: projects.status,
      projectType: projects.projectType,
      profile: projects.profile,
      updatedAt: projects.updatedAt,
    })
    .from(projects)
    .where(eq(projects.slug, slug))
    .limit(1)

  if (!current) {
    throw createError({ statusCode: 404, statusMessage: 'Project not found' })
  }

  const safePatch = sanitizeApiV1ClientProfilePatch(body.profile)
  const mergedProfile = {
    ...((current.profile || {}) as Record<string, unknown>),
    ...safePatch,
  }

  const [updated] = await db
    .update(projects)
    .set({
      profile: mergedProfile as Record<string, string>,
      updatedAt: new Date(),
    })
    .where(eq(projects.slug, slug))
    .returning({
      id: projects.id,
      slug: projects.slug,
      title: projects.title,
      status: projects.status,
      projectType: projects.projectType,
      profile: projects.profile,
      updatedAt: projects.updatedAt,
    })

  const data = createApiV1ClientProjectProfileDto({
    ...updated,
    profile: (updated.profile || {}) as Record<string, unknown>,
  })

  return createApiV1Envelope(event, data, {
    revision: data.project.updatedAt || `project:${data.project.id}`,
  })
})
