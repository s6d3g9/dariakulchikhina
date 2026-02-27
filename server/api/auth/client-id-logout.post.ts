export default defineEventHandler(async (event) => {
  clearClientIdSession(event)
  return { ok: true }
})
