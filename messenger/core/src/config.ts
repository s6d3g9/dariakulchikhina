import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

import { z } from 'zod'

function inferMessengerProjectRoot() {
  const explicitRoot = process.env.MESSENGER_PROJECT_ROOT?.trim()
  if (explicitRoot) {
    return explicitRoot
  }

  const repoLikeCandidates = [
    resolve(process.cwd(), '../..'),
    resolve(process.cwd(), '..'),
    process.cwd(),
  ]

  const withDocs = repoLikeCandidates.find(candidate => (
    existsSync(resolve(candidate, 'docs/messenger'))
    || existsSync(resolve(candidate, '.github/instructions/messenger.instructions.md'))
  ))

  if (withDocs) {
    return withDocs
  }

  const standaloneRoot = repoLikeCandidates.find(candidate => (
    existsSync(resolve(candidate, 'core/package.json'))
    && existsSync(resolve(candidate, 'web/package.json'))
  ))

  return standaloneRoot || process.cwd()
}

const defaultProjectRoot = inferMessengerProjectRoot()

const envSchema = z.object({
  MESSENGER_CORE_HOST: z.string().default('0.0.0.0'),
  MESSENGER_CORE_PORT: z.coerce.number().int().positive().default(4300),
  MESSENGER_CORE_LOG_LEVEL: z.string().default('info'),
  MESSENGER_CORE_AUTH_SECRET: z.string().min(16).default('messenger-dev-secret'),
  MESSENGER_CORE_CORS_ORIGIN: z.string().default('http://localhost,http://127.0.0.1,http://[::1]'),
  MESSENGER_ENCRYPTION_KEY: z.string().min(32).optional(),
  MESSENGER_CORE_DATA_DIR: z.string().default(''),
  MESSENGER_ENABLE_AGENTS: z.union([
    z.boolean(),
    z.enum(['true', 'false']),
  ])
  .transform(value => value === true || value === 'true')
  .default(true),
  MESSENGER_PROJECT_ROOT: z.string().default(defaultProjectRoot),
  MESSENGER_AGENT_API_BASE_URL: z.string().trim().url().default('https://api.openai.com'),
  MESSENGER_AGENT_API_KEY: z.string().trim().optional(),
  MESSENGER_AGENT_ALLOW_NO_KEY: z.union([
    z.boolean(),
    z.enum(['true', 'false']),
  ])
  .transform(value => value === true || value === 'true')
  .default(false),
  MESSENGER_AGENT_MODEL: z.string().trim().default('GPT-5.4'),
  MESSENGER_AGENT_ROUTER_SUBSCRIPTION_TIER: z.enum(['local', 'free', 'plus', 'pro', 'team', 'enterprise']).default('team'),
  MESSENGER_AGENT_FAST_MODEL: z.string().trim().default('gpt-4.1-mini'),
  MESSENGER_AGENT_BALANCED_MODEL: z.string().trim().default('gpt-4.1'),
  MESSENGER_AGENT_PREMIUM_MODEL: z.string().trim().default('GPT-5.4'),
  MESSENGER_AGENT_LOCAL_MODEL: z.string().trim().default('gemma3:27b'),
  MESSENGER_AGENT_CLI_ENABLED: z.union([
    z.boolean(),
    z.enum(['true', 'false']),
  ])
  .transform(value => value === true || value === 'true')
  .default(false),
  MESSENGER_AGENT_CLAUDE_CLI_COMMAND: z.string().trim().default('/Users/oxo/.local/bin/claude'),
  MESSENGER_AGENT_CODEX_CLI_COMMAND: z.string().trim().default('codex'),
  MESSENGER_AGENT_CLI_TIMEOUT_MS: z.coerce.number().int().positive().default(90000),
  MESSENGER_AGENT_CLI_MAX_PROMPT_CHARS: z.coerce.number().int().positive().default(12000),
  MESSENGER_AGENT_CLI_MAX_BUDGET_USD: z.coerce.number().nonnegative().default(0.25),
  MESSENGER_AGENT_TIMEOUT_MS: z.coerce.number().int().positive().default(45000),
  MESSENGER_AGENT_TEMPERATURE: z.coerce.number().min(0).max(1.5).default(0.35),
  MESSENGER_TRANSCRIPTION_ENABLED: z.union([
    z.boolean(),
    z.enum(['true', 'false']),
  ])
  .transform(value => value === true || value === 'true')
  .default(false),
  MESSENGER_TRANSCRIPTION_API_KEY: z.string().trim().optional(),
  MESSENGER_TRANSCRIPTION_ALLOW_NO_KEY: z.union([
    z.boolean(),
    z.enum(['true', 'false']),
  ])
  .transform(value => value === true || value === 'true')
  .default(false),
  MESSENGER_TRANSCRIPTION_API_BASE_URL: z.string().trim().url().default('https://api.groq.com/openai/v1'),
  MESSENGER_TRANSCRIPTION_COMMAND: z.string().trim().optional(),
  MESSENGER_TRANSCRIPTION_MODEL: z.string().trim().default('whisper-large-v3-turbo'),
  MESSENGER_TRANSCRIPTION_LANGUAGE: z.string().trim().default('ru'),
  MESSENGER_TRANSCRIPTION_TIMEOUT_MS: z.coerce.number().int().positive().default(20000),
  KLIPY_APP_KEY: z.string().trim().optional(),
  KLIPY_API_BASE_URL: z.string().trim().url().default('https://api.klipy.com'),
})

export function readMessengerConfig() {
  const config = envSchema.parse(process.env)

  if (process.env.NODE_ENV === 'production' && config.MESSENGER_CORE_AUTH_SECRET === 'messenger-dev-secret') {
    throw new Error('[SECURITY] MESSENGER_CORE_AUTH_SECRET must be set to a secure random value in production')
  }

  return config
}

export type MessengerConfig = ReturnType<typeof readMessengerConfig>
