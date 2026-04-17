import { buildStandaloneChatBootstrap } from '~/server/modules/chat/chat-communications.service'

export default defineEventHandler(async (event) => {
  return await buildStandaloneChatBootstrap(event)
})