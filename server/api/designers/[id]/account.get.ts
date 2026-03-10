/**
 * GET /api/designers/:id/account
 * Admin only — check whether designer has a login account.
 */
import { useDb } from '~/server/db/index'
import { designerAccounts } from '~/server/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const designerId = Number(getRouterParam(event, 'id'))
  if (!designerId) throw createError({ statusCode: 400, message: 'Неверный ID дизайнера' })

  const db = useDb()
  const [account] = await db
    .select({ id: designerAccounts.id, email: designerAccounts.email, createdAt: designerAccounts.createdAt, updatedAt: designerAccounts.updatedAt })
    .from(designerAccounts)
    .where(eq(designerAccounts.designerId, designerId))
    .limit(1)

  return account ?? null
})
