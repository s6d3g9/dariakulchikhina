import { z } from 'zod'

import { requireChatSession } from '~/server/utils/auth'
import { updateStandaloneChatProfile } from '~/server/modules/chat/chat-users.service'

const Schema = z.object({
  displayName: z.string().min(2).max(60).optional(),
  nickname: z.string().max(32).nullable().optional(),
})

export default defineEventHandler(async (event) => {
  const { chatUserId } = requireChatSession(event)
  const body = await readValidatedNodeBody(event, Schema)

  return {
    user: await updateStandaloneChatProfile(chatUserId, body),
  }
})