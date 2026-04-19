import { z } from 'zod'

import { requireChatSession } from '~/server/modules/auth/session.service'
import { safeGetQuery } from '~/server/utils/query'
import { searchStandaloneChatDirectory } from '~/server/modules/chat/chat-users.service'

const QuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
})

export default defineEventHandler(async (event) => {
  const { chatUserId } = requireChatSession(event)
  const query = QuerySchema.parse(safeGetQuery(event))

  return {
    users: await searchStandaloneChatDirectory({
      viewerId: chatUserId,
      search: query.search,
      limit: query.limit ?? 24,
    }),
  }
})