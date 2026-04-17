import { getContractor } from '~/server/modules/contractors/contractors.service'

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const idParam = getRouterParam(event, 'id')
  const contractorId = Number(idParam)

  if (!Number.isInteger(contractorId) || contractorId <= 0) {
    return null
  }

  return await getContractor(contractorId)
})
