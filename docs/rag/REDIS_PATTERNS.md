# ioredis — Redis Паттерны (RAG)

> Источники: github.com/redis/ioredis (README), redis.io/docs
> Версия: ioredis 5.4.x

---

## 1. Подключение

### Базовое
```ts
import Redis from 'ioredis'

// URL строка
const redis = new Redis(process.env.REDIS_URL)
// redis://[:password@]host:port[/db]

// Объект опций
const redis = new Redis({
  host: '127.0.0.1',
  port: 6379,
  password: 'secret',
  db: 0,
  keyPrefix: 'myapp:',         // автопрефикс для всех ключей
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000)
    return delay                 // return null для отключения retry
  }
})
```

### События подключения
```ts
redis.on('connect', () => console.log('Connected'))
redis.on('ready', () => console.log('Ready'))    // соединение установлено
redis.on('error', (err) => console.error('Redis error:', err))
redis.on('close', () => console.log('Connection closed'))
redis.on('reconnecting', () => console.log('Reconnecting...'))
```

### Auto-reconnect
ioredis автоматически переподключается. `retryStrategy` контролирует задержку:
```ts
retryStrategy(times) {
  if (times > 10) return null    // прекратить попытки
  return Math.min(times * 100, 3000)
}
```

---

## 2. Базовые операции

### String
```ts
await redis.set('key', 'value')
await redis.set('key', 'value', 'EX', 3600)     // TTL 3600 секунд
await redis.set('key', 'value', 'PX', 60000)     // TTL 60000 мс
await redis.set('key', 'value', 'NX')             // set только если НЕ существует
await redis.set('key', 'value', 'XX')             // set только если существует

const value = await redis.get('key')               // string | null
const ttl = await redis.ttl('key')                 // секунды до истечения
await redis.del('key')                              // удалить
await redis.del('key1', 'key2', 'key3')            // удалить несколько
await redis.exists('key')                           // 1 | 0
await redis.expire('key', 3600)                     // установить TTL
```

### Hash
```ts
await redis.hset('user:1', 'name', 'Ivan', 'age', '30')
await redis.hset('user:1', { name: 'Ivan', age: '30' })   // объект

const name = await redis.hget('user:1', 'name')            // string | null
const user = await redis.hgetall('user:1')                  // { name: 'Ivan', age: '30' }
await redis.hdel('user:1', 'age')
await redis.hincrby('user:1', 'visits', 1)
```

### List
```ts
await redis.lpush('queue', 'item1', 'item2')       // в начало
await redis.rpush('queue', 'item3')                  // в конец
const item = await redis.lpop('queue')               // забрать с начала
const items = await redis.lrange('queue', 0, -1)     // все элементы
const length = await redis.llen('queue')
```

### Set
```ts
await redis.sadd('tags', 'vue', 'nuxt', 'ts')
const members = await redis.smembers('tags')          // ['vue', 'nuxt', 'ts']
const isMember = await redis.sismember('tags', 'vue')  // 1 | 0
await redis.srem('tags', 'ts')
```

### Sorted Set
```ts
await redis.zadd('leaderboard', 100, 'player1', 200, 'player2')
const top = await redis.zrevrange('leaderboard', 0, 9)   // top 10
const rank = await redis.zrevrank('leaderboard', 'player1')
await redis.zincrby('leaderboard', 10, 'player1')
```

---

## 3. JSON (через строки)

```ts
// Redis не имеет нативного JSON — сериализуем
async function setJSON(key: string, data: unknown, ttl?: number) {
  const json = JSON.stringify(data)
  if (ttl) {
    await redis.set(key, json, 'EX', ttl)
  } else {
    await redis.set(key, json)
  }
}

async function getJSON<T>(key: string): Promise<T | null> {
  const raw = await redis.get(key)
  return raw ? JSON.parse(raw) as T : null
}

// Использование:
await setJSON('project:42', { id: 42, name: 'Test' }, 3600)
const project = await getJSON<Project>('project:42')
```

---

## 4. Pipeline (batch)

```ts
// Группировка команд — одна round-trip
const pipeline = redis.pipeline()
pipeline.set('key1', 'val1')
pipeline.set('key2', 'val2')
pipeline.get('key1')
pipeline.incr('counter')
const results = await pipeline.exec()
// results = [[null, 'OK'], [null, 'OK'], [null, 'val1'], [null, 1]]
// Каждый: [error, result]
```

### Auto-pipelining (для HTTP серверов!)
```ts
const redis = new Redis({
  enableAutoPipelining: true   // автоматически группирует команды из event loop
})
// Все redis.get/set вызовы в одном tick автоматически pipeline'ятся
```

---

## 5. Транзакции (MULTI/EXEC)

```ts
const results = await redis.multi()
  .set('key1', 'val1')
  .set('key2', 'val2')
  .incr('counter')
  .exec()
// Атомарное выполнение — все или ничего
// results = [[null, 'OK'], [null, 'OK'], [null, 1]]
```

---

## 6. Pub/Sub

