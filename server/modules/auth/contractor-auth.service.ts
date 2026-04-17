import type { H3Event } from 'h3'
import { z } from 'zod'
import {
  hashPassword,
  verifyPassword,
  setContractorSession,
} from '~/server/utils/auth'
import { generateRecoveryPhrase } from '~/server/modules/auth/recovery.service'
import { createUniqueContractorSlug } from '~/server/modules/auth/auth-registration.service'
import type {
  ContractorRegisterInput,
  ContractorRecoverInput,
} from '~/shared/types/auth'
import * as repo from './auth.repository'

/**
 * Contractor login accepts two shapes:
 *   - `{ id, slug }` — legacy direct-link access where the slug acts as a
 *     weak capability check.
 *   - `{ login, password }` — credentialed access.
 */
export const ContractorLoginSchema = z.union([
  z.object({
    id: z.number().int().positive(),
    slug: z.string().min(1).max(200),
  }),
  z.object({
    login: z.string().min(3).max(100).trim().toLowerCase(),
    password: z.string().min(1),
  }),
])
export type ContractorLoginInput = z.infer<typeof ContractorLoginSchema>

/**
 * Log a contractor in via one of the two accepted shapes. Throws 401 on
 * any mismatch.
 */
export async function contractorLogin(event: H3Event, body: ContractorLoginInput) {
  if ('id' in body) {
    const contractor = await repo.findContractorById(body.id)
    if (!contractor) {
      throw createError({ statusCode: 404, statusMessage: 'Подрядчик не найден' })
    }
    if (contractor.slug !== body.slug) {
      throw createError({ statusCode: 401, statusMessage: 'Неверные данные' })
    }
    setContractorSession(event, contractor.id)
    return { ok: true, id: contractor.id, name: contractor.name }
  }

  const contractor = await repo.findContractorWithPasswordByLogin(body.login)

  if (!contractor || !contractor.passwordHash) {
    throw createError({ statusCode: 401, statusMessage: 'Неверный логин или пароль' })
  }

  const ok = await verifyPassword(body.password, contractor.passwordHash)
  if (!ok) {
    throw createError({ statusCode: 401, statusMessage: 'Неверный логин или пароль' })
  }

  setContractorSession(event, contractor.id)
  return { ok: true, id: contractor.id, name: contractor.name }
}

/**
 * Register a new contractor row with its own unique slug and recovery
 * phrase. Returns the phrase (shown once).
 */
export async function contractorRegister(body: ContractorRegisterInput) {
  const existing = await repo.findContractorByLogin(body.login)

  if (existing) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Подрядчик с таким логином уже существует',
    })
  }

  const recoveryPhrase = generateRecoveryPhrase()
  const slug = await createUniqueContractorSlug(body.login)
  const passwordHash = await hashPassword(body.password)
  const recoveryPhraseHash = await hashPassword(recoveryPhrase)
  const contractorName = body.name?.trim() || body.login

  const contractor = await repo.insertContractor({
    slug,
    login: body.login,
    passwordHash,
    recoveryPhraseHash,
    name: contractorName,
    companyName: body.companyName,
  })

  return { ok: true, contractor, recoveryPhrase }
}

/**
 * Reset a contractor password given the recovery phrase.
 */
export async function contractorRecover(body: ContractorRecoverInput) {
  const contractor = await repo.findContractorWithRecoveryByLogin(body.login)

  if (!contractor || !contractor.recoveryPhraseHash) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Подрядчик не найден или recovery phrase не настроена',
    })
  }

  const ok = await verifyPassword(body.recoveryPhrase, contractor.recoveryPhraseHash)
  if (!ok) {
    throw createError({ statusCode: 401, statusMessage: 'Неверная recovery phrase' })
  }

  const passwordHash = await hashPassword(body.newPassword)
  await repo.updateContractorPassword(contractor.id, passwordHash)

  return { ok: true as const }
}
