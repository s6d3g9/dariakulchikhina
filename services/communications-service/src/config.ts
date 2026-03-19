export interface ServiceConfig {
  host: string
  port: number
  authSecret: string
  corsOrigin: string
  allowDevTokenIssue: boolean
  databaseUrl: string | null
}

function readBoolean(value: string | undefined, fallback: boolean) {
  if (value == null) {
    return fallback
  }

  return value === '1' || value.toLowerCase() === 'true'
}

function readPort(value: string | undefined, fallback: number) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback
  }

  return parsed
}

export function readConfig(): ServiceConfig {
  const authSecret = process.env.COMMUNICATIONS_AUTH_SECRET?.trim()

  if (!authSecret) {
    throw new Error('COMMUNICATIONS_AUTH_SECRET is required')
  }

  return {
    host: process.env.COMMUNICATIONS_HOST?.trim() || '0.0.0.0',
    port: readPort(process.env.COMMUNICATIONS_PORT, 4100),
    authSecret,
    corsOrigin: process.env.COMMUNICATIONS_CORS_ORIGIN?.trim() || '*',
    allowDevTokenIssue: readBoolean(process.env.COMMUNICATIONS_ALLOW_DEV_TOKEN_ISSUE, false),
    databaseUrl: process.env.COMMUNICATIONS_DATABASE_URL?.trim() || process.env.DATABASE_URL?.trim() || null,
  }
}