import { useDb } from '~/server/db/index'
import { contractors } from '~/server/db/schema'
import { readNodeBody } from '~/server/utils/body'

export default defineEventHandler(async (event) => {
  requireDesigner(event)
  const body = await readNodeBody(event) as Record<string, any>

  if (!body.name?.trim()) throw createError({ statusCode: 400, statusMessage: 'Имя обязательно' })

  const slug = `contractor-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const db = useDb()

  const [row] = await db.insert(contractors).values({
    slug,
    name: body.name.trim(),
    companyName: body.companyName?.trim() || null,
    phone: body.phone?.trim() || null,
    email: body.email?.trim() || null,
    telegram: body.telegram?.trim() || null,
    website: body.website?.trim() || null,
    messenger: body.messenger?.trim() || null,
    messengerNick: body.messengerNick?.trim() || null,
    notes: body.notes?.trim() || null,
    contractorType: body.contractorType || 'master',
    workTypes: Array.isArray(body.workTypes) ? body.workTypes : (body.workTypes ? [body.workTypes] : []),
  }).returning()

  return row
})
