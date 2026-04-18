import type { H3Event } from 'h3'
import { config } from '~/server/config'
import {
  hashPassword,
  verifyPassword,
  setAdminSession,
} from '~/server/utils/auth'
import { generateRecoveryPhrase } from '~/server/modules/auth/recovery.service'
import type {
  LoginInput,
  RegisterInput,
} from '~/shared/types/auth'
import * as repo from './auth.repository'

/**
 * Admin (designer) login by `login` or `email`. On a first-time login
 * matching DESIGNER_INITIAL_* bootstrap credentials, silently creates the
 * initial user row so the deploy comes up with a working admin without
 * a manual seed step.
 */
export async function adminLogin(event: H3Event, body: LoginInput) {
  const preferredEmail = config.DESIGNER_INITIAL_EMAIL.trim()
  const preferredLogin = (
    config.DESIGNER_INITIAL_LOGIN || preferredEmail.split('@')[0] || 'admin'
  )
    .trim()
    .toLowerCase()
  const initialPassword = (config.DESIGNER_INITIAL_PASSWORD || '').trim()

  let user = await repo.findUserByLoginOrEmail(body.login)

  if (!user) {
    const matchesBootstrap =
      body.login === preferredLogin ||
      body.login === preferredEmail.toLowerCase()
    if (matchesBootstrap && initialPassword && body.password === initialPassword) {
      user =
        (await repo.findUserByLoginOrEmail(preferredLogin)) ??
        (await repo.findUserByEmail(preferredEmail))

      if (!user) {
        const passwordHash = await hashPassword(initialPassword)
        user = await repo.insertUser({
          email: preferredEmail,
          login: preferredLogin,
          passwordHash,
          name: 'Designer',
        })
      }
    }
  }

  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Пользователь не найден' })
  }

  const ok = await verifyPassword(body.password, user.passwordHash)
  if (!ok) {
    throw createError({ statusCode: 401, statusMessage: 'Неверный пароль' })
  }

  setAdminSession(event, user.id)
  return { ok: true, name: user.name, email: user.email, login: user.login }
}

/**
 * Admin registration. Derives a placeholder email from the login handle
 * (`<login>@auth.local`) so the legacy email-is-identity code keeps working.
 * Returns the fresh recovery phrase — the only time it is ever revealed.
 */
export async function adminRegister(body: RegisterInput) {
  const existing = await repo.findUserByLoginOrEmailExists(
    body.login,
    `${body.login}@auth.local`,
  )

  if (existing) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Пользователь с таким логином уже существует',
    })
  }

  const recoveryPhrase = generateRecoveryPhrase()
  const passwordHash = await hashPassword(body.password)
  const recoveryPhraseHash = await hashPassword(recoveryPhrase)

  const created = await repo.insertUser({
    email: `${body.login}@auth.local`,
    login: body.login,
    passwordHash,
    recoveryPhraseHash,
    name: body.name || body.login,
  })

  return { ok: true, user: created, recoveryPhrase }
}
