import { eq, and } from 'drizzle-orm'
import { useDb } from '~/server/db/index'
import {
  contractors,
  projectContractors,
  projects,
  users,
} from '~/server/db/schema'

/**
 * Project row with the narrow field set the bootstrap payload builder
 * needs. Returns null when the slug does not exist.
 */
export async function findProjectForBootstrap(slug: string) {
  const db = useDb()
  const [project] = await db
    .select({
      id: projects.id,
      slug: projects.slug,
      title: projects.title,
      clientLogin: projects.clientLogin,
      pages: projects.pages,
      status: projects.status,
      profile: projects.profile,
    })
    .from(projects)
    .where(eq(projects.slug, slug))
    .limit(1)
  return project ?? null
}

/**
 * Fetch the admin user's display identity for token minting.
 */
export async function findAdminUser(userId: number) {
  const db = useDb()
  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      login: users.login,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
  return user ?? null
}

/**
 * Confirm that a contractor session belongs to the given project, and
 * return the contractor row for display/nickname resolution.
 */
export async function findContractorInProject(
  projectId: number,
  contractorId: number,
) {
  const db = useDb()
  const [contractor] = await db
    .select({
      id: contractors.id,
      name: contractors.name,
      messengerNick: contractors.messengerNick,
      login: contractors.login,
    })
    .from(projectContractors)
    .innerJoin(contractors, eq(projectContractors.contractorId, contractors.id))
    .where(
      and(
        eq(projectContractors.projectId, projectId),
        eq(projectContractors.contractorId, contractorId),
      ),
    )
    .limit(1)
  return contractor ?? null
}

/**
 * Project owner + creator admin joined with users for room-participant
 * assembly. Leftjoin — returns `userId: null` when no owner assigned.
 */
export async function findProjectOwnerForRoom(slug: string) {
  const db = useDb()
  const [row] = await db
    .select({
      userId: projects.userId,
      userName: users.name,
      userEmail: users.email,
      userLogin: users.login,
    })
    .from(projects)
    .leftJoin(users, eq(projects.userId, users.id))
    .where(eq(projects.slug, slug))
    .limit(1)
  return row ?? null
}
