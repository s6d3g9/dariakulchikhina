import { z } from 'zod'
import * as repo from './managers.repository'

export const CreateManagerSchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
  role: z.string().optional().default(''),
  phone: z.string().optional().default(''),
  email: z.string().optional().default(''),
  telegram: z.string().optional().default(''),
  city: z.string().optional().default(''),
  notes: z.string().optional().default(''),
})
export type CreateManagerInput = z.infer<typeof CreateManagerSchema>

export const UpdateManagerSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  telegram: z.string().optional(),
  city: z.string().optional(),
  notes: z.string().optional(),
})
export type UpdateManagerInput = z.infer<typeof UpdateManagerSchema>

export interface ListManagersOptions {
  projectSlug?: string
}

/**
 * Admin list of managers. With `projectSlug` returns only managers
 * linked to that project via `manager_projects`.
 */
export async function listManagers(opts: ListManagersOptions = {}) {
  if (opts.projectSlug) {
    const managers = await repo.listManagersByProjectSlug(opts.projectSlug)
    return managers ?? []
  }
  return repo.listAllManagers()
}

export async function getManager(id: number) {
  return repo.findManagerById(id)
}

/**
 * Create a manager. When `slug` is not provided, derives it from `name`
 * by lowercasing and replacing non-alphanumerics with dashes (preserving
 * Cyrillic so slugs remain readable).
 */
export async function createManager(body: CreateManagerInput) {
  const slug =
    body.slug ||
    body.name.toLowerCase().replace(/[^a-zа-яё0-9]+/gi, '-').replace(/-+$/, '')

  return repo.insertManager({
    name: body.name,
    slug,
    role: body.role || null,
    phone: body.phone || null,
    email: body.email || null,
    telegram: body.telegram || null,
    city: body.city || null,
    notes: body.notes || null,
  })
}

export async function updateManager(id: number, body: UpdateManagerInput) {
  return repo.updateManagerRow(id, { ...body, updatedAt: new Date() })
}

export async function deleteManager(id: number) {
  return repo.deleteManagerRow(id)
}

/**
 * Projects the manager is linked to via `manager_projects`, annotated
 * with the assignment role and timestamp.
 */
export async function listManagerProjects(managerId: number) {
  return repo.listManagerProjects(managerId)
}
