/**
 * Central server-side configuration.
 *
 * Single source of truth for environment variables used by the main Nuxt
 * app (server/). Validated at import time via Zod — a missing required
 * variable makes the process exit 1 on startup rather than fail at the
 * first request that needs it.
 *
 * Policy: nothing in `server/**` (except this file and scripts/) reads
 * `process.env` directly. Import the typed `config` object instead.
 * See docs/architecture-v5/20-config-and-logging.md for rationale.
 *
 * Scope: this file covers the MAIN NUXT APP only. The standalone
 * messenger and communications-service have their own config modules
 * under their respective runtimes.
 */

import { z } from 'zod'

const ConfigSchema = z.object({
  // ── Runtime ──────────────────────────────────────────────────────
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // ── Database ─────────────────────────────────────────────────────
  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL is required (postgres connection string)'),

  // ── Session / auth secrets ───────────────────────────────────────
  // Nuxt reads NUXT_SESSION_SECRET automatically; SESSION_SECRET is the
  // fallback used by HMAC signing in server/modules/auth/session.service. They should be
  // the same value in production.
  NUXT_SESSION_SECRET: z.string().min(32).optional(),
  SESSION_SECRET: z.string().min(32).optional(),

  // ── Admin bootstrap (optional — seeds first admin row on login) ──
  DESIGNER_INITIAL_EMAIL: z
    .string()
    .trim()
    .default('admin@dariakulchikhina.com'),
  DESIGNER_INITIAL_LOGIN: z.string().trim().optional(),
  DESIGNER_INITIAL_PASSWORD: z.string().trim().optional(),

  // ── Uploads ──────────────────────────────────────────────────────
  UPLOAD_DIR: z.string().default('public/uploads'),
  FORCE_HTTPS: z
    .enum(['true', 'false', '1', '0'])
    .default('false')
    .transform((v) => v === 'true' || v === '1'),

  // ── AI / RAG backends ────────────────────────────────────────────
  GEMMA_URL: z.string().url().optional(),
  OLLAMA_MODEL_CHAT: z.string().optional(),
  OLLAMA_MODEL_HEAVY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),

  // ── Messenger CORS ───────────────────────────────────────────────
  // Single-origin (MESSENGER_WEB_ORIGIN) or comma-separated list
  // (MESSENGER_WEB_ORIGINS). NUXT_PUBLIC_* variant is exposed to the
  // browser via Nuxt runtime config.
  MESSENGER_WEB_ORIGIN: z.string().url().optional(),
  MESSENGER_WEB_ORIGINS: z.string().optional(),
  NUXT_PUBLIC_MESSENGER_WEB_ORIGIN: z.string().url().optional(),
})

export type Config = z.infer<typeof ConfigSchema>

function formatZodErrors(error: z.ZodError): string {
  return error.issues
    .map((i) => `  ${i.path.join('.') || '(root)'}: ${i.message}`)
    .join('\n')
}

function loadConfig(): Config {
  const parsed = ConfigSchema.safeParse(process.env)
  if (!parsed.success) {
    // eslint-disable-next-line no-console -- startup failure output is the one place console is the right tool
    console.error(
      '[config] Environment validation failed:\n' + formatZodErrors(parsed.error),
    )
    // Fail fast — refusing to boot is better than failing at request time.
    process.exit(1)
  }
  return parsed.data
}

/**
 * Validated server config. Import-time initialization means the process
 * will refuse to start if required vars are missing. Never read
 * `process.env` directly — always go through this object.
 */
export const config = loadConfig()

/**
 * Derived: messenger CORS allow-list as a concrete string array.
 * Combines MESSENGER_WEB_ORIGIN (single) and MESSENGER_WEB_ORIGINS
 * (comma-separated). Deduplicated, empty origins dropped.
 */
export function getMessengerOriginAllowList(): string[] {
  const origins: string[] = []
  if (config.MESSENGER_WEB_ORIGIN) origins.push(config.MESSENGER_WEB_ORIGIN)
  if (config.MESSENGER_WEB_ORIGINS) {
    for (const part of config.MESSENGER_WEB_ORIGINS.split(',')) {
      const trimmed = part.trim()
      if (trimmed) origins.push(trimmed)
    }
  }
  if (config.NUXT_PUBLIC_MESSENGER_WEB_ORIGIN) {
    origins.push(config.NUXT_PUBLIC_MESSENGER_WEB_ORIGIN)
  }
  return Array.from(new Set(origins))
}

/**
 * Derived: resolved session HMAC secret. Prefers NUXT_SESSION_SECRET
 * (Nuxt runtime config), falls back to SESSION_SECRET. Callers that
 * sign/verify cookies should use this rather than reading env directly.
 * Returns null when neither is set so the caller can decide whether to
 * throw (production) or warn (dev with default signing).
 */
export function getSessionSecret(): string | null {
  return config.NUXT_SESSION_SECRET || config.SESSION_SECRET || null
}
