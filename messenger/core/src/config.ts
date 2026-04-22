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
  MESSENGER_CORE_AUTH_SECRET: z.string().default('messenger-dev-secret'),
  MESSENGER_CORE_CORS_ORIGIN: z.string().default('http://localhost,http://127.0.0.1,http://[::1]'),
  MESSENGER_CORE_DATA_DIR: z.string().default(''),
  MESSENGER_CORE_DATABASE_URL: z.string().default(process.env.DATABASE_URL || 'postgresql://daria@localhost:5433/daria_admin_refactor'),
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
  // Embedding / Ollama — used by agent-knowledge-store
  GEMMA_URL: z.string().trim().optional(),
  OLLAMA_BASE_URL: z.string().trim().default('http://localhost:11434'),
  MESSENGER_EMBED_MODEL: z.string().trim().default('nomic-embed-text'),
  // PostgreSQL — used by ingest endpoint; falls back to DATABASE_URL if not set
  MESSENGER_DB_URL: z.string().optional(),
  DATABASE_URL: z.string().optional(),
  // LiveKit — used by realtime server for call token generation
  LIVEKIT_API_URL: z.string().trim().default('wss://dariakulchikhina.com/livekit'),
  LIVEKIT_API_KEY: z.string().trim().optional(),
  LIVEKIT_API_SECRET: z.string().trim().optional(),
  // Claude CLI — path to claude binary for agent subprocess spawning
  CLAUDE_BIN: z.string().optional(),
  // Per-project secret encryption: 32-byte AES-256 key as 64 hex chars
  MESSENGER_CORE_SECRETS_KEY: z.string().length(64).optional(),
  // Service-to-service token for internal worker routes (e.g. /projects/:id/api-key)
  MESSENGER_CORE_SERVICE_TOKEN: z.string().min(16).optional(),
})

export function readMessengerConfig() {
  return envSchema.parse(process.env)
}