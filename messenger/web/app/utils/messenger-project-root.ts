const FILESYSTEM_ROOT_SEGMENTS = new Set([
  'Users',
  'home',
  'opt',
  'private',
  'root',
  'srv',
  'tmp',
  'usr',
  'var',
])

function isFilesystemLikeRoot(value: string) {
  const trimmed = value.trim()
  if (!trimmed) {
    return false
  }

  if (/^file:\/\//i.test(trimmed)) {
    return true
  }

  if (/^[a-zA-Z]:[\\/]/.test(trimmed) || trimmed.includes('\\')) {
    return true
  }

  if (!trimmed.startsWith('/')) {
    return false
  }

  const firstSegment = trimmed.split('/').filter(Boolean)[0] || ''
  return FILESYSTEM_ROOT_SEGMENTS.has(firstSegment)
}

export function normalizeMessengerProjectRoot(configuredRoot: string) {
  const trimmed = configuredRoot.trim()
  if (trimmed && !isFilesystemLikeRoot(trimmed)) {
    return trimmed
  }

  if (!import.meta.client) {
    return '/'
  }

  const { hostname, port, protocol, origin } = window.location
  const localHost = hostname === '127.0.0.1' || hostname === 'localhost'
  if (localHost && port && !['3000', '3003'].includes(port)) {
    return `${protocol}//${hostname}:3003`
  }

  return origin
}