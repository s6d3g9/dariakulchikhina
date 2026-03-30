function ensureTrailingSlash(value: string) {
  return value.endsWith('/') ? value : `${value}/`
}

function resolveMessengerBaseUrl(baseUrl: string) {
  if (/^[a-z][a-z\d+.-]*:\/\//i.test(baseUrl)) {
    return ensureTrailingSlash(baseUrl)
  }

  const normalizedBaseUrl = baseUrl.startsWith('/') ? baseUrl : `/${baseUrl}`
  const origin = import.meta.client ? window.location.origin : 'http://localhost'

  return ensureTrailingSlash(new URL(normalizedBaseUrl, origin).toString())
}

export function buildMessengerUrl(baseUrl: string, path: string) {
  return new URL(path.replace(/^\//, ''), resolveMessengerBaseUrl(baseUrl)).toString()
}

export function buildMessengerWsUrl(baseUrl: string, path: string) {
  const url = new URL(path.replace(/^\//, ''), resolveMessengerBaseUrl(baseUrl))
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  return url
}