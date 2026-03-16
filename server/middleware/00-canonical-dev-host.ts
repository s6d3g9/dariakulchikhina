const CANONICAL_DEV_HOST = 'localhost'
const LOOPBACK_HOSTS = new Set(['127.0.0.1', '::1'])

export default defineEventHandler((event) => {
  if (!import.meta.dev) {
    return
  }

  const req = event.node?.req
  const method = (req?.method || 'GET').toUpperCase()

  if (method !== 'GET' && method !== 'HEAD') {
    return
  }

  const hostHeader = req?.headers?.host
  if (!hostHeader) {
    return
  }

  const [hostname, port] = hostHeader.split(':')
  if (!hostname || !LOOPBACK_HOSTS.has(hostname)) {
    return
  }

  const path = req?.url || '/'
  const target = `http://${CANONICAL_DEV_HOST}${port ? `:${port}` : ''}${path}`
  const res = event.node?.res
  if (!res) {
    return
  }

  res.statusCode = 307
  res.setHeader('Location', target)
  res.end()
})