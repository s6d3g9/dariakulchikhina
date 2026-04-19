import {
  pgTable,
  serial,
  text,
  varchar,
  integer,
  timestamp,
  boolean,
  unique,
} from 'drizzle-orm/pg-core'
import { projects } from './projects.ts'

export const contractors = pgTable('contractors', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  login: varchar('login', { length: 100 }).unique(),
  passwordHash: text('password_hash'),
  recoveryPhraseHash: text('recovery_phrase_hash'),
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

export const projectContractors = pgTable(
  'project_contractors',
  {
    id: serial('id').primaryKey(),
    projectId: integer('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    contractorId: integer('contractor_id')
      .notNull()
      .references(() => contractors.id, { onDelete: 'cascade' }),
  },
  (t) => [unique('project_contractor_uniq').on(t.projectId, t.contractorId)],
)

export const contractorDocuments = pgTable('contractor_documents', {
  id: serial('id').primaryKey(),
  contractorId: integer('contractor_id')
    .notNull()
    .references(() => contractors.id, { onDelete: 'cascade' }),
  category: text('category').notNull().default('other'),
  title: text('title').notNull(),
  filename: text('filename'),
  url: text('url'),
  notes: text('notes'),
  expiresAt: text('expires_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
