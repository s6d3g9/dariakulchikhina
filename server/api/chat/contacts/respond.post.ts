import { z } from 'zod'

import { requireChatSession } from '~/server/utils/auth'
import { respondToStandaloneChatInvite } from '~/server/utils/standalone-chat-users'

const Schema = z.object({
  inviteId: z.string().uuid(),
  action: z.enum(['accept', 'reject']),
})

export default defineEventHandler(async (event) => {
  const { chatUserId } = requireChatSession(event)
  const body = await readValidatedNodeBody(event, Schema)

  return await respondToStandaloneChatInvite({
    inviteId: body.inviteId,
    userId: chatUserId,
    action: body.action,
  })
})