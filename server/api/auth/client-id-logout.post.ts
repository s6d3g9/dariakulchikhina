export default defineEventHandler(async (event) => {
  clearClientSession(event)
  return { ok: true }
})
