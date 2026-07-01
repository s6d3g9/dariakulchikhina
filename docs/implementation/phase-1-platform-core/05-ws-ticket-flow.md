# Phase 1 / Week 1 / Friday: WS-ticket flow

Цель: atomic one-shot ticket-based WebSocket auth. Identity issues, Redis stores, messenger/feed consume.

## Протокол

```
1. Client (authenticated с JWT) → POST /identity/ws-ticket
2. Identity → Redis SETEX ws_ticket:<uuid> 30 '<userId>:<scopes>'
3. Identity returns { ticket: "<uuid>", expiresIn: 30 }
4. Client opens WS: wss://messenger.internal/connect?ticket=<uuid>
5. Messenger → Redis GETDEL ws_ticket:<uuid>
   - If missing → close WS (401)
   - If found → extract userId, scopes, upgrade connection
6. Connection authorized. Ticket consumed (can't reuse).
```

## Шаг 1: Issue endpoint в identity

`services/identity/src/handlers/ws-ticket.ts`:

```typescript
import { defineEventHandler, createError } from 'h3'
import { v4 as uuidv4 } from 'uuid'
import { redis } from '../redis'
import { requireAuth } from '../middleware/auth'

const TICKET_TTL_SECONDS = 30

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)

  const ticket = uuidv4()
  const value = JSON.stringify({
    userId: auth.userId,
    scopes: auth.scopes,
    region: auth.region,
    kycLevel: auth.kycLevel,
    issuedAt: Date.now(),
  })

  // Atomic SETEX
  await redis.setex(`ws_ticket:${ticket}`, TICKET_TTL_SECONDS, value)

  return {
    ticket,
    expiresIn: TICKET_TTL_SECONDS,
  }
})
```

## Шаг 2: Middleware в messenger

`services/messenger/src/ws/auth.ts`:

```typescript
import { redis } from '../redis'
import type { IncomingMessage } from 'http'

export interface WsAuthContext {
  userId: string
  scopes: string[]
  region: string
  kycLevel: number
  issuedAt: number
}

export async function authenticateWs(req: IncomingMessage): Promise<WsAuthContext | null> {
  const url = new URL(req.url ?? '/', 'http://localhost')
  const ticket = url.searchParams.get('ticket')
  
  if (!ticket || !/^[a-f0-9-]{36}$/.test(ticket)) {
    return null
  }

  // GETDEL — atomic one-shot consumption
  const rawValue = await redis.call('GETDEL', `ws_ticket:${ticket}`) as string | null
  
  if (!rawValue) {
    return null  // ticket missing or already consumed
  }

  try {
    const parsed = JSON.parse(rawValue)
    
    // Additional freshness check (redundant с TTL, но defense-in-depth)
    if (Date.now() - parsed.issuedAt > 30_000) {
      return null
    }
    
    return parsed as WsAuthContext
  } catch {
    return null
  }
}
```

## Шаг 3: WebSocket server

`services/messenger/src/ws/server.ts`:

