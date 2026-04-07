import { z } from 'zod'

/** Safe JSON meta record — keys ≤200 chars, values: string/number/boolean/null */
const zMetaRecord = z.record(z.string().max(200), z.union([z.string().max(10_000), z.number(), z.boolean(), z.null()])).default({})

export const PROJECT_PARTICIPANT_SOURCE_KINDS = ['client', 'contractor', 'designer', 'seller', 'manager', 'custom'] as const
export const PROJECT_PARTICIPANT_ROLE_KEYS = ['client', 'manager', 'designer', 'lawyer', 'contractor', 'seller', 'engineer', 'consultant', 'service', 'other'] as const
export const PROJECT_SCOPE_TYPES = ['project', 'phase', 'sprint', 'task', 'document', 'service'] as const
export const PROJECT_SCOPE_SOURCES = ['project', 'hybrid-control', 'work-status', 'documents', 'extra-services'] as const
export const PROJECT_RESPONSIBILITY_KEYS = ['lead', 'owner', 'executor', 'reviewer', 'approver', 'observer', 'consultant'] as const
export const PROJECT_PARTICIPANT_STATUSES = ['active', 'archived'] as const
export const PROJECT_SCOPE_ASSIGNMENT_STATUSES = ['active', 'pending', 'done', 'removed'] as const
export const PROJECT_SCOPE_ASSIGNMENT_ORIGINS = ['direct', 'project', 'derived'] as const

export const ProjectParticipantSourceKindSchema = z.enum(PROJECT_PARTICIPANT_SOURCE_KINDS)
export const ProjectParticipantRoleKeySchema = z.enum(PROJECT_PARTICIPANT_ROLE_KEYS)
export const ProjectScopeTypeSchema = z.enum(PROJECT_SCOPE_TYPES)
export const ProjectScopeSourceSchema = z.enum(PROJECT_SCOPE_SOURCES)
export const ProjectResponsibilityKeySchema = z.enum(PROJECT_RESPONSIBILITY_KEYS)
export const ProjectParticipantStatusSchema = z.enum(PROJECT_PARTICIPANT_STATUSES)
export const ProjectScopeAssignmentStatusSchema = z.enum(PROJECT_SCOPE_ASSIGNMENT_STATUSES)
export const ProjectScopeAssignmentOriginSchema = z.enum(PROJECT_SCOPE_ASSIGNMENT_ORIGINS)

export const ProjectScopeRefSchema = z.object({
  scopeType: ProjectScopeTypeSchema,
  scopeSource: ProjectScopeSourceSchema,
  scopeId: z.string().trim().min(1),
})

export const ProjectParticipantSchema = z.object({
  id: z.string().trim().min(1),
  persistedId: z.number().int().positive().optional(),
  projectId: z.number().int().positive().optional(),
  sourceKind: ProjectParticipantSourceKindSchema,
  sourceId: z.number().int().positive().optional(),
  roleKey: ProjectParticipantRoleKeySchema,
  displayName: z.string().trim().min(1),
  companyName: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  email: z.string().trim().optional(),
  messengerNick: z.string().trim().optional(),
  isPrimary: z.boolean().default(false),
  status: ProjectParticipantStatusSchema.default('active'),
  notes: z.string().trim().optional(),
  meta: zMetaRecord,
})

export const ProjectScopeAssignmentSchema = z.object({
  id: z.string().trim().min(1),
  persistedId: z.number().int().positive().optional(),
  projectId: z.number().int().positive().optional(),
  participantId: z.string().trim().min(1),
  persistedParticipantId: z.number().int().positive().optional(),
  scopeType: ProjectScopeTypeSchema,
  scopeSource: ProjectScopeSourceSchema,
  scopeId: z.string().trim().min(1),
  responsibility: ProjectResponsibilityKeySchema,
  allocationPercent: z.number().int().min(0).max(100).optional(),
  status: ProjectScopeAssignmentStatusSchema.default('active'),
  dueDate: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  meta: zMetaRecord,
  assignedBy: z.string().trim().optional(),
  assignedAt: z.string().trim().min(1),
  updatedAt: z.string().trim().min(1),
})

export const ProjectScopeSettingsSchema = z.object({
  id: z.string().trim().min(1),
  persistedId: z.number().int().positive().optional(),
  projectId: z.number().int().positive().optional(),
  scopeType: ProjectScopeTypeSchema,
  scopeSource: ProjectScopeSourceSchema,
  scopeId: z.string().trim().min(1),
  settings: zMetaRecord,
  updatedAt: z.string().trim().min(1),
})

