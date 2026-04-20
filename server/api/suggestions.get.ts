import { getSuggestions } from '~/server/modules/catalog/suggestions.service'

export default defineEventHandler((event) => {
  const admin = getAdminSession(event)
  const client = getClientSession(event)
  const contractor = getContractorSession(event)
  if (!admin && !client && !contractor) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  const params = safeGetQuery(event)
  const q = ((params.q as string) || '').toLowerCase().trim()
  const category = (params.category as string) || ''
  return getSuggestions(q, category)
})
