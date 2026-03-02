import { useDb } from '~/server/db/index'
import { designerProjects, projects, roadmapStages } from '~/server/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { DESIGNER_SERVICE_TEMPLATES, DESIGNER_PACKAGE_TEMPLATES } from '~~/shared/types/designer'

const CreateDesignerProjectSchema = z.object({
  designerId: z.number(),
  title: z.string().min(1),
  slug: z.string().min(1),
  packageKey: z.string().optional(),
  pricePerSqm: z.number().optional(),
  area: z.number().optional(),
  totalPrice: z.number().optional(),
  notes: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const body = await readValidatedNodeBody(event, CreateDesignerProjectSchema)
  const db = useDb()

  // 1. Create the project in projects table
  let project: any
  try {
    ;[project] = await db.insert(projects).values({
      slug: body.slug,
      title: body.title,
      pages: [],
      profile: {},
    }).returning()
  } catch (e: any) {
    const code = e?.cause?.code ?? e?.code
    if (code === '23505') {
      // Project slug already exists — find it
      const [existing] = await db.select().from(projects).where(eq(projects.slug, body.slug)).limit(1)
      if (existing) {
        project = existing
      } else {
        throw createError({ statusCode: 400, statusMessage: `Slug «${body.slug}» уже занят` })
      }
    } else throw e
  }

  // 2. Create designer ↔ project link
  const totalPrice = body.totalPrice || ((body.pricePerSqm || 0) * (body.area || 0)) || null
  let dp: any
  try {
    ;[dp] = await db.insert(designerProjects).values({
      designerId: body.designerId,
      projectId: project.id,
      packageKey: body.packageKey || null,
      pricePerSqm: body.pricePerSqm || null,
      area: body.area || null,
      totalPrice: totalPrice,
      status: 'draft',
      notes: body.notes || null,
    }).returning()
  } catch (e: any) {
    const code = e?.cause?.code ?? e?.code
    if (code === '23505') {
      throw createError({ statusCode: 400, statusMessage: 'Этот проект уже привязан к дизайнеру' })
    }
    throw e
  }

  // 3. Auto-generate roadmap stages based on selected package
  if (body.packageKey) {
    const pkg = DESIGNER_PACKAGE_TEMPLATES.find(p => p.key === body.packageKey)
    if (pkg) {
      // Collect unique roadmap stage keys from services in this package
      const stageKeys = new Set<string>()
      for (const sk of pkg.serviceKeys) {
        const svc = DESIGNER_SERVICE_TEMPLATES.find(s => s.key === sk)
        if (svc) svc.roadmapStages.forEach(rs => stageKeys.add(rs))
      }

      // Create roadmap stages
      const stageOrder = ['brief', 'concept', 'planning', 'engineering', 'procurement', 'implementation', 'supervision', 'handover']
      const stageLabels: Record<string, string> = {
        brief: 'Бриф и обмер',
        concept: 'Концепция и стиль',
        planning: 'Планировочное решение',
        engineering: 'Рабочая документация',
        procurement: 'Подбор и комплектация',
        implementation: 'Реализация',
        supervision: 'Авторский надзор',
        handover: 'Сдача',
      }
      const stageDescriptions: Record<string, string> = {
        brief: 'Обмер, фотофиксация, заполнение брифа',
        concept: 'Мудборд, коллажи, 3D-визуализация, цветовые решения',
        planning: 'Варианты планировки, расстановка мебели, зонирование',
        engineering: 'Рабочие чертежи, электрика, сантехника, потолки, полы',
        procurement: 'Ведомости материалов, подбор мебели, смета',
        implementation: 'Строительно-монтажные работы',
        supervision: 'Выезды на объект, контроль качества, согласования',
        handover: 'Приёмка работ, дефектовка, финальное оформление',
      }

      const orderedStages = stageOrder.filter(s => stageKeys.has(s))
      if (orderedStages.length > 0) {
        await db.insert(roadmapStages).values(
          orderedStages.map((key, idx) => ({
            projectId: project.id,
            stageKey: key,
            title: stageLabels[key] || key,
            description: stageDescriptions[key] || null,
            status: 'pending',
            sortOrder: idx,
          }))
        )
      }
    }
  }

  return {
    designerProject: dp,
    project,
  }
})
