import { z } from 'zod'

import { requireChatSession } from '~/server/utils/auth'
import { createStandaloneChatInvite } from '~/server/modules/chat/chat-users.service'

const Schema = z.object({
  userId: z.string().uuid(),
})

export default defineEventHandler(async (event) => {
  const { chatUserId } = requireChatSession(event)
  const body = await readValidatedNodeBody(event, Schema)

  return await createStandaloneChatInvite({
    fromUserId: chatUserId,
    toUserId: body.userId,
  })
})