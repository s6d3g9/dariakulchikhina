import { asc, eq, inArray } from 'drizzle-orm'

import { useDb } from '~/server/db'
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

type ProjectLinkedClient = {
  id: number
  name: string
  phone: string | null
  email: string | null
  messengerNick: string | null
}

type ProjectLinkedContractor = {
  id: number
  name: string
  companyName: string | null
  phone: string | null
  email: string | null
  messengerNick: string | null
}

type ProjectLinkedDesigner = {
  id: number
  name: string
  companyName: string | null
  phone: string | null
  email: string | null
}

type ProjectLinkedSeller = {
  id: number
  name: string
  companyName: string | null
  city: string | null
  contactPerson: string | null
  messengerNick: string | null
}

type ProjectLinkedManager = {
  id: number
  name: string
  role: string | null
  phone: string | null
  email: string | null
}

export type ProjectRelationsSnapshot = {
  linked: {
    clients: ProjectLinkedClient[]
    contractors: ProjectLinkedContractor[]
    designers: ProjectLinkedDesigner[]
    sellers: ProjectLinkedSeller[]
    managers: ProjectLinkedManager[]
  }
  summary: {
    clients: number
    contractors: number
    designers: number
    sellers: number
    managers: number
  }
}

function extractLinkedClientIds(profile: Record<string, unknown> | null | undefined) {
  const ids = new Set<number>()

  if (Array.isArray(profile?.client_ids)) {
    for (const rawId of profile.client_ids) {
      const clientId = Number(rawId)
      if (Number.isInteger(clientId) && clientId > 0) {
        ids.add(clientId)
      }
    }
  }

  const singleClientId = Number(profile?.client_id)
  if (Number.isInteger(singleClientId) && singleClientId > 0) {
    ids.add(singleClientId)
  }

  return Array.from(ids)
}

export async function getProjectRelationsSnapshot(projectSlug: string): Promise<ProjectRelationsSnapshot | null> {
  const db = useDb()

  const [project] = await db
    .select({
      id: projects.id,
      profile: projects.profile,
    })
    .from(projects)
    .where(eq(projects.slug, projectSlug))
    .limit(1)

  if (!project) {
    return null
  }

  const linkedClientIds = extractLinkedClientIds(project.profile as Record<string, unknown> | undefined)

  const [linkedClients, linkedContractorsRows, linkedDesignersRows, linkedSellersRows, linkedManagersRows] = await Promise.all([
    linkedClientIds.length
      ? db
          .select({
            id: clients.id,
            name: clients.name,
            phone: clients.phone,
            email: clients.email,
            messengerNick: clients.messengerNick,
          })
          .from(clients)
          .where(inArray(clients.id, linkedClientIds))
          .orderBy(asc(clients.name))
      : Promise.resolve([]),
    db
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
      .where(eq(projectContractors.projectId, project.id))
      .orderBy(asc(contractors.name)),
    db
      .select({
        id: designers.id,
        name: designers.name,
        companyName: designers.companyName,
        phone: designers.phone,
        email: designers.email,
      })
      .from(designerProjects)
      .innerJoin(designers, eq(designerProjects.designerId, designers.id))
      .where(eq(designerProjects.projectId, project.id))
      .orderBy(asc(designers.name)),
    db
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
      .where(eq(sellerProjects.projectId, project.id))
      .orderBy(asc(sellers.name)),
    db
      .select({
        id: managers.id,
        name: managers.name,
        role: managers.role,
        phone: managers.phone,
        email: managers.email,
      })
      .from(managerProjects)
      .innerJoin(managers, eq(managerProjects.managerId, managers.id))
      .where(eq(managerProjects.projectId, project.id))
      .orderBy(asc(managers.name)),
  ])

  return {
    linked: {
      clients: linkedClients,
      contractors: linkedContractorsRows,
      designers: linkedDesignersRows,
      sellers: linkedSellersRows,
      managers: linkedManagersRows,
    },
    summary: {
      clients: linkedClients.length,
      contractors: linkedContractorsRows.length,
      designers: linkedDesignersRows.length,
      sellers: linkedSellersRows.length,
      managers: linkedManagersRows.length,
    },
  }
}