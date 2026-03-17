const HTML_METHODS = new Set(['GET', 'HEAD'])
const HTML_ACCEPT_HEADER = 'text/html'
const NUXT_ASSET_PREFIX = '/_nuxt/'
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

function isDocumentRequest(event: CachePolicyEvent) {
  const method = event.method?.toUpperCase?.() || 'GET'
  if (!HTML_METHODS.has(method)) {
    return false
  }

  const path = event.path || event.node.req.url || '/'
  if (typeof path === 'string' && path.startsWith(NUXT_ASSET_PREFIX)) {
    return false
  }

  const accept = event.node.req.headers.accept || ''
  return typeof accept === 'string' && accept.includes(HTML_ACCEPT_HEADER)
}

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('render:response', (response, { event }) => {
    if (!isDocumentRequest(event)) {
      return
    }

    response.headers = response.headers || {}
    response.headers['cache-control'] = CACHE_CONTROL_NO_STORE
    response.headers.pragma = 'no-cache'
    response.headers.expires = '0'
  })
})