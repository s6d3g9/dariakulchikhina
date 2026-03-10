import { getProjectById } from '~/server/utils/projects'

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const rawId = getRouterParam(event, 'id')
  const projectId = Number(rawId)

  if (!rawId || !Number.isInteger(projectId) || projectId <= 0) {
    throw createError({ statusCode: 400, message: 'Неверный id проекта' })
  }

  const project = await getProjectById(projectId)

  if (!project) {
    throw createError({ statusCode: 404, message: 'Проект не найден' })
  }

  return project
})