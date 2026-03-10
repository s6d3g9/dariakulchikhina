import { getProjectRelationsSnapshot } from '~/server/utils/project-relations'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')!
  requireAdminOrClient(event, slug)

  const snapshot = await getProjectRelationsSnapshot(slug)
  if (!snapshot) {
    throw createError({ statusCode: 404, message: 'Проект не найден' })
  }

  return snapshot
})