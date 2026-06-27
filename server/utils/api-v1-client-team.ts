import { createHash } from 'node:crypto'

import { CONTRACTOR_ROLE_TYPE_OPTIONS } from '~/shared/types/catalogs'
import { workTypeLabel } from '~/shared/utils/work-status'
import type {
  ApiV1ClientProjectTeam,
  ApiV1ClientProjectTeamMember,
  ApiV1ProjectRef,
} from '~/shared/types/api-v1'

type ProjectTeamRow = {
  id: number
  slug: string
  title: string
  status: string
  projectType: string
  updatedAt: Date | string | null
}

type ContractorTeamRow = {
  id: number
  name: string
  companyName: string | null
  workTypes: string[]
  roleTypes: string[]
  contractorType: string
}

const ROLE_LABELS = Object.fromEntries(
  CONTRACTOR_ROLE_TYPE_OPTIONS.map(option => [option.value, option.label]),
) as Record<string, string>

const CONTRACTOR_TYPE_LABELS: Record<string, string> = {
  company: 'Подрядная организация',
  master: 'Мастер',
  ip: 'ИП',
  ooo: 'ООО',
  self_employed: 'Самозанятый',
}

function safeString(value: unknown, maxLength = 500) {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, maxLength)
}

function safeStringList(values: unknown, maxLength = 240) {
  if (!Array.isArray(values)) return []
  return values
    .map(value => safeString(value, maxLength))
    .filter(Boolean)
}

function createProjectRef(project: ProjectTeamRow): ApiV1ProjectRef {
  const updatedAt = project.updatedAt instanceof Date
    ? project.updatedAt.toISOString()
    : safeString(project.updatedAt, 80)

  return {
    id: project.id,
    slug: project.slug,
    title: project.title,
    status: project.status,
    projectType: project.projectType,
    updatedAt,
  }
}

function createPublicMemberId(project: ProjectTeamRow, sourceKind: string, sourceId: number) {
  return createHash('sha1')
    .update(`${project.slug}:${sourceKind}:${sourceId}`)
    .digest('hex')
    .slice(0, 16)
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)))
}

function createContractorMember(project: ProjectTeamRow, row: ContractorTeamRow): ApiV1ClientProjectTeamMember {
  const name = safeString(row.name, 240)
  const companyName = safeString(row.companyName, 240)
  const displayName = companyName || name || 'Участник проекта'
  const roleLabels = unique([
    ...safeStringList(row.roleTypes, 120).map(role => ROLE_LABELS[role] || role),
    CONTRACTOR_TYPE_LABELS[safeString(row.contractorType, 80)] || '',
  ])
  const workTypeLabels = unique(safeStringList(row.workTypes, 120).map(workTypeLabel))

  return {
    id: createPublicMemberId(project, 'contractor', row.id),
    subjectKind: 'contractor',
    displayName,
    secondaryName: companyName && name && companyName !== name ? name : '',
    avatarInitial: safeString(displayName[0], 1).toUpperCase() || '?',
    roleLabels,
    workTypeLabels,
    communicationMode: 'portal',
  }
}

export function createApiV1ClientProjectTeamDto(
  project: ProjectTeamRow,
  contractors: ContractorTeamRow[],
): ApiV1ClientProjectTeam {
  const members = contractors.map(row => createContractorMember(project, row))

  return {
    project: createProjectRef(project),
    summary: {
      total: members.length,
      contractors: members.filter(member => member.subjectKind === 'contractor').length,
      crews: members.filter(member => member.subjectKind === 'crew').length,
      workers: members.filter(member => member.subjectKind === 'worker').length,
    },
    members,
  }
}