### ⚠️ Отдельное соединение для subscriber!
```ts
const pub = new Redis(process.env.REDIS_URL)   // publisher
const sub = new Redis(process.env.REDIS_URL)   // subscriber (ОТДЕЛЬНЫЙ!)

// Подписка
sub.subscribe('notifications', 'updates')
sub.on('message', (channel, message) => {
  console.log(`${channel}: ${message}`)
})

// Публикация (из другого соединения!)
await pub.publish('notifications', JSON.stringify({ type: 'new_order', id: 42 }))

// Pattern subscribe
sub.psubscribe('project:*')
sub.on('pmessage', (pattern, channel, message) => {
  // pattern = 'project:*', channel = 'project:42:update'
})
```

---

## 7. Scan (безопасная итерация)

### scanStream — НЕ блокирует базу (в отличие от KEYS)
```ts
// ❌ НИКОГДА: await redis.keys('user:*')  — блокирует!

// ✅ ПРАВИЛЬНО:
const stream = redis.scanStream({
  match: 'session:*',
  count: 100                    // hint для Redis
})

const keys: string[] = []
stream.on('data', (batch: string[]) => {
  keys.push(...batch)
})
stream.on('end', () => {
  console.log('Found', keys.length, 'keys')
})
```

### Массовое удаление
```ts
const stream = redis.scanStream({ match: 'cache:*' })
stream.on('data', async (keys: string[]) => {
  if (keys.length) {
    const pipeline = redis.pipeline()
    keys.forEach(key => pipeline.del(key))
    await pipeline.exec()
  }
})
```

---

## 8. Streams (Event Sourcing)

```ts
// Добавить событие
await redis.xadd('events', '*', 'type', 'order_created', 'data', JSON.stringify({ orderId: 1 }))
// '*' = auto-generated ID

// Читать
const entries = await redis.xread('COUNT', 10, 'STREAMS', 'events', '0-0')

// Consumer Groups
await redis.xgroup('CREATE', 'events', 'workers', '0', 'MKSTREAM')
const messages = await redis.xreadgroup(
  'GROUP', 'workers', 'worker-1',
  'COUNT', 10, 'STREAMS', 'events', '>'
)

// ACK
await redis.xack('events', 'workers', messageId)
```

---

## 9. Паттерны для проекта

### Session store
```ts
const SESSION_TTL = 86400  // 24 часа

async function setSession(sessionId: string, data: SessionData) {
  await redis.set(`session:${sessionId}`, JSON.stringify(data), 'EX', SESSION_TTL)
}

async function getSession(sessionId: string): Promise<SessionData | null> {
  const raw = await redis.get(`session:${sessionId}`)
  return raw ? JSON.parse(raw) : null
}

async function deleteSession(sessionId: string) {
  await redis.del(`session:${sessionId}`)
}
```

### Cache-aside
```ts
async function getCached<T>(key: string, fetcher: () => Promise<T>, ttl = 300): Promise<T> {
  const cached = await redis.get(key)
  if (cached) return JSON.parse(cached) as T

  const data = await fetcher()
  await redis.set(key, JSON.stringify(data), 'EX', ttl)
  return data
}

// Использование:
const projects = await getCached(
  'projects:active',
  () => db.select().from(projectsTable).where(eq(projectsTable.status, 'active')),
  600  // 10 минут
)
```

### Rate limiter (скользящее окно)
```ts
async function rateLimit(ip: string, limit: number, windowSec: number): Promise<boolean> {
  const key = `rate:${ip}`
  const current = await redis.incr(key)
  if (current === 1) {
    await redis.expire(key, windowSec)
  }
  return current <= limit
}
```

### Key prefix convention
```
session:{sessionId}       — сессии пользователей
cache:{entity}:{id}       — кэш сущностей
rate:{ip}                 — rate limiting
lock:{resource}           — распределённые блокировки
queue:{name}              — очереди задач
event:{channel}           — события pub/sub
```

---

## Быстрая шпаргалка

| Задача | Код |
|--------|-----|
| Connect | `new Redis(process.env.REDIS_URL)` |
| Set + TTL | `redis.set('k', 'v', 'EX', 3600)` |
| Get | `redis.get('k')` → `string \| null` |
| Delete | `redis.del('k')` |
| Hash set | `redis.hset('k', { f1: 'v1', f2: 'v2' })` |
| Hash get all | `redis.hgetall('k')` → `Record<string, string>` |
| List push | `redis.rpush('k', 'item')` |
| Expire | `redis.expire('k', seconds)` |
| Pipeline | `redis.pipeline().set(...).get(...).exec()` |
| Pub | `redis.publish('ch', msg)` |
| Sub | `sub.subscribe('ch'); sub.on('message', cb)` |
| Scan keys | `redis.scanStream({ match: 'prefix:*' })` |
| Auto-pipeline | `new Redis({ enableAutoPipelining: true })` |
| JSON set | `redis.set(k, JSON.stringify(data), 'EX', ttl)` |
| JSON get | `JSON.parse(await redis.get(k))` |
