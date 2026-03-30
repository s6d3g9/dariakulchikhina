import { z } from 'zod'

const HybridControlPhaseStatusSchema = z.enum(['planned', 'active', 'blocked', 'done'])
const HybridControlSprintStatusSchema = z.enum(['planned', 'active', 'review', 'done'])
const HybridControlTaskStatusSchema = z.enum(['todo', 'doing', 'review', 'done'])
const HybridControlHealthStatusSchema = z.enum(['stable', 'warning', 'critical'])
const HybridControlManagerAgentRoleSchema = z.enum(['orchestrator', 'risk', 'delivery', 'communication'])
const HybridControlStakeholderRoleSchema = z.enum(['admin', 'manager', 'designer', 'client', 'contractor', 'seller', 'service'])
const HybridControlCommunicationChannelSchema = z.enum(['project-room', 'direct-thread', 'handoff', 'approval', 'daily-digest'])
const HybridControlCallInsightSourceSchema = z.enum(['call'])

export const HybridControlGateSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  done: z.boolean().default(false),
})

export const HybridControlPhaseSchema = z.object({
  id: z.string().min(1),
  phaseKey: z.string().min(1),
  title: z.string().min(1),
  owner: z.string().optional(),
  status: HybridControlPhaseStatusSchema.default('planned'),
  percent: z.number().min(0).max(100).default(0),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  factEndDate: z.string().optional(),
  deliverable: z.string().optional(),
  notes: z.string().optional(),
  gates: z.array(HybridControlGateSchema).default([]),
})

export const HybridControlTaskSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  status: HybridControlTaskStatusSchema.default('todo'),
  assignee: z.string().optional(),
  dueDate: z.string().optional(),
  points: z.number().min(0).max(100).default(1),
  notes: z.string().optional(),
})

export const HybridControlSprintSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  linkedPhaseKey: z.string().optional(),
  goal: z.string().optional(),
  focus: z.string().optional(),
  status: HybridControlSprintStatusSchema.default('planned'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  retrospective: z.string().optional(),
  tasks: z.array(HybridControlTaskSchema).default([]),
})

export const HybridControlCheckpointSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  category: z.string().min(1),
  status: HybridControlHealthStatusSchema.default('stable'),
  note: z.string().optional(),
})

export const HybridControlManagerAgentSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  role: HybridControlManagerAgentRoleSchema.default('orchestrator'),
  enabled: z.boolean().default(true),
  mission: z.string().optional(),
  cadenceDays: z.number().min(1).max(90).default(3),
  linkedChannel: HybridControlCommunicationChannelSchema.default('project-room'),
  targetRoles: z.array(HybridControlStakeholderRoleSchema).default([]),
  notes: z.string().optional(),
})

export const HybridControlCommunicationRuleSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  trigger: z.string().min(1),
  linkedChannel: HybridControlCommunicationChannelSchema.default('project-room'),
  audience: z.array(HybridControlStakeholderRoleSchema).default([]),
  ownerAgentId: z.string().optional(),
  cadenceDays: z.number().min(1).max(90).optional(),
  template: z.string().optional(),
})

export const HybridControlCallInsightSchema = z.object({
  id: z.string().min(1),
  sourceKind: HybridControlCallInsightSourceSchema.default('call'),
  title: z.string().min(1),
  summary: z.string().min(1),
  transcript: z.string().optional(),
  callId: z.string().optional(),
  conversationId: z.string().optional(),
  roomExternalRef: z.string().optional(),
  actorRole: HybridControlStakeholderRoleSchema.optional(),
  actorName: z.string().optional(),
  happenedAt: z.string().optional(),
  createdAt: z.string().min(1),
  relatedPhaseKey: z.string().optional(),
  tone: HybridControlHealthStatusSchema.default('stable'),
  decisions: z.array(z.string()).default([]),
  nextSteps: z.array(z.string()).default([]),
  blockers: z.array(z.string()).default([]),
  approvals: z.array(z.string()).default([]),
  appliedCheckpointId: z.string().optional(),
  appliedSprintId: z.string().optional(),
  appliedTaskIds: z.array(z.string()).default([]),
  appliedAt: z.string().optional(),
})

