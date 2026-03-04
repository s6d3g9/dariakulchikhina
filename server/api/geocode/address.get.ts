export default defineEventHandler(async (event) => {
  const adminSession = getAdminSession(event)
  const clientSession = getClientSession(event)
  if (!adminSession && !clientSession) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const q = safeGetQuery(event)
  const address = (q.address as string) || ''
  if (!address.trim()) return { lat: null, lng: null }

  try {
    const url = `https://geocode-maps.yandex.ru/1.x/?format=json&geocode=${encodeURIComponent(address)}&lang=ru_RU&results=1`
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    })
    const data = (await res.json()) as any
    const pos =
      data?.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject?.Point?.pos
    if (!pos) return { lat: null, lng: null }

    const [lng, lat] = pos.split(' ').map(Number)
    return { lat, lng }
  } catch {
    return { lat: null, lng: null }
  }
})
