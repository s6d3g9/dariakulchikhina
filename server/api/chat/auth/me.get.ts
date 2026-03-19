import { getChatSession } from '~/server/utils/auth'
import { findStandaloneChatUserById } from '~/server/utils/standalone-chat-users'

export default defineEventHandler(async (event) => {
  const session = getChatSession(event)
  if (!session) {
    return { authenticated: false, user: null }
  }

  const user = await findStandaloneChatUserById(session.chatUserId)
  if (!user) {
    return { authenticated: false, user: null }
  }

  return {
    authenticated: true,
    user: {
      id: user.id,
      login: user.login,
      displayName: user.displayName,
      nickname: user.nickname,
      createdAt: user.createdAt,
    },
  }
})