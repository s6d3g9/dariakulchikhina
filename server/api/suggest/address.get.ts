export default defineEventHandler(async (event) => {
  const rawUrl = event.node.req.url || ''
  const qs = rawUrl.includes('?') ? rawUrl.slice(rawUrl.indexOf('?') + 1) : ''
  const query = new URLSearchParams(qs).get('q') || ''
  if (!query.trim()) return { results: [] }

  try {
    const url = `https://suggest-maps.yandex.ru/suggest-geo?part=${encodeURIComponent(query)}&lang=ru_RU&v=9&n=7&search_type=all&highlight=0`
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' }
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
