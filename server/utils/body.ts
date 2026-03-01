import type { H3Event } from 'h3'

/**
 * Reads JSON body in Nitro/h3 v2 RC + Node.js adapter.
 * Tries multiple strategies in order of reliability.
 */
export async function readNodeBody(event: H3Event): Promise<unknown> {
  const req: any = (event as any).node?.req ?? (event as any).req

  // Strategy 1: already-buffered body (Nitro stores it in these fields)
  for (const key of ['_body', 'rawBody', 'body']) {
    if (req[key] != null && typeof req[key] !== 'function') {
      const v = req[key]
      if (typeof v === 'object' && !Buffer.isBuffer(v)) return v
      try { return JSON.parse(Buffer.isBuffer(v) ? v.toString('utf8') : String(v)) } catch { /**/ }
    }
  }

  // Strategy 2: Nitro's internal RawBodySymbol
  const sym = Object.getOwnPropertySymbols(req).find(s => String(s).includes('RawBody') || String(s).includes('rawBody'))
  if (sym) {
    try {
      const cached = await (req as any)[sym]
      if (cached) return JSON.parse(Buffer.isBuffer(cached) ? cached.toString('utf8') : String(cached))
    } catch { /**/ }
  }

  // Strategy 3: read the raw stream directly
  try {
    const raw = await new Promise<string>((resolve, reject) => {
      if (req.readableEnded || req.destroyed) return resolve('')
      let data = ''
      req.on('data', (chunk: any) => { data += Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk) })
      req.on('end', () => resolve(data))
      req.on('error', reject)
      // safety timeout
      setTimeout(() => resolve(data), 5000)
    })
    if (raw.trim()) return JSON.parse(raw)
  } catch { /**/ }

  return {}
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