export const ProjectGovernanceDetailItemSchema = z.object({
  key: z.string().trim().min(1),
  label: z.string().trim().min(1),
  value: z.string().trim().min(1),
})

export const ProjectGovernanceSummaryParticipantSchema = ProjectParticipantSchema.extend({
  secondary: z.string().trim().default(''),
  assignmentCount: z.number().int().min(0).default(0),
  activeTaskCount: z.number().int().min(0).default(0),
})

export const ProjectGovernanceSummarySchema = z.object({
  revision: z.string().trim().min(1),
  participants: z.array(ProjectGovernanceSummaryParticipantSchema).default([]),
  scopeCounters: z.record(z.number().int().min(0)).default({}),
})

export const ProjectScopeParticipantSummarySchema = z.object({
  assignmentId: z.string().trim().min(1),
  participantId: z.string().trim().min(1),
  displayName: z.string().trim().min(1),
  roleKey: ProjectParticipantRoleKeySchema,
  roleLabel: z.string().trim().min(1),
  responsibility: ProjectResponsibilityKeySchema,
  responsibilityLabel: z.string().trim().min(1),
  origin: ProjectScopeAssignmentOriginSchema,
  activeTaskCount: z.number().int().min(0).default(0),
  secondary: z.string().trim().default(''),
})

export const ProjectScopeLinkSchema = z.object({
  scopeType: ProjectScopeTypeSchema,
  scopeSource: ProjectScopeSourceSchema,
  scopeId: z.string().trim().min(1),
  title: z.string().trim().min(1),
  status: z.string().trim().optional(),
  statusLabel: z.string().trim().optional(),
})

export const ProjectScopeTaskSummarySchema = z.object({
  id: z.string().trim().min(1),
  title: z.string().trim().min(1),
  status: z.string().trim().min(1),
  statusLabel: z.string().trim().min(1),
  assigneeLabels: z.array(z.string().trim().min(1)).default([]),
  secondary: z.string().trim().default(''),
})

export const ProjectScopeRuleSummarySchema = z.object({
  id: z.string().trim().min(1),
  title: z.string().trim().min(1),
  channel: z.string().trim().min(1),
  trigger: z.string().trim().min(1),
  audience: z.string().trim().min(1),
})

export const ProjectScopeDetailBundleSchema = z.object({
  revision: z.string().trim().min(1),
  scope: ProjectScopeRefSchema.extend({
    title: z.string().trim().min(1),
    subtitle: z.string().trim().default(''),
    status: z.string().trim().default(''),
    statusLabel: z.string().trim().default(''),
  }),
  core: zMetaRecord,
  settings: zMetaRecord,
  settingItems: z.array(ProjectGovernanceDetailItemSchema).default([]),
  participants: z.array(ProjectScopeParticipantSummarySchema).default([]),
  subjectItems: z.array(ProjectGovernanceDetailItemSchema).default([]),
  objectItems: z.array(ProjectGovernanceDetailItemSchema).default([]),
  actionItems: z.array(ProjectGovernanceDetailItemSchema).default([]),
  ruleItems: z.array(ProjectScopeRuleSummarySchema).default([]),
  linkedScopes: z.array(ProjectScopeLinkSchema).default([]),
  tasks: z.array(ProjectScopeTaskSummarySchema).default([]),
})

export const CreateProjectParticipantSchema = z.object({
  sourceKind: ProjectParticipantSourceKindSchema.default('custom'),
  sourceId: z.number().int().positive().optional(),
  roleKey: ProjectParticipantRoleKeySchema,
  displayName: z.string().trim().min(1).max(160),
  companyName: z.string().trim().max(160).optional(),
  phone: z.string().trim().max(80).optional(),
  email: z.string().trim().max(160).optional(),
  messengerNick: z.string().trim().max(120).optional(),
  isPrimary: z.boolean().optional(),
  notes: z.string().trim().max(4000).optional(),
  meta: zMetaRecord.optional(),
}).superRefine((value, ctx) => {
  if (value.sourceKind === 'custom' && value.sourceId !== undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Для custom participant sourceId не нужен',
      path: ['sourceId'],
    })
  }

  if (value.sourceKind !== 'custom' && !value.sourceId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Для связанного участника нужен sourceId',
      path: ['sourceId'],
    })
  }
})

