import { useDb } from '~/server/db/index'
import { contractors } from '~/server/db/schema'
import { ilike, or, eq, sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  requireDesigner(event)
  const q = (getQuery(event).q as string || '').trim()
  const db = useDb()

  if (!q || q.length < 1) return []

  const pattern = `%${q}%`

  // If query looks like a number, also search by ID
  const numericId = /^\d+$/.test(q) ? parseInt(q, 10) : null

  const rows = await db
    .select({
      id: contractors.id,
      name: contractors.name,
      companyName: contractors.companyName,
      phone: contractors.phone,
      telegram: contractors.telegram,
      workTypes: contractors.workTypes,
      contractorType: contractors.contractorType,
    })
    .from(contractors)
    .where(or(
      ilike(contractors.name, pattern),
      ilike(contractors.companyName, pattern),
      ilike(contractors.phone, pattern),
      ilike(contractors.telegram, pattern),
      ilike(contractors.messengerNick, pattern),
      ...(numericId ? [eq(contractors.id, numericId)] : []),
    ))
    .limit(20)

  return rows
})
