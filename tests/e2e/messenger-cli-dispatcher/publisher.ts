import { readFile } from 'node:fs/promises'
import { request } from 'node:https'
import { request as httpRequest } from 'node:http'

interface PublisherOptions {
  fixtureFile: string
  ingestUrl: string
  ingestToken: string
  runId: string
  agentId: string
}

async function readFixture(filePath: string): Promise<Record<string, unknown>[]> {
  const content = await readFile(filePath, 'utf-8')
  return content
    .trim()
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line))
}

function replaceTemplates(
  obj: Record<string, unknown>,
  runId: string,
  agentId: string,
): Record<string, unknown> {
  const json = JSON.stringify(obj)
  const replaced = json
    .replace(/\{\{RUN_ID\}\}/g, runId)
    .replace(/\{\{AGENT_ID\}\}/g, agentId)
  return JSON.parse(replaced)
}

async function postEvent(
  url: string,
  event: Record<string, unknown>,
  token: string,
): Promise<boolean> {
  return new Promise((resolve) => {
    const urlObj = new URL(url)
    const isHttps = urlObj.protocol === 'https:'
    const httpModule = isHttps ? request : httpRequest

    const body = JSON.stringify(event)
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        Authorization: `Bearer ${token}`,
      },
    }

    const req = httpModule(options, (res) => {
      if (res.statusCode && res.statusCode >= 400) {
        resolve(false)
      } else {
        resolve(true)
      }
      res.on('data', () => {})
    })

    req.on('error', () => {
      resolve(false)
    })

    req.write(body)
    req.end()
  })
}

export async function publishFixture(options: PublisherOptions): Promise<void> {
  const events = await readFixture(options.fixtureFile)

  for (const rawEvent of events) {
    const event = replaceTemplates(
      rawEvent as Record<string, unknown>,
      options.runId,
      options.agentId,
    )
    const delayMs = (event.delay_ms as number) || 0

    const success = await postEvent(options.ingestUrl, event, options.ingestToken)
    if (!success) {
      process.exit(1)
    }

    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }
}
