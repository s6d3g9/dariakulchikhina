import * as repo from '~/server/modules/projects/project-relations.repository'

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
  const project = await repo.findProjectWithProfile(projectSlug)

  if (!project) {
    return null
  }

  const linkedClientIds = extractLinkedClientIds(project.profile as Record<string, unknown> | undefined)

  const [linkedClients, linkedContractorsRows, linkedDesignersRows, linkedSellersRows, linkedManagersRows] = await Promise.all([
    repo.findClientsByIds(linkedClientIds),
    repo.findProjectContractorsForProject(project.id),
    repo.findProjectDesignersForProject(project.id),
    repo.findProjectSellersForProject(project.id),
    repo.findProjectManagersForProject(project.id),
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
