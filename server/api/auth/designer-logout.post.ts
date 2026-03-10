export default defineEventHandler((event) => {
  clearDesignerSession(event)
  return { ok: true }
})
