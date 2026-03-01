import { useDb } from '~/server/db/index'
import { contractors } from '~/server/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  // Auth: admin or the contractor themselves
  requireAdminOrContractor(event, id)
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
    .where(eq(contractors.parentId, id))
    .orderBy(contractors.name)
})
