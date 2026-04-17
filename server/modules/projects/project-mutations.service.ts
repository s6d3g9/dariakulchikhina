import { z } from 'zod'
import { unlink } from 'node:fs/promises'
import { join } from 'node:path'
import { eq, inArray } from 'drizzle-orm'
import { useDb } from '~/server/db/index'
import {
  projects,
  uploads,
  workStatusItems,
  workStatusItemPhotos,
  documents,
} from '~/server/db/schema'
import type {
  CreateProject as CreateProjectInput,
  UpdateProject as UpdateProjectInput,
} from '~/shared/types/project/project'
import { findPreset } from '~/shared/constants/design-system/presets'
import { CORE_PAGES } from '~/shared/constants/navigation/pages'
import { PROJECT_STATUSES } from '~/shared/types/catalogs'
import { CLIENT_PROFILE_EDITABLE_KEYS } from '~/shared/constants/profile-fields'

const projectReturning = {
  id: projects.id,
  slug: projects.slug,
  title: projects.title,
  status: projects.status,
  projectType: projects.projectType,
  userId: projects.userId,
  pages: projects.pages,
  profile: projects.profile,
  createdAt: projects.createdAt,
  updatedAt: projects.updatedAt,
}

export const UpdateProjectStatusSchema = z.object({
  status: z.enum(PROJECT_STATUSES),
})
export type UpdateProjectStatusInput = z.infer<typeof UpdateProjectStatusSchema>

/**
 * Zod schema for client-profile PUT. Built dynamically from the
 * CLIENT_PROFILE_EDITABLE_KEYS whitelist so unknown fields are rejected
 * at validation time (strict mode).
 */
export const ClientProfileSchema = z
  .object(
    Object.fromEntries(
      CLIENT_PROFILE_EDITABLE_KEYS.map((k) => [k, z.string().max(1000).optional()]),
    ) as Record<string, z.ZodOptional<z.ZodString>>,
  )
  .strict()
export type ClientProfileInput = z.infer<typeof ClientProfileSchema>

function getDuplicateCode(e: unknown): string | undefined {
  const err = e as { cause?: { code?: string }; code?: string }
  return err?.cause?.code ?? err?.code
}

/**
 * Create a new project row. Applies pages + defaultProfile from the
 * projectType preset when one is given, otherwise falls back to
 * CORE_PAGES. Maps unique-slug violation (23505) to a user-facing 400.
 */
export async function createProject(body: CreateProjectInput) {
  const db = useDb()
  const preset = body.projectType ? findPreset(body.projectType) : undefined
  const pages = preset ? [...preset.pages] : [...CORE_PAGES]
  const initialProfile = preset ? { ...preset.defaultProfile } : {}

  try {
    const [project] = await db
      .insert(projects)
      .values({
        slug: body.slug,
        title: body.title,
        projectType: body.projectType ?? 'apartment',
        pages,
        profile: initialProfile,
      })
      .returning(projectReturning)
    return project
  } catch (e: unknown) {
    if (getDuplicateCode(e) === '23505') {
      throw createError({
        statusCode: 400,
        statusMessage: `Slug «${body.slug}» уже занят — выберите другой`,
        data: { message: `Slug «${body.slug}» уже занят — выберите другой` },
      })
    }
    throw e
  }
}

export async function updateProject(slug: string, body: UpdateProjectInput) {
  const db = useDb()
  const [updated] = await db
    .update(projects)
    .set({ ...body, updatedAt: new Date() } as Record<string, unknown>)
    .where(eq(projects.slug, slug))
    .returning(projectReturning)
  return updated ?? null
}

export async function updateProjectStatus(
  slug: string,
  body: UpdateProjectStatusInput,
) {
  const db = useDb()
  const [updated] = await db
    .update(projects)
    .set({ status: body.status, updatedAt: new Date() })
    .where(eq(projects.slug, slug))
    .returning(projectReturning)
  return updated ?? null
}

/**
 * Delete a project row plus every file that belongs to it on disk.
 * Drizzle cascades handle the row graph; this helper walks `uploads`
 * and `work_status_item_photos` for physical filenames first, sets
 * `documents.project_id = NULL` (the FK is set-null), then deletes the
 * project row. File unlinks are best-effort.
 */
export async function deleteProjectBySlug(slug: string) {
  const db = useDb()

  const [proj] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.slug, slug))
    .limit(1)
  if (!proj) return false

  const uploadRows = await db
    .select({ filename: uploads.filename })
    .from(uploads)
    .where(eq(uploads.projectId, proj.id))
  const workItems = await db
    .select({ id: workStatusItems.id })
    .from(workStatusItems)
    .where(eq(workStatusItems.projectId, proj.id))

  let photoUrls: { url: string | null }[] = []
  if (workItems.length) {
    photoUrls = await db
      .select({ url: workStatusItemPhotos.url })
      .from(workStatusItemPhotos)
      .where(
        inArray(
          workStatusItemPhotos.itemId,
          workItems.map((w) => w.id),
        ),
      )
  }

  await db
    .update(documents)
    .set({ projectId: null } as Record<string, unknown>)
    .where(eq(documents.projectId, proj.id))

  await db.delete(projects).where(eq(projects.id, proj.id))

  const base = join(process.cwd(), 'public')
  for (const row of uploadRows) {
    if (row.filename) {
      try {
        await unlink(join(base, 'uploads', row.filename))
      } catch {
        // file may not exist — ignore
      }
    }
  }
  for (const row of photoUrls) {
    if (row.url) {
      try {
        await unlink(join(base, row.url.replace(/^\//, '')))
      } catch {
        // file may not exist — ignore
      }
    }
  }

  return true
}

/**
 * Partial update of the `projects.profile` JSONB column, restricted to
 * the whitelisted keys in CLIENT_PROFILE_EDITABLE_KEYS. Strings are
 * trimmed; empty strings become null so downstream consumers can check
 * `== null` uniformly. Returns null when the slug doesn't exist.
 */
export async function updateClientProfile(slug: string, body: ClientProfileInput) {
  const db = useDb()

  const [current] = await db
    .select()
    .from(projects)
    .where(eq(projects.slug, slug))
    .limit(1)
  if (!current) return null

  const safeFields: Record<string, string | null> = {}
  for (const [k, v] of Object.entries(body)) {
    if (v == null || v === '') {
      safeFields[k] = null
      continue
    }
    safeFields[k] = v.trim()
  }

  const merged: Record<string, string | null> = {
    ...((current.profile as Record<string, string>) || {}),
    ...safeFields,
  }

  await db
    .update(projects)
    .set({
      profile: merged as unknown as Record<string, string>,
      updatedAt: new Date(),
    })
    .where(eq(projects.slug, slug))

  return { ok: true as const }
}
