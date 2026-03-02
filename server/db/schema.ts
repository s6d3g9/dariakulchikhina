import {
  pgTable,
  serial,
  text,
  varchar,
  integer,
  timestamp,
  jsonb,
  unique,
  boolean,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  login: varchar('login', { length: 100 }).unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const projects = pgTable('projects', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  status: text('status').default('lead').notNull(),
  userId: integer('user_id').references(() => users.id),
  pages: text('pages').array().default([]).notNull(),
  profile: jsonb('profile').$type<Record<string, string>>().default({}).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const pageConfigs = pgTable('page_configs', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  pageTitle: text('page_title'),
  fontSize: integer('font_size').default(16).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
})

export const pageContent = pgTable('page_content', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  pageSlug: text('page_slug').notNull(),
  content: jsonb('content').$type<Record<string, unknown>>().default({}).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [unique('page_content_project_page').on(t.projectId, t.pageSlug)])

export const contractors = pgTable('contractors', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  companyName: text('company_name'),
  contactPerson: text('contact_person'),
  phone: text('phone'),
  email: text('email'),
  inn: text('inn'),
  kpp: text('kpp'),
  ogrn: text('ogrn'),
  bankName: text('bank_name'),
  bik: text('bik'),
  settlementAccount: text('settlement_account'),
  correspondentAccount: text('correspondent_account'),
  legalAddress: text('legal_address'),
  factAddress: text('fact_address'),
  workTypes: text('work_types').array().default([]).notNull(),
  roleTypes: text('role_types').array().default([]).notNull(),
  contractorType: text('contractor_type').default('master').notNull(),
  parentId: integer('parent_id'),
  notes: text('notes'),
  messenger: text('messenger'),
  messengerNick: text('messenger_nick'),
  website: text('website'),
  // Паспортные данные
  passportSeries: text('passport_series'),
  passportNumber: text('passport_number'),
  passportIssuedBy: text('passport_issued_by'),
  passportIssueDate: text('passport_issue_date'),
  passportDepartmentCode: text('passport_department_code'),
  birthDate: text('birth_date'),
  birthPlace: text('birth_place'),
  registrationAddress: text('registration_address'),
  snils: text('snils'),
  // Доп. контакты
  telegram: text('telegram'),
  whatsapp: text('whatsapp'),
  city: text('city'),
  workRadius: text('work_radius'),
  // Финансовые / организационные
  taxSystem: text('tax_system'),
  paymentMethods: text('payment_methods').array().default([]),
  hourlyRate: text('hourly_rate'),
  hasInsurance: boolean('has_insurance').default(false),
  insuranceDetails: text('insurance_details'),
  education: text('education'),
  certifications: text('certifications').array().default([]),
  experienceYears: integer('experience_years'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const projectContractors = pgTable('project_contractors', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  contractorId: integer('contractor_id').notNull().references(() => contractors.id, { onDelete: 'cascade' }),
}, (t) => [unique('project_contractor_uniq').on(t.projectId, t.contractorId)])

export const workStatusItems = pgTable('work_status_items', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  contractorId: integer('contractor_id').references(() => contractors.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  workType: text('work_type'),
  roadmapStageId: integer('roadmap_stage_id'),
  status: text('status').default('pending').notNull(),
  dateStart: text('date_start'),
  dateEnd: text('date_end'),
  budget: text('budget'),
  notes: text('notes'),
  messenger: text('messenger'),
  messengerNick: text('messenger_nick'),
  website: text('website'),
  sortOrder: integer('sort_order').default(0).notNull(),
})

export const workStatusItemPhotos = pgTable('work_status_item_photos', {
  id: serial('id').primaryKey(),
  itemId: integer('item_id').notNull().references(() => workStatusItems.id, { onDelete: 'cascade' }),
  contractorId: integer('contractor_id'),
  url: text('url').notNull(),
  caption: text('caption'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const workStatusItemComments = pgTable('work_status_item_comments', {
  id: serial('id').primaryKey(),
  itemId: integer('item_id').notNull().references(() => workStatusItems.id, { onDelete: 'cascade' }),
  authorType: text('author_type').notNull(), // 'contractor' | 'admin'
  authorName: text('author_name').notNull(),
  text: text('text').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const roadmapStages = pgTable('roadmap_stages', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  stageKey: text('stage_key'),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status').default('pending').notNull(),
  dateStart: text('date_start'),
  dateEnd: text('date_end'),
  notes: text('notes'),
  messenger: text('messenger'),
  messengerNick: text('messenger_nick'),
  website: text('website'),
  sortOrder: integer('sort_order').default(0).notNull(),
})

export const uploads = pgTable('uploads', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').references(() => projects.id, { onDelete: 'cascade' }),
  filename: text('filename').notNull(),
  originalName: text('original_name').notNull(),
  mimeType: text('mime_type'),
  sizeBytes: integer('size_bytes'),
  uploadedAt: timestamp('uploaded_at').defaultNow().notNull(),
})

export const galleryItems = pgTable('gallery_items', {
  id: serial('id').primaryKey(),
  category: text('category').notNull(),
  title: text('title').notNull(),
  image: text('image'),
  /** Дополнительные изображения (JSON-массив filename) */
  images: jsonb('images').$type<string[]>().default([]).notNull(),
  tags: text('tags').array().default([]).notNull(),
  description: text('description'),
  /** Избранный / Featured */
  featured: boolean('featured').default(false).notNull(),
  /** Ширина основного изображения (px) */
  width: integer('width'),
  /** Высота основного изображения (px) */
  height: integer('height'),
  /** Структурированные свойства материала (физ., хим., тактильные и т.д.) */
  properties: jsonb('properties').$type<Record<string, unknown>>().default({}).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const clients = pgTable('clients', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  phone: text('phone'),
  email: text('email'),
  messenger: text('messenger'),
  messengerNick: text('messenger_nick'),
  address: text('address'),
  notes: text('notes'),
  brief: jsonb('brief'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const documents = pgTable('documents', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').references(() => projects.id, { onDelete: 'set null' }),
  category: text('category').notNull().default('other'), // contract | act | invoice | template | other
  title: text('title').notNull(),
  filename: text('filename'),           // физическое имя файла в uploads/
  url: text('url'),                     // публичный URL (если есть)
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const contractorDocuments = pgTable('contractor_documents', {
  id: serial('id').primaryKey(),
  contractorId: integer('contractor_id').notNull().references(() => contractors.id, { onDelete: 'cascade' }),
  category: text('category').notNull().default('other'), // passport | license | certificate | contract | insurance | snils | inn_doc | other
  title: text('title').notNull(),
  filename: text('filename'),
  url: text('url'),
  notes: text('notes'),
  expiresAt: text('expires_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ── Дизайнер ────────────────────────────────────────────────────
export const designers = pgTable('designers', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  name: text('name').notNull(),
  companyName: text('company_name'),
  phone: text('phone'),
  email: text('email'),
  telegram: text('telegram'),
  website: text('website'),
  city: text('city'),
  experience: text('experience'),
  about: text('about'),
  specializations: text('specializations').array().default([]).notNull(),
  /** Настроенные услуги и цены (JSON: DesignerServicePrice[]) */
  services: jsonb('services').$type<Record<string, unknown>[]>().default([]).notNull(),
  /** Пакеты услуг (JSON: DesignerPackage[]) */
  packages: jsonb('packages').$type<Record<string, unknown>[]>().default([]).notNull(),
  /** Подписки / абонементы (JSON: DesignerSubscription[]) */
  subscriptions: jsonb('subscriptions').$type<Record<string, unknown>[]>().default([]).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const designerProjects = pgTable('designer_projects', {
  id: serial('id').primaryKey(),
  designerId: integer('designer_id').notNull().references(() => designers.id, { onDelete: 'cascade' }),
  projectId: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  /** Ключ выбранного пакета */
  packageKey: text('package_key'),
  /** Стоимость за м² (фиксация на момент создания) */
  pricePerSqm: integer('price_per_sqm'),
  /** Площадь объекта в м² */
  area: integer('area'),
  /** Итого стоимость */
  totalPrice: integer('total_price'),
  status: text('status').default('draft').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [unique('designer_project_uniq').on(t.designerId, t.projectId)])

export const designerProjectClients = pgTable('designer_project_clients', {
  id: serial('id').primaryKey(),
  designerProjectId: integer('designer_project_id').notNull().references(() => designerProjects.id, { onDelete: 'cascade' }),
  clientId: integer('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
}, (t) => [unique('designer_project_client_uniq').on(t.designerProjectId, t.clientId)])

export const designerProjectContractors = pgTable('designer_project_contractors', {
  id: serial('id').primaryKey(),
  designerProjectId: integer('designer_project_id').notNull().references(() => designerProjects.id, { onDelete: 'cascade' }),
  contractorId: integer('contractor_id').notNull().references(() => contractors.id, { onDelete: 'cascade' }),
  role: text('role'),
}, (t) => [unique('designer_project_contractor_uniq').on(t.designerProjectId, t.contractorId)])

// ── Relations ──

export const designersRelations = relations(designers, ({ one, many }) => ({
  user: one(users, { fields: [designers.userId], references: [users.id] }),
  designerProjects: many(designerProjects),
}))

export const designerProjectsRelations = relations(designerProjects, ({ one, many }) => ({
  designer: one(designers, { fields: [designerProjects.designerId], references: [designers.id] }),
  project: one(projects, { fields: [designerProjects.projectId], references: [projects.id] }),
  clients: many(designerProjectClients),
  contractors: many(designerProjectContractors),
}))

export const designerProjectClientsRelations = relations(designerProjectClients, ({ one }) => ({
  designerProject: one(designerProjects, { fields: [designerProjectClients.designerProjectId], references: [designerProjects.id] }),
  client: one(clients, { fields: [designerProjectClients.clientId], references: [clients.id] }),
}))

export const designerProjectContractorsRelations = relations(designerProjectContractors, ({ one }) => ({
  designerProject: one(designerProjects, { fields: [designerProjectContractors.designerProjectId], references: [designerProjects.id] }),
  contractor: one(contractors, { fields: [designerProjectContractors.contractorId], references: [contractors.id] }),
}))

export const projectsRelations = relations(projects, ({ many, one }) => ({
  user: one(users, { fields: [projects.userId], references: [users.id] }),
  pageContents: many(pageContent),
  projectContractors: many(projectContractors),
  workStatusItems: many(workStatusItems),
  roadmapStages: many(roadmapStages),
  uploads: many(uploads),
}))

export const contractorsRelations = relations(contractors, ({ many }) => ({
  projectContractors: many(projectContractors),
  workStatusItems: many(workStatusItems),
}))

export const projectContractorsRelations = relations(projectContractors, ({ one }) => ({
  project: one(projects, { fields: [projectContractors.projectId], references: [projects.id] }),
  contractor: one(contractors, { fields: [projectContractors.contractorId], references: [contractors.id] }),
}))

export const workStatusItemsRelations = relations(workStatusItems, ({ one }) => ({
  project: one(projects, { fields: [workStatusItems.projectId], references: [projects.id] }),
  contractor: one(contractors, { fields: [workStatusItems.contractorId], references: [contractors.id] }),
}))

export const roadmapStagesRelations = relations(roadmapStages, ({ one }) => ({
  project: one(projects, { fields: [roadmapStages.projectId], references: [projects.id] }),
}))
