import { eq, or } from 'drizzle-orm'
import { useDb } from '~/server/db/index'
import { users, contractors, projects } from '~/server/db/schema'

// ── Admin / users ─────────────────────────────────────────────────────

/** Admin login: find by login or email with password hash included. */
export async function findUserByLoginOrEmail(login: string) {
  const db = useDb()
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      login: users.login,
      name: users.name,
      passwordHash: users.passwordHash,
    })
    .from(users)
    .where(or(eq(users.login, login), eq(users.email, login)))
    .limit(1)
  return user ?? null
}

/** Find admin user by primary key for session resolution. */
export async function findUserById(id: number) {
  const db = useDb()
  const [user] = await db
    .select({ id: users.id, email: users.email, name: users.name })
    .from(users)
    .where(eq(users.id, id))
    .limit(1)
  return user ?? null
}

/** Find admin user by email (session bootstrap fallback). */
export async function findUserByEmail(email: string) {
  const db = useDb()
  const [user] = await db
    .select({ id: users.id, email: users.email, name: users.name })
    .from(users)
    .where(eq(users.email, email))
    .limit(1)
  return user ?? null
}

/** Return the first user row — last-resort admin session fallback. */
export async function findFirstUser() {
  const db = useDb()
  const [user] = await db
    .select({ id: users.id, email: users.email, name: users.name })
    .from(users)
    .limit(1)
  return user ?? null
}

/** Find user by login returning id + recoveryPhraseHash for recovery flow. */
export async function findUserForRecovery(login: string) {
  const db = useDb()
  const [user] = await db
    .select({ id: users.id, recoveryPhraseHash: users.recoveryPhraseHash })
    .from(users)
    .where(eq(users.login, login))
    .limit(1)
  return user ?? null
}

/** Check whether a user with this login or derived email already exists. */
export async function findUserByLoginOrEmailExists(login: string, email: string) {
  const db = useDb()
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(or(eq(users.login, login), eq(users.email, email)))
    .limit(1)
  return user ?? null
}

export async function insertUser(values: {
  email: string
  login: string
  passwordHash: string
  recoveryPhraseHash?: string
  name?: string
}) {
  const db = useDb()
  const [user] = await db
    .insert(users)
    .values(values)
    .returning({
      id: users.id,
      login: users.login,
      email: users.email,
      name: users.name,
      passwordHash: users.passwordHash,
    })
  return user
}

export async function updateUserPassword(id: number, passwordHash: string) {
  const db = useDb()
  await db.update(users).set({ passwordHash }).where(eq(users.id, id))
}

// ── Client / projects ─────────────────────────────────────────────────

/** Find project by public slug for slug-based client login. */
export async function findProjectByClientSlug(slug: string) {
  const db = useDb()
  const [project] = await db
    .select({
      id: projects.id,
      slug: projects.slug,
      title: projects.title,
      status: projects.status,
    })
    .from(projects)
    .where(eq(projects.slug, slug))
    .limit(1)
  return project ?? null
}

/** Find project by clientLogin with password hash for credentialed client login. */
export async function findProjectWithPasswordByClientLogin(login: string) {
  const db = useDb()
  const [project] = await db
    .select({
      id: projects.id,
      slug: projects.slug,
      title: projects.title,
      clientPasswordHash: projects.clientPasswordHash,
    })
    .from(projects)
    .where(eq(projects.clientLogin, login))
    .limit(1)
  return project ?? null
}

/** Check whether a clientLogin already exists (for registration guard). */
export async function findProjectByClientLogin(login: string) {
  const db = useDb()
  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.clientLogin, login))
    .limit(1)
  return project ?? null
}

/** Find project by clientLogin with recovery hash for password reset. */
export async function findProjectWithRecoveryByClientLogin(login: string) {
  const db = useDb()
  const [project] = await db
    .select({
      id: projects.id,
      clientRecoveryPhraseHash: projects.clientRecoveryPhraseHash,
    })
    .from(projects)
    .where(eq(projects.clientLogin, login))
    .limit(1)
  return project ?? null
}

/** Return true when a project slug is already taken. */
export async function projectSlugExists(slug: string): Promise<boolean> {
  const db = useDb()
  const [row] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.slug, slug))
    .limit(1)
  return !!row
}

export async function insertClientProject(values: {
  slug: string
  title: string
  clientLogin: string
  clientPasswordHash: string
  clientRecoveryPhraseHash: string
  profile: Record<string, string>
}) {
  const db = useDb()
  const [project] = await db
    .insert(projects)
    .values(values)
    .returning({
      id: projects.id,
      slug: projects.slug,
      title: projects.title,
      clientLogin: projects.clientLogin,
    })
  return project
}

export async function updateProjectClientPassword(
  id: number,
  clientPasswordHash: string,
) {
  const db = useDb()
  await db.update(projects).set({ clientPasswordHash }).where(eq(projects.id, id))
}

// ── Contractor ────────────────────────────────────────────────────────

/** Find contractor by id for legacy slug-based login. */
export async function findContractorById(id: number) {
  const db = useDb()
  const [contractor] = await db
    .select()
    .from(contractors)
    .where(eq(contractors.id, id))
    .limit(1)
  return contractor ?? null
}

/** Find contractor by login with password hash for credentialed login. */
export async function findContractorWithPasswordByLogin(login: string) {
  const db = useDb()
  const [contractor] = await db
    .select({
      id: contractors.id,
      name: contractors.name,
      passwordHash: contractors.passwordHash,
    })
    .from(contractors)
    .where(eq(contractors.login, login))
    .limit(1)
  return contractor ?? null
}

/** Check whether a contractor login already exists (registration guard). */
export async function findContractorByLogin(login: string) {
  const db = useDb()
  const [contractor] = await db
    .select({ id: contractors.id })
    .from(contractors)
    .where(eq(contractors.login, login))
    .limit(1)
  return contractor ?? null
}

/** Find contractor by login with recovery hash for password reset. */
export async function findContractorWithRecoveryByLogin(login: string) {
  const db = useDb()
  const [contractor] = await db
    .select({
      id: contractors.id,
      recoveryPhraseHash: contractors.recoveryPhraseHash,
    })
    .from(contractors)
    .where(eq(contractors.login, login))
    .limit(1)
  return contractor ?? null
}

/** Return true when a contractor slug is already taken. */
export async function contractorSlugExists(slug: string): Promise<boolean> {
  const db = useDb()
  const [row] = await db
    .select({ id: contractors.id })
    .from(contractors)
    .where(eq(contractors.slug, slug))
    .limit(1)
  return !!row
}

export async function insertContractor(values: {
  slug: string
  login: string
  passwordHash: string
  recoveryPhraseHash: string
  name: string
  companyName?: string | null
}) {
  const db = useDb()
  const [contractor] = await db
    .insert(contractors)
    .values(values)
    .returning({
      id: contractors.id,
      name: contractors.name,
      login: contractors.login,
    })
  return contractor
}

export async function updateContractorPassword(id: number, passwordHash: string) {
  const db = useDb()
  await db.update(contractors).set({ passwordHash }).where(eq(contractors.id, id))
}

// ── Session ────────────────────────────────────────────────────────────

/** Confirm a contractor row still exists (stale-session guard). */
export async function findContractorIdForSession(id: number) {
  const db = useDb()
  const [contractor] = await db
    .select({ id: contractors.id })
    .from(contractors)
    .where(eq(contractors.id, id))
    .limit(1)
  return contractor ?? null
}
