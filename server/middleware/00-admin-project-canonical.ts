import { sendRedirect } from 'h3'

import { getAdminSession } from '~/server/utils/auth'
import { getProjectById, isNumericProjectId } from '~/server/utils/projects'

export default defineEventHandler(async (event) => {
  const url = event.node?.req?.url || event.path || ''
  const [path, query = ''] = url.split('?')

  if (!path.startsWith('/admin/projects/')) return

  const match = path.match(/^\/admin\/projects\/([^/]+)$/)
  if (!match?.[1]) return

  const projectParam = decodeURIComponent(match[1])
  if (!isNumericProjectId(projectParam)) return

  if (!getAdminSession(event)) {
    return sendRedirect(event, '/admin/login', 302)
  }

  const project = await getProjectById(Number(projectParam))
  if (!project) {
    throw createError({ statusCode: 404, message: 'Проект не найден' })
  }

  const location = query
    ? `/admin/projects/${project.slug}?${query}`
    : `/admin/projects/${project.slug}`

  return sendRedirect(event, location, 301)
})