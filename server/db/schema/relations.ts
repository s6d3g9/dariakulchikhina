// Cross-domain relations, isolated from table declarations to avoid
// cyclic imports between per-domain schema files. Tables that reference
// many other domains (e.g. projects, designers) keep their relations
// here so the table files stay cycle-free.

import { relations } from 'drizzle-orm'
import { users } from './users.ts'
import { projects, pageContent } from './projects.ts'
import { clients } from './clients.ts'
import {
  contractors,
  projectContractors,
} from './contractors.ts'
import {
  workStatusItems,
} from './work-status.ts'
import { uploads } from './uploads.ts'
import {
  documents,
  projectExtraServices,
} from './documents.ts'
import {
  designers,
  designerProjects,
  designerProjectClients,
  designerProjectContractors,
} from './designers.ts'
import { sellers, sellerProjects } from './sellers.ts'
import { managers, managerProjects } from './managers.ts'
import {
  projectParticipants,
  projectScopeAssignments,
  projectScopeSettings,
} from './project-governance.ts'

export const projectsRelations = relations(projects, ({ many, one }) => ({
  user: one(users, { fields: [projects.userId], references: [users.id] }),
  pageContents: many(pageContent),
  projectContractors: many(projectContractors),
  workStatusItems: many(workStatusItems),
  uploads: many(uploads),
  projectParticipants: many(projectParticipants),
  projectScopeAssignments: many(projectScopeAssignments),
  projectScopeSettings: many(projectScopeSettings),
}))

export const contractorsRelations = relations(contractors, ({ many }) => ({
  projectContractors: many(projectContractors),
  workStatusItems: many(workStatusItems),
}))

export const projectContractorsRelations = relations(projectContractors, ({ one }) => ({
  project: one(projects, { fields: [projectContractors.projectId], references: [projects.id] }),
  contractor: one(contractors, {
    fields: [projectContractors.contractorId],
    references: [contractors.id],
  }),
}))

export const workStatusItemsRelations = relations(workStatusItems, ({ one }) => ({
  project: one(projects, { fields: [workStatusItems.projectId], references: [projects.id] }),
  contractor: one(contractors, {
    fields: [workStatusItems.contractorId],
    references: [contractors.id],
  }),
}))

export const designersRelations = relations(designers, ({ one, many }) => ({
  user: one(users, { fields: [designers.userId], references: [users.id] }),
  designerProjects: many(designerProjects),
}))

export const designerProjectsRelations = relations(designerProjects, ({ one, many }) => ({
  designer: one(designers, {
    fields: [designerProjects.designerId],
    references: [designers.id],
  }),
  project: one(projects, {
    fields: [designerProjects.projectId],
    references: [projects.id],
  }),
  clients: many(designerProjectClients),
  contractors: many(designerProjectContractors),
}))

export const designerProjectClientsRelations = relations(designerProjectClients, ({ one }) => ({
  designerProject: one(designerProjects, {
    fields: [designerProjectClients.designerProjectId],
    references: [designerProjects.id],
  }),
  client: one(clients, {
    fields: [designerProjectClients.clientId],
    references: [clients.id],
  }),
}))

export const designerProjectContractorsRelations = relations(
  designerProjectContractors,
  ({ one }) => ({
    designerProject: one(designerProjects, {
      fields: [designerProjectContractors.designerProjectId],
      references: [designerProjects.id],
    }),
    contractor: one(contractors, {
      fields: [designerProjectContractors.contractorId],
      references: [contractors.id],
    }),
  }),
)

export const sellersRelations = relations(sellers, ({ many }) => ({
  sellerProjects: many(sellerProjects),
}))

export const sellerProjectsRelations = relations(sellerProjects, ({ one }) => ({
  seller: one(sellers, { fields: [sellerProjects.sellerId], references: [sellers.id] }),
  project: one(projects, { fields: [sellerProjects.projectId], references: [projects.id] }),
}))

export const managersRelations = relations(managers, ({ many }) => ({
  managerProjects: many(managerProjects),
}))

export const managerProjectsRelations = relations(managerProjects, ({ one }) => ({
  manager: one(managers, { fields: [managerProjects.managerId], references: [managers.id] }),
  project: one(projects, { fields: [managerProjects.projectId], references: [projects.id] }),
}))

export const projectParticipantsRelations = relations(projectParticipants, ({ one, many }) => ({
  project: one(projects, { fields: [projectParticipants.projectId], references: [projects.id] }),
  assignments: many(projectScopeAssignments),
}))

export const projectScopeAssignmentsRelations = relations(projectScopeAssignments, ({ one }) => ({
  project: one(projects, {
    fields: [projectScopeAssignments.projectId],
    references: [projects.id],
  }),
  participant: one(projectParticipants, {
    fields: [projectScopeAssignments.participantId],
    references: [projectParticipants.id],
  }),
}))

export const projectScopeSettingsRelations = relations(projectScopeSettings, ({ one }) => ({
  project: one(projects, {
    fields: [projectScopeSettings.projectId],
    references: [projects.id],
  }),
}))

export const projectExtraServicesRelations = relations(projectExtraServices, ({ one }) => ({
  project: one(projects, {
    fields: [projectExtraServices.projectId],
    references: [projects.id],
  }),
  contractDoc: one(documents, {
    fields: [projectExtraServices.contractDocId],
    references: [documents.id],
  }),
  invoiceDoc: one(documents, {
    fields: [projectExtraServices.invoiceDocId],
    references: [documents.id],
  }),
}))