export const HybridControlSchema = z.object({
  manager: z.string().optional(),
  cadenceDays: z.number().min(1).max(90).default(7),
  nextReviewDate: z.string().optional(),
  lastSyncAt: z.string().optional(),
  phases: z.array(HybridControlPhaseSchema).default([]),
  sprints: z.array(HybridControlSprintSchema).default([]),
  checkpoints: z.array(HybridControlCheckpointSchema).default([]),
  managerAgents: z.array(HybridControlManagerAgentSchema).default([]),
  communicationPlaybook: z.array(HybridControlCommunicationRuleSchema).default([]),
  callInsights: z.array(HybridControlCallInsightSchema).default([]),
  blockers: z.array(z.string()).default([]),
})

export const ClientProfileSchema = z.object({
  // personal
  fio: z.string().optional(),
  birthday: z.string().optional(),
  age: z.string().optional(),
  familyStatus: z.string().optional(),
  children: z.string().optional(),
  pets: z.string().optional(),
  photo: z.string().optional(),
  // contacts
  phone: z.string().optional(),
  phoneExtra: z.string().optional(),
  email: z.string().optional(),
  messenger: z.string().optional(),
  messengerNick: z.string().optional(),
  preferredContact: z.string().optional(),
  address: z.string().optional(),
  // object
  objectAddress: z.string().optional(),
  objectType: z.string().optional(),
  objectTypeCode: z.string().optional(),
  objectCondition: z.string().optional(),
  objectArea: z.string().optional(),
  roomCount: z.string().optional(),
  floor: z.string().optional(),
  ceilingHeight: z.string().optional(),
  hasBalcony: z.string().optional(),
  parking: z.string().optional(),
  // project
  budget: z.string().optional(),
  budgetIncluded: z.string().optional(),
  deadline: z.string().optional(),
  paymentMethod: z.string().optional(),
  referralSource: z.string().optional(),
  previousExperience: z.string().optional(),
  // lifestyle
  lifestyle: z.string().optional(),
  hobbies: z.string().optional(),
  stylePreferences: z.string().optional(),
  colorPreferences: z.string().optional(),
  allergies: z.string().optional(),
  priorities: z.string().optional(),
  dislikes: z.string().optional(),
  notes: z.string().optional(),
  // catalog selects
  clientType: z.string().optional(),
  objectTypeCode2: z.string().optional(),
  projectPriority: z.string().optional(),
  paymentType: z.string().optional(),
  contractType: z.string().optional(),
  // chips (multi-select arrays)
  designerServiceTypes: z.array(z.string()).optional(),
  contractorWorkTypes: z.array(z.string()).optional(),
  // ── Phase 0: Smart Briefing ──────────────────────────────────
  brief_smart_home:     z.boolean().optional(),
  brief_kids_room:      z.boolean().optional(),
  brief_work_from_home: z.boolean().optional(),
  brief_soundproofing:  z.boolean().optional(),
  brief_pets:           z.boolean().optional(),
  brief_storage:        z.boolean().optional(),
  brief_home_gym:       z.boolean().optional(),
  brief_home_cinema:    z.boolean().optional(),
  brief_chef_kitchen:   z.boolean().optional(),
  brief_sauna:          z.boolean().optional(),
  brief_gallery:        z.boolean().optional(),
  brief_wine_cellar:    z.boolean().optional(),
  brief_adults_count:   z.string().optional(),
  brief_kids_ages:      z.string().optional(),
  brief_ergonomics:     z.string().optional(),
  brief_handed:         z.string().optional(),
  brief_pets_desc:      z.string().optional(),
  brief_pets_zone_detail: z.string().optional(),
  brief_remote_work:    z.string().optional(),
  brief_guests_freq:    z.string().optional(),
  brief_hobbies:        z.string().optional(),
  brief_morning_routine: z.string().optional(),
  brief_evening_routine: z.string().optional(),
  brief_cooking_role:   z.string().optional(),
  brief_bedroom_needs:  z.string().optional(),
  brief_acoustic_zones: z.string().optional(),
  brief_flex_zones:     z.string().optional(),
  brief_future_changes: z.string().optional(),
  brief_style_prefer:   z.string().optional(),
  brief_color_mood:     z.string().optional(),
  brief_color_palette:  z.string().optional(),
  brief_like_refs:      z.string().optional(),
  brief_dislike_refs:   z.string().optional(),
  brief_material_prefs: z.string().optional(),
  brief_textures:       z.string().optional(),
  brief_prints:         z.string().optional(),
  brief_art:            z.string().optional(),
  brief_home_mood:      z.string().optional(),
  brief_return_emotion: z.string().optional(),
  brief_space_image:    z.string().optional(),
  brief_kitchen_intensity: z.string().optional(),
  brief_kitchen_surfaces: z.string().optional(),
  brief_kitchen_cabinets: z.string().optional(),
  brief_kitchen_hardware: z.string().optional(),
  brief_kitchen_cooktop: z.string().optional(),
  brief_kitchen_oven:   z.string().optional(),
  brief_kitchen_appliances: z.string().optional(),
  brief_kitchen_sink:   z.string().optional(),
  brief_sport_zone:     z.string().optional(),
  brief_sport_storage:  z.string().optional(),
  brief_sport_tech:     z.string().optional(),
  brief_storage_volume: z.string().optional(),
  brief_storage_hidden: z.string().optional(),
  brief_utility_zone:   z.string().optional(),
  brief_light_modes:    z.string().optional(),
  brief_light_dimming:  z.string().optional(),
  brief_light_automation: z.string().optional(),
  brief_smart_control:  z.string().optional(),
  brief_acoustics_type: z.string().optional(),
  brief_tech_equipment: z.string().optional(),
  brief_allergies:      z.string().optional(),
  brief_deadlines_hard: z.string().optional(),
  brief_budget_limits:  z.string().optional(),
  brief_budget_priorities: z.string().optional(),
  brief_special_notes:  z.string().optional(),
  brief_completed:      z.boolean().optional(),
  // Бриф — корпоратив и концепция
  brief_project_idea:   z.string().optional(),
  brief_target_audience: z.string().optional(),
  brief_brand_values:   z.string().optional(),
  brief_competitors_refs: z.string().optional(),
  brief_unique_selling: z.string().optional(),
  // Бриф — рабочее пространство
  brief_ws_workstations: z.string().optional(),
  brief_ws_meeting_rooms: z.string().optional(),
  brief_ws_focus_zones: z.string().optional(),
  brief_ws_lounge:      z.string().optional(),
  brief_ws_reception:   z.string().optional(),
  brief_ws_brand:       z.string().optional(),
  // Бриф — профессиональная кухня
  brief_kp_concept:     z.string().optional(),
  brief_kp_capacity:    z.string().optional(),
  brief_kp_equipment:   z.string().optional(),
  brief_kp_workflow:    z.string().optional(),
  brief_kp_cold_storage: z.string().optional(),
  brief_kp_delivery:    z.string().optional(),
  // Бриф — зоны обслуживания
  brief_sz_guest_capacity: z.string().optional(),
  brief_sz_service_style: z.string().optional(),
  brief_sz_bar_zone:    z.string().optional(),
  brief_sz_outdoor:     z.string().optional(),
  brief_sz_private_rooms: z.string().optional(),
  brief_sz_staff_areas: z.string().optional(),
  // Бриф — номерной фонд
  brief_rc_room_count:  z.string().optional(),
  brief_rc_room_types:  z.string().optional(),
  brief_rc_amenities:   z.string().optional(),
  brief_rc_common_areas: z.string().optional(),
  brief_rc_spa_gym:     z.string().optional(),
  brief_rc_breakfast:   z.string().optional(),
  // Бриф — ритейл
  brief_rt_product_category: z.string().optional(),
  brief_rt_display_type: z.string().optional(),
  brief_rt_customer_flow: z.string().optional(),
  brief_rt_storage_back: z.string().optional(),
  brief_rt_fitting_rooms: z.string().optional(),
  brief_rt_checkout:    z.string().optional(),
  // Кастомизация структуры брифа (редактор)
  brief_config:         z.record(z.unknown()).optional(),
  // ── Phase 0: Site Survey ─────────────────────────────────────
  survey_status:        z.string().optional(),
  survey_date:          z.string().optional(),
  survey_engineer:      z.string().optional(),
  survey_address:       z.string().optional(),
  survey_area:          z.string().optional(),
  survey_ceiling:       z.string().optional(),
  survey_mep_notes:     z.string().optional(),
  survey_issues:        z.string().optional(),
  survey_recommendations: z.string().optional(),
  survey_notes:         z.string().optional(),
  survey_files:         z.array(z.any()).optional(),
  mep_ventilation:      z.boolean().optional(),
  mep_plumbing:         z.boolean().optional(),
  mep_electrical:       z.boolean().optional(),
  mep_heating:          z.boolean().optional(),
  mep_gas:              z.boolean().optional(),
  mep_smart:            z.boolean().optional(),
  mep_balcony:          z.boolean().optional(),
  mep_structural:       z.boolean().optional(),
  // ── Phase 0: ToR & Contract ──────────────────────────────────
  contract_number:      z.string().optional(),
  contract_date:        z.string().optional(),
  contract_status:      z.string().optional(),
  contract_parties:     z.string().optional(),
  contract_file:        z.string().optional(),
  contract_filename:    z.string().optional(),
  contract_notes:       z.string().optional(),
  invoice_amount:       z.string().optional(),
  invoice_advance_pct:  z.string().optional(),
  invoice_date:         z.string().optional(),
  payment_status:       z.string().optional(),
  invoice_file:         z.string().optional(),
  invoice_filename:     z.string().optional(),
  invoice_payment_details: z.string().optional(),
  tor_scope:            z.string().optional(),
  tor_exclusions:       z.string().optional(),
  tor_timeline:         z.string().optional(),
  tor_deliverables:     z.string().optional(),
  hybridControl:        HybridControlSchema.optional(),
}).passthrough()
export type ClientProfile = z.infer<typeof ClientProfileSchema>