export const UpdateProjectParticipantSchema = z.object({
  sourceKind: ProjectParticipantSourceKindSchema.optional(),
  sourceId: z.number().int().positive().nullable().optional(),
  roleKey: ProjectParticipantRoleKeySchema.optional(),
  displayName: z.string().trim().min(1).max(160).optional(),
  companyName: z.string().trim().max(160).nullable().optional(),
  phone: z.string().trim().max(80).nullable().optional(),
  email: z.string().trim().max(160).nullable().optional(),
  messengerNick: z.string().trim().max(120).nullable().optional(),
  isPrimary: z.boolean().optional(),
  status: ProjectParticipantStatusSchema.optional(),
  notes: z.string().trim().max(4000).nullable().optional(),
  meta: zMetaRecord.nullable().optional(),
})

export const CreateProjectScopeAssignmentSchema = z.object({
  participantId: z.number().int().positive(),
  scopeType: ProjectScopeTypeSchema,
  scopeSource: ProjectScopeSourceSchema,
  scopeId: z.string().trim().min(1).max(255),
  responsibility: ProjectResponsibilityKeySchema,
  allocationPercent: z.number().int().min(0).max(100).optional(),
  status: ProjectScopeAssignmentStatusSchema.optional(),
  dueDate: z.string().trim().max(64).optional(),
  notes: z.string().trim().max(4000).optional(),
  meta: zMetaRecord.optional(),
  assignedBy: z.string().trim().max(120).optional(),
})

export const UpdateProjectScopeAssignmentSchema = z.object({
  participantId: z.number().int().positive().optional(),
  scopeType: ProjectScopeTypeSchema.optional(),
  scopeSource: ProjectScopeSourceSchema.optional(),
  scopeId: z.string().trim().min(1).max(255).optional(),
  responsibility: ProjectResponsibilityKeySchema.optional(),
  allocationPercent: z.number().int().min(0).max(100).nullable().optional(),
  status: ProjectScopeAssignmentStatusSchema.optional(),
  dueDate: z.string().trim().max(64).nullable().optional(),
  notes: z.string().trim().max(4000).nullable().optional(),
  meta: zMetaRecord.nullable().optional(),
  assignedBy: z.string().trim().max(120).nullable().optional(),
})

export const UpdateProjectScopeSettingsSchema = z.object({
  settings: z.record(z.string().max(200), z.union([z.string().max(10_000), z.number(), z.boolean(), z.null()])),
})

export type ProjectParticipantSourceKind = z.infer<typeof ProjectParticipantSourceKindSchema>
export type ProjectParticipantRoleKey = z.infer<typeof ProjectParticipantRoleKeySchema>
export type ProjectScopeType = z.infer<typeof ProjectScopeTypeSchema>
export type ProjectScopeSource = z.infer<typeof ProjectScopeSourceSchema>
export type ProjectResponsibilityKey = z.infer<typeof ProjectResponsibilityKeySchema>
export type ProjectParticipantStatus = z.infer<typeof ProjectParticipantStatusSchema>
export type ProjectScopeAssignmentStatus = z.infer<typeof ProjectScopeAssignmentStatusSchema>
export type ProjectScopeAssignmentOrigin = z.infer<typeof ProjectScopeAssignmentOriginSchema>
export type ProjectScopeRef = z.infer<typeof ProjectScopeRefSchema>
export type ProjectParticipant = z.infer<typeof ProjectParticipantSchema>
export type ProjectScopeAssignment = z.infer<typeof ProjectScopeAssignmentSchema>
export type ProjectScopeSettings = z.infer<typeof ProjectScopeSettingsSchema>
export type ProjectGovernanceDetailItem = z.infer<typeof ProjectGovernanceDetailItemSchema>
export type ProjectGovernanceSummaryParticipant = z.infer<typeof ProjectGovernanceSummaryParticipantSchema>
export type ProjectGovernanceSummary = z.infer<typeof ProjectGovernanceSummarySchema>
export type ProjectScopeParticipantSummary = z.infer<typeof ProjectScopeParticipantSummarySchema>
export type ProjectScopeLink = z.infer<typeof ProjectScopeLinkSchema>
export type ProjectScopeTaskSummary = z.infer<typeof ProjectScopeTaskSummarySchema>
export type ProjectScopeRuleSummary = z.infer<typeof ProjectScopeRuleSummarySchema>
export type ProjectScopeDetailBundle = z.infer<typeof ProjectScopeDetailBundleSchema>
export type CreateProjectParticipant = z.infer<typeof CreateProjectParticipantSchema>
export type UpdateProjectParticipant = z.infer<typeof UpdateProjectParticipantSchema>
export type CreateProjectScopeAssignment = z.infer<typeof CreateProjectScopeAssignmentSchema>
export type UpdateProjectScopeAssignment = z.infer<typeof UpdateProjectScopeAssignmentSchema>
export type UpdateProjectScopeSettings = z.infer<typeof UpdateProjectScopeSettingsSchema>