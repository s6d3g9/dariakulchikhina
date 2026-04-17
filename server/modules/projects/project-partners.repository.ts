import { and, eq } from 'drizzle-orm'

import { useDb } from '~/server/db/index'
import {
  contractors,
  designerProjects,
  designers,
  projectContractors,
  projects,
  sellerProjects,
  sellers,
} from '~/server/db/schema'

export async function findProjectIdBySlug(slug: string): Promise<number | null> {
  const db = useDb()
  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.slug, slug))
    .limit(1)
  return project?.id ?? null
}

export async function listProjectContractorRows(projectId: number) {
  const db = useDb()
  return db
    .select({
      contractor: {
        id: contractors.id,
        slug: contractors.slug,
        name: contractors.name,
        companyName: contractors.companyName,
        contactPerson: contractors.contactPerson,
        phone: contractors.phone,
        email: contractors.email,
        inn: contractors.inn,
        kpp: contractors.kpp,
        ogrn: contractors.ogrn,
        bankName: contractors.bankName,
        bik: contractors.bik,
        settlementAccount: contractors.settlementAccount,
        correspondentAccount: contractors.correspondentAccount,
        legalAddress: contractors.legalAddress,
        factAddress: contractors.factAddress,
        workTypes: contractors.workTypes,
        roleTypes: contractors.roleTypes,
        contractorType: contractors.contractorType,
        parentId: contractors.parentId,
        notes: contractors.notes,
        messenger: contractors.messenger,
        messengerNick: contractors.messengerNick,
        website: contractors.website,
        passportSeries: contractors.passportSeries,
        passportNumber: contractors.passportNumber,
        passportIssuedBy: contractors.passportIssuedBy,
        passportIssueDate: contractors.passportIssueDate,
        passportDepartmentCode: contractors.passportDepartmentCode,
        birthDate: contractors.birthDate,
        birthPlace: contractors.birthPlace,
        registrationAddress: contractors.registrationAddress,
        snils: contractors.snils,
        telegram: contractors.telegram,
        whatsapp: contractors.whatsapp,
        city: contractors.city,
        workRadius: contractors.workRadius,
        taxSystem: contractors.taxSystem,
        paymentMethods: contractors.paymentMethods,
        hourlyRate: contractors.hourlyRate,
        hasInsurance: contractors.hasInsurance,
        insuranceDetails: contractors.insuranceDetails,
        education: contractors.education,
        certifications: contractors.certifications,
        experienceYears: contractors.experienceYears,
      },
    })
    .from(projectContractors)
    .innerJoin(contractors, eq(projectContractors.contractorId, contractors.id))
    .where(eq(projectContractors.projectId, projectId))
    .orderBy(contractors.name)
}

export async function insertProjectContractor(projectId: number, contractorId: number) {
  const db = useDb()
  await db
    .insert(projectContractors)
    .values({ projectId, contractorId })
    .onConflictDoNothing()
}

export async function deleteProjectContractor(projectId: number, contractorId: number) {
  const db = useDb()
  await db
    .delete(projectContractors)
    .where(and(eq(projectContractors.projectId, projectId), eq(projectContractors.contractorId, contractorId)))
}

export async function listProjectDesignerRows(projectId: number) {
  const db = useDb()
  return db
    .select({ designer: designers })
    .from(designerProjects)
    .innerJoin(designers, eq(designerProjects.designerId, designers.id))
    .where(eq(designerProjects.projectId, projectId))
    .orderBy(designers.name)
}

export async function insertProjectDesigner(projectId: number, designerId: number) {
  const db = useDb()
  await db
    .insert(designerProjects)
    .values({ projectId, designerId })
    .onConflictDoNothing()
}

export async function deleteProjectDesigner(projectId: number, designerId: number) {
  const db = useDb()
  await db
    .delete(designerProjects)
    .where(and(eq(designerProjects.projectId, projectId), eq(designerProjects.designerId, designerId)))
}

export async function listProjectSellerRows(projectId: number) {
  const db = useDb()
  return db
    .select({ seller: sellers })
    .from(sellerProjects)
    .innerJoin(sellers, eq(sellerProjects.sellerId, sellers.id))
    .where(eq(sellerProjects.projectId, projectId))
    .orderBy(sellers.name)
}

export async function insertProjectSeller(projectId: number, sellerId: number) {
  const db = useDb()
  await db
    .insert(sellerProjects)
    .values({ projectId, sellerId })
    .onConflictDoNothing()
}

export async function deleteProjectSeller(projectId: number, sellerId: number) {
  const db = useDb()
  await db
    .delete(sellerProjects)
    .where(and(eq(sellerProjects.projectId, projectId), eq(sellerProjects.sellerId, sellerId)))
}