export type HybridControlPhaseStatus = z.infer<typeof HybridControlPhaseStatusSchema>
export type HybridControlSprintStatus = z.infer<typeof HybridControlSprintStatusSchema>
export type HybridControlTaskStatus = z.infer<typeof HybridControlTaskStatusSchema>
export type HybridControlHealthStatus = z.infer<typeof HybridControlHealthStatusSchema>
export type HybridControlManagerAgentRole = z.infer<typeof HybridControlManagerAgentRoleSchema>
export type HybridControlStakeholderRole = z.infer<typeof HybridControlStakeholderRoleSchema>
export type HybridControlCommunicationChannel = z.infer<typeof HybridControlCommunicationChannelSchema>
export type HybridControlCallInsightSource = z.infer<typeof HybridControlCallInsightSourceSchema>
export type HybridControlGate = z.infer<typeof HybridControlGateSchema>
export type HybridControlPhase = z.infer<typeof HybridControlPhaseSchema>
export type HybridControlTask = z.infer<typeof HybridControlTaskSchema>
export type HybridControlSprint = z.infer<typeof HybridControlSprintSchema>
export type HybridControlCheckpoint = z.infer<typeof HybridControlCheckpointSchema>
export type HybridControlManagerAgent = z.infer<typeof HybridControlManagerAgentSchema>
export type HybridControlCommunicationRule = z.infer<typeof HybridControlCommunicationRuleSchema>
export type HybridControlCallInsight = z.infer<typeof HybridControlCallInsightSchema>
export type HybridControl = z.infer<typeof HybridControlSchema>

export const ProjectCallInsightIngestSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  summary: z.string().trim().min(1).max(8000),
  transcript: z.string().trim().max(32000).optional(),
  callId: z.string().trim().max(120).optional(),
  conversationId: z.string().trim().max(120).optional(),
  roomExternalRef: z.string().trim().max(255).optional(),
  relatedPhaseKey: z.string().trim().max(120).optional(),
  happenedAt: z.string().trim().max(64).optional(),
  actorRole: HybridControlStakeholderRoleSchema.optional(),
  actorName: z.string().trim().max(120).optional(),
  tone: HybridControlHealthStatusSchema.optional(),
  decisions: z.array(z.string().trim().min(1).max(240)).max(12).optional(),
  nextSteps: z.array(z.string().trim().min(1).max(240)).max(12).optional(),
  blockers: z.array(z.string().trim().min(1).max(240)).max(12).optional(),
  approvals: z.array(z.string().trim().min(1).max(240)).max(12).optional(),
})
export type ProjectCallInsightIngest = z.infer<typeof ProjectCallInsightIngestSchema>

export interface HybridControlCoordinationSummary {
  healthStatus: HybridControlHealthStatus
  healthLabel: string
  activePhaseTitle: string
  activeSprintTitle: string
  blockerCount: number
  overdueSprints: number
  nextReviewDate: string
}

