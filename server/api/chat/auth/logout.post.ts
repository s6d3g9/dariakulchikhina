import { clearChatSession } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  clearChatSession(event)
  return { ok: true }
})