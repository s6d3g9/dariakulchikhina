import { readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { resolve } from 'node:path'

import type { FastifyInstance } from 'fastify'

import { readBearerToken, verifyMessengerToken } from '../auth/auth.ts'
import { readMessengerConfig } from '../config.ts'

// Path to Claude Code's OAuth credentials. The CLI rewrites this file when it
// refreshes its token, so we always re-read before using the access token.
const CREDENTIALS_PATH = resolve(homedir(), '.claude/.credentials.json')

const ANTHROPIC_BASE_URL = 'https://api.anthropic.com'
const USAGE_PATH = '/api/oauth/usage'
const TOKEN_REFRESH_PATH = '/api/oauth/claude_cli/refresh'
const OAUTH_BETA_HEADER = 'oauth-2025-04-20'
const USER_AGENT = 'claude-cli/2.1.114 (external, native)'

interface ClaudeAiOauthCreds {
  accessToken: string
  refreshToken: string
  expiresAt: number
  scopes: string[]
  subscriptionType: string
  rateLimitTier: string
}

interface CredentialsFile {
  claudeAiOauth: ClaudeAiOauthCreds
}

interface UsageBucket {
  utilization: number
  resets_at: number
}

interface UsageResponse {
  five_hour?: UsageBucket
  seven_day?: UsageBucket
  seven_day_opus?: UsageBucket
  seven_day_sonnet?: UsageBucket
  [key: string]: unknown
}

interface CachedEntry {
  fetchedAt: number
  payload: UsageResponse
  subscriptionType: string
  rateLimitTier: string
}

const CACHE_TTL_MS = 30_000
let cached: CachedEntry | null = null

async function readCredentials(): Promise<ClaudeAiOauthCreds | null> {
  try {
    const raw = await readFile(CREDENTIALS_PATH, 'utf8')
    const parsed = JSON.parse(raw) as CredentialsFile
    return parsed.claudeAiOauth ?? null
  }
  catch {
    return null
  }
}

async function writeAccessToken(updated: Partial<ClaudeAiOauthCreds>): Promise<void> {
  // Mirror what the CLI does: shallow-merge into claudeAiOauth, preserving
  // every other field. Stay best-effort — if the disk write fails we still
  // return fresh data to the caller.
  try {
    const raw = await readFile(CREDENTIALS_PATH, 'utf8')
    const parsed = JSON.parse(raw) as CredentialsFile
    parsed.claudeAiOauth = { ...parsed.claudeAiOauth, ...updated }
    await writeFile(CREDENTIALS_PATH, JSON.stringify(parsed, null, 2), { mode: 0o600 })
  }
  catch {
    /* ignore */
  }
}

async function refreshAccessToken(refreshToken: string): Promise<ClaudeAiOauthCreds | null> {
  try {
    const res = await fetch(`${ANTHROPIC_BASE_URL}${TOKEN_REFRESH_PATH}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'user-agent': USER_AGENT,
      },
      body: JSON.stringify({ refresh_token: refreshToken, grant_type: 'refresh_token' }),
    })
    if (!res.ok) return null
    const body = await res.json() as {
      access_token?: string
      refresh_token?: string
      expires_in?: number
    }
    if (!body.access_token) return null
    const updated: Partial<ClaudeAiOauthCreds> = {
      accessToken: body.access_token,
      expiresAt: body.expires_in ? Date.now() + body.expires_in * 1000 : Date.now() + 3600_000,
    }
    if (body.refresh_token) updated.refreshToken = body.refresh_token
    await writeAccessToken(updated)
    const next = await readCredentials()
    return next
  }
  catch {
    return null
  }
}

async function fetchUsage(token: string): Promise<{ status: number; body: UsageResponse | null }> {
  const res = await fetch(`${ANTHROPIC_BASE_URL}${USAGE_PATH}`, {
    method: 'GET',
    headers: {
      'authorization': `Bearer ${token}`,
      'content-type': 'application/json',
      'anthropic-beta': OAUTH_BETA_HEADER,
      'user-agent': USER_AGENT,
    },
  })
  if (!res.ok) return { status: res.status, body: null }
  const body = await res.json() as UsageResponse
  return { status: res.status, body }
}

async function getUsage(): Promise<{ ok: true; payload: CachedEntry } | { ok: false; status: number; reason: string }> {
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return { ok: true, payload: cached }
  }

  let creds = await readCredentials()
  if (!creds) {
    return { ok: false, status: 503, reason: 'NO_CLAUDE_CREDENTIALS' }
  }

  let result = await fetchUsage(creds.accessToken)
  if (result.status === 401 && creds.refreshToken) {
    const refreshed = await refreshAccessToken(creds.refreshToken)
    if (refreshed) {
      creds = refreshed
      result = await fetchUsage(refreshed.accessToken)
    }
  }

  if (result.status === 429) {
    if (cached) return { ok: true, payload: cached }
    return { ok: false, status: 429, reason: 'RATE_LIMITED' }
  }

  if (!result.body) {
    return { ok: false, status: result.status, reason: 'UPSTREAM_ERROR' }
  }

  cached = {
    fetchedAt: Date.now(),
    payload: result.body,
    subscriptionType: creds.subscriptionType,
    rateLimitTier: creds.rateLimitTier,
  }
  return { ok: true, payload: cached }
}

function resolveSessionAuth(request: { headers: { authorization?: string } }) {
  const config = readMessengerConfig()
  const token = readBearerToken(request.headers.authorization ?? '')
  if (!token) return null
  return verifyMessengerToken(token, config.MESSENGER_CORE_AUTH_SECRET)
}

export function registerClaudeUsageRoutes(app: FastifyInstance): void {
  app.get('/claude-usage', async (request, reply) => {
    const session = resolveSessionAuth(request)
    if (!session) return reply.code(401).send({ error: 'UNAUTHORIZED' })

    const result = await getUsage()
    if (!result.ok) {
      return reply.code(result.status).send({ error: result.reason })
    }
    const { payload } = result
    return {
      fetchedAt: payload.fetchedAt,
      subscriptionType: payload.subscriptionType,
      rateLimitTier: payload.rateLimitTier,
      five_hour: payload.payload.five_hour ?? null,
      seven_day: payload.payload.seven_day ?? null,
      seven_day_opus: payload.payload.seven_day_opus ?? null,
      seven_day_sonnet: payload.payload.seven_day_sonnet ?? null,
    }
  })
}
