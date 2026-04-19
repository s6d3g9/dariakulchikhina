import { clearChatSession } from '~/server/modules/auth/session.service'

export default defineEventHandler(async (event) => {
  clearChatSession(event)
  return { ok: true }
})