import { useDb } from '~/server/db/index'
import { contractors, projectContractors, projects } from '~/server/db/schema'
import { eq, sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const db = useDb()
  const q = safeGetQuery(event)
  const projectSlugFilter = (q.projectSlug as string) || ''

  // Always show ALL contractors (with their linked projects info)
  const rowsRaw = await db
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

  const rows = Array.isArray(rowsRaw)
    ? rowsRaw
    : (rowsRaw ? Array.from(rowsRaw as any) : [])

  return rows.map((r: any) => {
    // Strip sensitive fields — slug used for contractor auth
    const { slug: _slug, ...safeContractor } = r.contractor || {}
    return {
      ...safeContractor,
      linkedProjectIds: Array.isArray(r.projectIds) ? r.projectIds : [],
      linkedProjectTitles: Array.isArray(r.projectTitles) ? r.projectTitles : [],
      linkedProjectSlugs: Array.isArray(r.projectSlugs) ? r.projectSlugs : [],
    }
  })
})
