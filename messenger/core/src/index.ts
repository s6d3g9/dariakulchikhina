import { readMessengerConfig } from './config.ts'
import { createMessengerServer } from './realtime/server.ts'

const config = readMessengerConfig()
const app = await createMessengerServer()

await app.listen({
  host: config.MESSENGER_CORE_HOST,
  port: config.MESSENGER_CORE_PORT,
})