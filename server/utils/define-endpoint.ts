import type { H3Event } from 'h3'
import { createError, defineEventHandler } from 'h3'
import { ZodError } from 'zod'
import type { ZodSchema } from 'zod'
import { DomainError, resolveDomainErrorStatus } from './errors'
import { readNodeBody } from './body'
import { safeGetQuery } from './query'

/** Authenticated session — mirrors session.service SessionView (minus role: null). */
export type Session =
  | { role: 'admin'; id: number; email: string; name: string | null }
  | { role: 'client'; projectSlug: string }
  | { role: 'contractor'; contractorId: number }

export interface EndpointContext<I> {
  event: H3Event
  session: Session | null
  input: I
  params: Record<string, string>
  query: Record<string, string | string[]>
}

interface DefineEndpointOptions<I, O> {
  input?: ZodSchema<I>
  output?: ZodSchema<O>
  auth: 'required' | 'optional' | 'none'
  params?: ZodSchema
  query?: ZodSchema
  handler: (ctx: EndpointContext<I>) => Promise<O>
  /** @internal Test-only: overrides session resolution to avoid live DB. */
  _resolveSession?: (event: H3Event) => Promise<Session | null>
}

// Dynamic import keeps server/utils free of server/modules dependencies (lint rule).
async function _defaultResolveSession(event: H3Event): Promise<Session | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mod: any = await import('~/server/modules/auth/session.service')
  const view = await mod.resolveSession(event)
  return view?.role != null ? (view as Session) : null
}

function _validationError(issues: ZodError['issues']) {
  return createError({
    statusCode: 400,
    statusMessage: 'VALIDATION_FAILED',
    data: { code: 'VALIDATION_FAILED', issues },
  })
}

export function defineEndpoint<I = unknown, O = unknown>(opts: DefineEndpointOptions<I, O>) {
  const resolveSessionFn = opts._resolveSession ?? _defaultResolveSession

  return defineEventHandler(async (event: H3Event) => {
    // Auth
    let session: Session | null = null
    if (opts.auth !== 'none') {
      session = await resolveSessionFn(event)
      if (opts.auth === 'required' && session === null) {
        throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
      }
    }

    // Params
    const rawParams = ((event.context as Record<string, unknown>)?.params as Record<string, string>) ?? {}
    let params: Record<string, string> = rawParams
    if (opts.params) {
      try {
        params = opts.params.parse(rawParams) as Record<string, string>
      } catch (e) {
        if (e instanceof ZodError) throw _validationError(e.issues)
        throw e
      }
    }

    // Query
    const query: Record<string, string | string[]> = safeGetQuery(event)
    if (opts.query) {
      try {
        opts.query.parse(query)
      } catch (e) {
        if (e instanceof ZodError) throw _validationError(e.issues)
        throw e
      }
    }

    // Body / input
    let input = undefined as unknown as I
    if (opts.input) {
      const body = await readNodeBody(event)
      try {
        input = opts.input.parse(body)
      } catch (e) {
        if (e instanceof ZodError) throw _validationError(e.issues)
        throw e
      }
    }

    // Handler
    try {
      const result = await opts.handler({ event, session, input, params, query })
      if (opts.output) return opts.output.parse(result)
      return result
    } catch (e) {
      if (e instanceof DomainError) {
        throw createError({
          statusCode: resolveDomainErrorStatus(e),
          statusMessage: e.code,
          data: e.toJSON(),
        })
      }
      throw e
    }
  })
}
