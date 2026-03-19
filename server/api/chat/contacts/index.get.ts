import { requireChatSession } from '~/server/utils/auth'
import { listStandaloneChatContacts } from '~/server/utils/standalone-chat-users'

export default defineEventHandler(async (event) => {
  const { chatUserId } = requireChatSession(event)
  return await listStandaloneChatContacts(chatUserId)
})