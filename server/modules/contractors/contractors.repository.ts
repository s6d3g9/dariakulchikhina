import { eq, sql } from 'drizzle-orm'
import { useDb } from '~/server/db/index'
import { contractors, projects, projectContractors } from '~/server/db/schema'

export async function findContractorById(id: number) {
  const db = useDb()
  const [contractor] = await db
    .select()
    .from(contractors)
    .where(eq(contractors.id, id))
    .limit(1)
  return contractor ?? null
}

export async function listContractorsWithProjects() {
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
      projectIds: sql<number[]>`array_remove(array_agg(${projectContractors.projectId}), null)`,
      projectTitles: sql<string[]>`array_remove(array_agg(${projects.title}), null)`,
      projectSlugs: sql<string[]>`array_remove(array_agg(${projects.slug}), null)`,
    })
    .from(contractors)
    .leftJoin(projectContractors, eq(projectContractors.contractorId, contractors.id))
    .leftJoin(projects, eq(projects.id, projectContractors.projectId))
    .groupBy(contractors.id)
    .orderBy(contractors.name)
}

export async function insertContractor(values: {
  slug: string
  name: string
  contractorType: string
  parentId: number | null
  workTypes: string[]
}) {
  const db = useDb()
  const [contractor] = await db.insert(contractors).values(values).returning()
  return contractor
}

export async function updateContractorRow(id: number, updates: Record<string, unknown>) {
  const db = useDb()
  const [updated] = await db
    .update(contractors)
    .set(updates)
    .where(eq(contractors.id, id))
    .returning()
  return updated ?? null
}

export async function deleteContractorChildren(parentId: number) {
  const db = useDb()
  await db.delete(contractors).where(eq(contractors.parentId, parentId))
}

export async function deleteContractorRow(id: number) {
  const db = useDb()
  await db.delete(contractors).where(eq(contractors.id, id))
}

export async function listContractorStaff(parentId: number) {
  const db = useDb()
  return db
    .select({
      id: contractors.id,
      name: contractors.name,
      phone: contractors.phone,
      email: contractors.email,
      messenger: contractors.messenger,
      messengerNick: contractors.messengerNick,
      workTypes: contractors.workTypes,
      roleTypes: contractors.roleTypes,
      notes: contractors.notes,
    })
    .from(contractors)
    .where(eq(contractors.parentId, parentId))
    .orderBy(contractors.name)
}

export async function listContractorProjects(contractorId: number) {
  const db = useDb()
  return db
    .select({
      id: projects.id,
      slug: projects.slug,
      title: projects.title,
      status: projects.status,
    })
    .from(projectContractors)
    .innerJoin(projects, eq(projectContractors.projectId, projects.id))
    .where(eq(projectContractors.contractorId, contractorId))
    .orderBy(projects.title)
}

/**
 * Returns the contractor id plus all staff member ids (rows where
 * `parent_id` equals the given id). Used to scope work-item queries
 * to the full company hierarchy.
 */
export async function resolveContractorAndStaffIds(contractorId: number) {
  const db = useDb()
  const staff = await db
    .select({ id: contractors.id })
    .from(contractors)
    .where(eq(contractors.parentId, contractorId))
  return [contractorId, ...staff.map((s) => s.id)]
}

export async function findContractorStaffMember(
  targetId: number,
  companyId: number,
) {
  const db = useDb()
  const [master] = await db
    .select({ id: contractors.id })
    .from(contractors)
    .where(
      sql`${contractors.id} = ${targetId} AND ${contractors.parentId} = ${companyId}`,
    )
    .limit(1)
  return master ?? null
}
