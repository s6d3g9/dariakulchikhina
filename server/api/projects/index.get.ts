import { applyMessengerCors } from '~/server/utils/messenger-cors'
import { listProjectsWithTaskStats } from '~/server/modules/projects/projects.service'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  applyMessengerCors(event)

  return listProjectsWithTaskStats()
})
