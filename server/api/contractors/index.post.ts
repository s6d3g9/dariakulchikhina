import { useDb } from '~/server/db/index'
import { contractors } from '~/server/db/schema'
import { CreateContractorSchema } from '~/shared/types/contractor'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const body = await readValidatedNodeBody(event, CreateContractorSchema)
  const db = useDb()
  const [contractor] = await db.insert(contractors).values({
    slug: body.slug,
    name: body.name,
    pin: body.pin,
    workTypes: [],
  }).returning()
  return contractor
})
