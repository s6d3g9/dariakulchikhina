import { useDb } from '~/server/db/index'
import { projects, projectContractors, contractors } from '~/server/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')!
  // Auth: admin or client for this project
  requireAdminOrClient(event, slug)
  const db = useDb()
  const [project] = await db.select({ id: projects.id }).from(projects).where(eq(projects.slug, slug)).limit(1)
  if (!project) throw createError({ statusCode: 404, message: 'Проект не найден' })

  const rows = await db
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
    .where(eq(projectContractors.projectId, project.id))
    .orderBy(contractors.name)

  // Strip sensitive fields: slug (auth secret), passport/financial PII
  return rows.map(r => {
    const {
      slug: _slug,
      passportSeries, passportNumber, passportIssuedBy, passportIssueDate,
      snils, inn,
      bankName, bik, settlementAccount, correspondentAccount,
      ...safe
    } = r.contractor as Record<string, any>
    return safe
  })
})
