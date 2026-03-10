import { useDb } from '~/server/db/index'
import { designerProjects, projects } from '~/server/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { CORE_PAGES } from '~/shared/constants/pages'

const Schema = z.object({
  title: z.string().min(1),
  packageKey: z.string().optional().nullable(),
  pricePerSqm: z.number().optional().nullable(),
  area: z.number().optional().nullable(),
  totalPrice: z.number().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export default defineEventHandler(async (event) => {
  const designerId = requireDesigner(event)
  const body = await readValidatedNodeBody(event, Schema)
  const db = useDb()

  const slug = body.title.toLowerCase()
    .replace(/[а-яё]/gi, (c: string) => {
      const m: Record<string,string>={а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'yo',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'ts',ч:'ch',ш:'sh',щ:'sch',ы:'y',э:'e',ю:'yu',я:'ya'}
      return m[c.toLowerCase()] ?? ''
    })
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 36)
    + '-' + Math.random().toString(36).slice(2, 7)

  const [project] = await db.insert(projects).values({
    slug,
    title: body.title,
    pages: [...CORE_PAGES],
    profile: {},
  }).returning()

  const totalPrice = body.totalPrice || ((body.pricePerSqm || 0) * (body.area || 0)) || null

  const [dp] = await db.insert(designerProjects).values({
    designerId,
    projectId: project.id,
    packageKey: body.packageKey || null,
    pricePerSqm: body.pricePerSqm || null,
    area: body.area || null,
    totalPrice: totalPrice ? Number(totalPrice) : null,
    status: 'draft',
    notes: body.notes || null,
  }).returning()

  return { id: dp.id, projectId: project.id, projectTitle: project.title, projectSlug: project.slug }
})
