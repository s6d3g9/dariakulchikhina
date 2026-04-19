import type { H3Event } from 'h3'
import { z } from 'zod'
import { hashPassword, verifyPassword } from '~/server/modules/auth/password.service'
import { setClientSession } from '~/server/modules/auth/session.service'
import { generateRecoveryPhrase } from '~/server/modules/auth/recovery.service'
import { createUniqueProjectSlug } from '~/server/modules/auth/auth-registration.service'
import type {
  ClientRegisterInput,
  ClientRecoverInput,
} from '~/shared/types/auth'
import * as repo from './auth.repository'

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
  if ('slug' in body) {
    const project = await repo.findProjectByClientSlug(body.slug)

    if (!project) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Проект не найден. Проверьте код доступа.',
      })
    }

    setClientSession(event, project.slug)
    return { ok: true, slug: project.slug, title: project.title }
  }

  const project = await repo.findProjectWithPasswordByClientLogin(body.login)

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
  const existing = await repo.findProjectByClientLogin(body.login)

  if (existing) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Клиент с таким логином уже существует',
    })
  }

  const recoveryPhrase = generateRecoveryPhrase()
  const slug = await createUniqueProjectSlug(body.login)
  const clientPasswordHash = await hashPassword(body.password)
  const clientRecoveryPhraseHash = await hashPassword(recoveryPhrase)
  const projectTitle = body.projectTitle?.trim() || `Проект ${body.login}`
  const clientName = body.name?.trim() || body.login

  const project = await repo.insertClientProject({
    slug,
    title: projectTitle,
    clientLogin: body.login,
    clientPasswordHash,
    clientRecoveryPhraseHash,
    profile: { clientName, clientLogin: body.login },
  })

  return { ok: true, project, recoveryPhrase }
}

/**
 * Reset a client password given the recovery phrase.
 */
export async function clientRecover(body: ClientRecoverInput) {
  const project = await repo.findProjectWithRecoveryByClientLogin(body.login)

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
  await repo.updateProjectClientPassword(project.id, clientPasswordHash)

  return { ok: true as const }
}
