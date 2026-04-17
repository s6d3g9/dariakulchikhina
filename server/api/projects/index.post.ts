import { CreateProjectSchema } from '~/shared/types/project/project'
import { createProject } from '~/server/modules/projects/project-mutations.service'

/**
 * POST /api/projects — create a new project. Maps duplicate slug to 400.
 */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const body = await readValidatedNodeBody(event, CreateProjectSchema)
  return await createProject(body)
})
