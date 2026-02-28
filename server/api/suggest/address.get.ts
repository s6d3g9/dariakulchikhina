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
    const data = await res.json() as any
    const results = (data.results || []).map((r: any) => ({
      title: r.title?.text || '',
      subtitle: r.subtitle?.text || '',
      full: [r.title?.text, r.subtitle?.text].filter(Boolean).join(', '),
    }))
    return { results }
  } catch {
    return { results: [] }
  }
})
