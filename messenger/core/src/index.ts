import { readMessengerConfig } from './config.ts'
import { loadManifest } from './integrations/manifest-loader.ts'
import { createMessengerServer } from './realtime/server.ts'

const config = readMessengerConfig()

loadManifest(config.MESSENGER_PROJECT_ROOT)

const app = await createMessengerServer()

await app.listen({
  host: config.MESSENGER_CORE_HOST,
  port: config.MESSENGER_CORE_PORT,
})