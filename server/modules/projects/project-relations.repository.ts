import { asc, eq, inArray } from 'drizzle-orm'

import { useDb } from '~/server/db/index'
import {
  clients,
  contractors,
  designerProjects,
  designers,
  managerProjects,
  managers,
  projectContractors,
  projects,
  sellerProjects,
  sellers,
} from '~/server/db/schema'

export async function findProjectWithProfile(slug: string) {
  const db = useDb()
  const [project] = await db
    .select({
      id: projects.id,
      profile: projects.profile,
    })
    .from(projects)
    .where(eq(projects.slug, slug))
    .limit(1)
  return project ?? null
}

export async function findClientsByIds(ids: number[]) {
  if (!ids.length) return []
  const db = useDb()
  return db
    .select({
      id: clients.id,
      name: clients.name,
      phone: clients.phone,
      email: clients.email,
      messengerNick: clients.messengerNick,
    })
    .from(clients)
    .where(inArray(clients.id, ids))
    .orderBy(asc(clients.name))
}

export async function findProjectContractorsForProject(projectId: number) {
  const db = useDb()
  return db
    .select({
      id: contractors.id,
      name: contractors.name,
      companyName: contractors.companyName,
      phone: contractors.phone,
      email: contractors.email,
      messengerNick: contractors.messengerNick,
    })
    .from(projectContractors)
    .innerJoin(contractors, eq(projectContractors.contractorId, contractors.id))
    .where(eq(projectContractors.projectId, projectId))
    .orderBy(asc(contractors.name))
}

export async function findProjectDesignersForProject(projectId: number) {
  const db = useDb()
  return db
    .select({
      id: designers.id,
      name: designers.name,
      companyName: designers.companyName,
      phone: designers.phone,
      email: designers.email,
    })
    .from(designerProjects)
    .innerJoin(designers, eq(designerProjects.designerId, designers.id))
    .where(eq(designerProjects.projectId, projectId))
    .orderBy(asc(designers.name))
}

export async function findProjectSellersForProject(projectId: number) {
  const db = useDb()
  return db
    .select({
      id: sellers.id,
      name: sellers.name,
      companyName: sellers.companyName,
      city: sellers.city,
      contactPerson: sellers.contactPerson,
      messengerNick: sellers.messengerNick,
    })
    .from(sellerProjects)
    .innerJoin(sellers, eq(sellerProjects.sellerId, sellers.id))
    .where(eq(sellerProjects.projectId, projectId))
    .orderBy(asc(sellers.name))
}

export async function findProjectManagersForProject(projectId: number) {
  const db = useDb()
  return db
    .select({
      id: managers.id,
      name: managers.name,
      role: managers.role,
      phone: managers.phone,
      email: managers.email,
    })
    .from(managerProjects)
    .innerJoin(managers, eq(managerProjects.managerId, managers.id))
    .where(eq(managerProjects.projectId, projectId))
    .orderBy(asc(managers.name))
}
