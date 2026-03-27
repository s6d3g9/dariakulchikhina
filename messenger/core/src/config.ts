import { z } from 'zod'

const envSchema = z.object({
  MESSENGER_CORE_HOST: z.string().default('0.0.0.0'),
  MESSENGER_CORE_PORT: z.coerce.number().int().positive().default(4300),
  MESSENGER_CORE_LOG_LEVEL: z.string().default('info'),
  MESSENGER_CORE_AUTH_SECRET: z.string().default('messenger-dev-secret'),
  MESSENGER_CORE_CORS_ORIGIN: z.string().default('http://localhost:3300'),
  MESSENGER_CORE_DATA_DIR: z.string().default(''),
  MESSENGER_AGENT_API_BASE_URL: z.string().trim().url().default('https://api.openai.com'),
  MESSENGER_AGENT_MODEL: z.string().trim().default('GPT-5.4'),
  MESSENGER_AGENT_TIMEOUT_MS: z.coerce.number().int().positive().default(45000),
  MESSENGER_AGENT_TEMPERATURE: z.coerce.number().min(0).max(1.5).default(0.35),
  KLIPY_APP_KEY: z.string().trim().optional(),
  KLIPY_API_BASE_URL: z.string().trim().url().default('https://api.klipy.com'),
})

export function readMessengerConfig() {
  return envSchema.parse(process.env)
}