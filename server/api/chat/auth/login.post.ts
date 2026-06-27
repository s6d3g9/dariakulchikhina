import { z } from 'zod'

import { setChatSession } from '~/server/utils/auth'
import { authenticateStandaloneChatUser } from '~/server/utils/standalone-chat-users'
import { enforceLoginThrottle, recordLoginFailure, recordLoginSuccess, getClientIp } from '~/server/utils/login-throttle'

const Schema = z.object({
  login: z.string().min(3).max(32),
  password: z.string().min(1).max(200),
})

export default defineEventHandler(async (event) => {
  await enforceLoginThrottle(event)
  const body = await readValidatedNodeBody(event, Schema)
  const ip = getClientIp(event)
  try {
    const user = await authenticateStandaloneChatUser(body)
    recordLoginSuccess(ip)
    setChatSession(event, user.id)
    return {
      ok: true,
      user,
    }
  } catch (err) {
    recordLoginFailure(ip)
    throw err
  }
})