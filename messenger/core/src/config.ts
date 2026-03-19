import { z } from 'zod'

const envSchema = z.object({
  MESSENGER_CORE_HOST: z.string().default('0.0.0.0'),
  MESSENGER_CORE_PORT: z.coerce.number().int().positive().default(4300),
  MESSENGER_CORE_LOG_LEVEL: z.string().default('info'),
  MESSENGER_CORE_AUTH_SECRET: z.string().default('messenger-dev-secret'),
  MESSENGER_CORE_CORS_ORIGIN: z.string().default('http://localhost:3300'),
  MESSENGER_CORE_DATA_DIR: z.string().default(''),
})

export function readMessengerConfig() {
  return envSchema.parse(process.env)
}