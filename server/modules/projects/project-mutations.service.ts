import { z } from 'zod'
import { unlink } from 'node:fs/promises'
import { join } from 'node:path'
import type {
  CreateProject as CreateProjectInput,
  UpdateProject as UpdateProjectInput,
} from '~/shared/types/project/project'
import { findPreset } from '~/shared/constants/design-system/presets'
import { CORE_PAGES } from '~/shared/constants/navigation/pages'
import { PROJECT_STATUSES } from '~/shared/types/catalogs'
import * as repo from '~/server/modules/projects/projects.repository'

export const UpdateProjectStatusSchema = z.object({
  status: z.enum(PROJECT_STATUSES),
})
export type UpdateProjectStatusInput = z.infer<typeof UpdateProjectStatusSchema>

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
  const preset = body.projectType ? findPreset(body.projectType) : undefined
  const pages = preset ? [...preset.pages] : [...CORE_PAGES]
  const initialProfile = preset ? { ...preset.defaultProfile } : {}

  try {
    return await repo.insertProject({
      slug: body.slug,
      title: body.title,
      projectType: body.projectType ?? 'apartment',
      pages,
      profile: initialProfile,
    })
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
  return repo.updateProjectBySlug(slug, { ...body, updatedAt: new Date() } as Record<string, unknown>)
}

export async function updateProjectStatus(
  slug: string,
  body: UpdateProjectStatusInput,
) {
  return repo.updateProjectStatusBySlug(slug, body.status)
}

/**
 * Delete a project row plus every file that belongs to it on disk.
 * Drizzle cascades handle the row graph; this helper walks `uploads`
 * and `work_status_item_photos` for physical filenames first, sets
 * `documents.project_id = NULL` (the FK is set-null), then deletes the
 * project row. File unlinks are best-effort.
 */
export async function deleteProjectBySlug(slug: string) {
  const proj = await repo.findProjectForDelete(slug)
  if (!proj) return false

  const uploadRows = await repo.findProjectUploads(proj.id)
  const workItems = await repo.findProjectWorkItemIds(proj.id)
  const photoUrls = await repo.findProjectWorkItemPhotosByItemIds(workItems.map(w => w.id))

  await repo.nullifyDocumentsProjectId(proj.id)
  await repo.deleteProjectById(proj.id)

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

