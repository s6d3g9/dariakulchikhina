import { createServer } from 'node:http'
import { URL } from 'node:url'
import type { IncomingMessage } from 'node:http'

interface IngestEvent {
  event: string
  run_id: string
  agent_id?: string
  [key: string]: unknown
}

let storedEvents: Map<string, IngestEvent[]> = new Map()
let runStatuses: Map<string, string> = new Map()

function validateToken(authHeader?: string, expectedToken?: string): boolean {
  if (!expectedToken) return true
  if (!authHeader) return false
  const parts = authHeader.split(' ')
  return parts[0] === 'Bearer' && parts[1] === expectedToken
}

async function handleIngestRequest(
  req: IncomingMessage,
  res: any,
  ingestToken: string,
): Promise<boolean> {
  const url = new URL(req.url || '', `http://${req.headers.host}`)

  if (url.pathname === '/agent/ingest' && req.method === 'POST') {
    const authHeader = req.headers.authorization as string | undefined
    if (!validateToken(authHeader, ingestToken)) {
      res.writeHead(401, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Unauthorized' }))
      return true
    }

    let body = ''
    req.on('data', (chunk) => {
      body += chunk.toString()
    })

    req.on('end', () => {
      try {
        const event = JSON.parse(body) as IngestEvent
        const runId = event.run_id

        if (!storedEvents.has(runId)) {
          storedEvents.set(runId, [])
        }
        storedEvents.get(runId)!.push(event)

        if (event.event === 'run_start') {
          runStatuses.set(runId, 'running')
        } else if (event.event === 'run_complete') {
          runStatuses.set(runId, 'completed')
        } else if (event.event === 'run_error') {
          runStatuses.set(runId, 'failed')
        }

        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true, event: event.event }))
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Invalid JSON' }))
      }
    })

    return true
  }

  if (url.pathname === '/agent/events' && req.method === 'GET') {
    const runId = url.searchParams.get('run_id')
    const events = runId ? storedEvents.get(runId) || [] : []
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ events }))
    return true
  }

  return false
}

export function createMockIngestServer(options: { port: number; ingestToken?: string }) {
  const ingestToken = options.ingestToken || 'test-token'

  const server = createServer(async (req, res) => {
    const handled = await handleIngestRequest(req, res, ingestToken)
    if (!handled) {
      res.writeHead(404, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Not found' }))
    }
  })

  const listen = () =>
    new Promise<{ url: string; stop: () => Promise<void> }>((resolve) => {
      server.listen(options.port, '127.0.0.1', () => {
        const url = `http://127.0.0.1:${options.port}`
        resolve({
          url,
          stop: () => {
            return new Promise<void>((done) => {
              server.close(done)
            })
          },
        })
      })
    })

  return {
    listen,
    getEvents: (runId: string) => storedEvents.get(runId) || [],
    getRunStatus: (runId: string) => runStatuses.get(runId) || 'unknown',
    getRunIds: () => Array.from(storedEvents.keys()),
    reset: () => {
      storedEvents.clear()
      runStatuses.clear()
    },
  }
}
