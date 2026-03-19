function ensureTrailingSlash(value: string) {
  return value.endsWith('/') ? value : `${value}/`
}

export function buildMessengerUrl(baseUrl: string, path: string) {
  return new URL(path.replace(/^\//, ''), ensureTrailingSlash(baseUrl)).toString()
}

export function buildMessengerWsUrl(baseUrl: string, path: string) {
  const url = new URL(path.replace(/^\//, ''), ensureTrailingSlash(baseUrl))
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  return url
}