```typescript
import { WebSocketServer, WebSocket } from 'ws'
import type { IncomingMessage } from 'http'
import { authenticateWs, WsAuthContext } from './auth'
import { trace, context as otelContext } from '@opentelemetry/api'

export function createWsServer(server: any) {
  const wss = new WebSocketServer({ 
    server,
    path: '/connect',
    maxPayload: 1024 * 1024,  // 1MB
  })

  wss.on('connection', async (ws: WebSocket, req: IncomingMessage) => {
    const tracer = trace.getTracer('messenger')
    const span = tracer.startSpan('ws.connection')

    try {
      // Authenticate
      const auth = await authenticateWs(req)
      if (!auth) {
        span.setAttributes({ 'ws.auth.rejected': true })
        ws.close(1008, 'AUTHENTICATION_FAILED')
        return
      }

      // Attach auth context
      ;(ws as any).auth = auth
      ;(ws as any).userId = auth.userId

      span.setAttributes({
        'user.id': auth.userId,
        'user.region': auth.region,
        'user.kyc_level': auth.kycLevel,
      })

      // Register connection
      await connectionManager.register(ws, auth)

      // Setup handlers
      ws.on('message', (data) => handleMessage(ws, auth, data))
      ws.on('close', () => connectionManager.unregister(ws))
      ws.on('error', (err) => {
        span.recordException(err)
        connectionManager.unregister(ws)
      })

      // Send welcome
      ws.send(JSON.stringify({
        type: 'connected',
        userId: auth.userId,
        serverTime: new Date().toISOString(),
      }))
    } finally {
      span.end()
    }
  })

  return wss
}

async function handleMessage(ws: WebSocket, auth: WsAuthContext, raw: any) {
  try {
    const message = JSON.parse(raw.toString())
    
    switch (message.type) {
      case 'send-message':
        await handleSendMessage(ws, auth, message)
        break
      case 'typing':
        await handleTyping(ws, auth, message)
        break
      case 'presence':
        await handlePresence(ws, auth, message)
        break
      case 'subscribe':
        await handleSubscribe(ws, auth, message)
        break
      default:
        ws.send(JSON.stringify({ type: 'error', code: 'UNKNOWN_MESSAGE_TYPE' }))
    }
  } catch (err) {
    ws.send(JSON.stringify({ type: 'error', code: 'INVALID_JSON' }))
  }
}
```

## Шаг 4: Connection manager

`services/messenger/src/ws/connection-manager.ts`:

```typescript
import type { WebSocket } from 'ws'
import type { WsAuthContext } from './auth'
import { redis } from '../redis'

interface Connection {
  ws: WebSocket
  userId: string
  connectedAt: Date
  subscriptions: Set<string>  // conversationIds
}

class ConnectionManager {
  private connections = new Map<WebSocket, Connection>()
  private userConnections = new Map<string, Set<WebSocket>>()

  async register(ws: WebSocket, auth: WsAuthContext) {
    const conn: Connection = {
      ws,
      userId: auth.userId,
      connectedAt: new Date(),
      subscriptions: new Set(),
    }
    
    this.connections.set(ws, conn)
    
    if (!this.userConnections.has(auth.userId)) {
      this.userConnections.set(auth.userId, new Set())
    }
    this.userConnections.get(auth.userId)!.add(ws)

    // Presence — mark online
    await redis.setex(`presence:${auth.userId}`, 120, '1')
    await redis.publish('presence.update', JSON.stringify({
      userId: auth.userId,
      status: 'online',
      since: Date.now(),
    }))
  }

  async unregister(ws: WebSocket) {
    const conn = this.connections.get(ws)
    if (!conn) return

    this.connections.delete(ws)
    const userWs = this.userConnections.get(conn.userId)
    if (userWs) {
      userWs.delete(ws)
      if (userWs.size === 0) {
        this.userConnections.delete(conn.userId)
        
        // Mark offline (if no other connections)
        await redis.del(`presence:${conn.userId}`)
        await redis.publish('presence.update', JSON.stringify({
          userId: conn.userId,
          status: 'offline',
          since: Date.now(),
        }))
      }
    }
  }

  getConnectionsForUser(userId: string): WebSocket[] {
    return Array.from(this.userConnections.get(userId) ?? [])
  }

  subscribe(ws: WebSocket, conversationId: string) {
    const conn = this.connections.get(ws)
    conn?.subscriptions.add(conversationId)
  }

  unsubscribe(ws: WebSocket, conversationId: string) {
    const conn = this.connections.get(ws)
    conn?.subscriptions.delete(conversationId)
  }

  // Broadcast к subscribers конкретной conversation
  broadcast(conversationId: string, payload: object, excludeUserId?: string) {
    const message = JSON.stringify(payload)
    for (const [ws, conn] of this.connections) {
      if (!conn.subscriptions.has(conversationId)) continue
      if (conn.userId === excludeUserId) continue
      if (ws.readyState === ws.OPEN) {
        ws.send(message)
      }
    }
  }

  get stats() {
    return {
      totalConnections: this.connections.size,
      uniqueUsers: this.userConnections.size,
    }
  }
}

export const connectionManager = new ConnectionManager()
```