export interface HybridControlCoordinationAgentState {
  id: string
  title: string
  role: HybridControlManagerAgentRole
  roleLabel: string
  enabled: boolean
  mission: string
  cadenceDays: number
  linkedChannel: HybridControlCommunicationChannel
  linkedChannelLabel: string
  targetRoles: HybridControlStakeholderRole[]
  targetRoleLabels: string[]
  recommendedActionCount: number
  notes: string
}

export interface HybridControlCoordinationRuleState {
  id: string
  title: string
  trigger: string
  linkedChannel: HybridControlCommunicationChannel
  linkedChannelLabel: string
  audience: HybridControlStakeholderRole[]
  audienceLabels: string[]
  ownerAgentId: string
  ownerAgentTitle: string
  cadenceDays: number | null
  template: string
}

export interface HybridControlCoordinationRecommendation {
  id: string
  title: string
  reason: string
  tone: HybridControlHealthStatus
  channel: HybridControlCommunicationChannel
  channelLabel: string
  audience: HybridControlStakeholderRole[]
  audienceLabels: string[]
  ownerAgentId: string
  ownerAgentTitle: string
  messengerExternalRef: string
  suggestedMessage: string
}

export interface HybridControlCoordinationBrief {
  summary: HybridControlCoordinationSummary
  agents: HybridControlCoordinationAgentState[]
  playbook: HybridControlCoordinationRuleState[]
  recommendations: HybridControlCoordinationRecommendation[]
}

export const ProjectSchema = z.object({
  id: z.number(),
  slug: z.string().min(1),
  title: z.string().min(1),
  projectType: z.string().optional(),
  pages: z.array(z.string()),
  profile: ClientProfileSchema,
})
export const CreateProjectSchema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9_-]+$/),
  title: z.string().min(1),
  projectType: z.string().optional(),
})
export const UpdateProjectSchema = CreateProjectSchema.partial().extend({
  status: z.string().optional(),
  projectType: z.string().optional(),
  pages: z.array(z.string()).optional(),
  profile: ClientProfileSchema.optional(),
})
export type Project = z.infer<typeof ProjectSchema>
export type CreateProject = z.infer<typeof CreateProjectSchema>
export type UpdateProject = z.infer<typeof UpdateProjectSchema>
