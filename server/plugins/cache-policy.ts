const HTML_METHODS = new Set(['GET', 'HEAD'])
const NUXT_ASSET_PREFIX = '/_nuxt/'
const API_PREFIX = '/api/'
const HTML_CONTENT_TYPE = 'text/html'
const CACHE_CONTROL_NO_STORE = 'no-store, no-cache, must-revalidate'

type CachePolicyEvent = {
  method?: string
  path?: string
  node: {
    req: {
      url?: string
      headers: {
        accept?: string
      }
    }
  }
}

type CachePolicyResponse = {
  statusCode?: number
  headers?: Record<string, string | string[] | undefined>
}

function getHeaderValue(headers: CachePolicyResponse['headers'], name: string) {
  if (!headers) {
    return ''
  }

  const match = Object.entries(headers).find(([key]) => key.toLowerCase() === name)
  const value = match?.[1]

  if (Array.isArray(value)) {
    return value.join(', ')
  }

  return typeof value === 'string' ? value : ''
}

function isDocumentResponse(event: CachePolicyEvent, response: CachePolicyResponse) {
  const method = event.method?.toUpperCase?.() || 'GET'
  if (!HTML_METHODS.has(method)) {
    return false
  }

  const path = event.path || event.node.req.url || '/'
  if (typeof path === 'string' && (path.startsWith(NUXT_ASSET_PREFIX) || path.startsWith(API_PREFIX))) {
    return false
  }

  const contentType = getHeaderValue(response.headers, 'content-type').toLowerCase()
  if (contentType.includes(HTML_CONTENT_TYPE)) {
    return true
  }

  const location = getHeaderValue(response.headers, 'location')
  return Boolean(location) && (response.statusCode || 200) >= 300 && (response.statusCode || 200) < 400
}

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('render:response', (response, { event }) => {
    if (!isDocumentResponse(event, response)) {
      return
    }

    response.headers = response.headers || {}
    response.headers['cache-control'] = CACHE_CONTROL_NO_STORE
    response.headers.pragma = 'no-cache'
    response.headers.expires = '0'
  })
})