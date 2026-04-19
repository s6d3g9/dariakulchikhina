import { requireChatSession } from '~/server/modules/auth/session.service'
import { listStandaloneChatContacts } from '~/server/modules/chat/chat-users.service'

export default defineEventHandler(async (event) => {
  const { chatUserId } = requireChatSession(event)
  return await listStandaloneChatContacts(chatUserId)
})