import { useDb } from '~/server/db'
import { projects } from '~/server/db/schema'
import { eq } from 'drizzle-orm'
import { ClientRecoverSchema } from '~/shared/types/auth/auth'

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

  const DUMMY_HASH = '$2a$12$000000000000000000000uGBPRnpKe7P6TBGgKOjHR0INdZOhHIi'
  const ok = await verifyPassword(body.recoveryPhrase, project?.clientRecoveryPhraseHash || DUMMY_HASH)

  if (!project || !project.clientRecoveryPhraseHash || !ok) {
    throw createError({ statusCode: 401, statusMessage: 'Неверный логин или recovery phrase' })
  }

  const clientPasswordHash = await hashPassword(body.newPassword)
  await db.update(projects).set({ clientPasswordHash }).where(eq(projects.id, project.id))

  return { ok: true }
})