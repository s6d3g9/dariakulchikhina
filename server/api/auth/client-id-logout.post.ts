export default defineEventHandler(async (event) => {
  clearClientIdSession(event)
  clearClientSession(event)
  return { ok: true }
})
