import { useDb } from '~/server/db/index'
import { contractorIntakes } from '~/server/db/schema'
import { desc, eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const db = useDb()
  const status = getQuery(event).status as string | undefined

  const rows = status
    ? await db.select().from(contractorIntakes).where(eq(contractorIntakes.status, status)).orderBy(desc(contractorIntakes.createdAt))
    : await db.select().from(contractorIntakes).orderBy(desc(contractorIntakes.createdAt))

  return rows
})
