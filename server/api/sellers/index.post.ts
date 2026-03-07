import { useDb } from '~/server/db/index'
import { sellers } from '~/server/db/schema'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const body = await readBody(event)
  const db = useDb()

  const [created] = await db.insert(sellers).values({
    name:          body.name?.trim() || 'Новый поставщик',
    companyName:   body.companyName   || null,
    contactPerson: body.contactPerson || null,
    phone:         body.phone         || null,
    email:         body.email         || null,
    telegram:      body.telegram      || null,
    whatsapp:      body.whatsapp      || null,
    website:       body.website       || null,
    city:          body.city          || null,
    messenger:     body.messenger     || null,
    messengerNick: body.messengerNick || null,
    categories:    Array.isArray(body.categories) ? body.categories : [],
    requisites:    body.requisites    || {},
    conditions:    body.conditions    || null,
    notes:         body.notes         || null,
    status:        body.status        || 'active',
    type:          body.type          || 'link',
  }).returning()

  return created
})
