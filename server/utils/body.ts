import type { H3Event } from 'h3'

/**
 * h3 v2 RC bug workaround: event.req.text() crashes because event.req
 * returns a deprecated Node.js IncomingMessage, not a Fetch Request.
 * We read from event.node.req directly.
 */
export async function readNodeBody(event: H3Event): Promise<unknown> {
  const req = (event as any).node?.req ?? (event as any).req
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (chunk: Buffer | string) => { data += chunk.toString() })
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}) }
      catch { resolve({}) }
    })
    req.on('error', reject)
  })
}

export async function readValidatedNodeBody<T>(
  event: H3Event,
  schema: { parse: (d: unknown) => T },
): Promise<T> {
  const body = await readNodeBody(event)
  try {
    return schema.parse(body)
  } catch (e: any) {
    // ZodError → 400
    throw createError({
      statusCode: 400,
      statusMessage: e?.errors?.[0]?.message ?? 'Invalid request body',
    })
  }
}
