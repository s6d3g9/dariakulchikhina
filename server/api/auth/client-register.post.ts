import { useDb } from '~/server/db'
import { projects } from '~/server/db/schema'
import { eq } from 'drizzle-orm'
import { ClientRegisterSchema } from '~/shared/types/auth'
import { generateRecoveryPhrase } from '~/server/utils/recovery-phrase'
import { createUniqueProjectSlug } from '~/server/utils/auth-registration'

export default defineEventHandler(async (event) => {
  const body = await readValidatedNodeBody(event, ClientRegisterSchema)
  const db = useDb()

  const [existing] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.clientLogin, body.login))
    .limit(1)

  if (existing) {
    throw createError({ statusCode: 409, statusMessage: 'Клиент с таким логином уже существует' })
  }

  const recoveryPhrase = generateRecoveryPhrase()
  const slug = await createUniqueProjectSlug(db, body.login)
  const clientPasswordHash = await hashPassword(body.password)
  const clientRecoveryPhraseHash = await hashPassword(recoveryPhrase)
  const projectTitle = body.projectTitle?.trim() || `Проект ${body.login}`
  const clientName = body.name?.trim() || body.login

  const [project] = await db.insert(projects).values({
    slug,
    title: projectTitle,
    clientLogin: body.login,
    clientPasswordHash,
    clientRecoveryPhraseHash,
    profile: {
      clientName,
      clientLogin: body.login,
    },
  }).returning({
    id: projects.id,
    slug: projects.slug,
    title: projects.title,
    clientLogin: projects.clientLogin,
  })

  return {
    ok: true,
    project,
    recoveryPhrase,
  }
})