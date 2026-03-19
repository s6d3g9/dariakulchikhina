import { useDb } from '~/server/db'
import { projects } from '~/server/db/schema'
import { eq } from 'drizzle-orm'
import { ClientRecoverSchema } from '~/shared/types/auth'

export default defineEventHandler(async (event) => {
  const body = await readValidatedNodeBody(event, ClientRecoverSchema)
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
    throw createError({ statusCode: 404, statusMessage: 'Клиент не найден или recovery phrase не настроена' })
  }

  const ok = await verifyPassword(body.recoveryPhrase, project.clientRecoveryPhraseHash)
  if (!ok) {
    throw createError({ statusCode: 401, statusMessage: 'Неверная recovery phrase' })
  }

  const clientPasswordHash = await hashPassword(body.newPassword)
  await db.update(projects).set({ clientPasswordHash }).where(eq(projects.id, project.id))

  return { ok: true }
})