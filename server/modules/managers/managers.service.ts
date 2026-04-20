import * as repo from './managers.repository'
import type { CreateManagerInput, UpdateManagerInput, ListManagersOptions } from './managers.types'

export * from './managers.types'

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
