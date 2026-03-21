import { eq } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { contractors, projects } from '~/server/db/schema'

export async function createUniqueProjectSlug(db: ReturnType<typeof useDb>, login: string) {
  const baseSlug = `${login}-project`
  let slug = baseSlug
  let suffix = 2

  while (true) {
    const [existing] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.slug, slug))
      .limit(1)

    if (!existing) {
      return slug
    }

    slug = `${baseSlug}-${suffix}`
    suffix += 1
  }
}

export async function createUniqueContractorSlug(db: ReturnType<typeof useDb>, login: string) {
  const baseSlug = `${login}-contractor`
  let slug = baseSlug
  let suffix = 2

  while (true) {
    const [existing] = await db
      .select({ id: contractors.id })
      .from(contractors)
      .where(eq(contractors.slug, slug))
      .limit(1)

    if (!existing) {
      return slug
    }

    slug = `${baseSlug}-${suffix}`
    suffix += 1
  }
}