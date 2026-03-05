import { useDb } from '~/server/db/index'
import { users, projects, designers } from '~/server/db/schema'
import { asc } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const db = useDb()

  const allUsers = await db
    .select({
      id: users.id,
      email: users.email,
      login: users.login,
      name: users.name,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(asc(users.id))

  // Attach roles based on linked entities
  const [allProjects, allDesigners] = await Promise.all([
    db.select({ userId: projects.userId, slug: projects.slug, title: projects.title }).from(projects),
    db.select({ userId: designers.userId, id: designers.id, name: designers.name }).from(designers),
  ])

  return allUsers.map(u => {
    const roles: string[] = []
    const linkedProject = allProjects.find(p => p.userId === u.id)
    const linkedDesigner = allDesigners.find(d => d.userId === u.id)
    if (linkedDesigner) roles.push('designer')
    if (linkedProject) roles.push('client')
    if (roles.length === 0) roles.push('admin')
    return {
      ...u,
      roles,
      linkedProject: linkedProject ? { slug: linkedProject.slug, title: linkedProject.title } : null,
      linkedDesigner: linkedDesigner ? { id: linkedDesigner.id, name: linkedDesigner.name } : null,
    }
  })
})