## Шаг 5: Heartbeat (keep-alive)

```typescript
// services/messenger/src/ws/heartbeat.ts
import { connectionManager } from './connection-manager'

export function setupHeartbeat(wss: any) {
  // Ping всех 30 sec
  const interval = setInterval(() => {
    wss.clients.forEach((ws: any) => {
      if (ws.isAlive === false) {
        connectionManager.unregister(ws)
        return ws.terminate()
      }
      ws.isAlive = false
      ws.ping()
    })
  }, 30_000)

  wss.on('connection', (ws: any) => {
    ws.isAlive = true
    ws.on('pong', () => { ws.isAlive = true })
  })

  wss.on('close', () => clearInterval(interval))
}
```

## Шаг 6: Client — WebSocket connection

`apps/shell-web/src/lib/ws-client.ts`:

```typescript
class WsClient {
  private ws: WebSocket | null = null
  private ticketRefreshTimer: NodeJS.Timeout | null = null
  private reconnectAttempts = 0
  private listeners = new Map<string, Set<(data: any) => void>>()

  async connect() {
    try {
      // 1. Fetch fresh ticket
      const ticketResponse = await fetch('/api/auth/ws-ticket', { method: 'POST' })
      if (!ticketResponse.ok) throw new Error('ticket-fetch-failed')
      const { ticket } = await ticketResponse.json()

      // 2. Open WS с ticket в query
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:3001'
      this.ws = new WebSocket(`${wsUrl}/connect?ticket=${ticket}`)

      this.ws.onopen = () => {
        console.log('WS connected')
        this.reconnectAttempts = 0
        this.emit('connected', null)
      }

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          this.emit(data.type, data)
        } catch (err) {
          console.error('WS message parse error:', err)
        }
      }

      this.ws.onclose = (event) => {
        console.log('WS closed:', event.code)
        this.emit('disconnected', { code: event.code, reason: event.reason })
        this.scheduleReconnect()
      }

      this.ws.onerror = (err) => {
        console.error('WS error:', err)
        this.emit('error', err)
      }
    } catch (err) {
      console.error('WS connect failed:', err)
      this.scheduleReconnect()
    }
  }

  private scheduleReconnect() {
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 60_000)
    this.reconnectAttempts++
    console.log(`Reconnecting в ${delay}ms (attempt ${this.reconnectAttempts})`)
    setTimeout(() => this.connect(), delay)
  }

  send(type: string, payload: object) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WS not open, dropping message:', type)
      return
    }
    this.ws.send(JSON.stringify({ type, ...payload }))
  }

  on(event: string, handler: (data: any) => void) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set())
    this.listeners.get(event)!.add(handler)
  }

  off(event: string, handler: (data: any) => void) {
    this.listeners.get(event)?.delete(handler)
  }

  private emit(event: string, data: any) {
    this.listeners.get(event)?.forEach(h => h(data))
  }

  disconnect() {
    this.ws?.close(1000, 'CLIENT_DISCONNECT')
    this.ws = null
  }
}

export const wsClient = new WsClient()
```

## Шаг 7: Ticket refresh для long-lived WS

WS connection выдерживает дольше чем JWT TTL (15 мин). Но ticket — one-shot. Если WS нуждается в re-auth (e.g. после JWT refresh), client переподключается с new ticket:

```typescript
// Client refreshes JWT every 10 min
setInterval(async () => {
  try {
    await fetch('/api/auth/refresh', { method: 'POST' })
  } catch (err) {
    // If refresh fails → force re-login
    wsClient.disconnect()
    router.push('/auth/login')
  }
}, 10 * 60 * 1000)

// WS reconnects с fresh ticket on disconnect
// (auto via scheduleReconnect)
```

