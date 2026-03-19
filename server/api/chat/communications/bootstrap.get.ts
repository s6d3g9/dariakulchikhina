import { buildStandaloneChatBootstrap } from '~/server/utils/standalone-chat-communications'

export default defineEventHandler(async (event) => {
  return await buildStandaloneChatBootstrap(event)
})