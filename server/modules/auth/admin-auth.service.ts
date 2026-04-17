import type { H3Event } from 'h3'
import { eq, or } from 'drizzle-orm'
import { useDb } from '~/server/db/index'
import { users } from '~/server/db/schema'
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

/**
 * Admin (designer) login by `login` or `email`. On a first-time login
 * matching DESIGNER_INITIAL_* bootstrap credentials, silently creates the
 * initial user row so the deploy comes up with a working admin without
 * a manual seed step.
 */
export async function adminLogin(event: H3Event, body: LoginInput) {
  const db = useDb()
  const preferredEmail = (
    process.env.DESIGNER_INITIAL_EMAIL || 'admin@dariakulchikhina.com'
  ).trim()
  const preferredLogin = (
    process.env.DESIGNER_INITIAL_LOGIN || preferredEmail.split('@')[0] || 'admin'
  )
    .trim()
    .toLowerCase()
  const initialPassword = (process.env.DESIGNER_INITIAL_PASSWORD || '').trim()

  const columns = {
    id: users.id,
    email: users.email,
    login: users.login,
    name: users.name,
    passwordHash: users.passwordHash,
  }

  let [user] = await db
    .select(columns)
    .from(users)
    .where(or(eq(users.login, body.login), eq(users.email, body.login)))
    .limit(1)

  if (!user) {
    const matchesBootstrap =
      body.login === preferredLogin ||
      body.login === preferredEmail.toLowerCase()
    if (matchesBootstrap && initialPassword && body.password === initialPassword) {
      ;[user] = await db
        .select(columns)
        .from(users)
        .where(
          or(eq(users.login, preferredLogin), eq(users.email, preferredEmail)),
        )
        .limit(1)

      if (!user) {
        const passwordHash = await hashPassword(initialPassword)
        ;[user] = await db
          .insert(users)
          .values({
            email: preferredEmail,
            login: preferredLogin,
            passwordHash,
            name: 'Designer',
          })
          .returning(columns)
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
  const db = useDb()

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(
      or(
        eq(users.login, body.login),
        eq(users.email, `${body.login}@auth.local`),
      ),
    )
    .limit(1)

  if (existing) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Пользователь с таким логином уже существует',
    })
  }

  const recoveryPhrase = generateRecoveryPhrase()
  const passwordHash = await hashPassword(body.password)
  const recoveryPhraseHash = await hashPassword(recoveryPhrase)

  const [created] = await db
    .insert(users)
    .values({
      email: `${body.login}@auth.local`,
      login: body.login,
      passwordHash,
      recoveryPhraseHash,
      name: body.name || body.login,
    })
    .returning({
      id: users.id,
      login: users.login,
      email: users.email,
      name: users.name,
    })

  return { ok: true, user: created, recoveryPhrase }
}
