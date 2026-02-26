export default defineEventHandler((event) => {
  clearClientSession(event)
  return { ok: true }
})
