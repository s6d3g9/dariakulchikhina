import type { H3Event } from 'h3'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { useDb } from '~/server/db/index'
import { projects } from '~/server/db/schema'
import {
  hashPassword,
  verifyPassword,
  setClientSession,
} from '~/server/utils/auth'
import { generateRecoveryPhrase } from '~/server/utils/recovery-phrase'
import { createUniqueProjectSlug } from '~/server/modules/auth/auth-registration.service'
import type {
  ClientRegisterInput,
  ClientRecoverInput,
} from '~/shared/types/auth'

/**
 * Client login accepts two shapes:
 *   - `{ slug }` — legacy slug-based access for read-only invites.
 *   - `{ login, password }` — credentialed access tied to the project row.
 *
 * Defined here as the source of truth for the thin handler to validate
 * against.
 */
export const ClientLoginSchema = z.union([
  z.object({
    slug: z.string().min(1).max(200).toLowerCase().trim(),
  }),
  z.object({
    login: z.string().min(3).max(100).trim().toLowerCase(),
    password: z.string().min(1),
  }),
])
export type ClientLoginInput = z.infer<typeof ClientLoginSchema>

/**
 * Resolves a client session and installs the session cookie. Throws 401
 * for invalid slug / credentials.
 */
export async function clientLogin(event: H3Event, body: ClientLoginInput) {
  const db = useDb()

  if ('slug' in body) {
    const [project] = await db
      .select({
        id: projects.id,
        slug: projects.slug,
        title: projects.title,
        status: projects.status,
      })
      .from(projects)
      .where(eq(projects.slug, body.slug))
      .limit(1)

    if (!project) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Проект не найден. Проверьте код доступа.',
      })
    }

    setClientSession(event, project.slug)
    return { ok: true, slug: project.slug, title: project.title }
  }

  const [project] = await db
    .select({
      id: projects.id,
      slug: projects.slug,
      title: projects.title,
      clientPasswordHash: projects.clientPasswordHash,
    })
    .from(projects)
    .where(eq(projects.clientLogin, body.login))
    .limit(1)

  if (!project || !project.clientPasswordHash) {
    throw createError({ statusCode: 401, statusMessage: 'Неверный логин или пароль' })
  }

  const ok = await verifyPassword(body.password, project.clientPasswordHash)
  if (!ok) {
    throw createError({ statusCode: 401, statusMessage: 'Неверный логин или пароль' })
  }

  setClientSession(event, project.slug)
  return { ok: true, slug: project.slug, title: project.title }
}

/**
 * Registers a new client + a project row owned by them. Returns the fresh
 * recovery phrase (shown once). Slug is unique by construction.
 */
export async function clientRegister(body: ClientRegisterInput) {
  const db = useDb()

  const [existing] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.clientLogin, body.login))
    .limit(1)

  if (existing) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Клиент с таким логином уже существует',
    })
  }

  const recoveryPhrase = generateRecoveryPhrase()
  const slug = await createUniqueProjectSlug(db, body.login)
  const clientPasswordHash = await hashPassword(body.password)
  const clientRecoveryPhraseHash = await hashPassword(recoveryPhrase)
  const projectTitle = body.projectTitle?.trim() || `Проект ${body.login}`
  const clientName = body.name?.trim() || body.login

  const [project] = await db
    .insert(projects)
    .values({
      slug,
      title: projectTitle,
      clientLogin: body.login,
      clientPasswordHash,
      clientRecoveryPhraseHash,
      profile: { clientName, clientLogin: body.login },
    })
    .returning({
      id: projects.id,
      slug: projects.slug,
      title: projects.title,
      clientLogin: projects.clientLogin,
    })

  return { ok: true, project, recoveryPhrase }
}

/**
 * Reset a client password given the recovery phrase.
 */
export async function clientRecover(body: ClientRecoverInput) {
  const db = useDb()

  const [project] = await db
    .select({
      id: projects.id,
      clientRecoveryPhraseHash: projects.clientRecoveryPhraseHash,
    })
    .from(projects)
    .where(eq(projects.clientLogin, body.login))
    .limit(1)

  if (!project || !project.clientRecoveryPhraseHash) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Клиент не найден или recovery phrase не настроена',
    })
  }

  const ok = await verifyPassword(
    body.recoveryPhrase,
    project.clientRecoveryPhraseHash,
  )
  if (!ok) {
    throw createError({ statusCode: 401, statusMessage: 'Неверная recovery phrase' })
  }

  const clientPasswordHash = await hashPassword(body.newPassword)
  await db
    .update(projects)
    .set({ clientPasswordHash })
    .where(eq(projects.id, project.id))

  return { ok: true as const }
}
