export default defineEventHandler(async (event) => {
  // Require at least client or admin auth for address suggestions
  const adminSession = getAdminSession(event)
  const clientSession = getClientSession(event)
  if (!adminSession && !clientSession) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const q = getQuery(event)
  const query = (q.q as string) || ''
  if (!query.trim()) return { results: [] }

  try {
    const url = `https://suggest-maps.yandex.ru/suggest-geo?part=${encodeURIComponent(query)}&lang=ru_RU&v=9&n=7&search_type=all&highlight=0`
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000),
    })
    const text = await res.text()
    // Response is JSONP: suggest.apply({...}) — strip wrapper
    const json = text.replace(/^suggest\.apply\(/, '').replace(/\)$/, '')
    const data = JSON.parse(json) as any
    const results = (data.results || [])
      .filter((r: any) => r.type === 'toponym')
      .map((r: any) => {
        const title = r.title?.text || ''
        const sub = (r.subtitle?.text || '').trim()
        // Skip distance subtitles like "7057,38 км"
        const subtitle = sub.endsWith('км') ? '' : sub
        const full = [title, subtitle].filter(Boolean).join(', ')
        return { title, subtitle, full }
      })
    return { results }
  } catch (e) {
    return { results: [] }
  }
})
