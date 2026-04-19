import { createMockIngestServer } from './mock-ingest-server.ts'
import { publishFixture } from './publisher.ts'
import { strict as assert } from 'node:assert'
import { request } from 'node:http'

const ingestPort = parseInt(process.env.INGEST_PORT || '5555')
const ingestToken = process.env.INGEST_TOKEN || 'test-token'
const fixtureFile = process.env.FIXTURE_FILE || './fixtures/simple-run.ndjson'
const runId = process.env.RUN_ID
const agentId = process.env.AGENT_ID

if (!runId || !agentId) {
  console.error('Missing RUN_ID or AGENT_ID')
  process.exit(1)
}

const server = createMockIngestServer({ port: ingestPort, ingestToken })
const { url: serverUrl, stop } = await server.listen()

console.log(`Mock ingest server listening at ${serverUrl}`)

const ingestUrl = `${serverUrl}/agent/ingest`

// Publish fixture events
console.log(`Publishing events from ${fixtureFile}...`)
try {
  await publishFixture({
    fixtureFile,
    ingestUrl,
    ingestToken,
    runId,
    agentId,
  })
  console.log('All events published successfully')
} catch (e) {
  console.error('Publisher error:', e.message)
  await stop()
  process.exit(1)
}

// Wait a moment for events to be processed
await new Promise((r) => setTimeout(r, 500))

// Poll for events
async function pollEvents() {
  return new Promise((resolve, reject) => {
    const url = new URL(`${serverUrl}/agent/events?run_id=${runId}`)
    const req = request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: 'GET',
      },
      (res) => {
        let data = ''
        res.on('data', (chunk) => {
          data += chunk
        })
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data)
            resolve(parsed.events || [])
          } catch {
            reject(new Error('Failed to parse events'))
          }
        })
      },
    )
    req.on('error', reject)
    req.end()
  })
}

// Get events from server
const events = await pollEvents()
const status = server.getRunStatus(runId)

console.log(`Server stored ${events.length} events`)
console.log(`Run status: ${status}`)

// Assertions
try {
  assert(events.length > 0, 'No events were stored')
  assert(status === 'completed' || status === 'failed', `Unexpected status: ${status}`)

  // Check event sequence
  const eventTypes = events.map((e) => e.event)
  console.log(`Event sequence: ${eventTypes.join(' -> ')}`)

  // Verify start and end events
  assert(eventTypes[0] === 'run_start', 'First event should be run_start')
  const lastEvent = eventTypes[eventTypes.length - 1]
  assert(
    lastEvent === 'run_complete' || lastEvent === 'run_error',
    'Last event should be run_complete or run_error',
  )

  console.log('\n✓ All assertions passed')
} catch (e) {
  console.error('\n✗ Assertion failed:', e.message)
  process.exit(1)
} finally {
  await stop()
}
