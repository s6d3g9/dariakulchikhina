import { z } from 'zod'

import { setChatSession } from '~/server/utils/auth'
import { authenticateStandaloneChatUser } from '~/server/utils/standalone-chat-users'

const Schema = z.object({
  login: z.string().min(3).max(32),
  password: z.string().min(1).max(200),
})

export default defineEventHandler(async (event) => {
  const body = await readValidatedNodeBody(event, Schema)
  const user = await authenticateStandaloneChatUser(body)
  setChatSession(event, user.id)
  return {
    ok: true,
    user,
  }
})