## Шаг 8: Security hardening

### Rate limit tickets per-user

```typescript
// services/identity/src/handlers/ws-ticket.ts
import { Redis } from 'ioredis'

const MAX_TICKETS_PER_MINUTE = 10

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)
  
  // Rate-limit check
  const rateLimitKey = `ws_ticket_rate:${auth.userId}`
  const count = await redis.incr(rateLimitKey)
  if (count === 1) await redis.expire(rateLimitKey, 60)
  if (count > MAX_TICKETS_PER_MINUTE) {
    throw createError({
      statusCode: 429,
      statusMessage: 'TOO_MANY_TICKETS',
    })
  }
  
  // ... rest of issue logic
})
```

### Abuse detection

Monitor:
- Tickets issued но never consumed (tracked via Redis expiry).
- Multiple WS connections per-user (limit 5 concurrent).
- Unusual disconnect patterns.

Published events для trust-safety:

```typescript
await publishEvent('app.daria.messenger.ws-connected.v1', {
  userId: auth.userId,
  region: auth.region,
  connectedAt: new Date().toISOString(),
  userAgent: req.headers['user-agent'],
  ipAddressHash: hashIp(req.socket.remoteAddress),
})
```

## Шаг 9: Concurrent connections limit

```typescript
// connection-manager.ts
private readonly MAX_PER_USER = 5

async register(ws: WebSocket, auth: WsAuthContext) {
  const existing = this.userConnections.get(auth.userId) ?? new Set()
  
  if (existing.size >= this.MAX_PER_USER) {
    // Kick oldest connection
    const oldest = Array.from(existing)[0]
    oldest.close(1008, 'MAX_CONNECTIONS_EXCEEDED')
  }
  
  // ... rest
}
```

## Шаг 10: Test

```bash
# 1. Login
eval $(pnpm tsx scripts/dev/zitadel-login.ts alice@test.com Password1!)

# 2. Get ticket
TICKET=$(curl -s -X POST http://identity.internal/v1/ws-ticket \
  -H "Authorization: Bearer $JWT" | jq -r .ticket)
echo "Ticket: $TICKET"

# 3. Check Redis
docker exec -it daria-redis redis-cli GET "ws_ticket:$TICKET"

# 4. Connect WS
wscat -c "ws://messenger.internal/connect?ticket=$TICKET"
# Expected: {"type":"connected","userId":"..."}

# 5. Try reuse ticket — should fail
wscat -c "ws://messenger.internal/connect?ticket=$TICKET"
# Expected: connection closed 1008 AUTHENTICATION_FAILED
```

## Checklist

- [ ] `POST /identity/v1/ws-ticket` issues ticket с 30s TTL
- [ ] Redis stores `ws_ticket:<uuid>` с JSON value
- [ ] Messenger authenticates WS connections через GETDEL
- [ ] Ticket consumed one-shot (second use fails)
- [ ] Connection manager tracks active connections
- [ ] Heartbeat pings every 30s
- [ ] Client auto-reconnects на disconnect
- [ ] Rate-limit prevents ticket farming (10/min)
- [ ] Max 5 concurrent WS per-user enforced
- [ ] Presence events published

## End of Week 1

Identity platform complete. User can:
- Register (email magic-link or passkey)
- Login (passkey preferred)
- Receive JWT с scopes
- Open authenticated WS connection

### Week 1 exit-criteria

- [ ] Zitadel running
- [ ] 25+ scopes registered
- [ ] 8 roles defined
- [ ] Signup flow works adult + minor
- [ ] Passkey registration + login works
- [ ] WS-ticket flow works + Redis
- [ ] All events emitted: `user-registered`, `user-logged-in`, `passkey-enrolled`, `ws-connected`
- [ ] Rate limits in place
- [ ] 70%+ test coverage для identity handlers

## Next

Week 2 Mon: Traefik Gateway → `06-gateway-traefik.md`.
