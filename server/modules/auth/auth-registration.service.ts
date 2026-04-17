import * as repo from './auth.repository'

/**
 * Generate a project slug that is guaranteed unique in the projects table.
 * Tries `<login>-project`, then `<login>-project-2`, `-3`, etc.
 */
export async function createUniqueProjectSlug(login: string): Promise<string> {
  const baseSlug = `${login}-project`
  let slug = baseSlug
  let suffix = 2

  while (true) {
    if (!(await repo.projectSlugExists(slug))) return slug
    slug = `${baseSlug}-${suffix}`
    suffix += 1
  }
}

/**
 * Generate a contractor slug that is guaranteed unique in the contractors table.
 * Tries `<login>-contractor`, then `<login>-contractor-2`, `-3`, etc.
 */
export async function createUniqueContractorSlug(login: string): Promise<string> {
  const baseSlug = `${login}-contractor`
  let slug = baseSlug
  let suffix = 2

  while (true) {
    if (!(await repo.contractorSlugExists(slug))) return slug
    slug = `${baseSlug}-${suffix}`
    suffix += 1
  }
}
