import { useDb } from '~/server/db'
import { contractors } from '~/server/db/schema'
import { eq } from 'drizzle-orm'
import { ContractorRegisterSchema } from '~/shared/types/auth'
import { generateRecoveryPhrase } from '~/server/utils/recovery-phrase'
import { createUniqueContractorSlug } from '~/server/utils/auth-registration'

export default defineEventHandler(async (event) => {
  const body = await readValidatedNodeBody(event, ContractorRegisterSchema)
  const db = useDb()

  const [existing] = await db
    .select({ id: contractors.id })
    .from(contractors)
    .where(eq(contractors.login, body.login))
    .limit(1)

  if (existing) {
    throw createError({ statusCode: 409, statusMessage: 'Подрядчик с таким логином уже существует' })
  }

  const recoveryPhrase = generateRecoveryPhrase()
  const slug = await createUniqueContractorSlug(db, body.login)
  const passwordHash = await hashPassword(body.password)
  const recoveryPhraseHash = await hashPassword(recoveryPhrase)
  const contractorName = body.name?.trim() || body.login

  const [contractor] = await db.insert(contractors).values({
    slug,
    login: body.login,
    passwordHash,
    recoveryPhraseHash,
    name: contractorName,
    companyName: body.companyName,
  }).returning({
    id: contractors.id,
    name: contractors.name,
    login: contractors.login,
  })

  return {
    ok: true,
    contractor,
    recoveryPhrase,
  }
})