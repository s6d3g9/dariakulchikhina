import { z } from 'zod'

import { setChatSession } from '~/server/utils/auth'
import { createStandaloneChatUser } from '~/server/utils/standalone-chat-users'

const Schema = z.object({
  login: z.string().min(3).max(32),
  displayName: z.string().min(2).max(60),
  password: z.string().min(8).max(200),
})

export default defineEventHandler(async (event) => {
  const body = await readValidatedNodeBody(event, Schema)
  const user = await createStandaloneChatUser(body)
  setChatSession(event, user.id)
  return {
    ok: true,
    user,
  }
})