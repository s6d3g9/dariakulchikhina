import { useDb } from '~/server/db/index'
import { designers } from '~/server/db/schema'
import { asc } from 'drizzle-orm'
import { getNormalizedDesignerServiceKeySet, normalizeDesignerPackages, normalizeDesignerServices, normalizeDesignerSubscriptions } from '~/shared/utils/designer-catalogs'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const db = useDb()
  const rows = await db.select().from(designers).orderBy(asc(designers.createdAt))
  return rows.map((designer) => ({
    ...designer,
    services: normalizeDesignerServices(designer.services),
    packages: normalizeDesignerPackages(designer.packages, { validServiceKeys: getNormalizedDesignerServiceKeySet(designer.services) }),
    subscriptions: normalizeDesignerSubscriptions(designer.subscriptions, { validServiceKeys: getNormalizedDesignerServiceKeySet(designer.services) }),
  }))
})
